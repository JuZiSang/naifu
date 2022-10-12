import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useRecoilCallback, useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import { StoryChildContent, StoryId, StoryMetadata } from '../../data/story/storycontainer'
import { GlobalUserContext } from '../../globals/globals'
import {
    CheckEditor,
    Session,
    SiteTheme,
    Stories,
    StoryShelves,
    StorySort,
    StoryUpdate,
} from '../../globals/state'
import { useDebounce } from '../../hooks/useDebounce'
import { Button, LightColorButton } from '../../styles/ui/button'
import { PenWritingIcon } from '../../styles/ui/icons'
import { getDropdownStyle, getDropdownTheme, Select } from '../controls/select'
import { Tags } from '../infotags'
import { getStorage } from '../../data/storage/storage'
import { SearchFilter, sortStoryMetadata } from '../../data/storage/search'
import { FlexRow } from '../../styles/ui/layout'
import RandomStoryNameButton from '../randomstorynamebutton'
import { getUserSetting } from '../../data/user/settings'
import { convertStoryToDocument } from '../../data/document/convert'
import useDownloadStoryJson from '../../hooks/useDownloadStory'
import { CloseButton } from './common'
import Modal, { ModalType } from './modal'

const MetadataModal = styled.div`
    background: ${(props) => props.theme.colors.bg2};
    max-width: 100vw;
    width: min(590px, 100vw);
    padding: 30px;
    textarea {
        height: 145px;
    }
    overflow: auto;
`

const Title = styled.h4`
    font-size: 1.125rem;
`

const SectionTitle = styled.div`
    font-size: 1rem;
    padding-top: 20px;
    font-family: ${(props) => props.theme.fonts.headings};
    padding-bottom: 5px;
`

const Subtitle = styled.div`
    font-size: 0.875rem;
    opacity: 0.7;
    padding-bottom: 8px;
`

const storyFilter = new SearchFilter()

export default function StoryMetadataModal(props: { id: StoryId }): JSX.Element {
    const [modalVisible, setModalVisible] = useState(false)
    return (
        <Fragment>
            <Button
                aria-label={'Edit Story Information'}
                onClick={(e) => {
                    e.stopPropagation()
                    setModalVisible(true)
                }}
            >
                <PenWritingIcon />
            </Button>
            <Modal
                onRequestClose={() => {
                    setModalVisible(false)
                }}
                isOpen={modalVisible}
                shouldCloseOnOverlayClick={true}
                type={ModalType.Large}
                icon={false}
                zIndex={10005}
            >
                <StoryMetadataModalContent id={props.id} onClose={() => setModalVisible(false)} />
            </Modal>
        </Fragment>
    )
}

function StoryMetadataModalContent(props: { id: StoryId; onClose: () => void }): JSX.Element {
    const session = useRecoilValue(Session)
    const shelves = useRecoilValue(StoryShelves)
    const setStories = useSetRecoilState(Stories)
    const updateStory = useRecoilCallback(({ set }) => (metadata: StoryMetadata) => {
        set(StoryUpdate(metadata.id), metadata.save())
    })
    useRecoilValue(StoryUpdate(props.id))

    const currentStory = GlobalUserContext.stories.get(props.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.id)

    const [titleInput, setTitleInput, updateTitleInput] = useDebounce(
        currentStory?.title ?? '',
        (s: string) => {
            if (currentStory) {
                currentStory.title = s
                updateStory(currentStory)
            }
        }
    )

    const [descriptionInput, setDescriptionInput, updateDescriptionInput] = useDebounce(
        currentStory?.description ?? '',
        (d: string) => {
            if (currentStory) {
                currentStory.description = d
                updateStory(currentStory)
            }
        }
    )

    const shelf = useMemo(
        () =>
            [...GlobalUserContext.shelves.entries()].find(
                ([, shelf]) => !!shelf.children?.find((child) => child.id === props.id)
            )?.[1] ?? null,
        [props.id]
    )

    const [selectedShelf, setSelectedShelf] = useState(
        shelf
            ? {
                  value: shelf.id,
                  description: shelf.title,
                  rawLabel: shelf.title,
                  label: shelf.title,
              }
            : {
                  value: '',
                  description: 'No Shelf',
                  rawLabel: 'No Shelf',
                  label: <i>No Shelf</i>,
              }
    )

    const updateShelf = () => {
        const oldShelf = shelf
        const newShelf = GlobalUserContext.shelves.get(selectedShelf.value)

        if (oldShelf) {
            oldShelf.children = oldShelf.children?.filter((child) => child.id !== props.id)
            getStorage(session).saveStoryShelf(oldShelf)
        }
        if (newShelf) {
            newShelf.children = [...(newShelf.children ?? []), { id: props.id, type: 'story' }]
            // make sure there are no duplicates
            newShelf.children = newShelf.children.filter(
                (value, index, array) => array.findIndex((inner) => inner.id === value.id) === index
            )
            getStorage(session).saveStoryShelf(newShelf)
        }
        setStories((stories) => [...stories])
    }
    const updateShelfRef = useRef(updateShelf)
    updateShelfRef.current = updateShelf

    const updateSelectedShelf = (shelf?: StoryMetadata) => {
        setSelectedShelf(
            shelf
                ? {
                      value: shelf.id,
                      description: shelf.title,
                      rawLabel: shelf.title,
                      label: shelf.title,
                  }
                : {
                      value: '',
                      description: 'No Shelf',
                      rawLabel: 'No Shelf',
                      label: <i>No Shelf</i>,
                  }
        )
    }

    useEffect(() => {
        setDescriptionInput(currentStory?.description ?? '')
        setTitleInput(currentStory?.title ?? '')
    }, [currentStory?.description, currentStory?.title, setDescriptionInput, setTitleInput])

    const sortValue = useRecoilValue(StorySort)
    const shelfElements: StoryChildContent[] = []

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

    const results = storyFilter.metadataMatch(shelfElements, '')

    sortStoryMetadata(results, sortValue)

    const shelfOptions = useMemo(
        () => [
            {
                value: '',
                description: 'No Shelf',
                rawLabel: 'No Shelf',
                label: <i>No Shelf</i>,
            },
            ...[...results].map(({ metadata }) => {
                return {
                    value: metadata.id,
                    description: metadata.title ?? 'unknown',
                    rawLabel: metadata.title ?? 'unknown',
                    label: metadata.title ?? 'unknown',
                }
            }),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [shelves]
    )
    const siteTheme = useRecoilValue(SiteTheme)

    useEffect(() => {
        // save on close
        return () => {
            currentStory && updateStory(currentStory)
            updateShelfRef.current()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const setCheckEditor = useSetRecoilState(CheckEditor)
    const downloadStoryJson = useDownloadStoryJson(props.id)

    const convertStory = () => {
        if (!currentStory || !currentStoryContent || !currentStoryContent.story) {
            return
        }
        try {
            downloadStoryJson()
            const document = convertStoryToDocument(currentStoryContent.story)
            currentStoryContent.document = document
            currentStoryContent.story = undefined
            currentStory.hasDocument = true
            setCheckEditor((v) => v + 1)
            updateStory(currentStory)
        } catch (error: any) {
            toast(`Couldn't convert story: ${error.message ?? error}`)
        }
    }

    return (
        <Fragment>
            <MetadataModal onClick={(e) => e.stopPropagation()} className="story-metadata-modal">
                <CloseButton
                    onClick={(e) => {
                        e.stopPropagation()
                        props.onClose()
                    }}
                >
                    <div />
                </CloseButton>
                <Title>Story Settings</Title>
                {!currentStory?.hasDocument && getUserSetting(session.settings, 'useEditorV2') && (
                    <>
                        <SectionTitle>Convert to Editor V2</SectionTitle>
                        <Subtitle>
                            Convert the story to use Editor V2. A backup of the story will be downloaded
                            automatically. This cannot be undone.
                        </Subtitle>

                        <LightColorButton onClick={() => convertStory()}>
                            Download Backup and Convert
                        </LightColorButton>
                    </>
                )}
                <SectionTitle>Story Title</SectionTitle>
                <FlexRow>
                    <input
                        type="text"
                        aria-label="Story Title"
                        value={titleInput}
                        onChange={(e) => {
                            e.stopPropagation()
                            updateTitleInput(e.target.value)
                        }}
                    />
                    <RandomStoryNameButton />
                </FlexRow>

                <SectionTitle>Description</SectionTitle>
                <textarea
                    value={descriptionInput}
                    onChange={(e) => {
                        e.stopPropagation()
                        updateDescriptionInput(e.target.value)
                    }}
                />
                <SectionTitle>Shelf</SectionTitle>
                <Select
                    aria-label="Select a shelf for this story"
                    maxMenuHeight={200}
                    isSearchable={true}
                    options={shelfOptions}
                    value={selectedShelf}
                    onChange={(e) =>
                        e !== null && updateSelectedShelf(GlobalUserContext.shelves.get(e.value))
                    }
                    styles={getDropdownStyle(siteTheme)}
                    theme={getDropdownTheme(siteTheme)}
                />
                <SectionTitle style={{ paddingBottom: '0px' }}>Search Tags</SectionTitle>
                <Subtitle>Type in the box below and press enter to save.</Subtitle>
                <Tags />
            </MetadataModal>
        </Fragment>
    )
}
