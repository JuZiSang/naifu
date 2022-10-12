import { useRecoilState, useRecoilValue, useSetRecoilState, useRecoilCallback } from 'recoil'
import { KeyboardEvent, useEffect, useState, useRef, MouseEventHandler, Fragment } from 'react'
import { useDrop as useDNDDrop } from 'react-dnd'
import styled from 'styled-components'
import { MdKeyboardArrowRight } from 'react-icons/md'
import { FaImage, FaQuestion } from 'react-icons/fa'
import { useRouter } from 'next/router'
import Link from 'next/link'
import {
    Stories,
    Session,
    SettingsModalOpen,
    SubscriptionDialogOpen,
    PrefixTrainingOpen,
    StorySearch,
    TokenizerOpen,
    GenerationRequestActive,
    SessionValue,
    StoryShelves,
    SelectedShelf,
    StorySort,
    ShowTutorial,
    TutorialState,
} from '../../../globals/state'
import { StoryMetadata } from '../../../data/story/storycontainer'
import { BreakpointMobile, CommitHash } from '../../../globals/constants'
import { GlobalUserContext } from '../../../globals/globals'
import {
    Create,
    CreateButtonInner,
    CreateButtonIcon,
    CreateButtonText,
    Header,
    HeaderTitle,
    Menubar,
    Search,
    SubMenu,
    SubMenuButton,
    SubMenuContainer,
    SubMenuOverlay,
    Toggler,
    HeaderSubTitle,
    SubMenuInfo,
    CreateButton,
    SubMenuLink,
} from '../../../styles/components/menubar'
import {
    AaIcon,
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    FolderIcon,
    FunnelEmptyIcon,
    BeakerIcon,
    Icon,
    ImportIcon,
    ModuleIcon,
    PenTipIcon,
    PlusIcon,
    SearchIcon,
    SettingsIcon,
    TextIcon,
    HomeIcon,
    FunnelFilledIcon,
    HeartEnabledIcon,
    EaselIcon,
} from '../../../styles/ui/icons'
import Opus from '../../../assets/images/opus.svg'
import { getUserSetting, UserSettings } from '../../../data/user/settings'
import { subscribeToHotEvent, HotEvent, HotEventSub } from '../../../data/user/hotkeys'
import { SearchFilter } from '../../../data/storage/search'
import { useWindowSizeBreakpoint } from '../../../hooks/useWindowSize'
import { isMobileDevice } from '../../../util/compat'
import { SubtleButton } from '../../../styles/ui/button'
import { DEFAULT_THEME } from '../../../styles/themes/theme'
import Modal, { ModalType } from '../../modals/modal'
import Subscription from '../../subscription'
import PrefixUploader from '../../prefix/uploader'
import { getDropdownStyle, getDropdownTheme, Select } from '../../controls/select'
import { UpdatePulser } from '../../pulser'
import { FlexRow } from '../../../styles/ui/layout'
import ShelfMetadataModalButton from '../../modals/shelfmetadata'
import { getStorage } from '../../../data/storage/storage'
import Checkbox from '../../controls/checkbox'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { AccountRequired, NoSubscriptionOnly } from '../../util/accountrequired'
import { TrialUsageDisplay } from '../../trialactions'
import { TutorialStates } from '../../tutorial'
import { SettingsPages } from '../../settings/constants'
import { FileImporterButtonType, FileImporterOverlayType } from '../../controls/fileimporter'
import { AnyFileImporter } from '../../modals/storyimporter'
import useAddStory from '../../../hooks/useAddStory'
import Sidebar from '../common/sidebar'
import { TipsList } from '../../tip'
import MenuBarLogo from './logo'
import { StoryList, StoryListPlaceholder } from './storylist'

export default function MenuBar(props: {
    visible: boolean
    setVisible: (visible: boolean) => void
}): JSX.Element {
    const windowSize = useWindowSizeBreakpoint(BreakpointMobile, 0)
    const [getLocal, setLocal] = useLocalStorage(
        'menuBarState',
        false,
        (val) => val.toString(),
        (val) => val === 'true'
    )

    useEffect(() => {
        if (
            windowSize.width <= BreakpointMobile &&
            (!windowSize.prevWidth || windowSize.prevWidth > BreakpointMobile)
        ) {
            props.setVisible(false)
        }
        if (
            windowSize.width > BreakpointMobile &&
            (!windowSize.prevWidth || windowSize.prevWidth <= BreakpointMobile)
        ) {
            props.setVisible(getLocal())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowSize.width])

    return (
        <>
            <Toggler
                visible={!props.visible}
                onClick={() => {
                    setLocal(!props.visible)
                    props.setVisible(!props.visible)
                }}
                className="toggler menubar-toggler"
            >
                <ArrowRightIcon />
                <PenTipIcon />
                <UpdatePulser style={{ right: '40px' }} />
            </Toggler>
            <Menu visible={props.visible} setVisible={props.setVisible} />
        </>
    )
}
export const storyFilter = new SearchFilter()

function MenuSubMenuContainer(props: {
    visible: boolean
    setVisible: (visible: boolean) => void
    setMenuVisible: (visible: boolean) => void
}): JSX.Element {
    const generationRequestActive = useRecoilValue(GenerationRequestActive)

    const [subscriptionVisible, setSubscriptionVisible] = useRecoilState(SubscriptionDialogOpen)
    const onSubscriptionClose = () => {
        setSubscriptionVisible({ open: false, blocked: false })
    }

    const [prefixTrainingVisible, setPrefixTrainingVisible] = useRecoilState(PrefixTrainingOpen)
    const onPrefixTraining = () => {
        props.setVisible(false)
        setPrefixTrainingVisible(true)
    }
    const onPrefixTrainingClose = () => {
        setPrefixTrainingVisible(false)
    }

    const setTokenizerOpen = useSetRecoilState(TokenizerOpen)
    const onTokenizer = () => {
        props.setVisible(false)
        setTokenizerOpen(true)
    }

    const [tipsOpen, setTipsOpen] = useState(false)
    const onTips = () => {
        props.setVisible(false)
        setTipsOpen(true)
    }

    const router = useRouter()
    const onImageGen = () => {
        props.setVisible(false)
        router.push('/image')
    }

    const setTutorialState = useSetRecoilState(TutorialState)

    const setShowTutorial = useSetRecoilState(ShowTutorial)
    const onTutorial = () => {
        props.setVisible(false)
        setShowTutorial(true)
        setTutorialState((v) => ({ ...v, state: TutorialStates.WELCOME_SCREEN }))
        if (isMobileDevice || (window.visualViewport?.width || window.innerWidth) < 1200) {
            props.setVisible(false)
        }
    }
    return (
        <SubMenuContainer visible={props.visible}>
            <SubMenu>
                <AccountRequired>
                    <Modal
                        type={ModalType.Compact}
                        isOpen={subscriptionVisible.open}
                        label=""
                        shouldCloseOnOverlayClick={true}
                        onRequestClose={onSubscriptionClose}
                        iconUrl={Opus.src}
                    >
                        <Subscription
                            actionBlocked={subscriptionVisible.blocked}
                            onClose={onSubscriptionClose}
                        />
                    </Modal>
                </AccountRequired>
                <AccountRequired>
                    <SubMenuButton
                        disabled={generationRequestActive}
                        onClick={onPrefixTraining}
                        additionalClasses={'submenu-item'}
                    >
                        <div>
                            <ModuleIcon />
                            <div>AI Module Training</div>
                        </div>
                    </SubMenuButton>
                </AccountRequired>
                <Modal
                    type={ModalType.Large}
                    isOpen={prefixTrainingVisible}
                    label=""
                    shouldCloseOnOverlayClick={false}
                    onRequestClose={onPrefixTrainingClose}
                >
                    <PrefixUploader onClose={onPrefixTrainingClose} />
                </Modal>
                <SubMenuButton onClick={onTokenizer} additionalClasses={'submenu-item'}>
                    <div>
                        <AaIcon />
                        <div>Tokenizer</div>
                    </div>
                </SubMenuButton>
                <SubMenuButton
                    disabled={(window.visualViewport?.width || window.innerWidth) < 700}
                    onClick={onTutorial}
                    additionalClasses={'submenu-item'}
                >
                    <div>
                        <TextIcon />
                        <div>Tutorial</div>
                    </div>
                    {(window.visualViewport?.width || window.innerWidth) < 700 && (
                        <TutorialNote>currently only supported on desktop devices</TutorialNote>
                    )}
                </SubMenuButton>
                <Fragment>
                    <SubMenuButton onClick={onTips} additionalClasses={'submenu-item'}>
                        <div>
                            <FaQuestion />
                            <div>Tips</div>
                        </div>
                    </SubMenuButton>
                    <Modal
                        isOpen={tipsOpen}
                        shouldCloseOnOverlayClick
                        label="Tips"
                        onRequestClose={() => setTipsOpen(false)}
                    >
                        <TipsList />
                    </Modal>
                </Fragment>
                <Fragment>
                    <Link href="/image" passHref>
                        <SubMenuLink onClick={onImageGen} className={'submenu-item'}>
                            <div>
                                <EaselIcon />
                                <div>Image Generation</div>
                            </div>
                        </SubMenuLink>
                    </Link>
                </Fragment>
                <SubMenuInfo>Version {CommitHash}</SubMenuInfo>
            </SubMenu>
            <SubMenuOverlay onClick={() => props.setVisible(!props.visible)} />
        </SubMenuContainer>
    )
}

function Menu(props: { visible: boolean; setVisible: (visible: boolean) => void }) {
    const setSearchValue = useSetRecoilState(StorySearch)
    const stories = useRecoilValue(Stories)
    const [subMenuVisible, setSubMenuVisible] = useState(false)

    const { addStory } = useAddStory({
        callback: () => {
            setSearchValue('')
            if (isMobileDevice) {
                props.setVisible(false)
            }
        },
    })

    const hotCreateNewStoryRef = useRef<any>()
    const hotCreateNewStory = () => {
        addStory()
    }
    hotCreateNewStoryRef.current = hotCreateNewStory

    useEffect(() => {
        subscribeToHotEvent(HotEvent.createNewStory, new HotEventSub('mbCNS', hotCreateNewStoryRef))
    }, [])

    const setSettingsVisible = useSetRecoilState(SettingsModalOpen)
    const onSettings = () => {
        setSettingsVisible(SettingsPages.AISettings)
        if (isMobileDevice) {
            props.setVisible(false)
        }
    }

    const [, setLocal] = useLocalStorage(
        'menuBarState',
        false,
        (val) => val.toString(),
        (val) => val === 'true'
    )

    const sessionSettings = useRecoilValue(SessionValue('settings')) as UserSettings
    const siteTheme = sessionSettings.siteTheme ?? DEFAULT_THEME

    return (
        <Sidebar
            left={true}
            open={props.visible}
            setOpen={props.setVisible}
            breakpointDesktop={`${Math.max(
                Number.parseInt(siteTheme.breakpoints.desktop) || BreakpointMobile + 1,
                (Number.parseInt(siteTheme.breakpoints.mobile) || BreakpointMobile) + 1
            )}px`}
            breakpointMobile={`${Math.max(
                Number.parseInt(siteTheme.breakpoints.mobile) || BreakpointMobile,
                BreakpointMobile
            )}px`}
            initialOffset={400}
        >
            <Menubar visible={props.visible} className="menubar">
                <Header>
                    <MenuBarLogo />
                    <HeaderTitle>NovelAI</HeaderTitle>
                    <HeaderSubTitle>beta</HeaderSubTitle>
                    <div style={{ flex: '1' }} />
                    <Link href="/image" passHref>
                        <a
                            tabIndex={-1}
                            aria-label="Open Submenu"
                            aria-hidden="true"
                            style={{ position: 'relative', padding: '14px 9px', cursor: 'pointer' }}
                        >
                            <EaselIcon />
                        </a>
                    </Link>
                    <SubtleButton
                        tabIndex={-1}
                        aria-label="Open Submenu"
                        aria-hidden="true"
                        style={{ position: 'relative', padding: '14px 9px', cursor: 'pointer' }}
                        onClick={() => setSubMenuVisible(!subMenuVisible)}
                    >
                        <BeakerIcon active={subMenuVisible} />
                    </SubtleButton>
                    <SubtleButton
                        aria-label="Open Settings"
                        style={{ position: 'relative', padding: '14px 7px', cursor: 'pointer' }}
                        onClick={onSettings}
                    >
                        <SettingsIcon />
                        <UpdatePulser style={{ top: '-2px', right: '-8px' }} />
                    </SubtleButton>
                    <SubtleButton
                        tabIndex={-1}
                        aria-label="Close left sidebar"
                        aria-hidden="true"
                        onClick={() => {
                            setLocal(!props.visible)
                            props.setVisible(!props.visible)
                        }}
                        style={{ padding: '14px 24px 14px 7px', cursor: 'pointer' }}
                    >
                        <ArrowLeftIcon />
                    </SubtleButton>
                </Header>
                <MenuSubMenuContainer
                    visible={subMenuVisible}
                    setVisible={setSubMenuVisible}
                    setMenuVisible={props.setVisible}
                />
                <NoSubscriptionOnly>
                    <TrialUsageDisplay />
                </NoSubscriptionOnly>
                {stories.length > 0 ? (
                    <>
                        <FilterControls />
                        <StoryList setVisible={props.setVisible} />
                        <BottomButtonsBlock addStoryClick={addStory} />
                    </>
                ) : (
                    <FullHeight>
                        <StoryListPlaceholder addStoryClick={addStory} />
                    </FullHeight>
                )}
            </Menubar>
        </Sidebar>
    )
}

const StyledBottomButtonsBlock = styled.div`
    display: flex;
    width: 100%;
    padding: 5px;
    flex-direction: column;
`
function BottomButtonsBlock(props: { addStoryClick: MouseEventHandler<HTMLButtonElement> }) {
    const session = useRecoilValue(Session)
    const [shelves, setShelves] = useRecoilState(StoryShelves)
    const selectedShelf = useRecoilValue(SelectedShelf)

    const addShelfClick = useRecoilCallback(({ snapshot, set }) => async () => {
        const generationRequestActive = await snapshot.getPromise(GenerationRequestActive)

        if (generationRequestActive) {
            return
        }

        const newShelf = new StoryMetadata()
        newShelf.title = 'New Shelf'
        GlobalUserContext.shelves.set(newShelf.id, newShelf)
        setShelves([...shelves, newShelf.id])
        getStorage(session).saveStoryShelf(newShelf)
        set(SelectedShelf, '')
    })

    return (
        <StyledBottomButtonsBlock>
            <BottomButtons>
                <Create className="new-story-button">
                    <CreateButton tabIndex={0} aria-label="create a new story" onClick={props.addStoryClick}>
                        <CreateButtonInner>
                            <CreateButtonIcon>
                                <PlusIcon />
                            </CreateButtonIcon>
                            <CreateButtonText>New Story</CreateButtonText>
                        </CreateButtonInner>
                    </CreateButton>
                </Create>
            </BottomButtons>
            <BottomButtons>
                <Create className="new-shelf-button">
                    <CreateButton
                        disabled={selectedShelf !== '' || session.noAccount}
                        aria-label="create a new shelf"
                        onClick={addShelfClick}
                    >
                        <CreateButtonInner faint={true}>
                            <CreateButtonIcon faint={true}>
                                <FolderIcon />
                            </CreateButtonIcon>
                            <CreateButtonText>New Shelf</CreateButtonText>
                        </CreateButtonInner>
                    </CreateButton>
                </Create>
                <Create className="import-file-button">
                    <AnyFileImporter
                        overlay={FileImporterOverlayType.Fixed}
                        button={FileImporterButtonType.None}
                    >
                        <CreateButtonInner dark={true} faint={true}>
                            <CreateButtonIcon faint={true}>
                                <ImportIcon />
                            </CreateButtonIcon>
                            <CreateButtonText>Import File</CreateButtonText>
                        </CreateButtonInner>
                    </AnyFileImporter>
                </Create>
            </BottomButtons>
        </StyledBottomButtonsBlock>
    )
}

const FilterControlsBlock = styled.div`
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    min-height: 45px;
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
`
const FilterControlsBlockControls = styled.div`
    padding: 10px 20px;
    height: 45px;
    display: flex;
    flex-direction: row;
    align-items: center;
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1rem;
    flex: 1 1 auto;
`
const IconsBlock = styled.div`
    display: flex;
    flex-direction: row;
    right: -2px;
    position: relative;
    > * {
        padding: 5px;
        position: relative;
        margin-left: 5px;
        cursor: pointer;
        pointer-events: all;
        flex: 1 1 auto;
        &:hover {
            ${Icon} {
                transform: scale(1.1);
            }
        }
        > * {
            width: 16px;
            transition: transform ${(props) => props.theme.transitions.iteractive};
        }
    }
`
const HoverIconContainer = styled.div`
    padding: 10px 2px 10px 0;
    cursor: pointer;
    display: flex;
    &:hover {
        ${Icon} {
            transform: scale(1.1);
        }
    }
`
const FilterBlock = styled.div<{ visible: boolean }>`
    display: ${(props) => (props.visible ? 'flex' : 'none')};
    flex-direction: column;
    padding: 10px 20px 10px;
    font-size: 0.875rem;
    gap: 10px;
    flex: 1 1 auto;
`
const FilterBlockHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    flex: 1 1 auto;
    font-weight: 500;
    > * {
        flex: 0 1 auto;
    }
`

function FilterControls() {
    const [searchValue, setSearchValue] = useRecoilState(StorySearch)
    const [selectedShelf, setSelectedShelf] = useRecoilState(SelectedShelf)
    const [session, setSession] = useRecoilState(Session)
    const sessionSettings = useRecoilValue(SessionValue('settings')) as UserSettings

    const [searchVisible, setSearchVisible] = useState(false)
    const [filterVisible, setFilterVisible] = useState(false)

    const [order, setOrder] = useRecoilState(StorySort)

    const setStories = useSetRecoilState(Stories)

    const searchKey = useRef<HTMLInputElement>(null)
    const searchKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            prevSearchValue.current = ''
            setSearchValue('')
            searchKey.current?.blur()
            setSearchVisible(false)
            event.stopPropagation()
        }
    }
    const prevSearchValue = useRef('')
    const blurRef = useRef(0)

    useRecoilValue(StoryShelves)

    const onSearchClick = () => {
        clearTimeout(blurRef.current)
        if (!searchVisible) {
            setTimeout(() => {
                const end = searchKey.current?.value.length
                end && searchKey.current?.setSelectionRange(end, end)
                searchKey.current?.focus()
            }, 10)
            setSearchValue(prevSearchValue.current)
        } else {
            prevSearchValue.current = searchValue
            setSearchValue('')
        }
        setSearchVisible(!searchVisible)
    }

    const [{ isOver, canDrop }, drop] = useDNDDrop(
        () => ({
            accept: 'StoryElement',
            drop: (item: { id: string }) => {
                const shelf = GlobalUserContext.shelves.get(selectedShelf)
                if (!shelf) return
                setTimeout(() => {
                    shelf.children = [...(shelf.children ?? []).filter((child) => child.id !== item.id)]
                    setStories((stories) => [...stories])
                    getStorage(session).saveStoryShelf(shelf)
                }, 50)
            },
            collect: (monitor) => ({
                isOver: monitor.isOver(),
                canDrop: monitor.canDrop(),
            }),
        }),
        [selectedShelf]
    )

    return (
        <FilterControlsBlock>
            <FilterControlsBlockControls
                onClick={() => {
                    if (!selectedShelf) onSearchClick()
                }}
            >
                {selectedShelf && GlobalUserContext.shelves.get(selectedShelf) ? (
                    <FlexRow
                        style={{ justifyContent: 'left', overflow: 'hidden' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <HoverIconContainer
                            onClick={(e) => {
                                e.stopPropagation()
                                setSelectedShelf('')
                            }}
                            ref={drop}
                        >
                            <HomeIcon
                                style={{
                                    display: 'inline-block',
                                    height: '16px',
                                    width: '16px',
                                    position: 'relative',
                                    top: '-2px',
                                    opacity: isOver && canDrop ? 0.5 : 1,
                                    flex: '0 0 16px',
                                }}
                            />
                        </HoverIconContainer>
                        <MdKeyboardArrowRight
                            style={{ display: 'inline-block', height: '22px', width: '22px' }}
                        />
                        <span
                            style={{
                                position: 'relative',
                                top: '2px',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {GlobalUserContext.shelves.get(selectedShelf)?.title}
                        </span>
                    </FlexRow>
                ) : (
                    <FlexRow style={{ justifyContent: 'left', overflow: 'hidden' }} grow={false}>
                        <span
                            style={{
                                position: 'relative',
                                top: '2px',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Your Stories
                        </span>
                    </FlexRow>
                )}
                <div style={{ flex: 1 }} />
                <Search
                    visible={searchVisible}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() =>
                        !searchValue &&
                        (blurRef.current = setTimeout(onSearchClick, 150) as unknown as number)
                    }
                >
                    <input
                        placeholder={selectedShelf ? 'Search this shelf' : 'Search your stories'}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => searchKeyDown(e)}
                        ref={searchKey}
                    />
                </Search>
                <IconsBlock>
                    {selectedShelf ? <ShelfMetadataModalButton id={selectedShelf} /> : null}
                    <SubtleButton
                        aria-label="Open Sort Settings"
                        onClick={(e) => {
                            e.stopPropagation()
                            setFilterVisible(!filterVisible)
                        }}
                    >
                        {filterVisible ? (
                            <FunnelFilledIcon highlight={filterVisible} />
                        ) : (
                            <FunnelEmptyIcon highlight={filterVisible} />
                        )}
                    </SubtleButton>
                    <SubtleButton
                        aria-label="Search"
                        onClick={(e) => {
                            e.stopPropagation()
                            onSearchClick()
                        }}
                    >
                        <SearchIcon highlight={searchVisible} />
                    </SubtleButton>
                </IconsBlock>
            </FilterControlsBlockControls>
            <FilterBlock visible={filterVisible} onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    value={getUserSetting(session.settings, 'sortShelvesOnTop')}
                    setValue={(v) => {
                        setSession((session) => {
                            const newSession = {
                                ...session,
                                settings: { ...session.settings, sortShelvesOnTop: v },
                            }
                            getStorage(newSession).saveSettings(newSession.settings)
                            return newSession
                        })
                    }}
                    alternate
                    label="Shelves on top"
                    style={{
                        fontWeight: 500,
                    }}
                >
                    <FolderIcon style={{ width: 14, height: 14, marginRight: 5 }} />
                    <span>Show Shelves on top</span>
                </Checkbox>
                <Checkbox
                    value={getUserSetting(session.settings, 'sortFavoritesOnTop')}
                    setValue={(v) => {
                        setSession((session) => {
                            const newSession = {
                                ...session,
                                settings: { ...session.settings, sortFavoritesOnTop: v },
                            }
                            getStorage(newSession).saveSettings(newSession.settings)
                            return newSession
                        })
                    }}
                    label="Favorites on top"
                    alternate
                    style={{
                        fontWeight: 500,
                    }}
                >
                    <HeartEnabledIcon style={{ width: 14, height: 14, marginRight: 5 }} />
                    <span>Show Favorites on top</span>
                </Checkbox>
                <FilterBlockHeader style={{ marginTop: '-5px' }}>
                    <SubtleButton
                        aria-label="Change display order"
                        onClick={() => setOrder({ ...order, reverse: !order.reverse })}
                        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                    >
                        {order.reverse ? (
                            <ArrowUpIcon style={{ width: 14, height: 14, marginRight: 5 }} />
                        ) : (
                            <ArrowDownIcon style={{ width: 14, height: 14, marginRight: 5 }} />
                        )}
                        <span>Sort By </span>
                    </SubtleButton>
                </FilterBlockHeader>
                <Select
                    aria-label="Select the sort order"
                    isSearchable={true}
                    value={order.by}
                    onChange={(e) => e && setOrder({ ...order, by: e })}
                    options={[
                        {
                            label: 'Most Recent',
                            value: 'recent',
                        },
                        {
                            label: 'Alphabetical',
                            value: 'alphabetical',
                        },
                        {
                            label: 'Creation Date',
                            value: 'creation',
                        },
                    ]}
                    styles={getDropdownStyle(sessionSettings.siteTheme ?? DEFAULT_THEME)}
                    theme={getDropdownTheme(sessionSettings.siteTheme ?? DEFAULT_THEME)}
                />
            </FilterBlock>
        </FilterControlsBlock>
    )
}

const BottomButtons = styled.div`
    display: flex;
    gap: 10px;
    width: 100%;
    padding: 5px;
`

export const ButtonsRow = styled.div`
    display: flex;
    flex-direction: row;
    margin-top: 0.5rem;
    button {
        background-color: ${(props) => props.theme.colors.bg3};
        margin-right: 0.5rem;
        width: 42px;
        display: flex;
        justify-content: center;
    }
    ${Icon} {
        width: 14px;
        height: 14px;
    }
`

const TutorialNote = styled.div`
    font-size: 0.875rem;
`

export const FullHeight = styled.div`
    height: 100%;
`
