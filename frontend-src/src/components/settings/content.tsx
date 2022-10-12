import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import { useRecoilCallback, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import styled, { css } from 'styled-components'
import * as dayjs from 'dayjs'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { toast } from 'react-toastify'
import TextareaAutosize from 'react-textarea-autosize'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { v4 as uuid } from 'uuid'
import { GiSpeaker } from 'react-icons/gi'
import { ImStop2 } from 'react-icons/im'
import {
    Session,
    SettingsModalOpen,
    SiteTheme,
    Stories,
    SubscriptionDialogOpen,
    UpdateNotesUnread,
    UpdateNotesVisible,
    ThemePreview as ThemePreviewState,
    CustomModules,
    GiftKeyOpen,
    SelectedStory,
    DebugSettings,
} from '../../globals/state'
import { User } from '../../data/user/user'
import { getUserSetting, TTSType, UserSettingsDefaults, TTSModel } from '../../data/user/settings'

import { Dark } from '../../styles/themes/dark'
import { Theme, AvailableThemes, DEFAULT_THEME } from '../../styles/themes/theme'
import Checkbox from '../controls/checkbox'
import { ActiveKeybinds, HotkeysInfo } from '../../data/user/hotkeys'
import { getDropdownStyle, getDropdownTheme, Select } from '../controls/select'
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll'
import { mix, transparentize } from '../../util/colour'
import {
    SettingsIcon,
    LogoutIcon,
    ArrowLeftIcon,
    Icon,
    ArrowRightIcon,
    MindIcon,
    SaveIcon,
    PlusIcon,
} from '../../styles/ui/icons'
import {
    Button,
    DarkColorButton,
    InvertedButton,
    LightColorButton,
    SubtleButton,
} from '../../styles/ui/button'
import { MainSettingSliderCard } from '../sidebars/common/editorcard'
import { EditorCard } from '../../styles/ui/editorcard'

import { GlobalUserContext } from '../../globals/globals'
import { flushSavingQueue } from '../../data/storage/queue'
import { downloadFile, downloadTextFile, logError } from '../../util/browser'

import {
    createTTSRequest,
    getDefaultTTS,
    isTTSAvailable,
    randomTTSSeedPhrase,
    setDefaultTTS,
    TTSv2Voices,
    TTSVoices,
} from '../../util/tts'

import { useWindowSizeBreakpoint } from '../../hooks/useWindowSize'
import { getStorage } from '../../data/storage/storage'
import { getChangeAuthRequest } from '../../data/request/request'
import { FlexCol, FlexColSpacer, FlexRow, FlexSpaceFull } from '../../styles/ui/layout'
import { UpdatePulser } from '../pulser'
import { AccountRequired } from '../util/accountrequired'
import { BackendURLRequestDeleteAccount, BackendURLResendVerifyEmail } from '../../globals/constants'
import { AIModule, DefaultPrefixOption, NoModule } from '../../data/story/storysettings'
import { ModuleSelect } from '../sidebars/infobar/story'
import { PrefixOptions } from '../../data/story/defaultprefixes'
import { StoryMode } from '../../data/story/story'
import { usePresetInfo } from '../../hooks/usePresetInfo'
import { usePresetOptions } from '../../hooks/usePresetOptions'
import { PrefixInnerDiv, useModuleOptions } from '../../hooks/useModuleOptions'
import { FileInfo } from '../controls/fileinput'
import { ImportDataType } from '../../data/story/storyconverter'
import { modelSupportsModules } from '../../data/ai/model'
import { DefaultModel, normalizeModel, TextGenerationModel } from '../../data/request/model'
import { getAvailiableModels, getLoregenModels } from '../../util/models'
import { hasStreamedTTSAccess, subscriptionIsActive, tierNumberToName } from '../../util/subscription'
import { authTokenToAccountId, groupBy, hasSameKeys } from '../../util/util'
import { isNonsenseAllowed } from '../../util/placebo'
import { copyToClipboard } from '../sidebars/infobar/items/storyexporter'
import { LoadingSpinner } from '../loading'
import { getGiftKeys } from '../modals/giftkey'
import FileImporter, { FileImporterButtonType, FileImporterOverlayType } from '../controls/fileimporter'
import Sidebar from '../sidebars/common/sidebar'
import { CloseButton } from '../modals/common'
import { useLogout } from '../../hooks/useLogout'
import { isSpellCheckSupported } from '../../util/compat'
import { PresetSelect } from '../presetselect'
import { WarningButton, WarningButtonStyle } from '../deletebutton'
import { speakTTS, stopTTS } from '../controls/tts'
import { Avatars, CommentAvatars } from '../comment'
import { getSessionStorage, removeSessionStorage } from '../../util/storage'
import ThemeEditor, { CssEditor } from './themeeditor'

const StyledThemePreview = styled.div<{ preview: Theme; current: boolean }>`
    min-width: 250px;
    flex: 1;
    background: transparent;
    display: flex;
    flex-direction: column;
    position: relative;
    cursor: pointer;
    > div:nth-child(1) {
        background-color: ${(props) => props.preview.colors.bg0};
        height: 15px;
        border-radius: 3px 3px 0 0;
    }
    > div:nth-child(2) {
        background-color: ${(props) => props.preview.colors.bg1};
        height: 20px;
    }
    > div:nth-child(3) {
        background-color: ${(props) => props.preview.colors.bg2};
        height: 30px;
    }
    > div:nth-child(4) {
        background-color: ${(props) => props.preview.colors.bg3};
        height: 50px;
        border-radius: 0 0 3px 3px;
    }
    > div:nth-child(5) {
        position: absolute;
        bottom: 0;
        background: none;
        padding-left: 1rem;
        z-index: 10;
        > span {
            color: ${(props) => props.preview.colors.textHeadings};
            font-family: ${(props) => props.preview.fonts.headings};
            font-size: 1rem;
            line-height: 50px;
        }

        > div {
            border-radius: 50%;
            margin-bottom: -2px;
            margin-right: 0.5rem;
            width: 14px;
            height: 14px;
            position: relative;
            display: inline-block;
            background: black;
            > div {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                position: absolute;
                background: ${(props) => (props.current ? 'white' : 'transparent')};
                left: calc(50% - 4px);
                top: calc(50% - 4px);
            }
        }
    }
    ${(props) =>
        props.preview.preview
            ? css`
                  ::after {
                      content: '';
                      z-index: 9;
                      width: 100%;
                      height: 100%;
                      position: absolute;
                      background: url(${props.preview.preview});
                      background-size: 100%;
                      background-position: center;
                      opacity: 0.6;
                  }
              `
            : null}
`

const StyledThemePreviewList = styled.div<{ columns: number }>`
    display: grid;
    grid-template-rows: auto auto;
    grid-template-columns: repeat(${(props) => props.columns}, auto);
    justify-content: space-between;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 7px;
    flex: 0 0 auto;
    height: 260px;
`

const WarningText = styled.div`
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.warning};
`

const TextSliders = styled.div`
    > div {
        margin: 0px;
    }
`

const VoiceName = styled.div`
    margin-left: 0.8rem;
`

function ThemePreview(props: { preview: Theme }): JSX.Element {
    const [themePreview, setThemePreview] = useRecoilState(ThemePreviewState)

    const changeTheme = (themeName: string) => {
        const theme = AvailableThemes.get(themeName) ?? DEFAULT_THEME
        const newTheme = JSON.parse(JSON.stringify(theme))
        if (newTheme) {
            setThemePreview(newTheme)
        }
    }

    return (
        <StyledThemePreview
            preview={props.preview}
            current={props.preview.name === themePreview.name}
            onClick={() => changeTheme(props.preview.name)}
        >
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div>
                <div>
                    <div></div>
                </div>
                <span>{props.preview.name}</span>
            </div>
        </StyledThemePreview>
    )
}

function ThemePreviewList(): JSX.Element {
    const previewRef = useHorizontalScroll()

    return (
        <StyledThemePreviewList columns={Math.ceil(AvailableThemes.size / 2)} ref={previewRef}>
            {[...AvailableThemes.values()].map((theme) => (
                <ThemePreview key={theme.name} preview={theme} />
            ))}
        </StyledThemePreviewList>
    )
}

const ButtonBox = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
    button {
        padding: 13px 37px;
    }
    font-size: 0.875rem;
    margin-bottom: 10px;
    button:first-child {
        color: ${(props) => props.theme.colors.textHeadings};
    }
    @media (max-width: 800px) {
        max-width: 200px;
        > button {
            justify-content: space-around;
        }
    }
`

export const ModelSelectOption = styled.div`
    & > div:nth-child(1) {
        font-weight: 600;
    }
    & > div:nth-child(2) {
        opacity: 0.8;
    }
`

const HotkeyListList = styled.div`
    display: flex;
    flex-direction: column;
    & > div {
        padding: 5px 10px;
        &:nth-child(2n) {
            background: ${(props) => transparentize(0.2, props.theme.colors.bg1)};
        }
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: space-between;

        &:hover {
            color: ${(props) => props.theme.colors.textHeadings};
        }

        & > div:nth-child(2) {
            font-weight: bold;
        }
    }
`

export function HotkeyList(): JSX.Element {
    const hotkeys = useRecoilValue(ActiveKeybinds)
    return (
        <HotkeyListList>
            {[...HotkeysInfo].map((key, i) => {
                return (
                    <div key={i}>
                        <div>{key[1]}</div>
                        <div>{hotkeys.bindsToString(key[0])}</div>
                    </div>
                )
            })}
        </HotkeyListList>
    )
}

const singleColumnBreakpoint = '800px'
const mobileBreakpoint = '650px'
const mobileBreakpointNum = 650

const SettingsLeft = styled.div`
    display: flex;
    flex-direction: column;
    background-color: ${(props) => props.theme.colors.bg1};
    width: 210px;
    flex: 0 0 auto;
    position: relative;
    overflow: auto;
    height: 100%;
    @media (max-width: ${mobileBreakpoint}) {
        width: 100vw;
    }
`

const SettingsRight = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    overflow-x: hidden;
    position: relative;
`

const SettingsHeader = styled.div`
    display: flex;
    align-items: center;
    padding: 30px 10px 20px 30px;
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textMain};
    font-size: 1.125rem;
    line-height: 0px;
    border-bottom: 1px solid ${(props) => props.theme.colors.bg2};
    > span {
        text-overflow: ellipsis;
        overflow: hidden;
        flex-wrap: nowrap;
        white-space: nowrap;
        height: 1rem;
        line-height: 1rem;
    }
    > div {
        height: 1rem;
        margin-right: 10px;
        margin-bottom: 0.2rem;
    }
    height: 64px;
    @media (max-width: ${mobileBreakpoint}) {
        padding-left: 30px;
    }
`

const SettingsCategory = styled(SubtleButton)<{ selected: boolean }>`
    padding: 13px 20px 13px 0;
    text-align: left;
    display: flex;
    font-size: 1rem;
    :hover,
    :focus {
        color: ${(props) => props.theme.colors.textHeadings};
    }

    justify-content: space-between;
    @media (min-width: ${mobileBreakpoint}) {
        font-size: 0.875rem;

        color: ${(props) =>
            props.selected
                ? props.theme.colors.textHeadings
                : transparentize(0.3, props.theme.colors.textMain)};
        background: ${(props) => (props.selected ? props.theme.colors.bg2 : 'transparent')};
        padding-left: 10px;

        > :last-child {
            display: none;
        }
    }
`
const SettingsCategoryLink = styled.a`
    padding: 13px 20px 13px 0;
    text-align: left;
    display: flex;
    font-size: 1rem;

    justify-content: space-between;
    @media (min-width: ${mobileBreakpoint}) {
        font-size: 0.875rem;

        color: ${(props) => transparentize(0.3, props.theme.colors.textMain)};
        background: transparent;
        padding-left: 10px;

        > :last-child {
            display: none;
        }
    }
`

const ChangeLogCategory = styled(SettingsCategory)`
    @media (min-width: ${mobileBreakpoint}) {
        > :last-child {
            display: block;
        }
    }
`

const SettingsCategories = styled.div`
    padding: 10px 0 10px 20px;
    display: flex;
    flex-direction: column;
`

const Logout = styled.div`
    font-weight: bold;
    border-top: 1px solid ${(props) => props.theme.colors.bg2};
    color: ${(props) => props.theme.colors.warning};
    align-items: center;
    padding: 20px 0px 30px 30px;
    text-align: left;
    @media (max-width: ${mobileBreakpoint}) {
        padding-left: 20px;
    }

    > button {
        display: flex;
        align-items: center;
    }
    > button > div {
        background: ${(props) => props.theme.colors.warning};
        margin-right: 10px;
    }
`

const SettingsRightHeader = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-size: 1.125rem;
    font-family: ${(props) => props.theme.fonts.headings};
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
    padding: 30px 20px 20px 20px;
    line-height: 1.2rem;
    height: 64px;

    > button {
        display: flex;
        align-items: center;
        > ${Icon} {
            margin-right: 10px;
            background: ${(props) => props.theme.colors.textHeadings};
        }
    }
`

const SettingsContent = styled.div`
    padding: 20px;
    display: grid;
    grid-template-columns: 100%;
    height: 100%;
    grid-auto-rows: min-content;
    gap: 10px;
    overflow-y: auto;
    ${EditorCard} {
        padding: 0px !important;
    }
`

const SettingsCategoryGroupHeader = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-size: 0.875rem;
`

const SettingsSplit = styled.div`
    display: flex;
    width: 100%;
    display: grid;
    gap: 22px 42px;
    grid-template-columns: 1fr 1fr;
    > div {
        display: grid;
        grid-template-columns: 1fr;
        gap: 22px;
        height: fit-content;
    }
    @media (max-width: ${singleColumnBreakpoint}) {
        grid-template-columns: 1fr;
    }
`

const EarlyAdjustSettingsSplit = styled(SettingsSplit)`
    @media (max-width: 1000px) {
        grid-template-columns: 1fr;
    }
`

const SubBox = styled.div`
    border: 1px solid ${(props) => props.theme.colors.bg3};
    border-bottom: 0px;
    background-color: ${(props) => props.theme.colors.bg1};
    display: flex;
    max-width: 491px;
    padding: 13px 20px;
    justify-content: space-between;
    font-size: 0.875rem;
    &:last-child {
        border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
        margin-bottom: 40px;
    }
`
const FadedSubBox = styled(SubBox)`
    background-color: ${(props) => props.theme.colors.bg2};
`

const FadedText = styled.span`
    opacity: 0.7;
`
const SpacedText = styled.span`
    padding: 0.5rem 0;
`

const TierText = styled.span`
    font-size: 1.125rem;
    font-family: ${(props) => props.theme.fonts.headings};
`

const SettingLabel = styled.span`
    font-size: 1rem;
    font-family: ${(props) => props.theme.fonts.headings};
`

const SettingDescription = styled.p`
    font-size: 0.875rem;
    opacity: 0.7;
    margin: 0;
`

const TierDisplay = styled.div`
    display: flex;
    flex-direction: column;
`

const ManageButton = styled(SubtleButton)`
    text-align: center;
    padding: 10px 20px;
    color: ${(props) => props.theme.colors.textHeadings};
    background: ${(props) => props.theme.colors.bg3};
    line-height: 1.35rem;
    flex: 0 0 auto;
    min-width: 100px;
    border: 1px solid transparent;
    &:hover {
        background: ${(props) => mix(0.5, props.theme.colors.bg3, props.theme.colors.bg2)};
    }
`

const ToggleButtons = styled.div`
    display: flex;
    background: ${(props) => props.theme.colors.bg0};
    width: fit-content;
    margin: 10px 0;
    > button {
        width: 189px;
        height: 44px;
        border: 2px solid ${(props) => props.theme.colors.bg0};
        &:first-child {
            border-right: 2px solid ${(props) => props.theme.colors.bg0};
        }
        &:last-child {
            border-left: 2px solid ${(props) => props.theme.colors.bg0};
        }
    }
`

const ToggleButton = styled(SubtleButton)<{ selected: boolean }>`
    background: ${(props) => (props.selected ? props.theme.colors.bg2 : 'transparent')};
    text-align: center;
    color: ${(props) => (props.selected ? props.theme.colors.textHeadings : props.theme.colors.textMain)};
`

const AIModelSection = styled.div`
    border: 1px solid ${(props) => props.theme.colors.bg3};
    background: ${(props) => props.theme.colors.bg1};
    display: flex;
    padding: 20px;
    margin-bottom: 20px;
    > :last-child {
        display: flex;
        flex-direction: column;
        flex: 1 1 0;
    }
`

const ModelImage = styled.img`
    height: 100px;
    width: 100px;
    margin-right: 20px;
`

const ModelDescription = styled.span`
    font-size: 0.875rem;
    margin-top: 15px;
`

const NewUpdatesBubble = styled.div`
    margin-right: 15px;
    color: ${(props) => props.theme.colors.warning};
    transform: rotate(-15deg);
    position: absolute;
    right: 0;
`

export enum SettingsPages {
    Closed = -1,
    AISettings,
    Interface,
    Theme,
    Account,
    TextToSpeech,
    Defaults,
    Hotkeys,
    Debug = 1001,
}

interface ICategory {
    label: string
    mobile: boolean
    debug: boolean
    page: SettingsPages
}
const Categories: Array<ICategory> = [
    {
        label: 'AI Settings',
        mobile: true,
        debug: false,
        page: SettingsPages.AISettings,
    },
    {
        label: 'Interface',
        mobile: true,
        debug: false,
        page: SettingsPages.Interface,
    },
    {
        label: 'Theme',
        mobile: true,
        debug: false,
        page: SettingsPages.Theme,
    },
    {
        label: 'Account',
        mobile: true,
        debug: false,
        page: SettingsPages.Account,
    },
    {
        label: 'Text to Speech',
        mobile: true,
        debug: false,
        page: SettingsPages.TextToSpeech,
    },
    {
        label: 'Defaults',
        mobile: true,
        debug: false,
        page: SettingsPages.Defaults,
    },
    {
        label: 'Hotkeys',
        mobile: false,
        debug: false,
        page: SettingsPages.Hotkeys,
    },
    {
        label: 'Debug',
        mobile: true,
        debug: true,
        page: SettingsPages.Debug,
    },
]

const round = (num: number, digits: number): number => {
    return Math.round(num * 10 ** digits) / 10 ** digits
}

export default function SettingsModal(props: { onClose: () => void }): JSX.Element {
    const [settingsModalOpen, setSettingsModalOpen] = useRecoilState(SettingsModalOpen)
    const setUpdateNotesVisible = useSetRecoilState(UpdateNotesVisible)

    const session = useRecoilValue(Session)

    const logout = useLogout()
    const onLogout = () => {
        flushSavingQueue()
            .then(logout)
            .catch((error) => {
                logError(error, true, "Couldn't save:")
                logout
            })
    }

    let settings
    switch (settingsModalOpen) {
        case SettingsPages.AISettings:
            settings = <SettingsAI />
            break
        case SettingsPages.Interface:
            settings = <SettingsInterface />
            break
        case SettingsPages.Theme:
            settings = <SettingsTheme />
            break
        case SettingsPages.Account:
            settings = <SettingsAccount />
            break
        case SettingsPages.TextToSpeech:
            settings = <SettingsTTS />
            break
        case SettingsPages.Defaults:
            settings = <SettingsDefaults />
            break
        case SettingsPages.Hotkeys:
            settings = <SettingsHotkeys />
            break
        case SettingsPages.Debug:
            settings = <SettingsDebug />
            break
        default:
            settings = <></>
            break
    }

    const updateNotesUnread = useRecoilValue(UpdateNotesUnread)

    const [categoriesVisible, setCategoriesVisible] = useState(true)
    const windowSize = useWindowSizeBreakpoint(mobileBreakpointNum, 0)

    useEffect(() => {
        if (
            windowSize.width > mobileBreakpointNum &&
            (!windowSize.prevWidth || windowSize.prevWidth <= mobileBreakpointNum)
        ) {
            setCategoriesVisible(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowSize.width])

    const debugSettings = useRecoilValue(DebugSettings)

    return (
        <Fragment>
            <CloseButton
                onClick={() => {
                    setCategoriesVisible(true)
                    props.onClose()
                }}
            >
                <div />
            </CloseButton>
            <Sidebar
                left={true}
                open={categoriesVisible}
                setOpen={setCategoriesVisible}
                modalSidebar
                breakpointDesktop={mobileBreakpoint}
                breakpointMobile={mobileBreakpoint}
                overlayPoint={mobileBreakpointNum}
                noDragPoint={mobileBreakpointNum}
            >
                <SettingsLeft className={'settings-sidebar'}>
                    {windowSize.width < mobileBreakpointNum ? (
                        <CloseButton
                            onClick={() => {
                                props.onClose()
                            }}
                        >
                            <div />
                        </CloseButton>
                    ) : (
                        <></>
                    )}

                    <SettingsHeader>
                        <SettingsIcon />
                        <span>User&nbsp;Settings</span>
                    </SettingsHeader>
                    <SettingsCategories style={{ marginBottom: 'auto' }}>
                        {(windowSize.width >= mobileBreakpointNum
                            ? Categories.filter(
                                  (c) => !c.debug || debugSettings || (window as any).debugUI === 1
                              )
                            : Categories.filter(
                                  (c) => !c.debug || debugSettings || (window as any).debugUI === 1
                              ).filter((c) => c.mobile)
                        ).map((c, i) => {
                            const category = (
                                <SettingsCategory
                                    key={i}
                                    selected={settingsModalOpen === c.page}
                                    onClick={() => {
                                        if (windowSize.width < mobileBreakpointNum) {
                                            setCategoriesVisible(false)
                                        }
                                        setSettingsModalOpen(c.page)
                                    }}
                                >
                                    {c.label}
                                    <ArrowRightIcon />
                                </SettingsCategory>
                            )
                            return c.page === SettingsPages.Account ? (
                                <AccountRequired key={i}>{category}</AccountRequired>
                            ) : (
                                category
                            )
                        })}
                    </SettingsCategories>
                    <SettingsCategories>
                        <SettingsCategoryLink href="mailto:support@novelai.net" target="_blank">
                            Support
                        </SettingsCategoryLink>
                        <ChangeLogCategory
                            onClick={() => {
                                props.onClose()
                                setUpdateNotesVisible(true)
                            }}
                            selected={false}
                        >
                            <span style={{ position: 'relative' }}>
                                Change Log
                                <UpdatePulser style={{ top: '-4px', right: '-27px' }} />
                            </span>
                            {updateNotesUnread ? <NewUpdatesBubble>New!</NewUpdatesBubble> : null}
                        </ChangeLogCategory>
                    </SettingsCategories>
                    <Logout>
                        <SubtleButton onClick={onLogout}>
                            <LogoutIcon />
                            {windowSize.width >= mobileBreakpointNum
                                ? session.noAccount
                                    ? 'End Session'
                                    : 'Logout'
                                : ''}
                        </SubtleButton>
                    </Logout>
                </SettingsLeft>
            </Sidebar>
            <SettingsRight className={'settings-content'}>
                <SettingsRightHeader onClick={() => setCategoriesVisible(true)}>
                    {windowSize.width >= mobileBreakpointNum ? (
                        Categories.find((c) => c.page === settingsModalOpen)?.label ?? '?'
                    ) : (
                        <SubtleButton>
                            <ArrowLeftIcon />
                            {Categories.find((c) => c.page === settingsModalOpen)?.label ?? '?'}
                        </SubtleButton>
                    )}
                </SettingsRightHeader>

                <SettingsContent>{settings}</SettingsContent>
            </SettingsRight>
        </Fragment>
    )
}

export function SettingsDebug(): JSX.Element {
    const [session, setSession] = useRecoilState(Session)
    const [settings, setSettings] = useState(JSON.stringify(session.settings, undefined, 2))
    useEffect(() => {
        setSettings(JSON.stringify(session.settings, undefined, 2))
    }, [session.settings])

    const saveSettings = () => {
        try {
            const newSettings = JSON.parse(settings)
            setSession((session) => ({
                ...session,
                settings: {
                    ...session.settings,
                    ...newSettings,
                },
            }))
            getStorage(session).saveSettings(newSettings)
        } catch (error) {
            toast("Couldn't save settings: " + error)
        }
    }

    const [debugStoryDelete, setDebugStoryDelete] = useState('')
    const [deletingStory, setDeletingStory] = useState(false)
    const setStories = useSetRecoilState(Stories)
    const [selectedStory, setSelectedStory] = useRecoilState(SelectedStory)

    const deleteStory = async () => {
        const storage = getStorage(session)
        setDeletingStory(true)
        const meta = GlobalUserContext.stories.get(debugStoryDelete)
        if (!meta) {
            toast('Story not found in story list')
            return
        }
        storage
            .deleteStory(meta)
            .then(
                () => {
                    setDeletingStory(false)
                    toast('Story deleted')
                    GlobalUserContext.stories.delete(debugStoryDelete)
                    GlobalUserContext.storyContentCache.delete(debugStoryDelete)
                    setStories((v) => v.filter((s) => s !== debugStoryDelete))
                    if (selectedStory.id === debugStoryDelete) {
                        setSelectedStory((v) => ({ ...v, id: '', loaded: false }))
                    }
                },
                () => {
                    setDeletingStory(false)
                    toast('Story deletion failed')
                }
            )
            .catch((error: any) => {
                setDeletingStory(false)
                toast('Story deletion failed: ' + (error.message ?? error))
            })
    }

    return (
        <>
            <SettingsSplit>
                <div>
                    <div>
                        <FadedText>Debug Story Deletion</FadedText>
                        <input
                            placeholder='Enter a story id and click "Delete". Cannot be undone.'
                            type="text"
                            value={debugStoryDelete}
                            onChange={(e) => setDebugStoryDelete(e.target.value)}
                        />
                        <WarningButton
                            onConfirm={async () => {
                                return await deleteStory()
                            }}
                            buttonType={WarningButtonStyle.Light}
                            warningColors
                            buttonText={'Delete'}
                            confirmButtonText="Delete it!"
                            label="Delete Story?"
                            disabled={deletingStory || debugStoryDelete.length === 0}
                            warningText={
                                <>
                                    Are you sure you want to delete {'"'}
                                    {GlobalUserContext.stories.get(debugStoryDelete)?.title}
                                    {'"'}?
                                    <br />
                                    This cannot be reversed.
                                </>
                            }
                        />
                    </div>
                </div>
            </SettingsSplit>

            <FlexColSpacer min={20} max={20} />
            <ButtonBox>
                <LightColorButton aria-label="Save settings" onClick={saveSettings}>
                    Apply & Save
                </LightColorButton>
            </ButtonBox>
            <CssEditor
                onChange={(e) => setSettings(e.target.value)}
                minRows={5}
                maxRows={24}
                value={settings}
            />
        </>
    )
}

export function SettingsAI(): JSX.Element {
    const [session, setSession] = useRecoilState(Session)

    const [streamResponses, setStreamResponses] = useState(
        getUserSetting(session.settings, 'streamResponses')
    )
    const changeStreamResponses = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, streamResponses: state } })
        setStreamResponses(state)
    }

    const [delay, setDelay] = useState(getUserSetting(session.settings, 'streamDelay'))
    const changeDelay = (scale: number) => {
        setSession({ ...session, settings: { ...session.settings, streamDelay: scale } })
        setDelay(scale)
    }

    const [continueToEndOfSentence, setContinueToEndOfSentence] = useState(
        getUserSetting(session.settings, 'continueGenerationToSentenceEnd')
    )
    const changeContinueToEndOfSentence = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, continueGenerationToSentenceEnd: state } })
        setContinueToEndOfSentence(state)
    }

    const [trimTrailingSpaces, setTrimTrailingSpaces] = useState(
        getUserSetting(session.settings, 'trimTrailingSpaces')
    )
    const changeTrailingSpaces = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, trimTrailingSpaces: state } })
        setTrimTrailingSpaces(state)
    }

    const [prependPreamble, setPrependPreamble] = useState(
        getUserSetting(session.settings, 'prependPreamble')
    )
    const changePrependPreamble = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, prependPreamble: state } })
        setPrependPreamble(state)
    }

    const [force1024Tokens, setForce1024Tokens] = useState(
        getUserSetting(session.settings, 'force1024Tokens')
    )
    const changeForce1024Tokens = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, force1024Tokens: state } })
        setForce1024Tokens(state)
    }

    const [defaultBias, setDefaultBias] = useState(getUserSetting(session.settings, 'defaultBias'))
    const changeDefaultBias = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, defaultBias: state } })
        setDefaultBias(state)
    }

    const [enableLogprobs, setEnableLogprobs] = useState(getUserSetting(session.settings, 'enableLogprobs'))
    const changeEnableLogprobs = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, enableLogprobs: state } })
        setEnableLogprobs(state)
    }

    const [placebo, setPlacebo] = useState(getUserSetting(session.settings, 'april2022'))
    const changePlacebo = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, april2022: state } })
        setPlacebo(state)
    }

    const [commentEnabled, setCommentEnabled] = useState(getUserSetting(session.settings, 'commentEnabled'))
    const changeCommentEnabled = (state: number) => {
        setSession({ ...session, settings: { ...session.settings, commentEnabled: state } })
        setCommentEnabled(state)
    }

    const [commentChance, setCommentChance] = useState(
        round(getUserSetting(session.settings, 'commentChance') * 100, 0)
    )
    const changeCommentChance = (state: number) => {
        setSession({ ...session, settings: { ...session.settings, commentChance: round(state / 100, 2) } })
        setCommentChance(state)
    }

    const [commentAvatar, setCommentAvatar] = useState(getUserSetting(session.settings, 'commentAvatar'))
    const changeCommentAvatar = (state: number) => {
        setSession({ ...session, settings: { ...session.settings, commentAvatar: state } })
        setCommentAvatar(state)
    }

    const [commentStreamDelay, setCommentStreamDelay] = useState(
        getUserSetting(session.settings, 'commentStreamDelay')
    )
    const changeCommentStreamDelay = (scale: number) => {
        setSession({ ...session, settings: { ...session.settings, commentStreamDelay: scale } })
        setCommentStreamDelay(scale)
    }

    const selectedAvatar = CommentAvatars[commentAvatar as Avatars] ?? Object.values(CommentAvatars)[0]

    const siteTheme = useRecoilValue(SiteTheme)

    const [bidirectionalInline, setBidirectionalInline] = useState(
        getUserSetting(session.settings, 'bidirectionalInline')
    )
    const changeBidirectionalInline = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, bidirectionalInline: state } })
        setBidirectionalInline(state)
    }

    const [commentAutoClear, setCommentAutoClear] = useState(
        getUserSetting(session.settings, 'commentAutoClear')
    )
    const changeCommentAutoClear = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, commentAutoClear: state } })
        setCommentAutoClear(state)
    }

    return (
        <>
            <SettingsCategoryGroupHeader>AI Responses</SettingsCategoryGroupHeader>
            <SettingsSplit>
                <div>
                    <Checkbox
                        label="Stream AI Responses"
                        value={streamResponses ?? true}
                        setValue={changeStreamResponses}
                        checkedText={`AI responses will be streamed, appearing token by token.`}
                        uncheckedText={'Text will appear all at once when generation has finished'}
                    />
                    {(streamResponses ?? true) && (
                        <MainSettingSliderCard
                            title="Streamed Response Delay"
                            hint={'Default: ' + UserSettingsDefaults.streamDelay}
                            onHintClick={() => changeDelay(UserSettingsDefaults.streamDelay as number)}
                            value={delay}
                            min={0}
                            max={20}
                            step={1}
                            onChange={changeDelay}
                            style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                        />
                    )}
                </div>
                <div>
                    <Checkbox
                        label="Continue Response to End of Sentence"
                        value={continueToEndOfSentence ?? true}
                        setValue={changeContinueToEndOfSentence}
                        checkedText={
                            'Responses will attempt to continue until the end of a sentence is found.'
                        }
                        uncheckedText={`Responses will end normally.`}
                    />
                </div>
            </SettingsSplit>
            <FlexColSpacer min={10} max={10} />
            <SettingsCategoryGroupHeader>HypeBot</SettingsCategoryGroupHeader>
            <SettingsSplit>
                <div>
                    <div>
                        <SettingLabel>Comment Output</SettingLabel>
                        <ToggleButtons>
                            <ToggleButton
                                style={{ width: '100px' }}
                                selected={commentEnabled === 0}
                                onClick={() => changeCommentEnabled(0)}
                                aria-label="Set comment generation off"
                            >
                                Off
                            </ToggleButton>
                            <ToggleButton
                                style={{ width: '100px' }}
                                selected={commentEnabled === 1}
                                onClick={() => changeCommentEnabled(1)}
                                aria-label="Set comment generation on"
                            >
                                Automatic
                            </ToggleButton>
                            <ToggleButton
                                style={{ width: '100px' }}
                                selected={commentEnabled === 2}
                                onClick={() => changeCommentEnabled(2)}
                                aria-label="Set comment generation on and always show dialog"
                            >
                                Permanent
                            </ToggleButton>
                        </ToggleButtons>
                        {commentEnabled === 2 && (
                            <Checkbox
                                label="Clear Comments"
                                value={commentAutoClear}
                                setValue={changeCommentAutoClear}
                                checkedText={'Automatically clear comments on generating story text.'}
                                uncheckedText={"Don't automatically clear comments on generating story text."}
                            />
                        )}

                        {commentEnabled !== 0 && (
                            <MainSettingSliderCard
                                title="Comment Chance"
                                hint={
                                    'Default: ' + (UserSettingsDefaults.commentChance as number) * 100 + '%'
                                }
                                onHintClick={() =>
                                    changeCommentChance((UserSettingsDefaults.commentChance as number) * 100)
                                }
                                value={commentChance}
                                min={0}
                                max={100}
                                step={1}
                                onChange={changeCommentChance}
                                style={{ marginLeft: 0, marginRight: 0 }}
                                suffix={() => `%`}
                            />
                        )}
                    </div>
                </div>
                <div>
                    <div>
                        {commentEnabled !== 0 && (
                            <Fragment>
                                <SettingLabel>Comment Avatar</SettingLabel>
                                <FlexColSpacer min={10} max={10} />
                                <Select
                                    aria-label="Select a comment avatar"
                                    maxMenuHeight={300}
                                    options={Object.values(CommentAvatars).map((avatar) => ({
                                        value: avatar.id,
                                        description: `${avatar.alt}`,
                                        label: (
                                            <PrefixInnerDiv selected={false}>
                                                <div>
                                                    <LazyLoadImage effect="opacity" src={avatar.img.src} />
                                                </div>
                                                <div>
                                                    <strong>{avatar.alt}</strong>
                                                </div>
                                            </PrefixInnerDiv>
                                        ),
                                    }))}
                                    onChange={(e: any) => {
                                        if (e) changeCommentAvatar(e.value)
                                    }}
                                    value={{
                                        value: selectedAvatar.id,
                                        description: `${selectedAvatar.alt}`,
                                        label: (
                                            <PrefixInnerDiv selected={false}>
                                                <div>
                                                    <LazyLoadImage
                                                        effect="opacity"
                                                        src={selectedAvatar.img.src}
                                                    />
                                                </div>
                                                <div>
                                                    <strong>{selectedAvatar.alt}</strong>
                                                </div>
                                            </PrefixInnerDiv>
                                        ),
                                    }}
                                    styles={getDropdownStyle(siteTheme)}
                                    theme={getDropdownTheme(siteTheme, true)}
                                />
                            </Fragment>
                        )}
                    </div>
                    {commentEnabled !== 0 && (streamResponses ?? true) && (
                        <MainSettingSliderCard
                            title="Comment Streamed Response Delay"
                            hint={'Default: ' + UserSettingsDefaults.commentStreamDelay}
                            onHintClick={() =>
                                changeCommentStreamDelay(UserSettingsDefaults.commentStreamDelay as number)
                            }
                            value={commentStreamDelay}
                            min={0}
                            max={5}
                            step={1}
                            onChange={changeCommentStreamDelay}
                            style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                        />
                    )}
                </div>
            </SettingsSplit>
            <FlexColSpacer min={10} max={10} />
            <SettingsCategoryGroupHeader>Experimental</SettingsCategoryGroupHeader>
            <SettingsSplit>
                <Checkbox
                    label="Preamble"
                    value={prependPreamble ?? true}
                    setValue={changePrependPreamble}
                    checkedText={
                        <div>
                            {'The context will have a small preamble prepended.'}
                            <br />
                            <div style={{ marginTop: '5px' }}>
                                <em>
                                    {`The preamble is an asterism (⁂) which tells the AI it's the start of a story. `}
                                    <br />
                                    {`Automatically removed when the story reaches a certain size.`}
                                </em>
                            </div>
                        </div>
                    }
                    uncheckedText={
                        <div>
                            {`The context is not prepended with a preamble.`}
                            <br />
                            <div style={{ marginTop: '5px' }}>
                                <em>
                                    {`The preamble is an asterism (⁂) which tells the AI it's the start of a story. `}
                                    <br />
                                    {`Automatically removed when the story reaches a certain size.`}
                                </em>
                            </div>
                        </div>
                    }
                />
                <Checkbox
                    label="Trim Excess Whitespace"
                    value={trimTrailingSpaces ?? true}
                    setValue={changeTrailingSpaces}
                    checkedText={
                        <div>
                            {`Excess whitespace will be trimmed from context before it is sent to the AI.`}
                            <br />
                            <div style={{ marginTop: '5px' }}>
                                <em>{`Excess whitespace includes trailing spaces and repeated newline characters.`}</em>
                            </div>
                        </div>
                    }
                    uncheckedText={
                        <div>
                            {`Excess whitespace will not be trimmed from context before it is sent to the AI.\
                                     Excess whitespace can significantly degrade output quality.`}
                            <br />
                            <div style={{ marginTop: '5px' }}>
                                <em>{`Excess whitespace includes trailing spaces and repeated newline characters.`}</em>
                            </div>
                        </div>
                    }
                />
                <Checkbox
                    label="Force 1024 token limit"
                    value={force1024Tokens ?? false}
                    setValue={changeForce1024Tokens}
                    checkedText={
                        'The maximum token context limit will be 1024 regardless of subscription tier.'
                    }
                    uncheckedText={`The maximum token context limit will be
                            based on your subscription tier (1024 for Tablet, 2048 for Scroll and Opus.)`}
                />
                <Checkbox
                    label="Default Bias"
                    value={defaultBias ?? false}
                    setValue={changeDefaultBias}
                    checkedText={`A default bias will be applied, reducing the likelyhood of
                        dinkus (***) and asterism (⁂) to be generated.`}
                    uncheckedText={`No default bias will be applied, not reducing the likelyhood of
                        dinkus (***) and asterism (⁂) to be generated.`}
                />
                <Checkbox
                    label="Enable Token Probabilities"
                    value={enableLogprobs ?? false}
                    setValue={changeEnableLogprobs}
                    checkedText={
                        <div>
                            <span>
                                Generation requests will return token probabilities for the response which can
                                be examined by clicking the
                            </span>
                            <MindIcon
                                style={{
                                    display: 'inline-block',
                                    height: '1rem',
                                    marginBottom: '-0.2rem',
                                    width: '1.5rem',
                                }}
                            />
                            <span>button next to Retry.</span>
                        </div>
                    }
                    uncheckedText={`Token probabilities will not be returned with generation requests.`}
                />
                <Checkbox
                    label="Bidirectional Inline Generation"
                    value={bidirectionalInline ?? true}
                    setValue={changeBidirectionalInline}
                    checkedText={`Inline generation will use a special model for generating
                                text between two points.`}
                    uncheckedText={`Inline generation will use the story model.`}
                />

                {isNonsenseAllowed() && (
                    <Checkbox
                        label="Placebo"
                        value={placebo ?? false}
                        setValue={changePlacebo}
                        uncheckedText={`It does nothing.`}
                        checkedText={`It does nothing... right?`}
                    />
                )}
            </SettingsSplit>
        </>
    )
}

export function SettingsInterface(): JSX.Element {
    const [session, setSession] = useRecoilState(Session)

    const [fontScale, setFontScale] = useState(getUserSetting(session.settings, 'fontScale'))
    const changeFontScale = (scale: number) => {
        setSession({ ...session, settings: { ...session.settings, fontScale: scale } })
        setFontScale(scale)
    }

    const [lineSpacing, setLineSpacing] = useState(getUserSetting(session.settings, 'lineSpacing'))
    const changeLineSpacing = (spacing: number) => {
        setSession({ ...session, settings: { ...session.settings, lineSpacing: spacing } })
        setLineSpacing(spacing)
    }

    const [paragraphSpacing, setParagraphSpacing] = useState(
        getUserSetting(session.settings, 'paragraphSpacing')
    )
    const changeParagraphSpacing = (spacing: number) => {
        setSession({ ...session, settings: { ...session.settings, paragraphSpacing: spacing } })
        setParagraphSpacing(spacing)
    }

    const [outputScale, setOutputScale] = useState(getUserSetting(session.settings, 'outputFontScale'))
    const changeOutputScale = (scale: number) => {
        setSession({ ...session, settings: { ...session.settings, outputFontScale: scale } })
        setOutputScale(scale)
    }

    const [paragraphIndent, setParagraphIndent] = useState(
        getUserSetting(session.settings, 'paragraphIndent')
    )
    const changeParagraphIndent = (paragraphIndent: number) => {
        setSession({ ...session, settings: { ...session.settings, paragraphIndent: paragraphIndent } })
        setParagraphIndent(paragraphIndent)
    }

    const [buttonScale, setButtonScale] = useState(getUserSetting(session.settings, 'buttonScale'))
    const changeButtonScale = (scale: number) => {
        setSession({ ...session, settings: { ...session.settings, buttonScale: scale } })
        setButtonScale(scale)
    }

    const [gestureControls, setGestureControls] = useState(getUserSetting(session.settings, 'gestureControl'))
    const changeGestureControls = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, gestureControl: state } })
        setGestureControls(state)
    }

    const [swapContextMenu, setSwapContextMenu] = useState(
        getUserSetting(session.settings, 'contextMenuSwap')
    )
    const changeSwapContextMenu = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, contextMenuSwap: state } })
        setSwapContextMenu(state)
    }

    const [showInputBox, setShowInputBox] = useState(getUserSetting(session.settings, 'showInputBox'))
    const changeShowInputBox = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, showInputBox: state } })
        setShowInputBox(state)
    }

    const [editorHighlighting, setEditorHighlighting] = useState(
        getUserSetting(session.settings, 'editorHighlighting')
    )
    const changeEditorHighlighting = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, editorHighlighting: state } })
        setEditorHighlighting(state)
    }

    const [outputSpellcheck, setOutputSpellcheck] = useState(
        getUserSetting(session.settings, 'editorSpellcheck')
    )
    const changeOutputSpellcheck = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, editorSpellcheck: state } })
        setOutputSpellcheck(state)
    }

    const [contextViewerColors, setContextViewerColors] = useState(
        getUserSetting(session.settings, 'contextViewerColors')
    )
    const changeContextViewerColors = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, contextViewerColors: state } })
        setContextViewerColors(state)
    }

    const [editorLoreKeys, setEditorLoreKeys] = useState(getUserSetting(session.settings, 'editorLoreKeys'))
    const changeEditorLoreKeys = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, editorLoreKeys: state } })
        setEditorLoreKeys(state)
    }

    const [showStoryTitle, setShowStoryTitle] = useState(getUserSetting(session.settings, 'showStoryTitle'))
    const changeShowStoryTitle = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, showStoryTitle: state } })
        setShowStoryTitle(state)
    }

    const [showTips, setShowTips] = useState(getUserSetting(session.settings, 'showTips'))
    const [tipsDisabled, setTipsDisabled] = useState(() => getSessionStorage('tipsDisabled') === 'true')
    const changeShowTips = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, showTips: state } })
        setShowTips(state)
        removeSessionStorage('tipsDisabled')
        setTipsDisabled(false)
    }

    const [useEditorV2, setUseEditorV2] = useState(getUserSetting(session.settings, 'useEditorV2') ?? false)
    const changeUseEditorV2 = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, useEditorV2: state } })
        setUseEditorV2(state)
    }

    return (
        <>
            <SettingsCategoryGroupHeader>Text Settings</SettingsCategoryGroupHeader>
            <SettingsSplit>
                <TextSliders>
                    <MainSettingSliderCard
                        style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                        title="Interface Font Size"
                        hint={'Default: ' + UserSettingsDefaults.fontScale + 'px'}
                        onHintClick={() => changeFontScale(UserSettingsDefaults.fontScale as number)}
                        value={fontScale}
                        min={10}
                        max={30}
                        step={0.25}
                        onChange={changeFontScale}
                        suffix={() => 'px'}
                    />
                    <MainSettingSliderCard
                        style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                        title="Line Spacing"
                        hint={'Default: ' + UserSettingsDefaults.lineSpacing + 'em'}
                        onHintClick={() => changeLineSpacing(UserSettingsDefaults.lineSpacing as number)}
                        value={lineSpacing}
                        min={1}
                        max={3}
                        step={0.01}
                        onChange={changeLineSpacing}
                        suffix={() => 'em'}
                    />
                    <MainSettingSliderCard
                        style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                        title="Paragraph Spacing"
                        hint={'Default: ' + UserSettingsDefaults.paragraphSpacing + 'em'}
                        onHintClick={() =>
                            changeParagraphSpacing(UserSettingsDefaults.paragraphSpacing as number)
                        }
                        value={paragraphSpacing}
                        min={0}
                        max={3}
                        step={0.01}
                        onChange={changeParagraphSpacing}
                        suffix={() => 'em'}
                    />
                </TextSliders>
                <TextSliders>
                    <MainSettingSliderCard
                        style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                        title="Output Font Size"
                        hint={'Default: ' + UserSettingsDefaults.outputFontScale + 'px'}
                        onHintClick={() => changeOutputScale(UserSettingsDefaults.outputFontScale as number)}
                        value={outputScale}
                        min={10}
                        max={30}
                        step={0.25}
                        onChange={changeOutputScale}
                        suffix={() => 'px'}
                    />

                    <MainSettingSliderCard
                        style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                        title="Paragraph Indent"
                        hint={'Default: ' + UserSettingsDefaults.paragraphIndent + 'px'}
                        onHintClick={() =>
                            changeParagraphIndent(UserSettingsDefaults.paragraphIndent as number)
                        }
                        value={paragraphIndent}
                        min={0}
                        max={100}
                        step={1}
                        onChange={changeParagraphIndent}
                        suffix={() => 'px'}
                    />
                    <MainSettingSliderCard
                        style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                        title="Button Scale"
                        hint={'Default: ' + UserSettingsDefaults.buttonScale}
                        onHintClick={() => changeButtonScale(UserSettingsDefaults.buttonScale as number)}
                        value={buttonScale}
                        min={0.5}
                        max={2}
                        step={0.01}
                        onChange={changeButtonScale}
                    />
                </TextSliders>
            </SettingsSplit>
            <FlexColSpacer min={10} max={10} />
            <SettingsCategoryGroupHeader>Interaction Settings</SettingsCategoryGroupHeader>
            <SettingsSplit>
                <div>
                    <Checkbox
                        label="Gesture Controls"
                        value={gestureControls ?? true}
                        setValue={changeGestureControls}
                        checkedText={'Swiping on touch devices will open and close the sidebars.'}
                        uncheckedText={`Gesture controls are disabled.`}
                    />
                </div>
                <div>
                    <Checkbox
                        label="Swap Context Menu Controls"
                        value={swapContextMenu ?? false}
                        setValue={changeSwapContextMenu}
                        checkedText={
                            'Right click will open the standard context menu. Ctrl+right click will open the NAI context menu.'
                        }
                        uncheckedText={
                            'Right click will open the NAI context menu. Ctrl+right click will open the standard context menu.'
                        }
                    />
                </div>
            </SettingsSplit>
            <FlexColSpacer min={10} max={10} />
            <SettingsCategoryGroupHeader>Other Settings</SettingsCategoryGroupHeader>
            <SettingsSplit>
                <div>
                    <Checkbox
                        label="Input Box"
                        value={showInputBox ?? true}
                        setValue={changeShowInputBox}
                        checkedText={'The input box is visible'}
                        uncheckedText={'The input box is hidden'}
                    />
                    <Checkbox
                        label="Output Spellcheck"
                        disabled={!isSpellCheckSupported}
                        value={outputSpellcheck ?? true}
                        setValue={changeOutputSpellcheck}
                        checkedText={
                            <span>
                                Spellcheck is enabled in the editor (on supported browsers)
                                {!isSpellCheckSupported ? (
                                    <WarningText>
                                        Your browser version has known performance issues with spellcheck.
                                        Spellcheck has been automatically disabled.
                                    </WarningText>
                                ) : (
                                    <></>
                                )}
                            </span>
                        }
                        uncheckedText={
                            <span>
                                Spellcheck is disabled in the editor
                                {!isSpellCheckSupported ? (
                                    <WarningText>
                                        Your browser version has known performance issues with spellcheck.
                                        Spellcheck has been automatically disabled.
                                    </WarningText>
                                ) : (
                                    <></>
                                )}
                            </span>
                        }
                    />
                    <Checkbox
                        label="Editor Lorebook Keys"
                        value={editorLoreKeys ?? false}
                        setValue={changeEditorLoreKeys}
                        checkedText={`Keys of currently active Lorebook entries will be bolded
                                in the editor. Disabling this setting may improve performance
                                on very large stories or stories with large Lorebooks.`}
                        uncheckedText={'No special styling will be applied to Lorebook keys in the editor.'}
                    />

                    <Checkbox
                        label="Show Tips"
                        value={showTips ?? true}
                        setValue={changeShowTips}
                        checkedText={
                            <div>
                                {`Tips will be shown below the editor.`}
                                {tipsDisabled && (
                                    <Fragment>
                                        <br />
                                        <div style={{ marginTop: '5px' }}>
                                            <em>{`Tips are temporarily disabled for this session.`}</em>
                                        </div>
                                    </Fragment>
                                )}
                            </div>
                        }
                        uncheckedText={'Tips will not be shown.'}
                    />
                </div>
                <div>
                    <Checkbox
                        label="Editor Highlighting"
                        value={editorHighlighting ?? true}
                        setValue={changeEditorHighlighting}
                        checkedText={'Text in the editor will be highlighted based on origin'}
                        uncheckedText={'Text in the editor will not be highlighted'}
                    />
                    <Checkbox
                        label="Context Viewer Colors"
                        value={contextViewerColors ?? true}
                        setValue={changeContextViewerColors}
                        checkedText={'Text in the context viewer will be color coded based on origin'}
                        uncheckedText={'Text in the context viewer will use the default color'}
                    />
                    <Checkbox
                        label="Show Story Title"
                        value={showStoryTitle ?? true}
                        setValue={changeShowStoryTitle}
                        checkedText={'The story title will be shown above the editor'}
                        uncheckedText={'The story title will not be shown above the editor'}
                    />
                </div>
            </SettingsSplit>
            <FlexColSpacer min={10} max={10} />
            <SettingsCategoryGroupHeader>Experimental</SettingsCategoryGroupHeader>
            <SettingsSplit>
                <Checkbox
                    label="Use Editor V2 for New Stories"
                    value={useEditorV2}
                    setValue={changeUseEditorV2}
                    checkedText={
                        <div>
                            {'New stories will use the new document editor.'}
                            <br />
                            <div style={{ marginTop: '5px' }}>
                                <em>
                                    {`The new document editor supports dynamic loading of sections for increased performance,\
                                    text formatting, a mobile context menu and additional features.`}
                                    <br />
                                    {`Stories will continue using the editor they were created with.`}
                                    <br />
                                    <br />
                                    {`Note that Editor V2 is currently experimental and not all functionality might be available\
                                    yet or work correctly. Make sure to backup your stories regularly.`}
                                </em>
                                <br />
                                <br />
                                <div>Currently unavailable functionality includes:</div>
                                <ul
                                    style={{
                                        paddingLeft: 20,
                                        margin: 0,
                                    }}
                                >
                                    <li>Adventure Mode UI</li>
                                    <li>Support of the Screenshot Editor</li>
                                    <li>Story Stats</li>
                                    <li>A method to search through the whole story</li>
                                    <li>Clickable Lorebook Keys</li>
                                    <li>Importing stories and scenarios via copy-paste</li>
                                </ul>
                            </div>
                        </div>
                    }
                    uncheckedText={
                        <div>
                            {`New stories will use the old story editor.`}
                            <br />
                            <div style={{ marginTop: '5px' }}>
                                <em>
                                    {`The new document editor supports dynamic loading of sections for increased performance,\
                                    text formatting, a mobile context menu and additional features.`}
                                    <br />
                                    {`Stories will continue using the editor they were created with.`}
                                    <br />
                                    <br />
                                    {`Note that Editor V2 is currently experimental and not all functionality might be available\
                                    yet or work correctly. Make sure to backup your stories regularly.`}
                                </em>
                                <br />
                                <br />
                                <div>Currently unavailable functionality includes:</div>
                                <ul
                                    style={{
                                        paddingLeft: 20,
                                        margin: 0,
                                    }}
                                >
                                    <li>Adventure Mode UI</li>
                                    <li>Support of the Screenshot Editor</li>
                                    <li>Story Stats</li>
                                    <li>A method to search through the whole story</li>
                                    <li>Clickable Lorebook Keys</li>
                                    <li>Importing stories and scenarios via copy-paste</li>
                                </ul>
                            </div>
                        </div>
                    }
                />
            </SettingsSplit>
        </>
    )
}

export function SettingsTheme(): JSX.Element {
    const [themePreview, setThemePreview] = useRecoilState(ThemePreviewState)
    const setCurrentTheme = useSetRecoilState(SiteTheme)
    const [session, setSession] = useRecoilState(Session)

    const updateTheme = () => {
        setCurrentTheme(themePreview)
        setSession({
            ...session,
            settings: { ...session.settings, siteTheme: themePreview },
        })
    }
    const exportTheme = () => {
        downloadTextFile(
            JSON.stringify(themePreview, undefined, '  '),
            `${themePreview.name.slice(0, 40)} (${new Date().toISOString()}).naitheme`
        )
    }
    const importTheme = async (file: FileInfo): Promise<boolean> => {
        const value = JSON.parse(file.text)
        if (!hasSameKeys(Dark, value, Dark)) {
            toast('Invalid Theme File')
            logError('Invalid theme', false)
            return false
        }
        toast('Theme imported to theme editor')
        setThemePreview(value)
        return true
    }

    const parentRef = useRef<null | HTMLDivElement>(null)
    const importClickRef = useRef<null | (() => boolean)>(null)
    return (
        <div style={{ position: 'relative' }} ref={parentRef}>
            <FileImporter
                overlay={FileImporterOverlayType.Absolute}
                overlayParentRef={parentRef}
                button={FileImporterButtonType.None}
                buttonClickRef={importClickRef}
                allowedFileTypes={[ImportDataType.naiTheme]}
                onImportFile={importTheme}
            />
            <ButtonBox>
                <LightColorButton aria-label="Save theme changes" onClick={updateTheme}>
                    Apply & Save Theme
                </LightColorButton>
                <LightColorButton
                    aria-label="Import Theme file"
                    onClick={() => importClickRef.current && importClickRef.current()}
                >
                    Import
                </LightColorButton>
                <LightColorButton aria-label="Export theme file" onClick={exportTheme}>
                    Export
                </LightColorButton>
            </ButtonBox>
            <SettingsCategoryGroupHeader>Default Themes</SettingsCategoryGroupHeader>
            <ThemePreviewList />
            <SettingsCategoryGroupHeader>Theme Editor</SettingsCategoryGroupHeader>
            <ThemeEditor />
        </div>
    )
}

export function SettingsAccount(): JSX.Element {
    const [session, setSession] = useRecoilState(Session)
    const setSettingsModalOpen = useSetRecoilState(SettingsModalOpen)
    const setSubscriptionVisible = useSetRecoilState(SubscriptionDialogOpen)

    const [remoteDefault, setRemoteDefault] = useState(getUserSetting(session.settings, 'remoteDefault'))
    const changeRemoteDefault = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, remoteDefault: state } })
        setRemoteDefault(state)
    }

    const [alwaysOverwriteConflicts, setAlwaysOverwriteConflicts] = useState(
        getUserSetting(session.settings, 'alwaysOverwriteConflicts')
    )
    const changeAlwaysOverwriteConflicts = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, alwaysOverwriteConflicts: state } })
        setAlwaysOverwriteConflicts(state)
    }

    const [downloadAllInProgress, setDownloadAllInProgress] = useState(false)
    const downloadAllStoriesJson = useRecoilCallback(({ snapshot }) => async () => {
        const stories = await snapshot.getPromise(Stories)
        setDownloadAllInProgress(true)
        try {
            if (stories.length <= 0) {
                return
            }
            const storyContainers = await getStorage(session).getStoryContents()
            const zip = new JSZip()
            for (const [i, storyContainer] of storyContainers.entries()) {
                zip.file(
                    `${i}. ${`${storyContainer.metadata.title}`
                        .replace(/["%*/:<>?\\|]/g, '_')
                        .slice(0, 40)}.story`,
                    storyContainer.serialize(true),
                    { createFolders: false }
                )
                zip.file(
                    `${i}. ${`${storyContainer.metadata.title}`
                        .replace(/["%*/:<>?\\|]/g, '_')
                        .slice(0, 40)}.txt`,
                    storyContainer.content.getStoryText(),
                    { createFolders: true }
                )
            }
            const date = new Date().toISOString()
            const content = await zip.generateAsync({
                type: 'blob',
                comment: `NovelAI All Stories - ${
                    getUserSetting(session.settings, 'penName') || 'Author'
                } - ${date}`,
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 9,
                },
            })
            saveAs(content, `All Stories(${date}).zip`)
            setDownloadAllInProgress(false)
        } catch (error: any) {
            toast('Downloading all failed: ' + (error.message ?? error))
            logError(error, true, 'Downloading all failed:')
            setDownloadAllInProgress(false)
        }
    })

    let dateText
    if (
        session.subscription.paymentProcessorData?.s === 'active' ||
        session.subscription.paymentProcessorData?.s === 'high_risk'
    ) {
        dateText = session.subscription.active ? (
            <>
                <FadedText> Your subscription renews around </FadedText>
                <span style={{ fontWeight: 'bold' }}>
                    {session.subscription?.expiresAt
                        ? dayjs
                              .unix(session.subscription?.paymentProcessorData.n ?? 0)
                              .format('YYYY/MM/DD @ hh:mma')
                        : 'unknown'}
                </span>
                <FadedText>.</FadedText>
            </>
        ) : (
            <FadedText> Your subscription is active.</FadedText>
        )
    } else {
        dateText = session.subscription.active ? (
            <>
                <FadedText> Your subscription ends on </FadedText>
                <span style={{ fontWeight: 'bold' }}>
                    {session.subscription?.expiresAt
                        ? dayjs.unix(session.subscription?.expiresAt ?? 0).format('YYYY/MM/DD @ hh:mma')
                        : 'unknown'}
                </span>
                <FadedText> and does not renew.</FadedText>
            </>
        ) : (
            <>
                <FadedText> Your subscription expired on </FadedText>
                <span style={{ fontWeight: 'bold' }}>
                    {session.subscription?.expiresAt
                        ? dayjs.unix(session.subscription?.expiresAt ?? 0).format('YYYY/MM/DD @ hh:mma')
                        : 'unknown'}
                </span>
                <FadedText>.</FadedText>
            </>
        )
    }

    const alreadyTriedPurchase =
        getUserSetting(session.settings, 'subscriptionPurchaseAttempt') > Date.now() - 43200000

    const accountId = useMemo(() => {
        try {
            return authTokenToAccountId(session.auth_token)
        } catch (error: any) {
            logError(error, false)
            return ''
        }
    }, [session])
    const [showID, setShowID] = useState(false)
    return (
        <>
            <div>
                <SubBox>
                    <TierDisplay>
                        <FadedText>Current Tier</FadedText>
                        <TierText>
                            {session.subscription.active
                                ? tierNumberToName(session.subscription.tier)
                                : alreadyTriedPurchase
                                ? 'Processing'
                                : 'Unsubscribed'}
                        </TierText>
                    </TierDisplay>
                    <ManageButton
                        aria-label="Manage Subscription"
                        onClick={() => {
                            setSettingsModalOpen(-1)
                            setSubscriptionVisible({ open: true, blocked: false })
                        }}
                    >
                        Manage
                    </ManageButton>
                </SubBox>
                {session.subscription.expiresAt >= 1000000 ? (
                    <SubBox>
                        <div>{dateText}</div>
                    </SubBox>
                ) : (
                    <></>
                )}
                <FadedSubBox>
                    <ChangeDetails />
                </FadedSubBox>
                {accountId && (
                    <SubBox>
                        {showID ? (
                            <FadedText>
                                <span>Account ID</span>
                                <pre>{accountId}</pre>
                            </FadedText>
                        ) : (
                            <LightColorButton onClick={() => setShowID(true)}>
                                Show Account ID
                            </LightColorButton>
                        )}
                    </SubBox>
                )}
            </div>

            <EarlyAdjustSettingsSplit>
                <div>
                    <div style={{ marginBottom: '30px' }}>
                        <RemoteStorageSetting value={remoteDefault} setValue={changeRemoteDefault} />
                    </div>
                    <LightColorButton
                        disabled={downloadAllInProgress}
                        style={{ display: 'flex', justifyContent: 'space-around' }}
                        onClick={downloadAllStoriesJson}
                    >
                        {downloadAllInProgress ? 'Downloading all stories...' : 'Download All Stories'}
                    </LightColorButton>
                </div>
                <div>
                    <Checkbox
                        label="Ignore Remote Story Conflicts"
                        value={alwaysOverwriteConflicts ?? false}
                        setValue={changeAlwaysOverwriteConflicts}
                        checkedText={
                            'Remote storage conflicts will be ignored, local changes always override remote saves.'
                        }
                        uncheckedText={`Remote storage conflicts will be detected.`}
                    />
                </div>
            </EarlyAdjustSettingsSplit>
            <FlexColSpacer min={10} max={10} />
            <GiftKeys />
            <FlexColSpacer min={10} max={10} />
        </>
    )
}

function ChangeDetails() {
    const [session, setSession] = useRecoilState(Session)

    const [changeDetailsDisabled, setChangeDetailsDisabled] = useState(false)
    const [changeDetailsError, setChangeDetailsError] = useState('')
    const [changeDetailsSuccess, setChangeDetailsSuccess] = useState('')
    const [oldEmail, setOldEmail] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [newPassword2, setNewPassword2] = useState('')
    const [penNameInput, setPenNameInput] = useState(session.settings?.penName ?? '')
    const [email, setEmail] = useState('')

    const [state, setState] = useState(0)

    const changeDetails = async () => {
    }

    const changeState = (state: number) => {
        setChangeDetailsError('')
        setChangeDetailsSuccess('')
        setNewEmail('')
        setNewPassword('')
        setNewPassword2('')
        setOldPassword('')
        setPenNameInput(session.settings?.penName ?? '')
        setState(state)
    }

    const changePenName = () => {
        setSession({ ...session, settings: { ...session.settings, penName: penNameInput } })
        changeState(0)
    }

    const sendVerificationEmail = async () => {
        try {
            const request = await fetch(BackendURLResendVerifyEmail, {
                mode: 'cors',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify({
                    email,
                }),
            })
            if (!request.ok) {
                const json = await request.json()

                setChangeDetailsError(json.message || 'Something went wrong!')
            } else {
                changeState(0)

                setChangeDetailsSuccess(
                    'Resent confirmation mail!' +
                        (subscriptionIsActive(session.subscription)
                            ? ''
                            : ` Refresh the page after confirming your email to claim your 50 free actions.`)
                )
            }
        } catch (error: any) {
            setChangeDetailsError(`${error}`)
        }
    }

    const requestDeleteAccount = async () => {
        try {
            const request = await fetch(BackendURLRequestDeleteAccount, {
                mode: 'cors',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + session.auth_token,
                },
                method: 'POST',
                body: JSON.stringify({
                    email,
                }),
            })
            if (!request.ok) {
                const json = await request.json()

                setChangeDetailsError(json.message || 'Something went wrong!')
            } else {
                changeState(0)

                setChangeDetailsSuccess(
                    'Sent account deletion confirmation email!' +
                        (subscriptionIsActive(session.subscription)
                            ? ''
                            : ` Follow the link in your email to confirm the deletion of your account.`)
                )
            }
        } catch (error: any) {
            setChangeDetailsError(`${error}`)
        }
    }

    switch (state) {
        case 1:
            return (
                <FlexCol>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="email">
                                <SpacedText>Old Email</SpacedText>
                            </label>
                            <input
                                id="email"
                                disabled={changeDetailsDisabled}
                                type="email"
                                onChange={(v) => setOldEmail(v.target.value)}
                                value={oldEmail}
                            />
                        </FlexCol>
                    </FlexRow>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="newEmail">
                                <SpacedText>New Email</SpacedText>
                            </label>
                            <input
                                id="newEmail"
                                disabled={changeDetailsDisabled}
                                type="email"
                                onChange={(v) => setNewEmail(v.target.value)}
                                value={newEmail}
                            />
                        </FlexCol>
                    </FlexRow>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="password">
                                <SpacedText>Password</SpacedText>
                            </label>
                            <input
                                id="password"
                                disabled={changeDetailsDisabled}
                                type="password"
                                onChange={(v) => setOldPassword(v.target.value)}
                                value={oldPassword}
                            />
                        </FlexCol>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <InvertedButton
                            style={{ flex: 1, marginRight: '15px' }}
                            disabled={
                                changeDetailsDisabled ||
                                (!newEmail && !newPassword) ||
                                !oldEmail ||
                                !oldPassword
                            }
                            onClick={changeDetails}
                        >
                            Save
                        </InvertedButton>
                        <ManageButton onClick={() => changeState(0)} disabled={changeDetailsDisabled}>
                            Cancel
                        </ManageButton>
                    </FlexRow>
                    <FlexRow>
                        <SpacedText>{changeDetailsError}</SpacedText>
                        <SpacedText>{changeDetailsSuccess}</SpacedText>
                    </FlexRow>
                </FlexCol>
            )
        case 2:
            return (
                <FlexCol>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="email">
                                <SpacedText>Current Email</SpacedText>
                            </label>

                            <input
                                id="email"
                                disabled={changeDetailsDisabled}
                                type="email"
                                onChange={(v) => setOldEmail(v.target.value)}
                                value={oldEmail}
                            />
                        </FlexCol>
                    </FlexRow>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="password">
                                <SpacedText>Current Password</SpacedText>
                            </label>
                            <input
                                id="password"
                                disabled={changeDetailsDisabled}
                                type="password"
                                onChange={(v) => setOldPassword(v.target.value)}
                                value={oldPassword}
                            />
                        </FlexCol>
                    </FlexRow>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="newPassword">
                                <SpacedText>New Password</SpacedText>
                            </label>

                            <input
                                id="newPassword"
                                disabled={changeDetailsDisabled}
                                type="password"
                                onChange={(v) => setNewPassword(v.target.value)}
                                value={newPassword}
                            />
                        </FlexCol>
                    </FlexRow>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="confirmNewPassword">
                                <SpacedText>Confirm New Password</SpacedText>
                            </label>

                            <input
                                id="confirmNewPassword"
                                disabled={changeDetailsDisabled}
                                type="password"
                                onChange={(v) => setNewPassword2(v.target.value)}
                                value={newPassword2}
                            />
                        </FlexCol>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <InvertedButton
                            style={{ flex: 1, marginRight: '15px' }}
                            disabled={
                                changeDetailsDisabled ||
                                (!newEmail && !newPassword) ||
                                !oldEmail ||
                                !oldPassword
                            }
                            onClick={changeDetails}
                        >
                            Save
                        </InvertedButton>
                        <ManageButton onClick={() => changeState(0)} disabled={changeDetailsDisabled}>
                            Cancel
                        </ManageButton>
                    </FlexRow>
                    <FlexRow>
                        <SpacedText>{changeDetailsError}</SpacedText>
                        <SpacedText>{changeDetailsSuccess}</SpacedText>
                    </FlexRow>
                </FlexCol>
            )
        case 3:
            return (
                <FlexCol>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="penName">
                                <SpacedText>Pen Name</SpacedText>
                            </label>

                            <input
                                id="penName"
                                disabled={changeDetailsDisabled}
                                type="text"
                                onChange={(v) => setPenNameInput(v.target.value)}
                                value={penNameInput}
                            />
                        </FlexCol>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <InvertedButton style={{ flex: 1, marginRight: '15px' }} onClick={changePenName}>
                            Save
                        </InvertedButton>
                        <ManageButton onClick={() => changeState(0)} disabled={changeDetailsDisabled}>
                            Cancel
                        </ManageButton>
                    </FlexRow>
                    <FlexRow>
                        <SpacedText>{changeDetailsError}</SpacedText>
                        <SpacedText>{changeDetailsSuccess}</SpacedText>
                    </FlexRow>
                </FlexCol>
            )
        case 4:
            return (
                <FlexCol>
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="email">
                                <SpacedText>Email</SpacedText>
                            </label>

                            <input
                                id="email"
                                disabled={changeDetailsDisabled}
                                type="email"
                                onChange={(v) => setEmail(v.target.value)}
                                value={email}
                            />
                        </FlexCol>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <InvertedButton
                            style={{ flex: 1, marginRight: '15px' }}
                            onClick={sendVerificationEmail}
                        >
                            Send Confirmation Email
                        </InvertedButton>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <ManageButton style={{ flex: 1, marginRight: '15px' }} onClick={() => changeState(0)}>
                            Cancel
                        </ManageButton>
                    </FlexRow>
                    <FlexRow>
                        <SpacedText>{changeDetailsError}</SpacedText>
                        <SpacedText>{changeDetailsSuccess}</SpacedText>
                    </FlexRow>
                </FlexCol>
            )
        case 5:
            return (
                <FlexCol>
                    <FlexRow>
                        Enter your email address below to receive an account deletion confirmation email.
                        <br />
                        <br />
                        Be aware that the deletion of your account results in the permanent loss of your
                        stories and other content! Make sure to export the content you want to keep available
                        beforehand; For example by using the &quot;Export all Stories&quot; option in the
                        Account Settings. Keep in mind that trained AI Modules and some other content are not
                        exportable and will be lost if not saved beforehand.
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <FlexCol>
                            <label htmlFor="email">
                                <SpacedText>Email</SpacedText>
                            </label>

                            <input
                                id="email"
                                disabled={changeDetailsDisabled}
                                type="email"
                                onChange={(v) => setEmail(v.target.value)}
                                value={email}
                            />
                        </FlexCol>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <InvertedButton
                            style={{ flex: 1, marginRight: '15px' }}
                            onClick={requestDeleteAccount}
                        >
                            Send Deletion Confirmation Email
                        </InvertedButton>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <ManageButton style={{ flex: 1, marginRight: '15px' }} onClick={() => changeState(0)}>
                            Cancel
                        </ManageButton>
                    </FlexRow>
                    <FlexRow>
                        <SpacedText>{changeDetailsError}</SpacedText>
                        <SpacedText>{changeDetailsSuccess}</SpacedText>
                    </FlexRow>
                </FlexCol>
            )
        default:
            return (
                <FlexCol>
                    <FlexRow>
                        <FlexCol>
                            <FadedText>Pen Name</FadedText>
                            <div>{session.settings?.penName}</div>
                        </FlexCol>
                        <ManageButton onClick={() => changeState(3)} aria-label="Change Pen Name">
                            Change
                        </ManageButton>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <FlexCol>
                            <FadedText>Email</FadedText>
                            <div>*****</div>
                        </FlexCol>
                        <ManageButton onClick={() => changeState(1)} aria-label="Change Email">
                            Change
                        </ManageButton>
                    </FlexRow>
                    <SpacedText />
                    <FlexRow>
                        <FlexCol>
                            <FadedText>Password</FadedText>
                            <div>*****</div>
                        </FlexCol>
                        <ManageButton onClick={() => changeState(2)} aria-label="Change Password">
                            Change
                        </ManageButton>
                    </FlexRow>
                    {!session.information.emailVerified && (
                        <>
                            <SpacedText />
                            <FlexRow>
                                <FlexCol>
                                    <FadedText>Email Unverified</FadedText>
                                    {!subscriptionIsActive(session.subscription) &&
                                        `Verify your email to gain 50 free actions.`}
                                </FlexCol>
                                <ManageButton onClick={() => changeState(4)} aria-label="Confirm Email">
                                    Confirm
                                </ManageButton>
                            </FlexRow>
                        </>
                    )}
                    <SpacedText />
                    <FlexRow>
                        <FlexCol>
                            <FadedText>Delete Account</FadedText>
                            {session.subscription.active && <div>Not possible while subscribed.</div>}
                        </FlexCol>
                        <ManageButton
                            onClick={() => changeState(5)}
                            aria-label="Request to Delete Account"
                            disabled={session.subscription.active}
                        >
                            Request
                        </ManageButton>
                    </FlexRow>

                    <FlexRow>
                        <SpacedText>{changeDetailsError}</SpacedText>
                        <SpacedText>{changeDetailsSuccess}</SpacedText>
                    </FlexRow>
                </FlexCol>
            )
    }
}

export function SettingsHotkeys(): JSX.Element {
    return (
        <>
            <HotkeyList />
        </>
    )
}

export function SettingsTTS(): JSX.Element {
    const [session, setSession] = useRecoilState(Session)
    const [noMediaSource, setNoMediaSource] = useState(false)
    const [noMP3, setNoMP3] = useState(false)
    useEffect(() => {
        if (typeof MediaSource !== 'undefined') {
            setNoMP3(!MediaSource.isTypeSupported('audio/mpeg'))
        } else {
            setNoMediaSource(true)
        }
    }, [])

    const [tts, setTTS] = useState(getUserSetting(session.settings, 'ttsType'))
    const changeTTS = (state: TTSType) => {
        setSession({ ...session, settings: { ...session.settings, ttsType: state } })
        setTTS(state)
    }

    const [sid, setSid] = useState(getUserSetting(session.settings, 'sid'))
    const changeSid = (state: number) => {
        setSession({ ...session, settings: { ...session.settings, sid: state } })
        setSid(state)
    }

    const [volume, setVolume] = useState(getUserSetting(session.settings, 'ttsVolume'))
    const changeVolume = (state: number) => {
        setSession({ ...session, settings: { ...session.settings, ttsVolume: state } })
        setVolume(state)
    }
    const [rate, setRate] = useState(getUserSetting(session.settings, 'ttsRate'))
    const changeRate = (state: number) => {
        setSession({ ...session, settings: { ...session.settings, ttsRate: state } })
        setRate(state)
    }
    const [rateStreamed, setRateStreamed] = useState(getUserSetting(session.settings, 'ttsRateStreamed'))
    const changeRateStreamed = (state: number) => {
        setSession({ ...session, settings: { ...session.settings, ttsRateStreamed: state } })
        setRateStreamed(state)
    }
    const [pitch, setPitch] = useState(getUserSetting(session.settings, 'ttsPitch'))
    const changePitch = (state: number) => {
        setSession({ ...session, settings: { ...session.settings, ttsPitch: state } })
        setPitch(state)
    }
    const [speakInputs, setSpeakInputs] = useState(getUserSetting(session.settings, 'speakInputs'))
    const changeSpeakInputs = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, speakInputs: state } })
        setSpeakInputs(state)
    }
    const [speakOutputs, setSpeakOutputs] = useState(getUserSetting(session.settings, 'speakOutputs'))
    const changeSpeakOutputs = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, speakOutputs: state } })
        setSpeakOutputs(state)
    }
    const [speakComments, setSpeakComments] = useState(getUserSetting(session.settings, 'speakComments'))
    const changeSpeakComments = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, speakComments: state } })
        setSpeakComments(state)
    }
    const [ttsSeed, setTTSSeed] = useState(getUserSetting(session.settings, 'ttsSeed') || '')
    const changeTTSSeed = (state: string) => {
        setSession({ ...session, settings: { ...session.settings, ttsSeed: state } })
        setTTSSeed(state)
    }
    const [ttsV2Seed, setTTSV2Seed] = useState(getUserSetting(session.settings, 'ttsV2Seed') ?? '')
    const changeTTSV2Seed = (state: string) => {
        setSession({ ...session, settings: { ...session.settings, ttsV2Seed: state } })
        setTTSV2Seed(state)
    }
    const [ttsCommentSeed, setTTSCommentSeed] = useState(
        getUserSetting(session.settings, 'ttsV2CommentSeed') ?? ''
    )
    const changeTTSCommentSeed = (state: string) => {
        setSession({ ...session, settings: { ...session.settings, ttsV2CommentSeed: state } })
        setTTSCommentSeed(state)
    }

    const [testInput, setTestInput] = useState('')
    const [downloading, setDownloading] = useState(false)

    const [voiceOptions, setVoiceOptions] = useState([] as Array<any>)
    const [selectedVoice, setSelectedVoice] = useState({} as any)
    useEffect(() => {
        const loadVoices = (retry: boolean = true) => {
            const voices = window?.speechSynthesis?.getVoices() ?? []
            if (voices.length === 0 && retry) {
                // the voices aren't always immediately populated
                setTimeout(() => loadVoices(false), 500)
                return
            }
            if (voices.length === 0) return
            setVoiceOptions(
                voices.map((voice, index) => ({
                    value: index,
                    label: voice.name,
                    description: `Language: ${voice.lang}, Local: ${voice.localService ? 'Yes' : 'No'}`,
                    voice,
                }))
            )
            const selectedVoice = getDefaultTTS(voices)
            if (!selectedVoice) setSelectedVoice({ value: -1, label: 'None Available' })
            else
                setSelectedVoice({
                    value: voices.findIndex((voice) => voice.name === selectedVoice.name),
                    label: selectedVoice.name,
                    description: `Language: ${selectedVoice.lang}, Local: ${
                        selectedVoice.localService ? 'Yes' : 'No'
                    }`,
                    voice: selectedVoice,
                })
        }
        loadVoices()
    }, [])
    const changeVoice = (selectedVoice: any) => {
        setSelectedVoice({
            value: selectedVoice.value,
            label: voiceOptions[selectedVoice.value].label,
            description: voiceOptions[selectedVoice.value].description,
            voice: voiceOptions[selectedVoice.value].voice,
        })
        setDefaultTTS(voiceOptions[selectedVoice.value].voice)
    }

    const [speaking, setSpeaking] = useState(false)
    const testVoice = () => {
        if (speaking) {
            stopTTS()
            setSpeaking(false)
            return
        }
        setSpeaking(true)
        speakTTS(
            TTSType.Local,
            session,
            testInput
                ? testInput
                : 'This is a test for text to speech. A little harsh, a little slow, but always on point.',
            {
                retry: false,
                voice: voiceOptions[selectedVoice.value]?.voice,
                callback: () => {
                    setSpeaking(false)
                },
                error: (error) => {
                    toast(error)
                    setTimeout(() => setSpeaking(false), 200)
                },
            }
        )
    }
    const [lastPlay, setLastPlay] = useState('')

    const testStreamedVoice = (seed?: string, from?: string) => {
        if (speaking && from && from === lastPlay) {
            stopTTS()
            setSpeaking(false)
            setLastPlay('')
            return
        } else if (speaking) {
            stopTTS()
        }

        if (testInput.length > 1000) {
            toast('Limit 1000 characters')
            stopTTS()
            setSpeaking(false)
            return
        }

        setSpeaking(true)
        setLastPlay(from ?? '')
        speakTTS(
            TTSType.Streamed,
            session,
            testInput
                ? testInput
                : 'This is a test for text to speech. A little harsh, a little slow, but always on point.',
            {
                retry: false,
                callback: () => {
                    setSpeaking(false)
                },
                error: (error) => {
                    toast(error)
                    setTimeout(() => setSpeaking(false), 200)
                },
                seed,
            }
        )
    }

    const voiceSelectOptions = Object.entries(groupBy(TTSVoices, 'category')).map(([label, values]) => ({
        label,
        description: label,
        options: values.map((voice) => ({
            value: voice.sid,
            description: voice.name,
            label: (
                <ModelSelectOption>
                    <VoiceName>{voice.name}</VoiceName>
                </ModelSelectOption>
            ),
        })),
    }))

    const ttsv2Voices = [
        ...getUserSetting(session.settings, 'savedTtsSeeds')
            .filter((v) => v.seed)
            .map((voice) => ({
                ...voice,
                category: 'custom',
            })),
        ...TTSv2Voices,
    ]

    const ttsv2Options = Object.entries(groupBy(ttsv2Voices, 'category')).map(([label, values]) => ({
        label,
        description: label,
        options: values.map((voice) => ({
            value: voice.seed,
            description: voice.name,
            label: (
                <ModelSelectOption>
                    <VoiceName>{voice.name || voice.seed}</VoiceName>
                </ModelSelectOption>
            ),
        })),
    }))

    const randomizeSeed = async () => {
        // eslint-disable-next-line unicorn/no-await-expression-member
        changeTTSSeed((await randomTTSSeedPhrase()).slice(0, 50))
    }

    const [savedTTSName, setSavedTTSName] = useState('')
    const [savedTTSSeed, setSavedTTSSeed] = useState('')
    const [savedTTSid, setSavedTTSid] = useState<string | undefined>(void 0)

    const seedmixResult = useMemo(() => {
        let seed = savedTTSSeed
        if (!seed) {
            return <span>&nbsp;</span>
        }
        if (!seed.startsWith('seedmix:')) {
            return (
                <span>
                    <span style={{ opacity: 0.5 }}>Seed: </span>
                    {seed}
                </span>
            )
        }
        seed = seed.slice(8)
        const specifics = seed.includes('|')
            ? seed.split('|').reduce((prev, cur) => {
                  if (cur.trim() === '') return prev
                  if (
                      cur.includes(':') &&
                      ['style', 'intonation', 'cadence'].includes(cur.split(/:(.*)/s)[0])
                  )
                      prev[cur.split(/:(.*)/s)[0]] = cur.split(/:(.*)/s)[1].replace(/ /g, '')
                  else prev['base'] = cur.replace(/ /g, '')
                  return prev
              }, {} as Record<string, string>)
            : ({ base: seed.replace(/ /g, '') } as Record<string, string>)
        if (!('cadence' in specifics)) specifics['cadence'] = specifics['base']
        if (!('intonation' in specifics)) specifics['intonation'] = specifics['base']
        if (!('style' in specifics)) specifics['style'] = specifics['intonation']
        return (
            <span>
                <span style={{ opacity: 0.5 }}>Style: </span>
                {specifics['style'] ? (
                    <span style={{ opacity: 0.8 }}>{specifics['style']} </span>
                ) : (
                    <span style={{ opacity: 0.6 }}>Empty </span>
                )}
                <span style={{ opacity: 0.5 }}>Intonation: </span>
                {specifics['intonation'] ? (
                    <span style={{ opacity: 0.8 }}>{specifics['intonation']} </span>
                ) : (
                    <span style={{ opacity: 0.6 }}>Empty </span>
                )}
                <span style={{ opacity: 0.5 }}>Cadence: </span>
                {specifics['cadence'] ? (
                    <span style={{ opacity: 0.8 }}>{specifics['cadence']} </span>
                ) : (
                    <span style={{ opacity: 0.6 }}>Empty </span>
                )}
            </span>
        )
    }, [savedTTSSeed])

    const randomizeSeedv2 = async () => {
        // eslint-disable-next-line unicorn/no-await-expression-member
        setSavedTTSSeed((await randomTTSSeedPhrase()).slice(0, 50))
    }
    const siteTheme = useRecoilValue(SiteTheme)
    const [ttsModel, setTTSModel] = useState(getUserSetting(session.settings, 'ttsModel'))
    const changeTTSModel = (state: TTSModel) => {
        setSession({ ...session, settings: { ...session.settings, ttsModel: state } })
        setTTSModel(state)
    }

    useEffect(() => {
        if (savedTTSid) {
            const seeds = getUserSetting(session.settings, 'savedTtsSeeds')
            const seed = seeds?.find((seed) => seed.id === savedTTSid)
            if (seed) {
                setSavedTTSName(seed.name)
                setSavedTTSSeed(seed.seed)
            }
        }
    }, [savedTTSid, session.settings])

    const addTTSSeed = () => {
        const seeds = getUserSetting(session.settings, 'savedTtsSeeds')
        // new seed
        const newSeeds = [...seeds, { id: uuid(), name: '', seed: '', model: TTSModel.v2 }]
        setSavedTTSid(newSeeds[newSeeds.length - 1].id)
        setSavedTTSName('')
        setSavedTTSSeed('')
        setSession({ ...session, settings: { ...session.settings, savedTtsSeeds: newSeeds } })
    }

    const saveTTSSeed = () => {
        const seeds = getUserSetting(session.settings, 'savedTtsSeeds')
        for (const [i, seed] of seeds.entries()) {
            if (seed.id === savedTTSid) {
                const name = savedTTSName === '' ? savedTTSSeed : savedTTSName
                const newSeed = { ...seed, name: name, seed: savedTTSSeed }
                const settings = {
                    ...session.settings,
                    savedTtsSeeds: [...seeds.slice(0, i), newSeed, ...seeds.slice(i + 1)],
                }
                setSession({
                    ...session,
                    settings,
                })
                getStorage(session).saveSettings(settings)
                return
            }
        }
        // If the seed couldn't be created with none selected, treat as new

        const id = uuid()
        const newSeeds = [...seeds, { id: id, name: savedTTSName, seed: savedTTSSeed, model: TTSModel.v2 }]
        const settings = {
            ...session.settings,
            savedTtsSeeds: newSeeds,
        }
        setSession({
            ...session,
            settings,
        })
        setSavedTTSid(id)
        getStorage(session).saveSettings(settings)
    }

    const deleteTTSSeed = () => {
        const seeds = getUserSetting(session.settings, 'savedTtsSeeds')
        const newSeeds = seeds.filter((seed) => seed.id !== savedTTSid)
        const settings = { ...session.settings, savedTtsSeeds: newSeeds }
        setSession({ ...session, settings })
        setSavedTTSid(void 0)
        setSavedTTSName('')
        setSavedTTSSeed('')
        getStorage(session).saveSettings(settings)
    }

    const selectTTSSeed = (id: string) => {
        setSavedTTSid(id)
    }

    const downloadTTSAudio = async () => {
        setDownloading(true)
        const response = await createTTSRequest(
            ttsModel,
            testInput
                ? testInput.slice(0, 1000)
                : // eslint-disable-next-line max-len
                  'This is a test for text to speech. A little harsh, a little slow, but always on point.',
            getUserSetting(session.settings, 'ttsModel') === TTSModel.v1 ? sid : -1,
            false,
            session.auth_token,
            ttsV2Seed
        )
        const data = await response.arrayBuffer()

        downloadFile(
            new Uint8Array(data),
            `NovelAI_TTS-${sid !== -1 ? TTSVoices.find((v) => v.sid === sid)?.name : 'seed.' + ttsSeed}.${
                testInput.length > 20 ? testInput.slice(0, 20) + '…' : testInput
            }.mp3`,
            'audio/mpeg'
        )

        setDownloading(false)
    }
    const downloadV2TTSAudio = async (seed?: string) => {
        const usedSeed = seed ? seed : ttsV2Seed
        setDownloading(true)
        const response = await createTTSRequest(
            ttsModel,
            testInput
                ? testInput.slice(0, 1000)
                : // eslint-disable-next-line max-len
                  'This is a test for text to speech. A little harsh, a little slow, but always on point.',
            -1,
            false,
            session.auth_token,
            usedSeed
        )
        const data = await response.arrayBuffer()
        downloadFile(
            new Uint8Array(data),
            `NovelAI_TTS2-${'seed.' + usedSeed}.${
                testInput.length > 20 ? testInput.slice(0, 20) + '…' : testInput
            }.mp3`,
            'audio/mpeg'
        )
        setDownloading(false)
    }

    const divRef = useRef<HTMLDivElement>(null)
    const testArea = (
        <div>
            <SettingDescription style={{ marginBottom: 10 }}>
                Text entered here will be used for the test/download buttons.
            </SettingDescription>
            <div id="tts-test-text" style={{ position: 'relative' }}>
                <TextareaAutosize
                    minRows={3}
                    maxRows={6}
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder={
                        'This is a test for text to speech. A little harsh, a little slow, but always on point.'
                    }
                />
            </div>
        </div>
    )

    const selectedSavedVoice = getUserSetting(session.settings, 'savedTtsSeeds')?.find(
        (seed) => seed.id === savedTTSid
    )

    return (
        <>
            <SettingsSplit>
                <div>
                    <div>
                        <SettingLabel>Text to Speech Source</SettingLabel>
                        <SettingDescription>
                            Local TTS uses your browsers available speech synthesis capabilities. <br />
                            Streamed TTS is higher quality, uses a model hosted by NovelAI, and requires an
                            active subscription. 100 free generations given for trial purposes.
                        </SettingDescription>
                        {voiceOptions.length === 0 || !isTTSAvailable() ? (
                            <WarningText style={{ paddingTop: '5px' }}>
                                Your browser does not support local TTS.
                            </WarningText>
                        ) : (
                            <></>
                        )}
                        <ToggleButtons>
                            <ToggleButton
                                style={{ width: '100px' }}
                                selected={tts === TTSType.Off}
                                onClick={() => changeTTS(0)}
                                aria-label="Set Text to speech off"
                            >
                                Off
                            </ToggleButton>
                            <ToggleButton
                                style={{ width: '100px' }}
                                selected={tts === TTSType.Local}
                                onClick={() => changeTTS(1)}
                                disabled={voiceOptions.length === 0 || !isTTSAvailable()}
                                aria-label="Set Text to speech local"
                            >
                                Local
                            </ToggleButton>
                            <ToggleButton
                                style={{ width: '100px' }}
                                selected={tts === TTSType.Streamed}
                                onClick={() => changeTTS(2)}
                                disabled={!hasStreamedTTSAccess(session)}
                                aria-label="Set Text to speech streamed"
                            >
                                Streamed
                            </ToggleButton>
                        </ToggleButtons>
                        {tts === TTSType.Local ? (
                            <SettingDescription>
                                TTS will use the browsers Speech Synthesis API.
                            </SettingDescription>
                        ) : tts === TTSType.Streamed ? (
                            <SettingDescription>
                                TTS will use NovelAI{"'"}s remote TTS service.
                                {noMediaSource && (
                                    <WarningText>
                                        Your browser does not support MediaSource. Streamed TTS will still
                                        work, but you may notice higher latency.
                                    </WarningText>
                                )}
                                {noMP3 && (
                                    <WarningText>
                                        Your browser does not support {"'"}audio/mpeg{"'"} as a MediaSource
                                        type. Streamed TTS will still work, but you may notice slightly higher
                                        latency.
                                    </WarningText>
                                )}
                            </SettingDescription>
                        ) : (
                            <SettingDescription>Text to speech is turned off.</SettingDescription>
                        )}
                    </div>
                </div>
                <div></div>
            </SettingsSplit>
            <SettingsSplit>
                <div>
                    <Checkbox
                        label="Speak Outputs"
                        disabled={!tts}
                        value={speakOutputs ?? false}
                        setValue={changeSpeakOutputs}
                        checkedText={<span>Outputs will be read by TTS.</span>}
                        uncheckedText={<span>Outputs will not be read.</span>}
                    />
                </div>
                <div>
                    <Checkbox
                        label="Speak Inputs"
                        disabled={!tts}
                        value={speakInputs ?? false}
                        setValue={changeSpeakInputs}
                        checkedText={
                            <span>
                                In addition to outputs, Inputs will be read by TTS.
                                <br />
                                {!speakOutputs ? ' Has no effect if speak outputs is disabled.' : <>&nbsp;</>}
                            </span>
                        }
                        uncheckedText={<span>Inputs will not be read.</span>}
                    />
                </div>
                <div>
                    <Checkbox
                        label="Speak HypeBot Comments"
                        value={speakComments ?? true}
                        setValue={changeSpeakComments}
                        checkedText={
                            <span>
                                HypeBot comments will be read by TTS.{' '}
                                {getUserSetting(session.settings, 'commentEnabled') <= 0
                                    ? ' But HypeBot is disabled.'
                                    : ''}
                            </span>
                        }
                        uncheckedText={
                            <span>
                                HypeBot comments will not be read.
                                {getUserSetting(session.settings, 'commentEnabled') <= 0
                                    ? ' HypeBot is disabled.'
                                    : ''}
                            </span>
                        }
                        disabled={!tts || getUserSetting(session.settings, 'commentEnabled') <= 0}
                    />
                </div>
            </SettingsSplit>
            <div style={{ height: '12px' }} />
            {getUserSetting(session.settings, 'ttsType') === TTSType.Local ? (
                <>
                    <SettingsCategoryGroupHeader>Local TTS Settings</SettingsCategoryGroupHeader>
                    <SettingsSplit>
                        <div>
                            <Select
                                isDisabled={voiceOptions.length === 0 || !isTTSAvailable()}
                                isSearchable={true}
                                aria-label="Select a Voice"
                                maxMenuHeight={300}
                                options={voiceOptions.map((voice) => ({
                                    value: voice.value,
                                    description: `${voice.label}: ${voice.description}`,
                                    label: (
                                        <ModelSelectOption>
                                            <div>{voice.label}</div>
                                            {voice.description ? <div>{voice.description}</div> : null}
                                        </ModelSelectOption>
                                    ),
                                }))}
                                onChange={(e: any) => e && changeVoice(e)}
                                value={{
                                    value: selectedVoice.value,
                                    description: `${selectedVoice.label}`,
                                    label: (
                                        <ModelSelectOption>
                                            <div>{selectedVoice.label}</div>
                                        </ModelSelectOption>
                                    ),
                                }}
                                styles={getDropdownStyle(siteTheme)}
                                theme={getDropdownTheme(siteTheme, true)}
                            />
                        </div>
                        <div id="tts-test-text" style={{ position: 'relative' }}>
                            {testArea}
                            <InvertedButton
                                onClick={testVoice}
                                style={{ height: '38px' }}
                                disabled={voiceOptions.length === 0 || !isTTSAvailable()}
                            >
                                {speaking ? 'Testing...' : 'Test Voice'}
                            </InvertedButton>
                        </div>

                        <div>
                            <MainSettingSliderCard
                                style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                                title="Volume"
                                hint={'Default: ' + UserSettingsDefaults.ttsVolume}
                                onHintClick={() => changeVolume(UserSettingsDefaults.ttsVolume as number)}
                                value={volume}
                                min={0.1}
                                max={1}
                                step={0.01}
                                onChange={changeVolume}
                            />
                        </div>
                        <div>
                            <MainSettingSliderCard
                                style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                                title="Speed"
                                hint={'Default: ' + UserSettingsDefaults.ttsRate}
                                onHintClick={() => changeRate(UserSettingsDefaults.ttsRate as number)}
                                value={rate}
                                min={0.1}
                                max={2}
                                step={0.01}
                                onChange={changeRate}
                            />
                        </div>
                        <div>
                            <MainSettingSliderCard
                                style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                                title="Pitch"
                                hint={'Default: ' + UserSettingsDefaults.ttsPitch}
                                onHintClick={() => changePitch(UserSettingsDefaults.ttsPitch as number)}
                                value={pitch}
                                min={0.1}
                                max={2}
                                step={0.01}
                                onChange={changePitch}
                            />
                        </div>
                    </SettingsSplit>
                </>
            ) : (
                <></>
            )}
            {getUserSetting(session.settings, 'ttsType') === TTSType.Streamed ? (
                <>
                    <SettingsCategoryGroupHeader>Streamed TTS Settings</SettingsCategoryGroupHeader>

                    <SettingDescription>Model</SettingDescription>
                    <SettingsSplit>
                        <div>
                            <Select
                                menuPlacement="auto"
                                isSearchable={false}
                                value={{ value: ttsModel, label: ttsModel }}
                                onChange={(e) => e && changeTTSModel(e.value)}
                                options={[TTSModel.v1, TTSModel.v2].map((model) => ({
                                    value: model,
                                    label: model,
                                }))}
                                styles={getDropdownStyle(siteTheme)}
                                theme={getDropdownTheme(siteTheme, true)}
                            />
                        </div>
                    </SettingsSplit>
                    <FlexColSpacer min={0} max={0} />

                    <SettingsSplit>
                        {ttsModel === TTSModel.v1 && (
                            <div>
                                <div>
                                    <SettingDescription style={{ marginBottom: 10 }}>
                                        Voice
                                    </SettingDescription>
                                    <div style={{ display: 'flex' }}>
                                        <InvertedButton
                                            onClick={() => testStreamedVoice()}
                                            style={{ height: '38px', width: '38px' }}
                                            disabled={!hasStreamedTTSAccess(session)}
                                        >
                                            {<GiSpeaker />}
                                        </InvertedButton>
                                        <InvertedButton
                                            onClick={downloadTTSAudio}
                                            style={{ height: '38px', width: '38px' }}
                                            disabled={downloading}
                                        >
                                            <SaveIcon />
                                        </InvertedButton>

                                        <Select
                                            menuPlacement="auto"
                                            value={{
                                                value: sid ?? 0,
                                                description:
                                                    TTSVoices.find((v) => v.sid === sid)?.name ??
                                                    'unknown voice',
                                                label: (
                                                    <ModelSelectOption>
                                                        <div>
                                                            {TTSVoices.find((v) => v.sid === sid)?.name ??
                                                                'unknown voice'}
                                                        </div>
                                                    </ModelSelectOption>
                                                ),
                                            }}
                                            onChange={(e) => e && changeSid(e.value)}
                                            options={voiceSelectOptions}
                                            styles={{
                                                ...getDropdownStyle(siteTheme),
                                            }}
                                            theme={getDropdownTheme(siteTheme, true)}
                                        />
                                    </div>
                                </div>

                                {sid === -1 && (
                                    <div>
                                        <div>
                                            <SettingDescription>
                                                Use a voice based on the given seed.
                                            </SettingDescription>
                                            <div style={{ height: '8px' }} />
                                            <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                                                <input
                                                    aria-label="Streamed Text to Speech Seed"
                                                    type="text"
                                                    onChange={(e) => changeTTSSeed(e.target.value)}
                                                    value={ttsSeed}
                                                    maxLength={50}
                                                    placeholder="Enter a seed here."
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            testStreamedVoice()
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                        }
                                                    }}
                                                />
                                                <DarkColorButton
                                                    onClick={randomizeSeed}
                                                    aria-label="Randomize Seed"
                                                >
                                                    Randomize
                                                </DarkColorButton>
                                            </div>
                                            <div style={{ height: '8px' }} />
                                            <SettingDescription>
                                                Note: Starting with a common first name will have a relevant
                                                influence on pitch and intonation. The voice for any given
                                                seed is liable to change in the future as we continue to
                                                develop the TTS.
                                            </SettingDescription>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {ttsModel === TTSModel.v2 && (
                            <div>
                                <div>
                                    <SettingDescription style={{ marginBottom: 10 }}>
                                        Story Voice
                                    </SettingDescription>
                                    <div
                                        ref={divRef}
                                        style={{
                                            display: 'flex',
                                        }}
                                    >
                                        <Select
                                            menuPlacement="auto"
                                            value={{
                                                value: ttsV2Seed,
                                                description:
                                                    ttsv2Voices.find((v) => v.seed === ttsV2Seed)?.name ||
                                                    ttsv2Voices.find((v) => v.seed === ttsV2Seed)?.seed ||
                                                    ttsV2Seed,
                                                label: (
                                                    <ModelSelectOption>
                                                        <div>
                                                            {ttsv2Voices.find((v) => v.seed === ttsV2Seed)
                                                                ?.name ||
                                                                ttsv2Voices.find((v) => v.seed === ttsV2Seed)
                                                                    ?.seed ||
                                                                ttsV2Seed}
                                                        </div>
                                                    </ModelSelectOption>
                                                ),
                                            }}
                                            onChange={(e) => e && changeTTSV2Seed(e.value)}
                                            options={ttsv2Options}
                                            styles={{
                                                ...getDropdownStyle(siteTheme),
                                            }}
                                            theme={getDropdownTheme(siteTheme, true)}
                                        />
                                        <InvertedButton
                                            onClick={() => testStreamedVoice(ttsV2Seed, 'story')}
                                            style={{ height: '38px', width: '38px' }}
                                            disabled={!hasStreamedTTSAccess(session)}
                                        >
                                            {lastPlay === 'story' && speaking ? <ImStop2 /> : <GiSpeaker />}
                                        </InvertedButton>
                                        <InvertedButton
                                            onClick={() => downloadV2TTSAudio(ttsV2Seed)}
                                            style={{ height: '38px', width: '38px' }}
                                            disabled={downloading || !hasStreamedTTSAccess(session)}
                                        >
                                            <SaveIcon />
                                        </InvertedButton>
                                    </div>
                                    <FlexColSpacer min={10} max={10} />

                                    {speakComments && getUserSetting(session.settings, 'commentEnabled') > 0 && (
                                        <Fragment>
                                            <SettingDescription style={{ marginBottom: 10 }}>
                                                HypeBot Voice
                                            </SettingDescription>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                }}
                                            >
                                                <Select
                                                    menuPlacement="auto"
                                                    isSearchable={true}
                                                    value={{
                                                        value: ttsCommentSeed,
                                                        description:
                                                            ttsv2Voices.find((v) => v.seed === ttsCommentSeed)
                                                                ?.name ||
                                                            ttsv2Voices.find((v) => v.seed === ttsCommentSeed)
                                                                ?.seed ||
                                                            ttsV2Seed,
                                                        label: (
                                                            <ModelSelectOption>
                                                                <div>
                                                                    {ttsv2Voices.find(
                                                                        (v) => v.seed === ttsCommentSeed
                                                                    )?.name ||
                                                                        ttsv2Voices.find(
                                                                            (v) => v.seed === ttsCommentSeed
                                                                        )?.seed ||
                                                                        ttsCommentSeed}
                                                                </div>
                                                            </ModelSelectOption>
                                                        ),
                                                    }}
                                                    onChange={(e) => e && changeTTSCommentSeed(e.value)}
                                                    options={ttsv2Options}
                                                    styles={{
                                                        ...getDropdownStyle(siteTheme),
                                                    }}
                                                    theme={getDropdownTheme(siteTheme, true)}
                                                />
                                                <InvertedButton
                                                    onClick={() =>
                                                        testStreamedVoice(ttsCommentSeed, 'comment')
                                                    }
                                                    style={{ height: '38px', width: '38px' }}
                                                    disabled={!hasStreamedTTSAccess(session)}
                                                >
                                                    {lastPlay === 'comment' && speaking ? (
                                                        <ImStop2 />
                                                    ) : (
                                                        <GiSpeaker />
                                                    )}
                                                </InvertedButton>
                                                <InvertedButton
                                                    onClick={() => downloadV2TTSAudio(ttsCommentSeed)}
                                                    style={{ height: '38px', width: '38px' }}
                                                    disabled={downloading || !hasStreamedTTSAccess(session)}
                                                >
                                                    <SaveIcon />
                                                </InvertedButton>
                                            </div>
                                        </Fragment>
                                    )}
                                </div>

                                {testArea}
                            </div>
                        )}

                        <div>
                            {ttsModel === TTSModel.v1 && testArea}
                            {ttsModel === TTSModel.v2 && (
                                <>
                                    <SettingsCategoryGroupHeader>Saved Voices</SettingsCategoryGroupHeader>
                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'stretch',
                                            }}
                                        >
                                            <LightColorButton
                                                style={{
                                                    marginRight: 1,
                                                }}
                                                onClick={addTTSSeed}
                                            >
                                                <PlusIcon />
                                            </LightColorButton>
                                            <Select
                                                menuPlacement="auto"
                                                placeholder="Select a voice to edit"
                                                noOptionsMessage={() => 'No saved voices. Add one first.'}
                                                value={
                                                    savedTTSid
                                                        ? {
                                                              value: savedTTSid,
                                                              description:
                                                                  selectedSavedVoice?.name ||
                                                                  selectedSavedVoice?.seed ||
                                                                  'unnamed voice',
                                                              label: getUserSetting(
                                                                  session.settings,
                                                                  'savedTtsSeeds'
                                                              ).some((v) => v.id === savedTTSid) ? (
                                                                  <ModelSelectOption>
                                                                      <div>
                                                                          {selectedSavedVoice?.name ||
                                                                              selectedSavedVoice?.seed ||
                                                                              'unnamed voice'}
                                                                      </div>
                                                                  </ModelSelectOption>
                                                              ) : undefined,
                                                          }
                                                        : {
                                                              value: '',
                                                              description: 'Select a voice to edit',
                                                              label: 'Select a voice to edit',
                                                          }
                                                }
                                                onChange={(e) => e && selectTTSSeed(e.value)}
                                                options={getUserSetting(
                                                    session.settings,
                                                    'savedTtsSeeds'
                                                ).map((v) => ({
                                                    value: v.id,
                                                    description: v.name || v.seed || 'unnamed voice',
                                                    label: (
                                                        <ModelSelectOption>
                                                            <div>{v.name || v.seed || 'unnamed voice'}</div>
                                                        </ModelSelectOption>
                                                    ),
                                                }))}
                                                styles={{
                                                    ...getDropdownStyle(siteTheme),
                                                }}
                                                theme={getDropdownTheme(siteTheme, true)}
                                            />
                                            <InvertedButton
                                                onClick={() => {
                                                    const seed = selectedSavedVoice?.seed
                                                    if (seed) testStreamedVoice(seed, 'saved')
                                                }}
                                                style={{ height: '38px', width: '38px' }}
                                                disabled={!hasStreamedTTSAccess(session) || !savedTTSid}
                                            >
                                                {lastPlay === 'saved' && speaking ? (
                                                    <ImStop2 />
                                                ) : (
                                                    <GiSpeaker />
                                                )}
                                            </InvertedButton>
                                            <InvertedButton
                                                onClick={() => downloadV2TTSAudio(ttsV2Seed)}
                                                style={{ height: '38px', width: '38px' }}
                                                disabled={
                                                    downloading ||
                                                    !hasStreamedTTSAccess(session) ||
                                                    !savedTTSid
                                                }
                                            >
                                                <SaveIcon />
                                            </InvertedButton>
                                        </div>
                                        <FlexColSpacer min={10} max={10} />
                                        <label>
                                            <SettingDescription>Name</SettingDescription>
                                            <input
                                                placeholder="Name"
                                                value={savedTTSName}
                                                type="text"
                                                onChange={(e) => setSavedTTSName(e.target.value)}
                                            />
                                        </label>
                                        <FlexColSpacer min={10} max={10} />

                                        <label htmlFor={'tts-seed-input'}>
                                            <SettingDescription>Seed</SettingDescription>
                                        </label>

                                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                            <LightColorButton
                                                onClick={randomizeSeedv2}
                                                aria-label="Randomize Seed"
                                            >
                                                Randomize
                                            </LightColorButton>
                                            <input
                                                id="tts-seed-input"
                                                placeholder="Seed"
                                                value={savedTTSSeed}
                                                type="text"
                                                onChange={(e) => setSavedTTSSeed(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter')
                                                        testStreamedVoice(savedTTSSeed, 'edit')
                                                }}
                                            />
                                            <InvertedButton
                                                onClick={() => testStreamedVoice(savedTTSSeed, 'edit')}
                                                style={{ width: '38px' }}
                                                disabled={!hasStreamedTTSAccess(session) || !savedTTSSeed}
                                            >
                                                {lastPlay === 'edit' && speaking ? (
                                                    <ImStop2 />
                                                ) : (
                                                    <GiSpeaker />
                                                )}
                                            </InvertedButton>
                                            <InvertedButton
                                                onClick={() => downloadV2TTSAudio(savedTTSSeed)}
                                                style={{ width: '38px' }}
                                                disabled={
                                                    downloading ||
                                                    !hasStreamedTTSAccess(session) ||
                                                    !savedTTSSeed
                                                }
                                            >
                                                <SaveIcon />
                                            </InvertedButton>
                                        </div>
                                        <FlexColSpacer min={10} max={10} />
                                        <SettingDescription
                                            style={{ display: 'flex', alignItems: 'stretch' }}
                                        >
                                            {seedmixResult}
                                        </SettingDescription>
                                        <FlexColSpacer min={10} max={10} />
                                        <div
                                            style={{
                                                display: 'flex',
                                                width: '100%',
                                                justifyContent: 'flex-end',
                                            }}
                                        >
                                            <Button onClick={saveTTSSeed} disabled={!savedTTSSeed}>
                                                Save Voice
                                            </Button>
                                            <WarningButton
                                                style={{ width: 'unset' }}
                                                confirmButtonText="Delete it!"
                                                buttonType={WarningButtonStyle.Dark}
                                                warningColors
                                                onConfirm={() => {
                                                    deleteTTSSeed()
                                                }}
                                                disabled={!selectedSavedVoice}
                                                warningText={
                                                    <>
                                                        Are you sure you want to delete the voice {'"'}
                                                        {selectedSavedVoice?.name ||
                                                            selectedSavedVoice?.seed ||
                                                            'unnamed voice'}
                                                        {'"'}?
                                                        <br />
                                                        This cannot be reversed.
                                                    </>
                                                }
                                                label="Delete Voice"
                                                buttonText="Delete Voice"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div>
                            <MainSettingSliderCard
                                style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                                title="Volume"
                                hint={'Default: ' + UserSettingsDefaults.ttsVolume}
                                onHintClick={() => changeVolume(UserSettingsDefaults.ttsVolume as number)}
                                value={volume}
                                min={0.1}
                                max={1}
                                step={0.01}
                                onChange={changeVolume}
                            />
                        </div>
                        <div>
                            <div>
                                <MainSettingSliderCard
                                    style={{ marginTop: 0, marginLeft: 0, marginRight: 0 }}
                                    title="Speed"
                                    hint={'Default: ' + UserSettingsDefaults.ttsRateStreamed}
                                    onHintClick={() =>
                                        changeRateStreamed(UserSettingsDefaults.ttsRateStreamed as number)
                                    }
                                    value={rateStreamed}
                                    min={0.1}
                                    max={2}
                                    step={0.01}
                                    onChange={changeRateStreamed}
                                />
                                <SettingDescription style={{ marginLeft: '15px' }}>
                                    Note: Will not affect the speed of downloaded audio.
                                </SettingDescription>
                            </div>
                        </div>
                    </SettingsSplit>
                </>
            ) : (
                <></>
            )}
        </>
    )
}

export function RemoteStorageSetting(props: { value: boolean; setValue: (b: boolean) => void }): JSX.Element {
    return (
        <>
            <SettingLabel>Default Storage Location</SettingLabel>
            <ToggleButtons>
                <ToggleButton selected={!props.value} onClick={() => props.setValue(false)}>
                    Local
                </ToggleButton>
                <ToggleButton selected={props.value} onClick={() => props.setValue(true)}>
                    Server
                </ToggleButton>
            </ToggleButtons>
            {!props.value ? (
                <SettingDescription>
                    New {'&'} imported stories will be saved locally <em>only</em>.
                </SettingDescription>
            ) : (
                <SettingDescription>
                    New {'&'} imported stories will be saved locally and stored encrypted remotely.
                </SettingDescription>
            )}
            <SettingDescription>
                Exporting and backing up your stories is highly recommended, should your browser cache get
                cleared, or if you lose access to your account.
            </SettingDescription>
        </>
    )
}

export function SettingsDefaults(): JSX.Element {
    const [session, setSession] = useRecoilState(Session)

    const [model, setModel] = useState(normalizeModel(getUserSetting(session.settings, 'defaultModel')))
    const [loreGenModel, setLoreGenModel] = useState(
        normalizeModel(getUserSetting(session.settings, 'loreGenModel'))
    )

    const modelOptions = getAvailiableModels(session.subscription.tier >= 3)
    const loreGenModelOptions = getLoregenModels(
        session.subscription.tier >= 3,
        getUserSetting(session.settings, 'legacyLoreGen')
    )

    const selectedOption =
        modelOptions.find((m) => m.str === model) ??
        modelOptions.find((m) => m.str === DefaultModel) ??
        modelOptions[0]

    const selectedLoreGenOption =
        loreGenModelOptions.find((m) => m.str === loreGenModel) ??
        loreGenModelOptions.find((m) => m.str === DefaultModel) ??
        loreGenModelOptions[0]

    const presetOptions = usePresetOptions(model)
    const selectedPreset = usePresetInfo(getUserSetting(session.settings, 'defaultPreset') ?? '', model)
    const setPreset = useCallback(
        (id: string) => {
            setSession((session) => ({ ...session, settings: { ...session.settings, defaultPreset: id } }))
        },
        [setSession]
    )

    const loreGenPresetOptions = usePresetOptions(loreGenModel, false, true)
    const selectedLoreGenPreset = usePresetInfo(
        getUserSetting(session.settings, 'loreGenPreset') ?? '',
        loreGenModel,
        false,
        true
    )
    const setLoreGenPreset = useCallback(
        (id: string) => {
            setSession((session) => ({ ...session, settings: { ...session.settings, loreGenPreset: id } }))
        },
        [setSession]
    )

    const customModules = useRecoilValue(CustomModules)
    const combinedPrefixes = useMemo(
        () => [
            ...customModules,
            ...[...PrefixOptions.keys()].map((key) => {
                return {
                    id: key,
                    mode: PrefixOptions.get(key)?.mode ?? StoryMode.normal,
                    name: PrefixOptions.get(key)?.label ?? key,
                    description: PrefixOptions.get(key)?.label ?? key,
                    image: PrefixOptions.get(key)?.image,
                } as AIModule
            }),
        ],
        [customModules]
    )

    const selectedModule = useMemo(() => {
        if (
            !getUserSetting(session.settings, 'defaultModule') ||
            getUserSetting(session.settings, 'defaultModule') === DefaultPrefixOption
        ) {
            return NoModule
        }
        const preset = combinedPrefixes.find(
            (p) => p.id === getUserSetting(session.settings, 'defaultModule')
        )
        if (!preset) {
            return NoModule
        }
        return preset.id
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [combinedPrefixes, session.settings.defaultModule])

    const prefixOptions = useModuleOptions(
        getUserSetting(session.settings, 'defaultModule') || DefaultPrefixOption,
        model
    )

    const setPrefix = useCallback(
        (id: string) => {
            setSession((session) => ({ ...session, settings: { ...session.settings, defaultModule: id } }))
        },
        [setSession]
    )

    const changeModel = (value: TextGenerationModel) => {
        const selectedModel = value
        setPrefix('')
        setPreset('')
        setModel(selectedModel)
        setSession((session) => ({
            ...session,
            settings: {
                ...session.settings,
                defaultModel: selectedModel,
                defaultPreset: '',
                defaultPrefix: '',
            },
        }))
    }

    const changeLoreGenModel = (value: TextGenerationModel) => {
        const selectedModel = value
        setLoreGenPreset('')
        setLoreGenModel(selectedModel)
        setSession((session) => ({
            ...session,
            settings: {
                ...session.settings,
                loreGenModel: selectedModel,
                loreGenPreset: '',
            },
        }))
    }

    const [legacyLoreGen, setLegacyLoreGen] = useState(getUserSetting(session.settings, 'legacyLoreGen'))
    const changeLegacyLoreGen = (state: boolean) => {
        setSession({ ...session, settings: { ...session.settings, legacyLoreGen: state } })
        if (selectedLoreGenOption.str === TextGenerationModel.krakev1) {
            changeLoreGenModel(TextGenerationModel.euterpev2)
        }
        setLegacyLoreGen(state)
    }

    const siteTheme = useRecoilValue(SiteTheme)

    return (
        <>
            <SettingLabel>Default AI Model</SettingLabel>
            <SettingDescription>New Stories will use this model.</SettingDescription>
            <SettingsSplit>
                <div>
                    <AIModelSection>
                        <div>
                            <ModelImage src={selectedOption.img.src} />
                        </div>
                        <div>
                            <Select
                                menuPlacement="auto"
                                isSearchable={false}
                                aria-label="Select an AI Model"
                                options={modelOptions.map((model) => ({
                                    value: model.str,
                                    description: `${model.label}: ${model.description}`,
                                    label: (
                                        <ModelSelectOption>
                                            <div>{model.label}</div>
                                            {model.description ? <div>{model.description}</div> : null}
                                        </ModelSelectOption>
                                    ),
                                }))}
                                onChange={(e: any) => e && changeModel(e.value)}
                                value={{
                                    value: selectedOption.str,
                                    description: selectedOption.description,
                                    label: <div>{selectedOption.label}</div>,
                                }}
                                styles={getDropdownStyle(siteTheme)}
                                theme={getDropdownTheme(siteTheme, true)}
                            />
                            <ModelDescription>{selectedOption.description}</ModelDescription>
                        </div>
                    </AIModelSection>
                </div>
            </SettingsSplit>
            <SettingsSplit>
                <div>
                    <FlexCol wide={true}>
                        <SettingLabel>Default Preset</SettingLabel>
                        <SettingDescription>
                            New Stories will use the selected preset as a default.
                        </SettingDescription>
                        <FlexColSpacer min={5} max={5} />
                        <PresetSelect
                            options={presetOptions}
                            currentPreset={selectedPreset}
                            setPreset={setPreset}
                            minMenuHeight={280}
                            maxMenuHeight={280}
                        />
                    </FlexCol>
                </div>
                <div>
                    <FlexCol wide={true}>
                        <SettingLabel>Default AI Module</SettingLabel>
                        {modelSupportsModules(model) ? (
                            <>
                                <SettingDescription>
                                    New Stories will use the selected Module as a default.
                                </SettingDescription>
                                <FlexColSpacer min={5} max={5} />
                                <ModuleSelect
                                    prefixOptions={prefixOptions}
                                    setPrefix={setPrefix}
                                    combinedPrefixes={combinedPrefixes}
                                    selectedPrefix={selectedModule}
                                    minMenuHeight={280}
                                    maxMenuHeight={280}
                                />
                            </>
                        ) : (
                            <SettingDescription>
                                The selected AI Model does not support Modules.
                            </SettingDescription>
                        )}
                    </FlexCol>
                </div>
            </SettingsSplit>
            <FlexColSpacer min={20} max={20} />
            <SettingsCategoryGroupHeader>Lorebook Generation Settings</SettingsCategoryGroupHeader>
            <SettingDescription>
                Change the Model and settings preset used by the Lorebook Generator.
            </SettingDescription>
            <SettingsSplit>
                <div>
                    <FlexCol wide={true}>
                        <SettingLabel>Lorebook Generation Model</SettingLabel>
                        <FlexColSpacer min={5} max={5} />
                        <Select
                            menuPlacement="auto"
                            isSearchable={false}
                            aria-label="Select an AI Model for lorebook generation"
                            options={loreGenModelOptions.map((model) => ({
                                value: model.str,
                                description: `${model.label}: ${model.description}`,
                                label: (
                                    <PrefixInnerDiv selected={false}>
                                        <div>
                                            <LazyLoadImage effect="opacity" src={model.img.src} />
                                        </div>
                                        <div>
                                            <strong>{model.label}</strong>
                                            <div>
                                                {model.description ? <div>{model.description}</div> : null}
                                            </div>
                                        </div>
                                    </PrefixInnerDiv>
                                ),
                            }))}
                            onChange={(e: any) => e && changeLoreGenModel(e.value)}
                            value={{
                                value: selectedLoreGenOption.str,
                                description: selectedLoreGenOption.label,
                                label: (
                                    <PrefixInnerDiv selected={false}>
                                        <div>
                                            <LazyLoadImage
                                                effect="opacity"
                                                src={selectedLoreGenOption.img.src}
                                            />
                                        </div>
                                        <div>
                                            <strong>{selectedLoreGenOption.label}</strong>
                                        </div>
                                    </PrefixInnerDiv>
                                ),
                            }}
                            styles={getDropdownStyle(siteTheme)}
                            theme={getDropdownTheme(siteTheme)}
                        />
                    </FlexCol>
                </div>
                <div>
                    <FlexCol wide={true}>
                        <SettingLabel>Lore Generation Preset</SettingLabel>
                        <FlexColSpacer min={5} max={5} />
                        <PresetSelect
                            options={loreGenPresetOptions}
                            currentPreset={selectedLoreGenPreset}
                            setPreset={setLoreGenPreset}
                            minMenuHeight={280}
                            maxMenuHeight={280}
                        />
                    </FlexCol>
                </div>
            </SettingsSplit>
            <FlexColSpacer min={20} max={20} />
            <SettingsSplit>
                <div>
                    <Checkbox
                        label="Legacy Lore Generation"
                        value={legacyLoreGen ?? true}
                        setValue={changeLegacyLoreGen}
                        checkedText={
                            <>
                                The less consistent fewshot prompt based Lore Generator will be used.
                                <br />
                                The module of the selected story will be used for generation if available for
                                the selected model. Arbitrary generation types are not supported.
                            </>
                        }
                        uncheckedText={'A bespoke module will be used for Lore Generator.'}
                    />
                </div>
            </SettingsSplit>
            <FlexSpaceFull />
        </>
    )
}

enum GiftKeyStatus {
    Active,
    Redeemed,
}

interface GiftKey {
    code: string
    created: number
    status: GiftKeyStatus
    showCode: boolean
    tier: string
}

const NewGiftKey = styled(SubtleButton)`
    display: flex;
    align-items: center;
    color: ${(props) => props.theme.colors.textHeadings};
    > div {
        height: 1rem;
        margin-right: 0.5rem;
        background-color: ${(props) => props.theme.colors.textHeadings};
    }
`

const KeyList = styled.div`
    border: solid 1px ${(props) => props.theme.colors.bg3};
    margin-bottom: 30px;
`

const KeyListHeader = styled.div`
    display: grid;
    grid-template-columns: 5fr 3fr 2fr 3fr;
    background-color: ${(props) => props.theme.colors.bg1};
    padding: 16px 20px;
    font-weight: 400;
    font-size: 0.875rem;
    gap: 0 5px;
    > div {
        opacity: 0.7;
    }
    overflow-y: scroll;
`

const KeyListContents = styled.div`
    max-height: 300px;
    overflow-y: scroll;
`

const KeyListEntry = styled.div<{ redeemed: boolean }>`
    padding: 20px;
    display: grid;
    grid-template-columns: 5fr 3fr 2fr 3fr;
    opacity: ${(props) => (props.redeemed ? 0.4 : 1)};
    gap: 0 5px;
    font-size: 0.875rem;
`

const RightAlign = styled.div`
    text-align: right;
`

const Emphasis = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
`
const KeyLoading = styled.div`
    display: flex;
    justify-content: space-around;
    padding: 20px;
`

function tierIdToName(id: number) {
    switch (id) {
        case 1:
            return 'Tablet'
        case 2:
            return 'Scroll'
        case 3:
            return 'Opus'
        default:
            return 'Unknown'
    }
}

function GiftKeys(): JSX.Element {
    const setSettingsModalOpen = useSetRecoilState(SettingsModalOpen)
    const setOpen = useSetRecoilState(GiftKeyOpen)
    const [giftKeys, setGiftKeys] = useState<GiftKey[] | undefined>()
    const fetchGiftKeys = useRecoilCallback(
        ({ snapshot }) =>
            async () => {
                const session = await snapshot.getPromise(Session)
                // eslint-disable-next-line unicorn/no-await-expression-member
                const keys = await getGiftKeys(session.auth_token)
                return keys.giftKeys.map((key: any) => ({
                    code: key.data.k,
                    created:
                        typeof key.createdAt == 'number'
                            ? key.createdAt
                            : new Date(key.createdAt).getTime() / 1000,
                    status: key.data.u ? GiftKeyStatus.Redeemed : GiftKeyStatus.Active,
                    tier: tierIdToName(key.data.i),
                    showCode: false,
                }))
            },
        []
    )

    useEffect(() => {
        const func = async () => {
            const result = await fetchGiftKeys()
            setGiftKeys(result)
        }
        func()
    }, [fetchGiftKeys])

    return (
        <>
            <FlexRow>
                <SettingLabel>Gift Keys</SettingLabel>
                <NewGiftKey
                    onClick={() => {
                        setSettingsModalOpen(SettingsPages.Closed)
                        setOpen(true)
                    }}
                >
                    <PlusIcon /> Purchase New Gift Key
                </NewGiftKey>
            </FlexRow>
            <KeyList>
                <KeyListHeader>
                    <div>Key</div>
                    <div>Date Created</div>
                    <div>Tier</div>
                    <RightAlign>Status</RightAlign>
                </KeyListHeader>
                <KeyListContents>
                    {typeof giftKeys === 'undefined' ? (
                        <KeyLoading>
                            <LoadingSpinner visible={true} />
                        </KeyLoading>
                    ) : giftKeys.length === 0 ? (
                        <KeyLoading>No Gift Keys yet!</KeyLoading>
                    ) : (
                        giftKeys.map((g, i) => (
                            <KeyListEntry key={i} redeemed={g.status === GiftKeyStatus.Redeemed}>
                                <div>
                                    <FlexCol>
                                        <div style={{ userSelect: 'all' }}>
                                            {g.showCode ? g.code : g.code.slice(0, 10) + '...'}
                                        </div>
                                        <div>
                                            <SubtleButton
                                                onClick={() => {
                                                    const newKeys = [
                                                        ...giftKeys.slice(0, i),
                                                        { ...giftKeys[i], showCode: !giftKeys[i].showCode },
                                                        ...giftKeys.slice(i + 1),
                                                    ]
                                                    setGiftKeys(newKeys)
                                                }}
                                            >
                                                {g.showCode ? 'Hide' : 'Reveal'}
                                            </SubtleButton>
                                            &nbsp; &nbsp; &nbsp;
                                            <SubtleButton
                                                onClick={() => {
                                                    copyToClipboard(g.code)
                                                    toast('Gift Key copied to clipboard.')
                                                }}
                                            >
                                                <Emphasis>Copy</Emphasis>
                                            </SubtleButton>
                                        </div>
                                    </FlexCol>
                                </div>
                                <div>
                                    {g.created
                                        ? dayjs.unix(g.created ?? 0).format('YYYY/MM/DD, hh:mma')
                                        : 'unknown'}
                                </div>
                                <div>{g.tier}</div>
                                <RightAlign>
                                    {g.status === GiftKeyStatus.Active ? (
                                        <Emphasis>Available</Emphasis>
                                    ) : g.status === GiftKeyStatus.Redeemed ? (
                                        'Redeemed'
                                    ) : (
                                        'Unknown'
                                    )}
                                </RightAlign>
                            </KeyListEntry>
                        ))
                    )}
                </KeyListContents>
            </KeyList>
        </>
    )
}
