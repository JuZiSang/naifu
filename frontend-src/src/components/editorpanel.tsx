import Head from 'next/head'
import {
    CSSProperties,
    Fragment,
    lazy,
    MutableRefObject,
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import styled from 'styled-components'
import { AnimatePresence, motion } from 'framer-motion'
import { cssTransition, toast, ToastContainer } from 'react-toastify'
import { useRecoilValue } from 'recoil'

import { useSelectedStory } from '../hooks/useSelectedStory'
import { isAdventureModeStory } from '../util/util'
import { useWindowSizeBreakpoint } from '../hooks/useWindowSize'
import { CheckEditor, SaveStatus, SelectedStoryMode } from '../globals/state'
import { LoadingSpinner } from './loading'
import { WelcomeHeading } from './welcome'

const Conversation = lazy(() => import('./conversation/conversation'))
const EditorContainer = lazy(() => import('./editor/container'))
const Scenarios = lazy(() => import('./scenarios'))

const PanelContainer = styled.div`
    position: relative;
    background: ${(props) => props.theme.colors.bg2};
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: center;
    flex: 0 1 auto;
    margin: auto auto 0 auto;
    max-width: ${(props) => props.theme.breakpoints.mobile};
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
`
const TopContainer = styled.div`
    position: absolute;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    flex: 0 0 auto;
    margin: 0;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: center;
`

const OverlayContainer = styled(motion.div)`
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    flex: 0 0 auto;
    margin: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`
const ContentContainer = styled(motion.div)`
    position: relative;
    width: 100%;
    height: 100%;
    flex: 0 1 min-content;
    min-height: min-content;
    margin: 0;
    padding: 15px 25px 10px;
    @media (max-width: ${(props) => props.theme.breakpoints.mobile}) {
        padding: 15px 10px 10px;
    }
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
`
const EditorWrapper = styled(motion.div)`
    position: relative;
    width: 100%;
    height: 100%;
    flex: 0 1 auto;
    margin: 0;
    padding: 15px 25px 10px;
    @media (max-width: ${(props) => props.theme.breakpoints.mobile}) {
        padding: 15px 10px 10px;
    }
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
`
const ScenariosContainer = styled(ContentContainer)`
    background-color: ${(props) => props.theme.colors.bg2};
    @media screen and (max-width: 600px) {
        overflow-y: auto;
    }
`

export const SaveIndicatorContainer = styled.div<{ error: boolean }>`
    position: fixed;
    z-index: 1001;
    font-size: 0.8rem;
    top: 0;
    left: 20px;
    user-select: none;
    opacity: 0.6;
    ${(props) => (props.error ? `color: ${props.theme.colors.warning};` : '')};
`

function SaveIndicator() {
    const saveStatus = useRecoilValue(SaveStatus)
    return (
        <SaveIndicatorContainer className="save-indicator" error={saveStatus === 'Save Failed'}>
            {saveStatus}
        </SaveIndicatorContainer>
    )
}

enum EditorVariant {
    None,
    Conversation,
    Document,
}

interface EditorSwitchProps {
    menuVisible: boolean
    infoVisible: boolean
    style?: CSSProperties
}
export default function EditorPanel({ menuVisible, infoVisible, style }: EditorSwitchProps): JSX.Element {
    const { id, story, meta, loaded, modified, error } = useSelectedStory()
    useRecoilValue(SelectedStoryMode)

    const isLoading = !!id && (!meta || (!story?.story && !story?.document) || !loaded)
    const isDirty = !!id && modified
    const isAdventure = isAdventureModeStory(story?.settings)

    const win = useWindowSizeBreakpoint(600, 0)
    const MOBILE_DEVICE = useMemo(() => win.width <= 600, [win])

    const welcomeHeight: MutableRefObject<number> = useRef(500)
    const animateHeight: MutableRefObject<boolean> = useRef(false)

    const [showScenarios, setShowScenarios] = useState(false)
    const [showEditor, setShowEditor] = useState(false)
    const [showTop, setShowTop] = useState(false)

    const checkEditor = useRecoilValue(CheckEditor)

    const editorVariant = useMemo(
        () =>
            meta && story?.story
                ? EditorVariant.Conversation
                : meta && story?.document
                ? EditorVariant.Document
                : EditorVariant.None,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [story, meta, checkEditor]
    )

    useEffect(() => {
        setShowEditor(!isLoading && isDirty)
        setShowTop(!isLoading && !isDirty && (!MOBILE_DEVICE || (MOBILE_DEVICE && showScenarios)))
    }, [MOBILE_DEVICE, isDirty, isLoading, showScenarios])

    useEffect(() => {
        if (error) toast(error)
    }, [error])

    return (
        <Fragment>
            <Head>
                <title>{meta?.title ? meta.title : 'Stories'} - NAIFU</title>
            </Head>
            <PanelContainer
                className="conversation"
                data-mode={isAdventure ? 'adventure' : 'normal'}
                style={style}
            >
                <SaveIndicator />
                <ToastArea>
                    <ToastContainer transition={fade} />
                </ToastArea>
                <TopContainer>
                    <AnimatePresence
                        onExitComplete={() => {
                            animateHeight.current = false
                        }}
                    >
                        {!isLoading && !isDirty && (
                            <ContentContainer
                                key="welcome"
                                style={{
                                    zIndex: 80,
                                }}
                                ref={(element) =>
                                    (welcomeHeight.current =
                                        (element?.firstChild as HTMLDivElement)?.offsetHeight - 10 ||
                                        welcomeHeight.current)
                                }
                                initial={{
                                    opacity: 0,
                                    marginTop: -welcomeHeight.current,
                                }}
                                animate={{
                                    opacity: 1,
                                    marginTop: 0,
                                    transition: { ease: 'easeInOut', duration: 0.32 },
                                }}
                                exit={{
                                    opacity: 0,
                                    marginTop: -welcomeHeight.current,
                                    transition: { duration: 0.32 },
                                }}
                                onAnimationComplete={() => {
                                    animateHeight.current = true
                                }}
                            >
                                <WelcomeHeading setShowScenarios={setShowScenarios} />
                            </ContentContainer>
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {showTop && (
                            <ScenariosContainer
                                style={{
                                    position: MOBILE_DEVICE ? 'absolute' : 'relative',
                                    height: MOBILE_DEVICE ? '100%' : 'auto',
                                    paddingTop: MOBILE_DEVICE ? '65px' : '15px',
                                    zIndex: 85,
                                }}
                                key="scenarios"
                                initial={{
                                    opacity: 0,
                                    translateY: 50,
                                }}
                                animate={{
                                    opacity: 1,
                                    translateY: 0,
                                    transition: { ease: 'easeInOut', duration: 0.32 },
                                }}
                                exit={{
                                    opacity: 0,
                                    translateY: 50,
                                    transition: { duration: 0.16 },
                                }}
                            >
                                <Suspense fallback={<LoadingSpinner visible={true} />}>
                                    <Scenarios setShowScenarios={setShowScenarios} />
                                </Suspense>
                            </ScenariosContainer>
                        )}
                    </AnimatePresence>
                </TopContainer>
                <AnimatePresence>
                    {showEditor && !isLoading && (
                        <Suspense
                            fallback={
                                <OverlayContainer>
                                    <LoadingSpinner visible={true} />
                                </OverlayContainer>
                            }
                        >
                            <EditorWrapper
                                style={{ zIndex: 75 }}
                                key="conversation"
                                initial={{
                                    opacity: 0,
                                    translateY: 40,
                                    paddingTop: animateHeight.current ? welcomeHeight.current : 15,
                                }}
                                animate={{
                                    opacity: 1,
                                    translateY: 0,
                                    paddingTop: 15,
                                    transition: { ease: 'easeInOut', duration: 0.32 },
                                }}
                                exit={{
                                    opacity: 0,
                                    translateY: 40,
                                    paddingTop: animateHeight.current ? welcomeHeight.current : 15,
                                    transition: {
                                        duration: 0.32,
                                    },
                                }}
                            >
                                {editorVariant === EditorVariant.Conversation ? (
                                    <Conversation
                                        menuVisible={menuVisible}
                                        infoVisible={infoVisible}
                                        visible={!isLoading && isDirty}
                                    />
                                ) : editorVariant === EditorVariant.Document ? (
                                    <EditorContainer
                                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                        story={story!}
                                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                        meta={meta!}
                                        menuVisible={menuVisible}
                                        infoVisible={infoVisible}
                                    />
                                ) : (
                                    <div>No editor available</div>
                                )}
                            </EditorWrapper>
                        </Suspense>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {isLoading && (
                        <OverlayContainer
                            key="spinner"
                            style={{
                                zIndex: 100,
                                justifyContent: 'center',
                                position: 'absolute',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: 1,
                                transition: { ease: 'easeInOut', duration: 0.1 },
                            }}
                            exit={{
                                opacity: 0,
                                transition: { duration: 0.1 },
                            }}
                        >
                            <LoadingSpinner visible={true} />
                        </OverlayContainer>
                    )}
                </AnimatePresence>
            </PanelContainer>
        </Fragment>
    )
}

export const ToastArea = styled.div`
    position: absolute;
    right: 0;
    top: 0;
    width: 100%;

    .Toastify__toast-container {
        position: absolute;
    }

    .Toastify__toast {
        border-radius: 2px;
    }
    .Toastify__close-button {
        color: ${(props) => props.theme.colors.textMain};
    }

    .Toastify__progress-bar {
        height: 2px;
    }

    --toastify-color-light: ${(props) => props.theme.colors.bg3};
    --toastify-color-progress-light: ${(props) => props.theme.colors.textHeadings};
    --toastify-text-color-light: ${(props) => props.theme.colors.textMain};
    --toastify-font-family: ${(props) => props.theme.fonts.default};
`
const fade = cssTransition({
    enter: 'fade-in-right',
    exit: 'fade-out-right',
})
