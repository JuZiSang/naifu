/* eslint-disable react/prop-types */
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import Joyride, { Step, TooltipRenderProps } from 'react-joyride'
import styled from 'styled-components'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { v4 as uuid } from 'uuid'
import {
    InfoBarOpen,
    InfobarSelectedTab,
    LorebookGeneratedExpanded,
    LorebookGenerateOpen,
    LorebookOpen,
    MenuBarOpen,
    SelectedLorebookEntry,
    SelectedStory,
    Session,
    ShowTutorial,
    SiteTheme,
    Stories,
    StoryUpdate,
    TutorialState,
} from '../globals/state'
import { LightColorButton, SubtleButton } from '../styles/ui/button'
import {
    ArrowRightIcon,
    BeakerIcon,
    BookOpenIcon,
    CopyIcon,
    DeleteIcon,
    EditIcon,
    ExportIcon,
    PartyIcon,
    PenTipIcon,
    ReloadIcon,
    RunningManIcon,
    SendIcon,
    SettingsIcon,
    SpeechBubbleIcon,
    SwordsIcon,
    TextIcon,
} from '../styles/ui/icons'
import { getStorage } from '../data/storage/storage'
import { StoryContainer } from '../data/story/storycontainer'
import { GlobalUserContext } from '../globals/globals'
import TutorialBackground from '../assets/images/tutorialbg.svg'
import { HotEvent, invokeHotkeyEvent } from '../data/user/hotkeys'
import GooseRight from '../assets/images/goose_right.svg'
import { LightOnIcon } from '../styles/components/lorebook'
import tutorialjson from '../assets/tutorial.json'
import tutorialTextAdventurejson from '../assets/tutorialTextAdventure.json'
import { logError } from '../util/browser'
import { DEFAULT_THEME } from '../styles/themes/theme'
import { getUserSetting } from '../data/user/settings'
import Modal, { ModalType } from './modals/modal'

const Emphasis = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
`
const PromptColor = styled.span`
    color: ${(props) => props.theme.colors.textPrompt};
    font-weight: 600;
`
const InputColor = styled.span`
    color: ${(props) => props.theme.colors.textUser};
    font-weight: 600;
`
const OutputColor = styled.span`
    color: ${(props) => props.theme.colors.textAI};
    font-weight: 600;
`
const EditColor = styled.span`
    color: ${(props) => props.theme.colors.textEdit};
    font-weight: 600;
`
const HighlightColor = styled.span`
    background-color: ${(props) => props.theme.colors.textHighlight};
    font-weight: 600;
`

const Tip = styled.div`
    padding: 10px;
    padding-left: 60px;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    position: relative;
    overflow: hidden;
    font-size: 0.9rem;
    margin-top: 1rem;
    background: ${(props) => props.theme.colors.bg1};

    :not(:last-child) {
        margin-bottom: 1rem;
    }
    ::before {
        content: '';
        width: 68px;
        height: 68px;
        position: absolute;
        left: -16px;
        bottom: -8px;
        display: block;
        background-position: center;
        background-size: contain;
        background-repeat: no-repeat;
        background-image: url(${GooseRight.src});
        @media (forced-colors: active) {
            forced-color-adjust: none;
        }
    }
`

const WelcomePromptContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 30px 10px 30px;
    font-weight: 600;
    background-color: ${(props) => props.theme.colors.bg1};
    max-width: 440px;
    text-align: center;
`

const WelcomePromptBackground = styled.div`
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    mask-repeat: no-repeat;
    background-color: ${(props) => props.theme.colors.bg3};
    mask-image: url(${TutorialBackground.src});
`

const WelcomeIcon = styled.div`
    position: relative;
    > div {
        height: 2.125rem;
        width: 2.125rem;
        background-color: ${(props) => props.theme.colors.textHeadings};
    }
`

const WelcomeTitle = styled.div`
    position: relative;
    font-size: 1.375rem;
    color: ${(props) => props.theme.colors.textHeadings};
    font-family: ${(props) => props.theme.fonts.headings};
    padding: 20px 0;
`

const WelcomeBody = styled.div`
    position: relative;
    font-size: 0.875rem;
    line-height: 1.5rem;
    padding: 0 30px;
`

const WelcomeSubTitle = styled.div`
    position: relative;
    color: ${(props) => props.theme.colors.textHeadings};
    padding: 40px 0 20px 0;
    font-weight: bold;
`

const WelcomeButtons = styled.div`
    position: relative;
    display: grid;
    width: 100%;
    gap: 20px;
    grid-template-columns: 1fr 1fr;
    > button {
        padding: 29px 10px 18px 10px;
        display: flex;
        flex-direction: column;
        > div:first-child {
            height: 1.9rem !important;
            width: 3rem;
            margin-bottom: 10px;
        }
        > div:last-child {
            font-size: 0.875rem;
            font-weight: 500;
        }
    }
`

const WelcomeSkip = styled.div`
    opacity: 0.7;
    background: none;
    padding: 30px;
    &:not(:last-child) {
        padding-bottom: 0;
    }
`

const WideButton = styled.div`
    padding: 20px 0;
    width: 100%;
    position: relative;
    button {
        padding: 14px;
        background: ${(props) => props.theme.colors.bg2};
        width: 100%;
        justify-content: space-around;
    }
    &:not(:last-child) {
        padding-bottom: 0;
    }
`

const WelcomeButton = styled(LightColorButton)`
    margin-top: 30px;
    margin-bottom: 30px;
    width: 100%;
    display: flex;
    justify-content: space-around;
    color: ${(props) => props.theme.colors.textHeadings};
    border: 1px solid ${(props) => props.theme.colors.textHeadings};
`

const TootipContainer = styled.div`
    background-color: ${(props) => props.theme.colors.bg2};
    min-width: 250px;
    max-width: 350px;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    font-size: 1rem;
    font-weight: 600;
    max-height: calc(var(--app-height, 100%) - 20px);
    overflow: auto;
`

const TooltipHeader = styled.div`
    padding: 20px 20px 5px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`

const TooptipTitle = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.125rem;
`

const TooltipCount = styled.div`
    font-size: 0.875rem;
    opacity: 0.5;
    flex: 0 0 auto;
`

const ButtonTitle = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
`

const ButtonDesc = styled.div`
    font-size: 0.875rem;
`

const FadedText = styled.div`
    font-size: 0.875rem;
    opacity: 0.5;
`

const TooltipBody = styled.div`
    padding: 5px 20px 20px 20px;
    font-weight: 400;
`

const TutorialButton = styled(LightColorButton)`
    background: ${(props) => props.theme.colors.bg2};
    gap: 2px;
`

const TooltipControls = styled.div`
    margin-top: auto;
    padding: 20px;
    display: flex;
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    > button {
        display: flex;
        align-items: center;
    }
    > :first-child {
        opacity: 0.6;
        color: ${(props) => props.theme.colors.textMain};
        margin-right: auto;
    }
    > :nth-child(2) {
        color: ${(props) => props.theme.colors.textMain};
        margin-right: 20px;
        div {
            margin-right: 10px;

            background-color: ${(props) => props.theme.colors.textMain};
        }
    }
    > :nth-child(3) {
        color: ${(props) => props.theme.colors.textHeadings};
        div {
            margin-left: 10px;
            height: 15px;
            background-color: ${(props) => props.theme.colors.textHeadings};
        }
    }
`

function Tooltip({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    tooltipProps,
    size,
}: TooltipRenderProps) {
    const [session, setSession] = useRecoilState(Session)
    const [tutorialState, setTutorialState] = useRecoilState(TutorialState)
    const [menuVisible, setMenuVisible] = useRecoilState(MenuBarOpen)
    const [infoVisible, setInfoVisible] = useRecoilState(InfoBarOpen)
    const setShowTutorial = useSetRecoilState(ShowTutorial)
    const setLorebookOpen = useSetRecoilState(LorebookOpen)
    const setSelectedLoreEntry = useSetRecoilState(SelectedLorebookEntry)
    const setGenerateShown = useSetRecoilState(LorebookGenerateOpen)
    const setAddContextShown = useSetRecoilState(LorebookGeneratedExpanded)
    const setInfobarSelectedTab = useSetRecoilState(InfobarSelectedTab)
    useEffect(() => {
        if (typeof step.target === 'string') {
            const target = document.querySelector(step.target)
            if (!target) return
            if (
                target.getBoundingClientRect().bottom > (window.visualViewport?.height || window.innerHeight)
            ) {
                target.scrollIntoView(false)
            }
            if (target.getBoundingClientRect().top < 0) {
                target.scrollIntoView()
            }
        }
    }, [step.target])
    return (
        <TootipContainer {...tooltipProps}>
            <TooltipHeader>
                {step.title && <TooptipTitle>{step.title}</TooptipTitle>}
                <TooltipCount>
                    {index + 1}/{size}
                </TooltipCount>
            </TooltipHeader>
            <TooltipBody>{step.content}</TooltipBody>
            <TooltipControls>
                <SubtleButton
                    {...closeProps}
                    onClick={() => {
                        let stateString = 'Unknown'

                        switch (tutorialState.state) {
                            case TutorialStates.EDITOR_TUTORIAL:
                                stateString = 'Writing Editor'
                                break
                            case TutorialStates.ADVENTURE_TUTORIAL:
                                stateString = 'Text Adventure'
                                break
                            case TutorialStates.ADVANCED_TUTORIAL:
                                stateString = 'Advanced Tutorial'
                                break
                        }

                        ;(window as any).plausible('TutorialEarlyFinish', {
                            props: {
                                step: step.title?.toString() ?? 'No step title?',
                                type: stateString,
                            },
                        })

                        setTutorialState((v) => ({ ...v, state: -1 }))
                        const newSession = {
                            ...session,
                            settings: { ...session.settings, tutorialSeen: true },
                        }
                        setShowTutorial(false)
                        setSession(newSession)
                        getStorage(newSession).saveSettings(newSession.settings)
                    }}
                >
                    Skip Tutorial
                </SubtleButton>
                {index > 0 ? (
                    <SubtleButton
                        {...backProps}
                        onClick={(e) => {
                            const titleString = step.title?.toString() ?? ''

                            if (
                                tutorialState.state === TutorialStates.EDITOR_TUTORIAL ||
                                tutorialState.state === TutorialStates.ADVENTURE_TUTORIAL
                            ) {
                                if (titleString === 'Final Touches') {
                                    setTimeout(() => backProps.onClick(e), 1)
                                    return
                                }

                                if (titleString === 'The Options Sidebar') {
                                    if ((window.visualViewport?.width || window.innerWidth) < 1200)
                                        setInfoVisible(false)
                                    setTimeout(() => backProps.onClick(e), 1)
                                    return
                                }
                                if (titleString === 'Your Library' && !infoVisible) {
                                    setInfoVisible(true)
                                    if ((window.visualViewport?.width || window.innerWidth) < 1200)
                                        setMenuVisible(false)
                                    setTimeout(() => backProps.onClick(e), 500)
                                    return
                                }
                            }
                            if (tutorialState.state === TutorialStates.ADVANCED_TUTORIAL) {
                                const sidebarSteps = [
                                    'AI Modules',
                                    'Memory',
                                    "Author's Note 1/2",
                                    "Author's Note 2/2",
                                    'Lorebook',
                                    'Lorebook Entries',
                                ]

                                // Manage advanced tutorial step changes
                                if (!infoVisible && sidebarSteps.includes(titleString)) {
                                    setInfoVisible(true)
                                    setTimeout(() => backProps.onClick(e), 100)
                                    return
                                }

                                if (titleString === 'Lorebook Entries') {
                                    setLorebookOpen(false)
                                    setTimeout(() => backProps.onClick(e), 100)
                                    return
                                }

                                if (titleString === 'Lorebook Generation 1/3') {
                                    setSelectedLoreEntry('74180e75-5c1d-415c-9b35-8dd7cb7428f3')
                                }

                                if (titleString === 'Lorebook Generation 2/3') {
                                    setGenerateShown(false)
                                }

                                if (titleString === 'Lorebook Generation Context') {
                                    setGenerateShown(true)
                                    setTimeout(() => backProps.onClick(e), 1)
                                    return
                                }

                                if (titleString === 'Lorebook Keys') {
                                    setAddContextShown(true)
                                    setGenerateShown(true)
                                    setTimeout(() => backProps.onClick(e), 1)
                                    return
                                }

                                if (titleString === 'View Story Stats') {
                                    setLorebookOpen(true)
                                    setTimeout(() => backProps.onClick(e), 100)
                                    return
                                }
                            }
                            backProps.onClick(e)
                        }}
                    >
                        Back
                    </SubtleButton>
                ) : (
                    <div />
                )}
                {continuous ? (
                    <SubtleButton
                        {...primaryProps}
                        onClick={(e) => {
                            const titleString = step.title?.toString() ?? ''
                            if (
                                tutorialState.state === TutorialStates.EDITOR_TUTORIAL ||
                                tutorialState.state === TutorialStates.ADVENTURE_TUTORIAL
                            ) {
                                // Manage basic tutorial step changes
                                if (titleString === 'Leave Your Mark') {
                                    setTimeout(() => primaryProps.onClick(e), 1)
                                    setMenuVisible(true)
                                    return
                                }
                                if (titleString === 'Final Touches') {
                                    setInfobarSelectedTab(0)
                                }
                                if (titleString === 'Final Touches' && !infoVisible) {
                                    setInfoVisible(true)
                                    setTimeout(() => primaryProps.onClick(e), 500)
                                    setInfobarSelectedTab(0)

                                    return
                                }
                                if (titleString === 'The Options Sidebar') {
                                    setInfobarSelectedTab(2)
                                }
                                if (titleString === 'Preset this!' && !menuVisible) {
                                    setInfobarSelectedTab(0)
                                    if ((window.visualViewport?.width || window.innerWidth) < 1200)
                                        setInfoVisible(false)
                                    setMenuVisible(true)
                                    setTimeout(() => primaryProps.onClick(e), 500)
                                    return
                                }
                                if (titleString === 'Your Library') {
                                    setTutorialState((v) => ({ ...v, state: TutorialStates.BASIC_COMPLETE }))
                                }

                                if (titleString === 'Send It Away!') invokeHotkeyEvent(HotEvent.editorRequest)

                                if (titleString === 'A New Direction') invokeHotkeyEvent(HotEvent.inputRetry)
                            }
                            if (tutorialState.state === TutorialStates.ADVANCED_TUTORIAL) {
                                const sidebarSteps = [
                                    'The Story Tab Tutorial',
                                    'AI Modules',
                                    'Memory',
                                    "Author's Note 1/2",
                                    "Author's Note 2/2",
                                ]

                                // Manage advanced tutorial step changes
                                if (!infoVisible && sidebarSteps.includes(titleString)) {
                                    setInfoVisible(true)
                                    setTimeout(() => primaryProps.onClick(e), 500)
                                    return
                                }

                                if (titleString === 'Lorebook') {
                                    setLorebookOpen(true)
                                    setGenerateShown(false)
                                    setTimeout(() => primaryProps.onClick(e), 500)
                                    setSelectedLoreEntry('74180e75-5c1d-415c-9b35-8dd7cb7428f3')
                                    return
                                }

                                if (titleString === 'Lorebook Entries') {
                                    setSelectedLoreEntry('74180e75-5c1d-415c-9b35-8dd7cb7428f3')
                                }

                                if (titleString === 'Lorebook Generation 1/3') {
                                    setGenerateShown(true)
                                    setTimeout(() => primaryProps.onClick(e), 1)
                                    return
                                }

                                if (titleString === 'Lorebook Generation 3/3') {
                                    setAddContextShown(true)
                                    setTimeout(() => primaryProps.onClick(e), 1)
                                    return
                                }

                                if (titleString === 'Lorebook Keys') {
                                    setLorebookOpen(false)
                                    setTimeout(() => primaryProps.onClick(e), 1)
                                    return
                                }

                                if (titleString === 'Saving & Exporting') {
                                    setTutorialState((v) => ({
                                        ...v,
                                        state: TutorialStates.ADVANCED_COMPLETE,
                                    }))
                                }
                            }
                            primaryProps.onClick(e)
                        }}
                    >
                        {step.title?.toString() === 'Send It Away!' ? (
                            <>
                                Send <SendIcon style={{ marginLeft: '5px' }} />
                            </>
                        ) : step.title?.toString() === 'A New Direction' ? (
                            <>
                                Retry <ReloadIcon style={{ marginLeft: '5px' }} />
                            </>
                        ) : (
                            <>
                                Next <ArrowRightIcon />
                            </>
                        )}
                    </SubtleButton>
                ) : (
                    <div style={{ width: '6ch' }} />
                )}
            </TooltipControls>
        </TootipContainer>
    )
}

export const tutorialStep = 0

export enum TutorialStates {
    WELCOME_SCREEN = -1,
    EDITOR_TUTORIAL = 0,
    ADVENTURE_TUTORIAL = 1,
    BASIC_COMPLETE = 2,
    ADVANCED_TUTORIAL = 3,
    ADVANCED_COMPLETE = 4,
}

export default function Tutorial(): JSX.Element {
    const [session, setSession] = useRecoilState(Session)
    const theme = useRecoilValue(SiteTheme)
    const [tutorialState, setTutorialState] = useRecoilState(TutorialState)

    const [stories, setStories] = useRecoilState(Stories)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const setSelectedStory = useSetRecoilState(SelectedStory)
    const [showTutorial, setShowTutorial] = useRecoilState(ShowTutorial)

    const setInfoVisible = useSetRecoilState(InfoBarOpen)
    const setInfobarSelectedTab = useSetRecoilState(InfobarSelectedTab)

    const setTutorialCleared = () => {
        const newSession = {
            ...session,
            settings: { ...session.settings, tutorialSeen: true },
        }
        setSession(newSession)
        getStorage(newSession).saveSettings(newSession.settings)
    }

    const [tutorialStoryId, setTutorialStoryId] = useState('')

    const tutorialSteps = useMemo(
        () =>
            [
                {
                    disableBeacon: true,
                    target: '.conversation-editor',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Behold, Your Canvas.',
                    content: (
                        <>
                            <div>
                                This field is your workspace, a sandbox for{' '}
                                <Emphasis>your imagination</Emphasis>!
                            </div>
                            <br />
                            <div>
                                You can type <strong>anything</strong> into this field for the AI to pick up
                                from your input.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                <strong>Proper English</strong> will produce better results, but{' '}
                                <strong>don’t let that stop you</strong> from{' '}
                                <Emphasis>experimenting around</Emphasis> with the AI! The AI will pick up
                                from your input so if you use grammatically correct English it will output on
                                in the same vein.
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.conversation-editor',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'A Prompt Introduction',
                    content: (
                        <>
                            <div>
                                This text is a <Emphasis>Prompt</Emphasis>, text written before the first AI
                                generation. <Emphasis>It is the basis of your AI-generated story.</Emphasis>
                            </div>
                            <br />
                            <div>
                                A <Emphasis>Prompt</Emphasis> can be empty, consist of a single word, a
                                sentence or as much text as you’d like. By default,{' '}
                                <PromptColor>Prompts are uniquely color coded.</PromptColor>
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                The more initial text your Prompt has, the better the AI’s outputs will be.
                            </Tip>
                            <div>
                                Feel free to add to or replace the existing <Emphasis>Prompt</Emphasis> if you
                                like, then hit{' '}
                                <Emphasis>
                                    <strong>Next</strong>
                                </Emphasis>
                                .
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.send.button',
                    placement: 'top',
                    title: 'Send It Away!',
                    content: (
                        <>
                            <div>
                                That&apos;s it! Now it’s time to send this beauty of a{' '}
                                <Emphasis>Prompt</Emphasis> off to the AI.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                You don’t even need to finish sentences or have to enter text at all.
                                <br />
                                The AI can pick up <strong>without any input</strong> from your side.
                            </Tip>

                            <div>
                                Hit{' '}
                                <Emphasis>
                                    <strong>Send</strong>
                                </Emphasis>{' '}
                                and watch the AI do the rest of the work.
                                <i>
                                    {' '}
                                    You can also use <Emphasis>Ctrl + Enter</Emphasis> whenever you are done
                                    typing!
                                </i>
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.conversation-editor',
                    placement: 'left-start',
                    title: 'It’s Alive!',
                    content: (
                        <>
                            <div>
                                As you can see, by default{' '}
                                <OutputColor>
                                    <Emphasis>all AI-generated text is displayed in its own color.</Emphasis>
                                </OutputColor>
                            </div>
                            <br />
                            <div>
                                You might’ve also noticed that{' '}
                                <InputColor>any new text you write after the first generation</InputColor>{' '}
                                will appear <InputColor>color coded</InputColor> as well!
                            </div>
                            <br />
                            <div>
                                Also, any <EditColor>edits</EditColor> you make to your story will be{' '}
                                <EditColor>color coded</EditColor> so that you can easily track how{' '}
                                <OutputColor>the AI</OutputColor> and <InputColor>you</InputColor>{' '}
                                collaborate!
                            </div>
                            <br />
                            <div>
                                Everything you{' '}
                                <InputColor>
                                    <strong>write</strong>
                                </InputColor>{' '}
                                and{' '}
                                <Emphasis>
                                    <strong>generate</strong>
                                </Emphasis>{' '}
                                will be added to your{' '}
                                <Emphasis>
                                    <strong>Context</strong>
                                </Emphasis>{' '}
                                (Depending on your subscription tier: around 4000 / 8000 characters consisting
                                of your story text and prompt setup is sent to the AI).{' '}
                                <Emphasis>This is the extent of what the AI can remember.</Emphasis>
                            </div>

                            <Tip>
                                <i>
                                    Keep your context limit in mind as you enter long{' '}
                                    <PromptColor>prompts</PromptColor> or <InputColor>text inputs</InputColor>
                                    !
                                </i>
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.retry.button',
                    placement: 'top',
                    title: 'A New Direction',
                    content: (
                        <>
                            <div>
                                This text we just generated is pretty neat, but let’s see the other sweet
                                outputs we can get!
                            </div>
                            <br />
                            <div>
                                Go ahead and hit the{' '}
                                <Emphasis>
                                    <strong>Retry</strong>
                                </Emphasis>{' '}
                                button to make the AI replace what was just generated with something else.
                            </div>

                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                Don’t worry about losing the previous <OutputColor>AI generation</OutputColor>{' '}
                                if you liked it! You can come back to it at any time.{' '}
                                <i>We’ll cover that in just a bit.</i>
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.conversation-editor, .send, .retry',
                    placement: 'left-start',
                    title: 'Sending and Replacing',
                    content: (
                        <>
                            <div>The old generation has now been replaced by the new one.</div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                If you <strong>hover</strong> over the <strong>Retry</strong> button you can
                                see exactly <HighlightColor>which text will be affected</HighlightColor>!
                            </Tip>
                            <div>
                                To recap, hit{' '}
                                <Emphasis>
                                    <strong>Send</strong>
                                </Emphasis>{' '}
                                to generate something completely new, and hit{' '}
                                <Emphasis>
                                    <strong>Retry</strong>
                                </Emphasis>{' '}
                                to replace your last generation with a new one.
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.undo-redo',
                    placement: 'top',
                    title: 'Undoing Your Mistakes',
                    content: (
                        <>
                            <div>
                                <Emphasis>
                                    You can <strong>Undo</strong> and <strong>Redo</strong> changes to the
                                    Story, including entire generations.
                                </Emphasis>
                            </div>
                            <br />
                            <div>
                                NovelAI keeps track of your generation history, which can be found by clicking
                                the number next to{' '}
                                <Emphasis>
                                    <strong>Redo</strong>
                                </Emphasis>
                                ,{' '}
                                <i>
                                    after pressing{' '}
                                    <Emphasis>
                                        <strong>Undo</strong>
                                    </Emphasis>
                                </i>{' '}
                                at least once.
                            </div>

                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                You can even{' '}
                                <Emphasis>
                                    <strong>Undo</strong>
                                </Emphasis>{' '}
                                all the way back to the prompt of your story at any time!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.conversation-title',
                    placement: 'bottom-end',
                    title: 'Leave Your Mark',
                    content: (
                        <>
                            <div>
                                This story is truly <strong>a masterpiece</strong>. It signifies your first
                                steps into the AI-generated universe!
                            </div>
                            <br />
                            <div>
                                Go ahead and click the{' '}
                                <Emphasis>
                                    <strong>Story Title</strong>
                                </Emphasis>{' '}
                                to edit your Story&apos;s name.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                You can toggle to hide your default Story title visibility in your{' '}
                                <strong>Interface Settings</strong>!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: `.sidebar-story-card[data-id="${tutorialStoryId}"], .story-metadata-modal`,
                    placement: 'right-start',
                    title: 'Final Touches',
                    content: (
                        <>
                            <div>
                                Alternatively you can click the{' '}
                                <Emphasis>
                                    <EditIcon
                                        highlight
                                        style={{ display: 'inline-block', position: 'relative', top: '5px' }}
                                    />{' '}
                                    <strong>Edit icon</strong>
                                </Emphasis>{' '}
                                here to edit the Story’s info.
                            </div>
                            <div>
                                You can also easily{' '}
                                <DeleteIcon
                                    highlight
                                    style={{
                                        display: 'inline-block',
                                        position: 'relative',
                                        top: '4px',
                                        width: '15px',
                                    }}
                                />{' '}
                                <Emphasis>
                                    <strong>Delete</strong>
                                </Emphasis>
                                ,{' '}
                                <CopyIcon
                                    highlight
                                    style={{
                                        display: 'inline-block',
                                        position: 'relative',
                                        top: '4px',
                                        width: '15px',
                                    }}
                                />{' '}
                                <Emphasis>
                                    <strong>Duplicate</strong>
                                </Emphasis>{' '}
                                or{' '}
                                <ExportIcon
                                    highlight
                                    style={{
                                        display: 'inline-block',
                                        position: 'relative',
                                        top: '3px',
                                        height: '14px',
                                    }}
                                />{' '}
                                <Emphasis>
                                    <strong>Export</strong>
                                </Emphasis>{' '}
                                in the left sidebar menu!
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip: </strong>
                                </Emphasis>
                                All of the options seen in the story info are purely cosmetic and for your own
                                organization.
                                <br />
                                <Emphasis>They don’t affect the AI or your story!</Emphasis>{' '}
                            </Tip>

                            <div>
                                There’s just one last thing to cover before we let you go...{' '}
                                <Emphasis>
                                    <strong>the Sidebars</strong>
                                </Emphasis>
                                !{' '}
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.infobar',
                    placement: 'left-start',
                    title: 'The Options Sidebar',
                    content: (
                        <>
                            <div>
                                Here you’ll find story-unique options that let you influence the AI’s outputs.
                                You can also{' '}
                                <Emphasis>
                                    <strong>Export</strong>
                                </Emphasis>
                                ,{' '}
                                <Emphasis>
                                    <strong>Duplicate</strong>
                                </Emphasis>{' '}
                                or{' '}
                                <Emphasis>
                                    <strong>Delete</strong>
                                </Emphasis>{' '}
                                your story, and much, much more.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                All these settings are <strong>unique to your story.</strong> Your settings{' '}
                                <Emphasis>
                                    <strong>do not carry over</strong>
                                </Emphasis>{' '}
                                between individual stories.
                            </Tip>
                            <div>
                                It may <strong>look</strong> threatening,
                                <Emphasis> but luckily all of it is entirely optional.</Emphasis>
                                <br />
                                <br />
                                Should you decide to check it out now, there are simple descriptions of what
                                the various options do to help you get started.
                            </div>
                            <br />
                            <div>
                                We&apos;ll cover all these sections in <strong>another Tutorial</strong>!
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.infobar',
                    placement: 'left-start',
                    title: 'Preset this!',
                    content: (
                        <>
                            <div>
                                Due to the flexibility of AI-assisted storytelling, it is hard to define a
                                specific setting that would encompass all writing methods.
                            </div>
                            <br />
                            <div>
                                Because of this, we have come up with various{' '}
                                <strong>Setting Configuration Presets</strong> that assist the AI in different
                                aspects.
                            </div>
                            <br />
                            <div>
                                While the descriptions might seem vague at first, you might be surprised with
                                the results you get by using different presets.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                Switching your preset might help get the AI back on track if the AI completely
                                goes off the rails, outputs nonsense or begins to loop!
                            </Tip>

                            <div>
                                Now, let&apos;s head to the left Sidebar, <strong>the Menubar</strong>!
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.menubar',
                    placement: 'right-start',
                    title: 'Your Library',
                    content: (
                        <>
                            <div>Here you’ll find all of your existing stories laid out nice and neat.</div>
                            <br />
                            <div>
                                At the top you can access the{' '}
                                <Emphasis>
                                    <SettingsIcon
                                        highlight
                                        style={{ display: 'inline-block', position: 'relative', top: '3px' }}
                                    />{' '}
                                    <strong>User Settings </strong>
                                </Emphasis>
                                to customize your NovelAI experience just the way you like it.
                            </div>
                            <br />
                            <div>
                                Adjust the{' '}
                                <Emphasis>
                                    <strong>AI Settings</strong>
                                </Emphasis>
                                , customize your visual{' '}
                                <Emphasis>
                                    <strong>Interface</strong>
                                </Emphasis>{' '}
                                and{' '}
                                <Emphasis>
                                    <strong>Theme</strong>
                                </Emphasis>{' '}
                                colors and adjust your{' '}
                                <Emphasis>
                                    <strong>Account Settings</strong>
                                </Emphasis>
                                . You can also view our{' '}
                                <Emphasis>
                                    <strong>Hotkeys</strong>
                                </Emphasis>{' '}
                                to navigate NovelAI through your keyboard!
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip: </strong>
                                </Emphasis>
                                You don&apos;t need to use the Import Button, you can drag and drop files
                                directly into the editor!
                            </Tip>
                            <div>
                                The buttons to start a{' '}
                                <Emphasis>
                                    <strong>New Story</strong>
                                </Emphasis>{' '}
                                and to{' '}
                                <Emphasis>
                                    <strong>Import Files</strong>
                                </Emphasis>{' '}
                                supported by NovelAI are found at the bottom.
                            </div>
                        </>
                    ),
                },
            ] as Step[],
        [tutorialStoryId]
    )
    const adventureTutorialSteps = useMemo(
        () =>
            [
                {
                    disableBeacon: true,
                    target: '.conversation-input-container',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Your Adventure Begins.',
                    content: (
                        <>
                            <div>
                                <Emphasis>This is where all the action takes place. </Emphasis>
                            </div>
                            <div>
                                The three buttons below the text area allow you to select{' '}
                                <Emphasis>what kind of input</Emphasis> you want to send for the AI to work
                                with.
                            </div>
                            <br />
                            <div>
                                <Emphasis>
                                    <RunningManIcon
                                        highlight
                                        style={{
                                            display: 'inline-block',
                                            position: 'relative',
                                            top: '5px',
                                            width: '13px',
                                            marginRight: '4px',
                                        }}
                                    />{' '}
                                    <strong>Do</strong>
                                </Emphasis>{' '}
                                lets you perform an action.
                            </div>
                            <div>
                                <Emphasis>
                                    <SpeechBubbleIcon
                                        highlight
                                        style={{
                                            display: 'inline-block',
                                            position: 'relative',
                                            top: '6px',
                                            width: '13px',
                                            marginRight: '4px',
                                        }}
                                    />{' '}
                                    <strong>Say</strong>
                                </Emphasis>{' '}
                                lets you speak as yourself.
                            </div>
                            <div>
                                <Emphasis>
                                    <BookOpenIcon
                                        highlight
                                        style={{
                                            display: 'inline-block',
                                            position: 'relative',
                                            top: '5px',
                                            width: '13px',
                                            marginRight: '4px',
                                        }}
                                    />{' '}
                                    <strong>Story</strong>
                                </Emphasis>{' '}
                                lets you write the story directly.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                You don&apos;t even need to finish your action sentences, use a{' '}
                                <Emphasis>
                                    <strong>* Symbol</strong>
                                </Emphasis>{' '}
                                to let the AI fill in the rest for you!
                                <br />
                                The AI could also pick up <strong>without any input</strong> from your side -
                                just hit{' '}
                                <Emphasis>
                                    <strong>Send!</strong>
                                </Emphasis>
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.adventureStory',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'This World is Yours to Control',
                    content: (
                        <>
                            <div>
                                This text is a <Emphasis>Prompt</Emphasis>, text written before the first AI
                                generation. <Emphasis>It is the basis of your AI-generated story.</Emphasis>
                            </div>
                            <br />
                            <div>
                                A <Emphasis>Prompt</Emphasis> can be empty, consist of a single word, a
                                sentence or as much text as you’d like. By default,{' '}
                                <PromptColor>Prompts are uniquely color coded.</PromptColor>
                            </div>
                            <br />
                            <div>
                                <Emphasis>The text in these boxes is completely editable.</Emphasis> Feel free
                                to{' '}
                                <Emphasis>
                                    <strong>cut</strong>
                                </Emphasis>
                                ,{' '}
                                <Emphasis>
                                    <strong>add</strong>
                                </Emphasis>{' '}
                                or{' '}
                                <Emphasis>
                                    <strong>edit</strong>
                                </Emphasis>{' '}
                                any section of the text{' '}
                                <i>
                                    <strong>at any time</strong>
                                </i>
                                .
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                If you want to generate more text for any action just hit{' '}
                                <Emphasis>
                                    <strong>Send</strong>
                                </Emphasis>{' '}
                                again!
                            </Tip>
                            <div>
                                <strong>Type out something</strong> in response to the given{' '}
                                <PromptColor>Prompt</PromptColor>, then hit Next.{' '}
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.send.button',
                    placement: 'top',
                    title: 'Send It Away!',
                    content: (
                        <>
                            <div>
                                Now that you have some text entered, it’s time to send it off to the AI.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                <strong>Proper English</strong> will produce better results but{' '}
                                <strong>don’t let that stop you</strong> from{' '}
                                <Emphasis>experimenting around</Emphasis> with the AI! The AI will pick up
                                from your input so if you use grammatically correct English it will output on
                                in the same vein.
                            </Tip>
                            <div>
                                Hit{' '}
                                <Emphasis>
                                    <strong>Send</strong>
                                </Emphasis>{' '}
                                and watch the AI do the rest of the work.
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.conversation-editor',
                    placement: 'left-end',
                    title: 'It’s Alive!',
                    content: (
                        <>
                            <div>
                                As you can see, by default{' '}
                                <OutputColor>
                                    <Emphasis>all AI-generated text is displayed in its own color.</Emphasis>
                                </OutputColor>
                            </div>
                            <br />
                            <div>
                                You might’ve also noticed that{' '}
                                <InputColor>any new text you write after the first generation</InputColor>{' '}
                                will appear <InputColor>color coded</InputColor> as well!
                            </div>
                            <br />
                            <div>
                                Also, any <EditColor>edits</EditColor> you make to your story will be{' '}
                                <EditColor>color coded</EditColor> so that you can easily track how{' '}
                                <OutputColor>the AI</OutputColor> and <InputColor>you</InputColor>{' '}
                                collaborate!
                            </div>
                            <br />
                            <div>
                                Everything you{' '}
                                <InputColor>
                                    <strong>write</strong>
                                </InputColor>{' '}
                                and{' '}
                                <Emphasis>
                                    <strong>generate</strong>
                                </Emphasis>{' '}
                                will be added to your{' '}
                                <Emphasis>
                                    <strong>Context</strong>
                                </Emphasis>{' '}
                                (Depending on your subscription tier: around 4000 / 8000 characters consisting
                                of your story text and prompt setup is sent to the AI).{' '}
                                <Emphasis>This is the extent of what the AI can remember.</Emphasis>
                            </div>
                            <Tip>
                                <i>
                                    Keep your context limit in mind as you enter long{' '}
                                    <PromptColor>prompts</PromptColor> or <InputColor>text inputs</InputColor>
                                    !
                                </i>
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.retry.button',
                    placement: 'top',
                    title: 'A New Direction',
                    content: (
                        <>
                            <div>
                                This text we just generated is pretty neat, but let’s see the other sweet
                                outputs we can get!
                            </div>
                            <br />
                            <div>
                                Go ahead and hit the{' '}
                                <Emphasis>
                                    <strong>Retry</strong>
                                </Emphasis>{' '}
                                button to make the AI replace what was just generated with something else.
                            </div>

                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                Don’t worry about losing the previous <OutputColor>AI generation</OutputColor>{' '}
                                if you liked it! You can come back to it at any time.{' '}
                                <i>We’ll cover that in just a bit.</i>
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.conversation-editor, .send, .retry',
                    placement: 'left-end',
                    title: 'Sending and Replacing',
                    content: (
                        <>
                            <div>The old generation has now been replaced by the new one.</div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                If you <strong>hover</strong> over the <strong>Retry</strong> button you can
                                see exactly <HighlightColor>which text will be affected</HighlightColor>!
                            </Tip>
                            <div>
                                To recap, hit{' '}
                                <Emphasis>
                                    <strong>Send</strong>
                                </Emphasis>{' '}
                                to generate something completely new, and hit{' '}
                                <Emphasis>
                                    <strong>Retry</strong>
                                </Emphasis>{' '}
                                to replace your last generation with a new one.
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.undo-redo, .redo-menu',
                    placement: 'top',
                    title: 'Undoing Your Mistakes',
                    content: (
                        <>
                            <div>
                                <Emphasis>
                                    You can <strong>Undo</strong> and <strong>Redo</strong> changes to the
                                    Story, including entire generations.
                                </Emphasis>
                            </div>
                            <br />
                            <div>
                                NovelAI keeps track of your generation history, which can be found by clicking
                                the number next to{' '}
                                <Emphasis>
                                    <strong>Redo</strong>
                                </Emphasis>
                                ,{' '}
                                <i>
                                    after pressing{' '}
                                    <Emphasis>
                                        <strong>Undo</strong>
                                    </Emphasis>
                                </i>{' '}
                                at least once.
                            </div>

                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                You can even{' '}
                                <Emphasis>
                                    <strong>Undo</strong>
                                </Emphasis>{' '}
                                all the way back to the prompt of your story at any time!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.conversation-title',
                    placement: 'bottom-end',
                    title: 'Leave Your Mark',
                    content: (
                        <>
                            <div>
                                This story is truly <strong>a masterpiece</strong>. It signifies your first
                                steps into the AI-generated universe!
                            </div>
                            <br />
                            <div>
                                Go ahead and click the{' '}
                                <Emphasis>
                                    <strong>Story Title</strong>
                                </Emphasis>{' '}
                                to edit your Story&apos;s name.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                You can toggle to hide your default Story title visibility in your{' '}
                                <strong>Interface Settings</strong>!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: `.sidebar-story-card[data-id="${tutorialStoryId}"], .story-metadata-modal`,
                    placement: 'right-start',
                    title: 'Final Touches',
                    content: (
                        <>
                            <div>
                                Alternatively you can click the{' '}
                                <Emphasis>
                                    <EditIcon
                                        highlight
                                        style={{ display: 'inline-block', position: 'relative', top: '5px' }}
                                    />{' '}
                                    <strong>Edit icon</strong>
                                </Emphasis>{' '}
                                here to edit the Story’s info.
                            </div>
                            <div>
                                You can also easily{' '}
                                <DeleteIcon
                                    highlight
                                    style={{
                                        display: 'inline-block',
                                        position: 'relative',
                                        top: '4px',
                                        width: '15px',
                                    }}
                                />{' '}
                                <Emphasis>
                                    <strong>Delete</strong>
                                </Emphasis>
                                ,{' '}
                                <CopyIcon
                                    highlight
                                    style={{
                                        display: 'inline-block',
                                        position: 'relative',
                                        top: '4px',
                                        width: '15px',
                                    }}
                                />{' '}
                                <Emphasis>
                                    <strong>Duplicate</strong>
                                </Emphasis>{' '}
                                or{' '}
                                <ExportIcon
                                    highlight
                                    style={{
                                        display: 'inline-block',
                                        position: 'relative',
                                        top: '3px',
                                        height: '14px',
                                    }}
                                />{' '}
                                <Emphasis>
                                    <strong>Export</strong>
                                </Emphasis>{' '}
                                in the left sidebar menu!
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip: </strong>
                                </Emphasis>
                                All of the options seen in the story info are purely cosmetic and for your own
                                organization.
                                <br />
                                <Emphasis>They don’t affect the AI or your story!</Emphasis>{' '}
                            </Tip>

                            <div>
                                There’s just one last thing to cover before we let you go...{' '}
                                <Emphasis>
                                    <strong>the Sidebars</strong>
                                </Emphasis>
                                !{' '}
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.infobar',
                    placement: 'left-start',
                    title: 'Preset this!',
                    content: (
                        <>
                            <div>
                                Due to the flexibility of AI-assisted storytelling, it is hard to define a
                                specific setting that would encompass all writing methods.
                            </div>
                            <br />
                            <div>
                                Because of this, we have come up with various{' '}
                                <strong>Setting Configuration Presets</strong> that assist the AI in different
                                aspects.
                            </div>
                            <br />
                            <div>
                                While the descriptions might seem vague at first, you might be surprised with
                                the results you get by using different presets.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                Switching your preset might help get the AI back on track if the AI completely
                                goes off the rails, outputs nonsense or begins to loop!
                            </Tip>

                            <div>
                                Now, let&apos;s head to the left Sidebar, <strong>the Menubar</strong>!
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.menubar',
                    placement: 'right-start',
                    title: 'Your Library',
                    content: (
                        <>
                            <div>Here you’ll find all of your existing stories laid out nice and neat.</div>
                            <br />
                            <div>
                                At the top you can access the{' '}
                                <Emphasis>
                                    <SettingsIcon
                                        highlight
                                        style={{ display: 'inline-block', position: 'relative', top: '3px' }}
                                    />{' '}
                                    <strong>User Settings </strong>
                                </Emphasis>
                                to customize your NovelAI experience just the way you like it.
                            </div>
                            <br />
                            <div>
                                Adjust the{' '}
                                <Emphasis>
                                    <strong>AI Settings</strong>
                                </Emphasis>
                                , customize your visual{' '}
                                <Emphasis>
                                    <strong>Interface</strong>
                                </Emphasis>{' '}
                                and{' '}
                                <Emphasis>
                                    <strong>Theme</strong>
                                </Emphasis>{' '}
                                colors and adjust your{' '}
                                <Emphasis>
                                    <strong>Account Settings</strong>
                                </Emphasis>
                                . You can also view our{' '}
                                <Emphasis>
                                    <strong>Hotkeys</strong>
                                </Emphasis>{' '}
                                to navigate NovelAI through your keyboard!
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip: </strong>
                                </Emphasis>
                                You don&apos;t need to use the Import Button, you can drag and drop files
                                directly into the editor!
                            </Tip>
                            <div>
                                The buttons to start a{' '}
                                <Emphasis>
                                    <strong>New Story</strong>
                                </Emphasis>{' '}
                                and to{' '}
                                <Emphasis>
                                    <strong>Import Files</strong>
                                </Emphasis>{' '}
                                supported by NovelAI are found at the bottom.
                            </div>
                        </>
                    ),
                },
            ] as Step[],
        [tutorialStoryId]
    )
    const advancedTutorial = useMemo(
        () =>
            [
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.infobar',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'The Story Tab Tutorial',
                    content: (
                        <>
                            <div>Welcome back!</div>
                            <br />
                            <div>
                                Now let&apos;s look at the tools we can use to{' '}
                                <Emphasis>lead our Story </Emphasis>
                                exactly where we want it to go!
                            </div>
                            <br />
                            <div>
                                In this Tutorial we will exclusively cover the{' '}
                                <strong>Story-unique Settings</strong> in our right <strong>Sidebar</strong>{' '}
                                menu.
                            </div>
                            <br />
                            <div>
                                Here you find a variety of neat tools that let you control how the AI will
                                interact with your story!
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip: </strong>
                                </Emphasis>
                                Remember all the information you enter here is exclusive to the selected
                                <Emphasis> Story </Emphasis> - Settings <strong>will not carry over</strong>{' '}
                                between multiple Stories.
                                <br />
                                <br />
                                <Emphasis>Duplicate</Emphasis> or <Emphasis>Export</Emphasis> a{' '}
                                <Emphasis>Story</Emphasis>, and it will retain all your Story Settings though!
                                <br />
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.ai-module-card',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'AI Modules',
                    content: (
                        <>
                            <div>
                                Load up an{' '}
                                <Emphasis>
                                    <strong>AI Module</strong>
                                </Emphasis>{' '}
                                to focus the AI into a desired genre, setting or world:{' '}
                                <Emphasis>
                                    <strong>AI Modules</strong>
                                </Emphasis>{' '}
                                let you quickly draw upon specific topics, emulate famous authors, writing
                                styles or give the AI reference material.
                            </div>
                            <br />
                            <div>
                                Click{' '}
                                <Emphasis>
                                    <strong>All Modules</strong>
                                </Emphasis>{' '}
                                to open the{' '}
                                <Emphasis>
                                    <strong>AI Module Browser </strong>
                                </Emphasis>
                                for easy navigation.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                Alternately, you can use AI Modules created by the community, make one using
                                your own writing, or use the writing of your favorite author! Provided you
                                have the text to do so, of course.
                                <br />
                                <br />
                                All the Custom AI Modules you create or load into NovelAI are{' '}
                                <strong>automatically saved</strong> and visible in the{' '}
                                <Emphasis>
                                    <strong>AI Module Browser</strong>
                                </Emphasis>
                                !
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.memory-card',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Memory',
                    content: (
                        <>
                            <div>
                                The{' '}
                                <strong>
                                    <Emphasis>Memory</Emphasis>
                                </strong>{' '}
                                field can be used to store broad details related to your current setting, your
                                character, their companions and what has previously happened in your story.
                            </div>
                            <br />
                            <div>
                                Updating this field with{' '}
                                <Emphasis>
                                    <strong>important story elements</strong>
                                </Emphasis>{' '}
                                as they take place will help the AI stay more consistent.
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                <strong>
                                    <Emphasis>Memory</Emphasis>
                                </strong>{' '}
                                is inserted at the top of your <strong>Story Context</strong>, before anything
                                else. The AI will <strong>never</strong> forget information you place here!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.an-card',
                    placement: 'left-start',
                    isFixed: true,
                    title: "Author's Note 1/2",
                    content: (
                        <>
                            <div>
                                The{' '}
                                <strong>
                                    <Emphasis>Author&apos;s Note</Emphasis>
                                </strong>{' '}
                                has nearly limitless usages. You can use it to give the story a primary focus,
                                set a writing style, author or tone elements.
                            </div>
                            <br />
                            <div>
                                Describe just about <i>anything</i> with a few short sentences and lend your
                                story a focus, details, moods or give it premonitions to make something
                                happen.
                            </div>

                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                The text in your Author&apos;s Note is one of most recent things the AI sees
                                in your Story Context, supercharging its influence over your story!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.an-card',
                    placement: 'left-start',
                    isFixed: true,
                    title: "Author's Note 2/2",
                    content: (
                        <>
                            <div>
                                <Emphasis>
                                    <strong>Different formats can lead to different results: </strong>
                                </Emphasis>{' '}
                                You can simply describe things with words or tag your story with Authors,
                                Genres, content Tags or Styles in brackets as seen in the{' '}
                                <strong>
                                    <Emphasis>Author&apos;s Note</Emphasis>
                                </strong>{' '}
                                field to the right!
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                Feel free to experiment with the <br />
                                <strong>[ Style: Genre: Tag: ]</strong> tags! Our AI knows many different tags
                                for styles and genres!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.lorebook-access-card, .lorebook',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Lorebook',
                    content: (
                        <>
                            <div>
                                The{' '}
                                <strong>
                                    <Emphasis>Lorebook</Emphasis>
                                </strong>{' '}
                                is used to store information <i>that is not always relevant</i>, which the AI
                                refers to only when a <i>custom</i> keyword is activated.
                            </div>

                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                The information stored in your Lorebook doesn&apos;t take up any space in your
                                Story Context unless triggered by a keyword!
                            </Tip>
                            <div>
                                Your{' '}
                                <strong>
                                    <Emphasis>Lorebook</Emphasis>
                                </strong>{' '}
                                helps the AI refer to any information you provide or generate for the specific
                                elements in your story, such as characters, events, or locations.
                            </div>
                            <br />
                            <div>
                                It&apos;s time to take an in-depth look at the{' '}
                                <strong>
                                    <Emphasis>Lorebook</Emphasis>
                                </strong>{' '}
                                and how to generate text with it!
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.lorebook-inserted-text',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Lorebook Entries',
                    content: (
                        <>
                            <div>
                                Let&apos;s take a look at this example
                                <strong>
                                    <Emphasis> Lorebook</Emphasis>
                                </strong>{' '}
                                entry for a Character!
                            </div>
                            <br />
                            <div>
                                Galena is our witch companion in the Tutorial scenario, tasked with defeating
                                the dragon alongside you.
                            </div>
                            <br />
                            <div>
                                In her description we <strong>cover her role</strong> in our story - being a
                                witch. Then we briefly cover an important aspect of her{' '}
                                <strong>physical appearance</strong> that we want the AI to focus on. Followed
                                by a snippet of <strong>her backstory</strong> and <strong>a purpose</strong>{' '}
                                for her in the setup of our immediate encounter.
                            </div>
                            <br />
                            <div>
                                <strong>
                                    All of the above is optional, but the more the AI has to work with the
                                    better it can continue your setup!
                                </strong>
                            </div>

                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                Writing your Lorebook in the same tense and perspective as your story will
                                yield more consistent results!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.lorebook-inserted-text',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Hammer Time',
                    content: (
                        <>
                            <div>
                                The AI isn&apos;t perfect and no matter how detailed you write your Lorebook
                                description, there is a chance for it to mess up.
                            </div>
                            <br />
                            <div>
                                However there are a handful of tricks you can employ to ensure a higher
                                success rate for the AI to correctly refer to the information you put down in
                                your descriptions!
                            </div>
                            <br />
                            <div>
                                You can hammer in a certain feature such as a physical descriptor by using
                                different synonyms for the same thing.
                            </div>
                            <br />
                            <Tip>
                                <Emphasis>
                                    <strong>Example:</strong>
                                </Emphasis>{' '}
                                We could give Galena green eyes by putting the word <i>&quot;green&quot;</i>{' '}
                                before the mention of her eyes in our Lorebook description. Then at the end we
                                could describe how{' '}
                                <i>&quot;She tends to keep her verdant gaze averted at all times.&quot;</i> or{' '}
                                <i>
                                    &quot;It was hard for me to concentrate whenever Galena&apos;s emerald
                                    stare focused on me.&quot;
                                </i>{' '}
                                <br />
                                <br />
                                This shows the AI that this is the type of output we desire and it will
                                continue on in the same style.
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.generate-toggle',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Lorebook Generation 1/3',
                    content: (
                        <>
                            <div>
                                Don&apos;t feel like writing your own description or want to see what the AI
                                can come up with instead? No problem!
                            </div>
                            <br />
                            <div>
                                {' '}
                                We got just the right tool for that!{' '}
                                <strong>
                                    <Emphasis>Lorebook Generation</Emphasis>
                                </strong>{' '}
                                will come to the rescue of your imagination!
                            </div>
                            <br />
                            <div>
                                Enable the{' '}
                                <strong>
                                    <Emphasis>Lorebook Generation</Emphasis>
                                </strong>{' '}
                                menu by hitting the{' '}
                                <strong>
                                    <Emphasis>
                                        <LightOnIcon style={{ display: 'inline-block' }} />
                                        Generate button
                                    </Emphasis>
                                </strong>
                            </div>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.lorebook-generation-select',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Lorebook Generation 2/3',
                    content: (
                        <>
                            <div>
                                First we are going to decide what we want to generate! Luckily we have a whole
                                range of available options.
                            </div>
                            <br />
                            <div>
                                <strong>
                                    <Emphasis>General:</Emphasis>
                                </strong>{' '}
                                A little bit of <strong>everything</strong>, making it somewhat unfocused, but
                                able to pull from a wide variety of information.{' '}
                            </div>
                            <br />
                            <div>
                                <strong>
                                    <Emphasis>Person:</Emphasis>
                                </strong>{' '}
                                Generate <strong>people</strong>, whether human, alien, or some other life
                                form.
                            </div>
                            <br />{' '}
                            <div>
                                <strong>
                                    <Emphasis>Place:</Emphasis>
                                </strong>{' '}
                                Hamlets, futuristic cities, far off planets, and other <strong>places</strong>{' '}
                                are the domain of this type.{' '}
                            </div>
                            <br />{' '}
                            <div>
                                <strong>
                                    <Emphasis>Thing:</Emphasis>
                                </strong>{' '}
                                Generate material <strong>things</strong> like a cursed weapon, deadly
                                disease, or fantastical creatures.{' '}
                            </div>
                            <br />{' '}
                            <div>
                                <strong>
                                    <Emphasis>Faction:</Emphasis>
                                </strong>{' '}
                                Noble Houses, Druidic Orders, and Corporations would all fall under the{' '}
                                <strong>factions</strong> type.
                            </div>
                            <br />{' '}
                            <div>
                                <strong>
                                    <Emphasis>Concept:</Emphasis>
                                </strong>{' '}
                                As the name suggests, <strong>concepts</strong> are pretty vague. It works
                                best for immaterial things like laws, spells, or technologies.{' '}
                            </div>
                            <br />{' '}
                            <div>
                                <strong>
                                    <Emphasis>History:</Emphasis>
                                </strong>{' '}
                                Generate descriptions of events such as notable natural disasters, important
                                festivals, or other <strong>historic</strong> occurrences.{' '}
                            </div>
                            <br />{' '}
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.lorebook-generate',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Lorebook Generation 3/3',
                    content: (
                        <>
                            <div>
                                Here we put a short description for the target or focus of our generation.
                            </div>
                            <br />
                            <div>
                                As always, <i>the sky is the limit</i>!
                            </div>
                            <div>
                                Experiment with your generation prompts to see what works best for{' '}
                                <strong>you</strong>!
                            </div>
                            <br />
                            You can generate different outputs or continue generating by pressing the{' '}
                            <Emphasis>
                                <SendIcon
                                    highlight
                                    style={{
                                        display: 'inline-block',
                                        position: 'relative',
                                        top: '5px',
                                        width: '10px',
                                        marginRight: '4px',
                                    }}
                                />
                                <strong>Send Button</strong>
                            </Emphasis>{' '}
                            or retry the previous AI generation with the{' '}
                            <strong>
                                <Emphasis>
                                    <ReloadIcon
                                        highlight
                                        style={{
                                            display: 'inline-block',
                                            position: 'relative',
                                            top: '5px',
                                            width: '13px',
                                            marginRight: '4px',
                                        }}
                                    />
                                    Reload Button
                                </Emphasis>
                                .
                            </strong>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                View and restore any previous AI generations by opening the{' '}
                                <strong>
                                    <Emphasis>Generation History</Emphasis>
                                </strong>{' '}
                                below the generation buttons! Please keep in mind that they are
                                session-specific and will be lost if you <strong>reload</strong> NovelAI.
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.lorebook-add-context',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Lorebook Generation Context',
                    content: (
                        <>
                            <div>
                                As an advanced feature you can select the Add Context option to let the AI
                                refer to your{' '}
                                <strong>
                                    <Emphasis>Memory</Emphasis>
                                </strong>{' '}
                                and/or{' '}
                                <strong>
                                    <Emphasis>Author&apos;s Note</Emphasis>
                                </strong>
                                . <i>This is not enabled by default and must be activated manually.</i>
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                The Generator does not know what your Story Text includes and it can only
                                <strong> reference</strong> the{' '}
                                <strong>
                                    <Emphasis>Memory</Emphasis>
                                </strong>{' '}
                                or{' '}
                                <strong>
                                    <Emphasis>Author&apos;s Note</Emphasis>
                                </strong>{' '}
                                if it is enabled by you!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    target: '.lorebook-keys',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Lorebook Keys',
                    content: (
                        <>
                            <div>
                                The most important part of your Lorebook! You have to assign Lorebook Keys to
                                each of your entries or the AI will not be able to refer to their information
                                when the subjects of your Lorebook appear in your story!
                            </div>
                            <Tip>
                                <Emphasis>
                                    <strong>Tip:</strong>
                                </Emphasis>{' '}
                                Pick as <strong>many</strong> or as <strong>few</strong> keys that encompass
                                your Lorebook subject. You can have them naturally appear in the story text or
                                force them to activate through your inputs whenever you want the AI to call up
                                the desired Lorebook information!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.story-stats-button',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'View Story Stats',
                    content: (
                        <>
                            <div>
                                Here you can find detailed information regarding your story, as well as some
                                handy trim options!
                            </div>
                            <br />
                            <div>
                                Take a closer look at how your story is set up! Explore just how much, or
                                little you&apos;ve worked with the AI to create your latest masterpiece!{' '}
                            </div>
                            <br />
                            <div>
                                <strong>
                                    <Emphasis>Generate Additional Stats</Emphasis>
                                </strong>{' '}
                                analyzes your data to show you your total word and sentence count alongside
                                your most used words!
                            </div>

                            <strong></strong>
                            <Tip>
                                <strong>
                                    <Emphasis>Tip:</Emphasis>
                                </strong>{' '}
                                <strong>Trimming</strong> your story removes your <strong>Retry</strong> story
                                branches! <strong>Flattening</strong> your story removes your{' '}
                                <strong>Edit</strong> history!
                            </Tip>
                        </>
                    ),
                },
                {
                    disableBeacon: true,
                    spotlightClicks: false,
                    target: '.infobar-export',
                    placement: 'left-start',
                    isFixed: true,
                    title: 'Saving & Exporting',
                    content: (
                        <>
                            <div>
                                Whew! that&apos;s all a lot to take in! Luckily, we are at the last step,
                                <Emphasis>Saving & Exporting</Emphasis> your work!
                            </div>
                            <br />
                            <div>
                                <strong>
                                    <Emphasis>Export to File:</Emphasis>
                                </strong>{' '}
                                Downloads the story as a .story file. This includes{' '}
                                <strong>all your Retry & Edit branches</strong>.{' '}
                            </div>
                            <br />
                            <div>
                                <strong>
                                    <Emphasis>Export as Scenario:</Emphasis>
                                </strong>{' '}
                                Downloads the story as a .scenario file. This excludes all your Retry & Edit
                                branches, turning your story text into the starting{' '}
                                <PromptColor>prompt text</PromptColor>.
                            </div>
                            <br />
                            <div>
                                <strong>
                                    <Emphasis>Export to Clipboard:</Emphasis>
                                </strong>{' '}
                                Copies your story to your clipboard in JSON format.{' '}
                                <i>If your story is very long it might lag!</i>
                            </div>
                            {/* <br />
                            <div>
                                <strong>
                                    <Emphasis>Duplicate as Scenario:</Emphasis>
                                </strong>{' '}
                                Imports the story into a new story copy, excluding your edit & retry branches
                                and let&apos;s you fill in new placeholders if you use them. This is the
                                option to use if you intend to share your{' '}
                                <PromptColor>starter prompt</PromptColor> with others!
                            </div> */}
                            <Tip>
                                <strong>
                                    <Emphasis>Tip:</Emphasis>
                                </strong>
                                Keep in mind which export versions retain your previous generations & retry
                                branches before you share them, since others may view those!
                            </Tip>
                        </>
                    ),
                },
            ] as Step[],
        []
    )

    let stepsToUse
    switch (tutorialState.state) {
        case TutorialStates.EDITOR_TUTORIAL:
            stepsToUse = tutorialSteps
            break
        case TutorialStates.ADVENTURE_TUTORIAL:
            stepsToUse = adventureTutorialSteps
            break
        case TutorialStates.ADVANCED_TUTORIAL:
            stepsToUse = advancedTutorial
            break
        default:
            stepsToUse = tutorialSteps
            break
    }

    const [tutorialLoading, setTutorialLoading] = useState(false)

    const siteTheme = useRecoilValue(SiteTheme)
    return (
        <>
            {(!showTutorial && getUserSetting(session.settings, 'tutorialSeen')) ||
            (window.visualViewport?.width || window.innerWidth) < 700 ? (
                <></>
            ) : (
                <Modal
                    onRequestClose={() => {
                        // Cannot be closed without continuing to tutorial
                    }}
                    isOpen={tutorialState.state === TutorialStates.WELCOME_SCREEN}
                    type={ModalType.Large}
                >
                    <WelcomePromptContainer>
                        <WelcomePromptBackground />
                        <WelcomeIcon>
                            <PenTipIcon />
                        </WelcomeIcon>
                        <WelcomeTitle>Welcome to NovelAI!</WelcomeTitle>
                        <WelcomeBody>
                            It seems like you’re new around here.
                            <br /> It’s a large AI-generated world out there, want to take the Tutorial before
                            you get started?
                        </WelcomeBody>
                        <WelcomeSubTitle>Choose a Tutorial to learn more.</WelcomeSubTitle>
                        <WelcomeButtons>
                            <TutorialButton
                                disabled={tutorialLoading}
                                onClick={async () => {
                                    ;(window as any).plausible('TutorialSelect', {
                                        props: { option: 'Storyteller' },
                                    })

                                    const story = await getTutorialStory()
                                    GlobalUserContext.stories.set(story.metadata.id, story.metadata)
                                    GlobalUserContext.storyContentCache.set(story.metadata.id, story.content)

                                    setStories([story.metadata.id, ...stories])
                                    setSelectedStory({ loaded: false, id: story.metadata.id })
                                    setStoryUpdate(story.metadata.save(true))
                                    setTutorialStoryId(story.metadata.id)
                                    setTutorialLoading(true)
                                    try {
                                        await new Promise((resolve, reject) => {
                                            const check = (tries: number) => {
                                                if (tries >= 100) {
                                                    reject(null)
                                                }
                                                if (document.querySelector('.conversation-editor')) {
                                                    setTimeout(() => resolve(null), 100)
                                                } else {
                                                    setTimeout(() => check(tries + 1), 100)
                                                }
                                            }
                                            setTimeout(() => check(0), 100)
                                        })
                                    } catch (error: any) {
                                        setTutorialLoading(false)
                                        logError(error, false)
                                    }
                                    setTimeout(() => {
                                        setTutorialState((v) => ({
                                            ...v,
                                            state: TutorialStates.EDITOR_TUTORIAL,
                                        }))
                                        setTutorialLoading(false)
                                    }, 1)
                                }}
                            >
                                <TextIcon />
                                <ButtonTitle>Storyteller</ButtonTitle>
                                <ButtonDesc>An empty canvas for your imagination!</ButtonDesc>
                                <FadedText>(Recommended)</FadedText>
                            </TutorialButton>
                            <TutorialButton
                                disabled={tutorialLoading}
                                onClick={async () => {
                                    ;(window as any).plausible('TutorialSelect', {
                                        props: { option: 'Text Adventure' },
                                    })

                                    const story = await getAdventureTutorialStory()
                                    GlobalUserContext.stories.set(story.metadata.id, story.metadata)
                                    GlobalUserContext.storyContentCache.set(story.metadata.id, story.content)

                                    setStories([story.metadata.id, ...stories])
                                    setSelectedStory({ loaded: false, id: story.metadata.id })
                                    setStoryUpdate(story.metadata.save(true))
                                    setTutorialStoryId(story.metadata.id)
                                    setTutorialLoading(true)
                                    setTimeout(() => {
                                        setTutorialState((v) => ({
                                            ...v,
                                            state: TutorialStates.ADVENTURE_TUTORIAL,
                                        }))
                                        setTutorialLoading(false)
                                    }, 1000)
                                }}
                            >
                                <SwordsIcon />
                                <ButtonTitle>Text Adventure</ButtonTitle>
                                <ButtonDesc>Let the AI tell a story using your words and actions!</ButtonDesc>
                                <FadedText>(Work in Progress)</FadedText>
                            </TutorialButton>
                        </WelcomeButtons>
                        {getUserSetting(session.settings, 'tutorialSeen') && (
                            <WideButton>
                                <LightColorButton
                                    onClick={async () => {
                                        ;(window as any).plausible('TutorialSelect', {
                                            props: { option: 'Advanced Tutorial' },
                                        })

                                        const story = await getTutorialStory()
                                        GlobalUserContext.stories.set(story.metadata.id, story.metadata)
                                        GlobalUserContext.storyContentCache.set(
                                            story.metadata.id,
                                            story.content
                                        )

                                        setStories([story.metadata.id, ...stories])
                                        setSelectedStory({ loaded: false, id: story.metadata.id })
                                        setStoryUpdate(story.metadata.save(true))
                                        setInfoVisible(true)
                                        setInfobarSelectedTab(0)
                                        setTutorialStoryId(story.metadata.id)

                                        setTimeout(
                                            () =>
                                                setTutorialState((v) => ({
                                                    ...v,
                                                    state: TutorialStates.ADVANCED_TUTORIAL,
                                                })),
                                            1000
                                        )
                                    }}
                                >
                                    Advanced Tutorial
                                </LightColorButton>
                            </WideButton>
                        )}
                        <WelcomeSkip>
                            <SubtleButton
                                onClick={() => {
                                    ;(window as any).plausible('TutorialSelect', {
                                        props: { option: 'Skip' },
                                    })

                                    setTutorialCleared()
                                    setShowTutorial(false)
                                }}
                            >
                                No thanks, let me in!
                            </SubtleButton>
                        </WelcomeSkip>
                    </WelcomePromptContainer>
                </Modal>
            )}
            <Modal
                onRequestClose={() => {
                    // Closed via button
                }}
                isOpen={tutorialState.state === TutorialStates.BASIC_COMPLETE}
                type={ModalType.Large}
            >
                <WelcomePromptContainer style={{ maxWidth: '350px' }}>
                    <WelcomeIcon>
                        <PartyIcon />
                    </WelcomeIcon>
                    <WelcomeTitle>You’re ready to go!</WelcomeTitle>
                    <WelcomeBody>
                        Congratulations on completing the Tutorial! You’re now equipped with all the necessary
                        basic information needed to get started.
                    </WelcomeBody>
                    <WelcomeButton
                        style={{ marginBottom: '20px' }}
                        onClick={() => {
                            ;(window as any).plausible('TutorialFinish', {
                                props: { option: 'Basic Tutorial' },
                            })

                            setTutorialState((v) => ({ ...v, state: TutorialStates.WELCOME_SCREEN }))
                            setShowTutorial(false)
                            setTutorialCleared()
                        }}
                    >
                        Woo! Let me in!
                    </WelcomeButton>
                    <WelcomeBody style={{ marginBottom: '20px' }}>
                        You can always return to the <Emphasis>tutorial</Emphasis> section with the&nbsp;
                        <BeakerIcon
                            style={{
                                backgroundColor:
                                    siteTheme.colors.textHeadings ?? DEFAULT_THEME.colors.textHeadings,
                                cursor: 'normal',
                                display: 'inline-block',
                                height: '1rem',
                                width: '1rem',
                                position: 'relative',
                                top: '0.2rem',
                            }}
                            active={false}
                        />
                        &nbsp;<Emphasis>Flask</Emphasis> icon.
                        <br />
                        The <Emphasis>Advanced Tutorial</Emphasis> is available there&nbsp;too!
                    </WelcomeBody>
                </WelcomePromptContainer>
            </Modal>
            <Modal
                onRequestClose={() => {
                    // Closed via button
                }}
                isOpen={tutorialState.state === TutorialStates.ADVANCED_COMPLETE}
                type={ModalType.Large}
            >
                <WelcomePromptContainer style={{ maxWidth: '350px' }}>
                    <WelcomeIcon>
                        <PartyIcon />
                    </WelcomeIcon>
                    <WelcomeTitle>Huzzah!</WelcomeTitle>
                    <WelcomeBody>
                        You&apos;ve collected all the Story tab knowledge! <br />
                        Use it wisely to control and lead the AI exactly where you want it to go!
                    </WelcomeBody>
                    <WelcomeButton
                        onClick={() => {
                            ;(window as any).plausible('TutorialFinish', {
                                props: { option: 'Advanced Tutorial' },
                            })

                            setTutorialState((v) => ({ ...v, state: TutorialStates.WELCOME_SCREEN }))
                            setShowTutorial(false)
                            setTutorialCleared()
                        }}
                    >
                        Let&apos;s go!
                    </WelcomeButton>
                </WelcomePromptContainer>
            </Modal>

            {createPortal(
                <Joyride
                    steps={stepsToUse}
                    run={
                        tutorialState.state === TutorialStates.EDITOR_TUTORIAL ||
                        tutorialState.state === TutorialStates.ADVENTURE_TUTORIAL ||
                        tutorialState.state === TutorialStates.ADVANCED_TUTORIAL
                    }
                    tooltipComponent={Tooltip}
                    continuous={true}
                    showProgress={true}
                    styles={{
                        options: {
                            arrowColor: theme.colors.bg2,
                        },
                    }}
                    disableOverlayClose={true}
                    spotlightClicks={true}
                    disableScrollParentFix={true}
                    disableScrolling={true}
                    floaterProps={{
                        disableAnimation: true,
                    }}
                    getHelpers={(helpers) =>
                        setTutorialState((v) => {
                            return {
                                state: v.state,
                                next: helpers.next,
                                prev: helpers.prev,
                            }
                        })
                    }
                />,
                document.body
            )}
        </>
    )
}

async function getTutorialStory(): Promise<StoryContainer> {
    const newStory = StoryContainer.deserialize(JSON.stringify(tutorialjson))
    newStory.metadata.createdAt = new Date()
    newStory.metadata.lastUpdatedAt = new Date()
    newStory.metadata.id = uuid()
    return newStory
}

async function getAdventureTutorialStory(): Promise<StoryContainer> {
    const newStory = StoryContainer.deserialize(JSON.stringify(tutorialTextAdventurejson))
    newStory.metadata.createdAt = new Date()
    newStory.metadata.lastUpdatedAt = new Date()
    newStory.metadata.id = uuid()
    return newStory
}
