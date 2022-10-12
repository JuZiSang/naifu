import { useRecoilState, useRecoilValue, useSetRecoilState, useRecoilCallback } from 'recoil'
import { useEffect, useState, useRef, MutableRefObject, useMemo, MouseEventHandler } from 'react'
import { createPortal } from 'react-dom'
import { useDrag as useDNDDrag, useDrop as useDNDDrop } from 'react-dnd'
import styled from 'styled-components'
import { MdOutlineSearchOff } from 'react-icons/md'
import dayjs from 'dayjs'
import { FaPaperclip } from 'react-icons/fa'
import {
    SelectedStory,
    Stories,
    StoryUpdate,
    Session,
    StorySearch,
    GenerationRequestActive,
    SessionValue,
    StoryShelves,
    SelectedShelf,
    StorySort,
} from '../../../globals/state'
import { StoryChildContent, StoryContainer, StoryId, StoryMetadata } from '../../../data/story/storycontainer'
import { GlobalUserContext } from '../../../globals/globals'
import {
    CreateButtonInner,
    CreateButtonIcon,
    CreateButtonText,
    StoryList as StyledStoryList,
    Story as StyledStory,
    StoryContent,
    StoryMetadataInfo as StyledStoryMetadata,
    StoryFavorite,
    StoryTitle,
    StoryTags,
    StoryRemoteDone,
    StoryRemoteUpload,
    StoryListWrapper,
} from '../../../styles/components/menubar'
import {
    CopyIcon,
    DeleteIcon,
    ExportIcon,
    FolderIcon,
    Icon,
    ImportIcon,
    PlusIcon,
    EditIcon,
} from '../../../styles/ui/icons'
import { UserSettings } from '../../../data/user/settings'
import { useRemoteSaveQueueStatus } from '../../../data/storage/queue'
import { MetadataMatchResult, sortStoryMetadata } from '../../../data/storage/search'
import { isMobileDevice } from '../../../util/compat'
import { Button, SubtleButton } from '../../../styles/ui/button'
import { deleteStory, StatePackage } from '../../../component-logic/optionslogic'
import LibraryIcon from '../../../assets/images/library.svg'
import { Heading } from '../../../styles/components/scenarios'
import Modal, { ModalType } from '../../modals/modal'
import { TextHighlight } from '../../util/texthighlight'
import { WarningButton, WarningButtonStyle } from '../../deletebutton'
import StoryMetadataModal from '../../modals/storymetadata'
import { FlexRow } from '../../../styles/ui/layout'
import { ShelfMetadataModal } from '../../modals/shelfmetadata'
import { getStorage } from '../../../data/storage/storage'
import { useContextMenu } from '../../../hooks/useContextMenu'
import { ButtonItem, ContextMenu } from '../../controls/contextmenu'
import { DeleteButton, DeleteInfo, DeleteModalContent } from '../../../styles/components/infobar'
import Tooltip from '../../tooltip'
import { FileImporterButtonType, FileImporterOverlayType } from '../../controls/fileimporter'
import { AnyFileImporter } from '../../modals/storyimporter'
import useAddStory from '../../../hooks/useAddStory'
import useDownloadStoryJson from '../../../hooks/useDownloadStory'
import { storyFilter, FullHeight, ButtonsRow } from './menubar'

export function StoryList(props: { setVisible: (b: boolean) => void }): JSX.Element {
    const setSelected = useSetRecoilState(SelectedStory)
    const stories = useRecoilValue(Stories)
    const shelves = useRecoilValue(StoryShelves)
    const searchValue = useRecoilValue(StorySearch)
    const storyListRef: MutableRefObject<HTMLDivElement | null> = useRef(null)
    const sortValue = useRecoilValue(StorySort)
    const [maxAmount, setMaxAmount] = useState(50)
    const selectedShelf = useRecoilValue(SelectedShelf)
    const sessionSettings = useRecoilValue(SessionValue('settings')) as UserSettings

    const [{ isOver }, drop] = useDNDDrop(
        () => ({
            accept: 'StoryElement',
            canDrop: () => false,
            collect: (monitor) => ({
                isOver: monitor.isOver(),
            }),
        }),
        []
    )

    const onStoryElementClick = useRecoilCallback(
        ({ snapshot }) =>
            async (result: MetadataMatchResult) => {
                const generationRequestActive = await snapshot.getPromise(GenerationRequestActive)
                const selected = await snapshot.getPromise(SelectedStory)

                if (generationRequestActive) {
                    return
                }

                if (result.metadata?.id && selected.id !== result.metadata.id) {
                    setSelected({
                        id: result.metadata.id,
                    })
                }
                if (isMobileDevice) {
                    props.setVisible(false)
                }
            },
        []
    )

    useEffect(() => {
        setMaxAmount(50)
    }, [searchValue])

    const filteredStories = useMemo(() => {
        let shelfElements = []

        // if shelf is selected, search shelf and sub shelves
        if (selectedShelf) {
            const children = GlobalUserContext.shelves.get(selectedShelf)?.children ?? []
            shelfElements.push(...children)
        }

        // otherwise search unshelved stories
        if (!selectedShelf) {
            for (const story of stories) {
                let found = false
                for (const shelf of shelves) {
                    if (
                        GlobalUserContext.shelves
                            .get(shelf)
                            ?.children?.filter((child) => child.type === 'story')
                            .map((child) => child.id)
                            .includes(story)
                    ) {
                        found = true
                        break
                    }
                }
                if (!found) {
                    shelfElements.push({ type: 'story', id: story } as StoryChildContent)
                }
            }
            for (const shelf of shelves) {
                let found = false
                for (const shelfInner of shelves) {
                    if (
                        GlobalUserContext.shelves
                            .get(shelfInner)
                            ?.children?.filter((child) => child.type === 'shelf')
                            .map((child) => child.id)
                            .includes(shelf)
                    ) {
                        found = true
                        break
                    }
                }
                if (!found) {
                    shelfElements.push({ type: 'shelf', id: shelf } as StoryChildContent)
                }
            }
        }

        // make sure there are no duplicates
        shelfElements = shelfElements.filter(
            (value, index, array) => array.findIndex((inner) => inner.id === value.id) === index
        )
        let results = storyFilter.metadataMatch(shelfElements, searchValue)

        sortStoryMetadata(results, sortValue)

        if (sessionSettings.sortFavoritesOnTop ?? false) {
            results.sort((a, b) =>
                a.metadata.favorite === b.metadata.favorite ? 0 : a.metadata.favorite ? -1 : 1
            )
        }
        if (sessionSettings.sortShelvesOnTop ?? true) {
            results.sort((a, b) => (a.elementType === b.elementType ? 0 : a.elementType === 'shelf' ? -1 : 1))
        }
        results = results.slice(0, maxAmount)

        const elements = results.map((result) => {
            return result.elementType === 'story' ? (
                <StoryElement
                    id={result.metadata.id}
                    key={result.metadata.id}
                    story={result.metadata}
                    highlight={result}
                    onClick={() => onStoryElementClick(result)}
                    parent={result.parent}
                />
            ) : (
                <ShelfElement id={result.metadata?.id ?? ''} key={result.metadata.id} />
            )
        })
        return elements
    }, [
        selectedShelf,
        searchValue,
        sortValue,
        sessionSettings.sortShelvesOnTop,
        sessionSettings.sortFavoritesOnTop,
        maxAmount,
        stories,
        shelves,
        onStoryElementClick,
    ])

    const handleScroll = () => {
        const current = storyListRef.current
        if (
            current !== null &&
            current.scrollTop > current.scrollHeight / 1.5 &&
            filteredStories.length === maxAmount
        ) {
            setMaxAmount(maxAmount + 50)
        }
    }

    const [scrollTop, setScrollTop] = useState(false)
    const [scrollBottom, setScrollBottom] = useState(false)
    useEffect(() => {
        const onScroll = () => {
            setScrollTop((storyListRef.current?.scrollTop ?? 0) >= 10)
            setScrollBottom(
                (storyListRef.current?.scrollTop ?? 0) + (storyListRef.current?.offsetHeight ?? 0) <=
                    (storyListRef.current?.scrollHeight ?? 0) - 10
            )
        }
        const element = storyListRef.current
        element?.addEventListener('scroll', onScroll)
        return () => element?.removeEventListener('scroll', onScroll)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storyListRef.current])

    return (
        <StoryListWrapper
            showScrollTop={isOver && scrollTop}
            showScrollBottom={isOver && scrollBottom}
            ref={drop}
            onScroll={handleScroll}
        >
            <StyledStoryList
                onScroll={handleScroll}
                ref={storyListRef}
                className="story-list"
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
            >
                {filteredStories.length > 0 ? (
                    filteredStories
                ) : (
                    <FullHeight>
                        <StoryNoResultPlaceholder />
                    </FullHeight>
                )}
            </StyledStoryList>
        </StoryListWrapper>
    )
}
const StyledShelfElement = styled.div<{ drop: boolean }>`
    cursor: pointer;
    padding: 10px;
    margin: 10px;
    position: relative;
    transition: ${(props) => props.theme.transitions.interactive};
    border: 2px solid ${(props) => props.theme.colors.bg2};

    background: ${(props) => (props.drop ? props.theme.colors.bg3 : 'transparent')};

    &:hover {
        background: ${(props) => props.theme.colors.bg2};
    }

    &:hover {
        ${StoryTitle} {
            opacity: 1;
        }
    }

    &:hover {
        ${StoryContent} {
            opacity: 1;
        }
    }
`
function ShelfElement(props: { id: StoryId }) {
    const shelf = useMemo(() => GlobalUserContext.shelves.get(props.id), [props.id])

    const [stories, setStories] = useRecoilState(Stories)
    const session = useRecoilValue(Session)
    const setSelectedShelf = useSetRecoilState(SelectedShelf)

    const [{ isOver, canDrop }, drop] = useDNDDrop(
        () => ({
            accept: 'StoryElement',
            drop: (item: { id: string }) => {
                const shelf = GlobalUserContext.shelves.get(props.id)
                if (!shelf) return
                setTimeout(() => {
                    shelf.children = [
                        ...(shelf.children ?? []),
                        {
                            type: 'story',
                            id: item.id,
                        },
                    ]
                    setStories((stories) => [...stories])
                    getStorage(session).saveStoryShelf(shelf)
                }, 50)
            },
            collect: (monitor) => ({
                isOver: monitor.isOver(),
                canDrop: monitor.canDrop(),
            }),
        }),
        [props.id]
    )

    const containedStories = useMemo(
        () => {
            if (!shelf?.children) return 0
            // make sure there are no duplicates
            const children = shelf.children.filter(
                (value, index, array) => array.findIndex((inner) => inner.id === value.id) === index
            )
            return children.filter((child) => !!GlobalUserContext.stories.get(child.id)).length ?? 0
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [stories, shelf]
    )

    const shelfRef = useRef<HTMLDivElement | null>(null)
    const menu = useContextMenu(shelfRef, false, true)

    const [modalVisible, setModalVisible] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const deleteShelf = useRecoilCallback(({ set }) => () => {
        if (shelf) getStorage(session).deleteStoryShelf(shelf)
        set(StoryShelves, (shelves) => [...shelves].filter((shelf) => shelf !== props.id))
        setSelectedShelf('')
    })

    if (!shelf) return <div>SHELF NOT FOUND</div>

    return (
        <StyledShelfElement
            ref={(ref) => {
                shelfRef.current = ref
                drop(ref)
            }}
            onClick={() => setSelectedShelf(props.id)}
            drop={isOver && canDrop}
        >
            <StoryTitle style={{ display: 'flex' }}>
                <FolderIcon />
                <TextHighlight text={shelf.title} />
            </StoryTitle>
            <StoryContent>
                <TextHighlight text={shelf.description} />
            </StoryContent>
            <StyledStoryMetadata>Contains {containedStories} Stories</StyledStoryMetadata>
            {createPortal(
                <ContextMenu
                    style={{
                        minWidth: '80px',
                        top: menu.showMenu ? menu.yPos : '-1000px',
                        left: menu.showMenu ? menu.xPos : '-1000px',
                        visibility: menu.showMenu ? 'visible' : 'hidden',
                    }}
                    hintHeight={0}
                >
                    <div>
                        <ButtonItem
                            aria-disabled={false}
                            onMouseDown={(e) => e.preventDefault()}
                            keyboard={false}
                            onClick={(e) => {
                                e.stopPropagation()
                                setModalVisible(true)
                                menu.setShowMenu(false)
                            }}
                        >
                            <FlexRow style={{ justifyContent: 'left' }}>
                                <EditIcon
                                    style={{ display: 'inline-block', width: '16px', marginRight: '6px' }}
                                />
                                Settings
                            </FlexRow>
                        </ButtonItem>
                        <ButtonItem
                            aria-disabled={false}
                            onMouseDown={(e) => e.preventDefault()}
                            keyboard={false}
                            onClick={(e) => {
                                e.stopPropagation()
                                setDeleteOpen(true)
                                menu.setShowMenu(false)
                            }}
                        >
                            <FlexRow style={{ justifyContent: 'left' }}>
                                <DeleteIcon
                                    style={{ display: 'inline-block', width: '16px', marginRight: '6px' }}
                                />
                                Delete
                            </FlexRow>
                        </ButtonItem>
                        <ShelfMetadataModal
                            id={props.id}
                            visible={modalVisible}
                            setVisible={setModalVisible}
                        />
                        <Modal
                            isOpen={deleteOpen}
                            label="Delete Shelf?"
                            shouldCloseOnOverlayClick={true}
                            onRequestClose={() => setDeleteOpen(false)}
                            type={ModalType.Compact}
                        >
                            <DeleteModalContent>
                                <DeleteInfo>
                                    {`Really delete the Shelf ${shelf?.title}?\
                                    The contained stories will be moved out of the shelf.`}
                                </DeleteInfo>
                                <DeleteButton
                                    deleteButtonType={WarningButtonStyle.Danger}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteShelf()
                                    }}
                                >
                                    Delete Shelf
                                </DeleteButton>
                            </DeleteModalContent>
                        </Modal>
                    </div>
                </ContextMenu>,
                document.body
            )}
        </StyledShelfElement>
    )
}
function StoryNoResultPlaceholder() {
    const searchValue = useRecoilValue(StorySearch)
    return (
        <StyledStoryListPlaceholder>
            {!searchValue ? (
                <FolderIcon style={{ width: '70px', height: '70px', opacity: 0.2 }} />
            ) : (
                <MdOutlineSearchOff style={{ width: '90px', height: '90px', opacity: 0.2 }} />
            )}
            <Heading>
                {!searchValue ? 'This shelf is empty.' : "We can't find what you're looking for."}
            </Heading>
        </StyledStoryListPlaceholder>
    )
}
const StyledStoryListPlaceholder = styled.div`
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    padding: 20px;
    gap: 10px;
    text-align: center;
`
const LibraryIconElement = styled(Icon)`
    mask-image: url(${LibraryIcon.src});
    cursor: default;
    width: 100px;
    height: 60px;
`
export function StoryListPlaceholder(props: {
    addStoryClick: MouseEventHandler<HTMLButtonElement> | undefined
}): JSX.Element {
    return (
        <StyledStoryListPlaceholder>
            <LibraryIconElement />
            <Heading>Looks like your Library is empty.</Heading>
            <SubtleButton
                style={{ width: '100%' }}
                aria-label="create a new story"
                onClick={props.addStoryClick}
            >
                <CreateButtonInner>
                    <CreateButtonIcon>
                        <PlusIcon />
                    </CreateButtonIcon>
                    <CreateButtonText>New Story</CreateButtonText>
                </CreateButtonInner>
            </SubtleButton>
            <AnyFileImporter overlay={FileImporterOverlayType.Fixed} button={FileImporterButtonType.None}>
                <CreateButtonInner tabIndex={0} aria-label="import file" dark={true}>
                    <CreateButtonIcon>
                        <ImportIcon />
                    </CreateButtonIcon>
                    <CreateButtonText>Import File</CreateButtonText>
                </CreateButtonInner>
            </AnyFileImporter>
        </StyledStoryListPlaceholder>
    )
}
function StoryElement(props: {
    story: StoryMetadata
    onClick: () => void
    id: string
    highlight: MetadataMatchResult
    parent?: StoryMetadata
}) {
    const [storyUpdate, setStoryUpdate] = useRecoilState(StoryUpdate(props.story.id))
    const remoteSaveQueue = useRemoteSaveQueueStatus()

    const toggleFavorite = (toggleStory: StoryMetadata) => {
        toggleStory.favorite = !toggleStory.favorite
        setStoryUpdate(toggleStory.save())
    }

    const showPreview =
        props.story.description.length === 0 ||
        (props.highlight.description.length === 0 && props.highlight.textPreview.length > 0)

    const [{ isDragging }, drag] = useDNDDrag(() => ({
        type: 'StoryElement',
        item: () => ({
            id: props.id,
        }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }))

    return (
        <StyledStory
            tabIndex={0}
            role="button"
            aria-label={props.story.title}
            selected={storyUpdate.selected ?? false}
            onClick={() => props.onClick()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && props.onClick()}
            id={props.id}
            ref={drag}
            style={{ opacity: isDragging ? 0.3 : 1 }}
            className="sidebar-story-card"
            data-id={props.id}
        >
            <StoryTitle>
                <TextHighlight text={props.story.title} highlight={props.highlight.title} />
            </StoryTitle>
            <StoryContent>
                <TextHighlight
                    text={showPreview ? props.story.textPreview : props.story.description}
                    highlight={showPreview ? props.highlight.textPreview : props.highlight.description}
                />
            </StoryContent>
            <StyledStoryMetadata>
                Created {dayjs(props.story.createdAt).format('YYYY-MM-DD @ HH:mma')}
                {props.story.hasDocument && (
                    <Tooltip delay={500} tooltip="Uses Editor V2">
                        <FaPaperclip style={{ marginLeft: 10 }} />
                    </Tooltip>
                )}
            </StyledStoryMetadata>
            <StoryFavorite
                favorite={props.story.favorite}
                onClick={(e) => {
                    toggleFavorite(props.story)
                    e.stopPropagation()
                }}
            />
            {props.story.remote ? (
                remoteSaveQueue.has(props.story.id) || !props.story.remoteId ? (
                    <StoryRemoteUpload />
                ) : (
                    <StoryRemoteDone />
                )
            ) : null}
            {props.highlight.tags.size > 0 ? (
                <StoryTags>
                    {[...props.highlight.tags.entries()].map((entry, index) => (
                        <TextHighlight key={index} text={entry[0]} highlight={entry[1]} />
                    ))}
                </StoryTags>
            ) : null}
            {storyUpdate.selected ? <StoryButtonsRow story={props.story} id={props.id} /> : null}
            {props.parent ? (
                <StyledStoryMetadata>
                    <FolderIcon
                        style={{
                            display: 'inline-block',
                            height: '16px',
                            width: '16px',
                            top: '-2px',
                            position: 'relative',
                            marginRight: '5px',
                        }}
                    />
                    Contained in {props.parent.title}
                </StyledStoryMetadata>
            ) : null}
        </StyledStory>
    )
}
function StoryButtonsRow(props: { story: StoryMetadata; id: string }) {
    const statePackage: StatePackage = {
        session: useRecoilValue(Session),
        selectedShelf: useRecoilValue(SelectedShelf),
        setSelectedStory: useSetRecoilState(SelectedStory),
        storiesState: useRecoilState(Stories),
        storyUpdateState: useSetRecoilState(StoryUpdate('')),
    }
    const generationRequestActive = useRecoilValue(GenerationRequestActive)

    const { duplicateStory } = useAddStory()
    const duplicateStoryInner = () => {
        if (!props.story) {
            return
        }
        const content = GlobalUserContext.storyContentCache.get(props.id)
        if (!content) {
            return
        }
        duplicateStory(StoryContainer.bundle(props.story, content))
    }

    const downloadStoryJson = useDownloadStoryJson(props.id)

    return (
        <ButtonsRow>
            <Tooltip tooltip={'Delete Story'} delay={1000} motionHover={true}>
                <WarningButton
                    onConfirm={async () => {
                        return await deleteStory(props.id, statePackage)
                    }}
                    buttonType={WarningButtonStyle.Light}
                    warningColors
                    buttonText={<DeleteIcon />}
                    confirmButtonText="Delete it!"
                    label="Delete Story?"
                    disabled={generationRequestActive}
                    warningText={
                        <>
                            Are you sure you want to delete {'"'}
                            {GlobalUserContext.stories.get(props.id)?.title}
                            {'"'}?
                            <br />
                            This cannot be reversed.
                        </>
                    }
                />
            </Tooltip>
            <Tooltip tooltip={'Duplicate Story'} delay={1000} motionHover={true}>
                <Button aria-label={'Duplicate Story'} onClick={() => duplicateStoryInner()}>
                    <CopyIcon />
                </Button>
            </Tooltip>
            <Tooltip tooltip={'Download Story'} delay={1000} motionHover={true}>
                <Button
                    aria-label={'Export Story'}
                    onClick={() => {
                        downloadStoryJson()
                    }}
                >
                    <ExportIcon />
                </Button>
            </Tooltip>
            <Tooltip tooltip={'Edit Information'} delay={1000} motionHover={true}>
                <StoryMetadataModal id={props.id} />
            </Tooltip>
        </ButtonsRow>
    )
}
