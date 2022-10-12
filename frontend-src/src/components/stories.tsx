import React, { Fragment, MutableRefObject, ReactNode, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { MdAllInbox, MdCloudDone } from 'react-icons/md'
import dynamic from 'next/dynamic'

import {
    ContextViewerPage,
    InfoBarOpen,
    MenuBarOpen,
    Session,
    SessionValue,
    SiteTheme,
    TokenizerOpen,
    UpdateNotes as UpdateNotesState,
    UpdateNotesUnread,
    UpdateNotesVisible,
    UserPromptModal,
} from '../globals/state'
import { getStorage } from '../data/storage/storage'

import { subscribeToHotEvent, HotEventSub, HotEvent, HotkeyHandler } from '../data/user/hotkeys'
import { Dark } from '../styles/themes/dark'
import { Light } from '../styles/themes/light'
import { useSelectStoryBasedOnQuery } from '../hooks/useSelectStoryBasedOnQuery'
import { useSetQueryBasedOnStory } from '../hooks/useSetQueryBasedOnStory'
import { useLoadUnloadedStory } from '../hooks/useLoadUnloadedStory'
import useLoadUpdates from '../hooks/useLoadUpdates'
import useSaveStory from '../hooks/useSaveStory'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { logError } from '../util/browser'
import { prepareGlobalEncoder } from '../tokenizer/interface'
import { EncoderType } from '../tokenizer/encoder'
import { transparentize } from '../util/colour'
import { usePlaceboTheme } from '../util/placebo'
import { getUserSetting } from '../data/user/settings'
import ScreenshotModal from './screenshot/modal'
import Menubar from './sidebars/menubar/menubar'
import InfoBar from './sidebars/infobar/infobar'
import EditorPanel from './editorpanel'

import Loading from './loading'
import OnlineCheck from './onlinecheck'
import UpdateNotifier from './updatenotifier'
import { NonAccountOnly } from './util/accountrequired'
import { NonAccountBanner } from './nonaccountbanner'
import ErrorOverlay from './error'
import TTSPlayer, { stopTTS, TTSControls } from './controls/tts'

const SettingsModal = dynamic(() => import('./settings/modal'), { ssr: false })
const TokenizerModal = dynamic(() => import('./tokenizer'), { ssr: false })
const ContextViewerModal = dynamic(() => import('./contextviewer'), { ssr: false })
const LogProbsModal = dynamic(() => import('./logprobs/modal'), { ssr: false })
const SplashModal = dynamic(() => import('./modals/splash'), { ssr: false })
const PurchaseGiftKeyModal = dynamic(() => import('./modals/giftkey'), { ssr: false })
const RemoteStorageErrorModal = dynamic(() => import('./modals/remotestorageerror'), { ssr: false })
const UserChoiceModal = dynamic(() => import('./modals/userchoice'), { ssr: false })
const UpdateNotesModal = dynamic(() => import('./updates'), { ssr: false })
const Tutorial = dynamic(() => import('./tutorial'), { ssr: false })

function AppStateUpdater(): JSX.Element {
    const router = useRouter()
    const didSucceed = useRef(false)

    const [session, setSession] = useRecoilState(Session)

    useSelectStoryBasedOnQuery()
    useSetQueryBasedOnStory()
    useLoadUnloadedStory()
    useSaveStory()

    const setUpdateNotes = useSetRecoilState(UpdateNotesState)
    const setUpdateNotesVisible = useSetRecoilState(UpdateNotesVisible)
    const setUpdateNotesUnread = useSetRecoilState(UpdateNotesUnread)
    const updates = useLoadUpdates()
    useEffect(() => {
        setUpdateNotes([...updates])
        if (
            session.authenticated &&
            updates.length > 0 &&
            (!getUserSetting(session.settings, 'lastUpdateViewed') ||
                getUserSetting(session.settings, 'lastUpdateViewed') < updates[0].date?.getTime())
        ) {
            setUpdateNotesUnread(true)
        }
    }, [updates, session, setUpdateNotes, setUpdateNotesVisible, setUpdateNotesUnread])

    const setPrompt = useSetRecoilState(UserPromptModal)
    useEffect(() => {
        if (
            getUserSetting(session.settings, 'storageDecision') !== 1 &&
            getUserSetting(session.settings, 'remoteDefault') === false &&
            !session.noAccount
        ) {
            setPrompt({
                label: 'Remote Storage',
                text: (
                    <div>
                        Your account is set to store stories <b>only on your local device</b>. Local storage
                        is not meant to be persistent, and a loss of your stories can occur for a number of
                        reasons and at any time.
                        <br />
                        <br />
                        <b>We recommend storing your stories on our servers.</b> They are locally encrypted
                        and inaccessible to anyone but you. This setting can also be changed for each story
                        individually.
                    </div>
                ),
                hint: 'Make sure to export and manually back up your stories if you store them locally. \
                    You can export all stories in the Account Settings. \
                    Switching to remote storage does not move existing stories to our servers automatically, \
                    this can be changed in each stories settings individually.',
                options: [
                    {
                        text: (
                            <React.Fragment>
                                Switch to Remote Storage{' '}
                                <MdCloudDone style={{ opacity: 0.2, width: '25px' }} />
                            </React.Fragment>
                        ),
                        color:
                            getUserSetting(session.settings, 'siteTheme')?.colors.textHeadings ??
                            Dark.colors.textHeadings,
                        onClick: () => {
                            setSession((session) => ({
                                ...session,
                                settings: {
                                    ...session.settings,
                                    storageDecision: 1,
                                    remoteDefault: true,
                                },
                            }))
                            getStorage(session).saveSettings({
                                ...session.settings,
                                storageDecision: 1,
                                remoteDefault: true,
                            })
                        },
                    },
                    {
                        text: (
                            <React.Fragment>
                                Keep Local Storage <MdAllInbox style={{ opacity: 0.2, width: '25px' }} />
                            </React.Fragment>
                        ),
                        onClick: () => {
                            setSession((session) => ({
                                ...session,
                                settings: {
                                    ...session.settings,
                                    storageDecision: 1,
                                },
                            }))
                            getStorage(session).saveSettings({
                                ...session.settings,
                                storageDecision: 1,
                            })
                        },
                    },
                ],
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session.settings, session.noAccount])

    return <></>
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function StoryApp(_props: { children: ReactNode }): JSX.Element {
    const setSession = useSetRecoilState(Session)
    const setTokenizerOpen = useSetRecoilState(TokenizerOpen)
    const setCurrentTheme = useSetRecoilState(SiteTheme)
    const setContextViewer = useSetRecoilState(ContextViewerPage)

    const authenticated = useRecoilValue(SessionValue('authenticated'))
    const noAccount = useRecoilValue(SessionValue('noAccount'))

    const [prepared, setPrepared] = useState(false)
    const [loadingError, setLoadingError] = useState<Error | null>(null)

    useEffect(() => {
        if (!authenticated || prepared) return
        prepareGlobalEncoder(EncoderType.GPT2)
            .then(() => {
                setPrepared(true)
            })
            .catch((error: any) => {
                logError(error)
                setLoadingError(error)
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated])

    const [menuVisible, setMenuVisible] = useRecoilState(MenuBarOpen)
    const [infoVisible, setInfoVisible] = useRecoilState(InfoBarOpen)

    const bannerRef: MutableRefObject<HTMLDivElement | null> = useRef(null)

    const hotReleaseFocusRef = useRef<any>(null)
    const hotToggleInfoBarRef = useRef<any>(null)
    const hotToggleMenuBarRef = useRef<any>(null)
    const hotToggleBarsRef = useRef<any>(null)
    const hotToggleInputBoxRef = useRef<any>(null)
    const hotHighlightingRef = useRef<any>(null)
    const hotSpellcheckRef = useRef<any>(null)
    const hotResetThemeRef = useRef<any>(null)
    const hotTokenizerRef = useRef<any>(null)
    const hotContextViewerRef = useRef<any>(null)
    const hotStopTTSRef = useRef<any>(null)

    const [, setLocalMenu] = useLocalStorage(
        'menuBarState',
        false,
        (val) => val.toString(),
        (val) => val === 'true'
    )
    const [, setLocalInfo] = useLocalStorage(
        'infoBarState',
        false,
        (val) => val.toString(),
        (val) => val === 'true'
    )

    const hotReleaseFocus = (): boolean => {
        if (!document.activeElement || !authenticated) {
            return false
        }

        ;(document.activeElement as HTMLElement).blur()

        return true
    }
    hotReleaseFocusRef.current = hotReleaseFocus

    const hotToggleInfoBar = (): boolean => {
        if (!authenticated) {
            return false
        }
        setInfoVisible(!infoVisible)
        setLocalInfo(!infoVisible)
        return true
    }
    hotToggleInfoBarRef.current = hotToggleInfoBar

    const hotToggleMenuBar = (): boolean => {
        if (!authenticated) {
            return false
        }
        setMenuVisible(!menuVisible)
        setLocalMenu(!menuVisible)
        return true
    }
    hotToggleMenuBarRef.current = hotToggleMenuBar

    const hotToggleBars = (): boolean => {
        if (!authenticated) {
            return false
        }
        setInfoVisible(!menuVisible)
        setMenuVisible(!menuVisible)
        setLocalInfo(!infoVisible)
        setLocalMenu(!menuVisible)
        return true
    }
    hotToggleBarsRef.current = hotToggleBars

    const hotToggleInputBox = (): boolean => {
        setSession((session) => {
            const newSession = {
                ...session,
                settings: {
                    ...session.settings,
                    showInputBox: !getUserSetting(session.settings, 'showInputBox'),
                },
            }
            getStorage(newSession).saveSettings(newSession.settings)
            return newSession
        })

        return true
    }
    hotToggleInputBoxRef.current = hotToggleInputBox

    const hotHighlighting = (): boolean => {
        setSession((session) => {
            const newSession = {
                ...session,
                settings: {
                    ...session.settings,
                    editorHighlighting: !getUserSetting(session.settings, 'editorHighlighting'),
                },
            }
            getStorage(newSession).saveSettings(newSession.settings)

            return newSession
        })

        return true
    }
    hotHighlightingRef.current = hotHighlighting

    const hotSpellcheck = (): boolean => {
        setSession((session) => {
            const newSession = {
                ...session,
                settings: {
                    ...session.settings,
                    editorSpellcheck: !getUserSetting(session.settings, 'editorSpellcheck'),
                },
            }
            getStorage(newSession).saveSettings(newSession.settings)
            return newSession
        })

        return true
    }
    hotSpellcheckRef.current = hotSpellcheck

    const hotResetTheme = (): boolean => {
        const newTheme = JSON.parse(
            JSON.stringify(window.matchMedia('(prefers-color-scheme: dark)').matches === true ? Dark : Light)
        )
        setCurrentTheme(newTheme)
        setSession((session) => {
            const newSession = {
                ...session,
                settings: { ...session.settings, siteTheme: newTheme },
            }
            return newSession
        })

        return true
    }
    hotResetThemeRef.current = hotResetTheme

    const hotTokenizer = (): boolean => {
        setTokenizerOpen((open) => !open)
        return true
    }
    hotTokenizerRef.current = hotTokenizer

    const hotContextViewer = (): boolean => {
        setContextViewer((contextViewer) => (contextViewer >= 0 ? -1 : 1))
        return true
    }
    hotContextViewerRef.current = hotContextViewer

    // eslint-disable-next-line unicorn/consistent-function-scoping
    const hotStopTTS = (): boolean => {
        stopTTS()
        return true
    }
    hotStopTTSRef.current = hotStopTTS

    useEffect(() => {
        subscribeToHotEvent(HotEvent.releaseFocus, new HotEventSub('saRF', hotReleaseFocusRef))
        subscribeToHotEvent(HotEvent.toggleInfoBar, new HotEventSub('saTIF', hotToggleInfoBarRef))
        subscribeToHotEvent(HotEvent.toggleMenuBar, new HotEventSub('saTMB', hotToggleMenuBarRef))
        subscribeToHotEvent(HotEvent.toggleBars, new HotEventSub('saTB', hotToggleBarsRef))
        subscribeToHotEvent(HotEvent.toggleInputBox, new HotEventSub('saTIB', hotToggleInputBoxRef))
        subscribeToHotEvent(HotEvent.highlighting, new HotEventSub('saHL', hotHighlightingRef))
        subscribeToHotEvent(HotEvent.spellcheck, new HotEventSub('saSC', hotSpellcheckRef))
        subscribeToHotEvent(HotEvent.resetTheme, new HotEventSub('saRT', hotResetThemeRef))
        subscribeToHotEvent(HotEvent.tokenizer, new HotEventSub('saTN', hotTokenizerRef))
        subscribeToHotEvent(HotEvent.contextViewer, new HotEventSub('saCV', hotContextViewerRef))
        subscribeToHotEvent(HotEvent.stopTTS, new HotEventSub('saST', hotStopTTSRef))
    }, [])

    usePlaceboTheme()

    return (
        <>
            <AppStateUpdater />
            {authenticated && prepared ? (
                <Fragment>
                    <Menubar visible={menuVisible} setVisible={setMenuVisible} />
                    <EditorPanel
                        menuVisible={menuVisible}
                        infoVisible={infoVisible}
                        style={noAccount ? { paddingTop: 50 } : undefined}
                    />
                    <InfoBar visible={infoVisible} setVisible={setInfoVisible} />
                    <Banner ref={bannerRef}>
                        <NonAccountOnly>
                            <NonAccountBanner />
                        </NonAccountOnly>
                    </Banner>
                    <HotkeyHandler />
                    <SettingsModal />
                    <TokenizerModal />
                    <LogProbsModal />
                    <ContextViewerModal
                        setTab={(i) => setContextViewer(i)}
                        onRequestClose={() => setContextViewer(-1)}
                    />
                    <UpdateNotesModal />
                    <SplashModal />
                    <Tutorial />
                    <UpdateNotifier />
                    <RemoteStorageErrorModal />
                    <UserChoiceModal />
                    <PurchaseGiftKeyModal />
                    <ScreenshotModal />
                    <OnlineCheck />
                    <TTSPlayer />
                    <TTSControls />
                </Fragment>
            ) : (
                <>
                    <Head>
                        <title>Stories - NovelAI</title>
                    </Head>
                    {loadingError ? (
                        <ErrorOverlay
                            error={new Error(`Failed loading the encoder: ${loadingError}`)}
                            componentStack={loadingError.stack ?? null}
                            eventId={null}
                        />
                    ) : (
                        <Loading />
                    )}
                </>
            )}
        </>
    )
}

export const Banner = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-around;
    flex: 0 0 auto !important;
    position: absolute;
    background: ${(props) => transparentize(0.4, props.theme.colors.bg1)};
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
`
