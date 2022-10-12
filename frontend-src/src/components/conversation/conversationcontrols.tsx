import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { motion } from 'framer-motion'
import { HotEvent, HotEventSub, subscribeToHotEvent } from '../../data/user/hotkeys'
import {
    GenerationRequestActive,
    GenerationRequestError,
    InputModes,
    SelectedInputMode,
    LorebookOpen,
    SelectedStory,
    Session,
    SiteTheme,
    GenerationRequestCancelled,
    TutorialState,
    TokenProbOpen,
    LastResponse,
} from '../../globals/state'
import {
    ConversationControlsContainer,
    ConversationControlsContent,
    ConversationControls as StyledConversationControls,
    ConversationInput,
    RedoContainer,
    RequestErrorInfo,
    RedoMenu,
    RedoOption,
    ControlButton,
    ConversationControlsGroup,
    ThinControlButton,
    UndoMenuArrow,
    ControlIcon,
    ControlText,
    ConversationInputContainer,
    ConversationStoryControls,
    RedoScrollWrapper,
} from '../../styles/components/conversationcontrols'
import { MinusIcon, PlusIcon } from '../../styles/ui/icons'
import Book from '../../assets/images/book.svg'
import Send from '../../assets/images/send.svg'
import CrossRounded from '../../assets/images/cross-rounded.svg'
import Reload from '../../assets/images/reload.svg'
import Undo from '../../assets/images/undo.svg'
import Redo from '../../assets/images/redo.svg'
import Mind from '../../assets/images/mind.svg'
import { DataOrigin, StoryMode } from '../../data/story/story'
import { logError } from '../../util/browser'
import Tooltip from '../tooltip'
import { getUserSetting } from '../../data/user/settings'

function formatRequestError(error: string): string {
    if (
        `${error}`.toLowerCase() === 'error: timeout' ||
        `${error}`.toLowerCase() === 'timeout' ||
        `${error}`.toLowerCase().includes('timeout fetching')
    ) {
        return 'Error: Timeout - Unable to reach NovelAI servers. Please wait for a moment and try again'
    }
    if (`${error}`.toLowerCase().includes('worker timeout')) {
        return `${error} - Please try again, or if this issue persists, \
            try restarting your browser or clearing your browser cache (after backing up your local stories)`
    }
    return error
}

export function ConversationControls(props: {
    onUndoRequest: () => void
    onRedoRequest: (index: number | undefined) => void
    handleCancelRequest: () => void
    onInputRecieved: (input: string, origin?: DataOrigin) => Promise<void>
    onRetryRequest: () => void
    onRetryHover: (hovered: boolean) => void
    onUndoHover: (hovered: boolean) => void

    visible: boolean
    redoOptions: string[][][]
    canUndo: boolean
    canRetry: boolean
    mode: StoryMode
}): JSX.Element {
    const [text, setText] = useState('')
    const [error, setError] = useRecoilState(GenerationRequestError)
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    const generationRequestCancelled = useRecoilValue(GenerationRequestCancelled)
    const setLorebookVisible = useSetRecoilState(LorebookOpen)
    const setTokenProbVisible = useSetRecoilState(TokenProbOpen)
    const lastResponse = useRecoilValue(LastResponse)

    const content: MutableRefObject<HTMLDivElement | null> = useRef(null)
    const [redoMenuCursor, setRedoMenuCursor] = useState(-1)

    const [redoMenuVisible, setRedoMenuVisible] = useState(false)
    const session = useRecoilValue(Session)
    const selectedStory = useRecoilValue(SelectedStory)
    const inputWindow = useRef<any>(null)
    const redoMenu = useRef<any>(null)
    const inputModes = useRecoilValue(InputModes)
    const [inputMode, setInputMode] = useRecoilState(SelectedInputMode)
    const theme = useRecoilValue(SiteTheme)

    const hotInputUndoRef = useRef<any>(null)
    const hotInputRedoRef = useRef<any>(null)
    const hotInputRedoMenuRef = useRef<any>(null)
    const hotNavigateDownRef = useRef<any>(null)
    const hotNavigateUpRef = useRef<any>(null)
    const hotInputRetryRef = useRef<any>(null)
    const hotInputFocusRef = useRef<any>(null)

    const showRedoMenu = () => {
        setRedoMenuVisible(true)
    }

    const hideRedoMenu = () => {
        setRedoMenuVisible(false)
        setRedoMenuCursor(-1)
    }

    const hotInputUndo = (): boolean => {
        if (generationRequestActive || !props.canUndo || !props.visible) {
            return false
        }
        props.onUndoRequest()
        return true
    }
    hotInputUndoRef.current = hotInputUndo

    const hotInputRedo = (): boolean => {
        if (generationRequestActive || props.redoOptions.length === 0 || !props.visible) {
            return false
        }
        props.onRedoRequest(-1)
        return true
    }
    hotInputRedoRef.current = hotInputRedo

    const hotInputRedoMenu = () => {
        if (generationRequestActive || props.redoOptions.length === 0 || !props.visible) {
            return false
        }

        if (!redoMenuVisible) {
            showRedoMenu()
            setRedoMenuCursor(0)
            if (redoMenu.current && redoMenu.current.children[0]) {
                redoMenu.current.children[0].focus()
            }
            if (!props.canUndo) {
                props.onUndoHover(false)
            }
        } else {
            hideRedoMenu()
        }

        return true
    }
    hotInputRedoMenuRef.current = hotInputRedoMenu

    const hotNavigateDown = () => {
        if (!redoMenuVisible) {
            return false
        }

        let newPosition = redoMenuCursor
        newPosition++
        if (newPosition >= props.redoOptions.length) {
            newPosition = 0
        }
        setRedoMenuCursor(newPosition)
        if (redoMenu.current && redoMenu.current.children[newPosition]) {
            redoMenu.current.children[newPosition].focus()
        }

        return true
    }
    hotNavigateDownRef.current = hotNavigateDown

    const hotNavigateUp = () => {
        if (!redoMenuVisible) {
            return false
        }

        let newPosition = redoMenuCursor
        newPosition--
        if (newPosition < 0) {
            newPosition = props.redoOptions.length - 1
        }
        setRedoMenuCursor(newPosition)
        if (redoMenu.current && redoMenu.current.children[newPosition]) {
            redoMenu.current.children[newPosition].focus()
        }

        return true
    }
    hotNavigateUpRef.current = hotNavigateUp

    const hotInputRetry = () => {
        if (generationRequestActive || !props.canUndo || !props.visible) {
            return false
        }

        props.onRetryRequest()
        return true
    }
    hotInputRetryRef.current = hotInputRetry

    const hotInputFocus = () => {
        if (inputWindow.current === undefined) {
            return false
        }

        inputWindow.current.focus()
        return true
    }
    hotInputFocusRef.current = hotInputFocus

    useEffect(() => {
        subscribeToHotEvent(HotEvent.inputRedoMenu, new HotEventSub('ccIRM', hotInputRedoMenuRef))
        subscribeToHotEvent(HotEvent.inputUndo, new HotEventSub('ccIU', hotInputUndoRef))
        subscribeToHotEvent(HotEvent.inputRedo, new HotEventSub('ccIR', hotInputRedoRef))
        subscribeToHotEvent(HotEvent.navigateUp, new HotEventSub('ccNU', hotNavigateUpRef))
        subscribeToHotEvent(HotEvent.navigateDown, new HotEventSub('ccND', hotNavigateDownRef))
        subscribeToHotEvent(HotEvent.inputRetry, new HotEventSub('ccIR', hotInputRetryRef))
        subscribeToHotEvent(HotEvent.inputFocus, new HotEventSub('ccIF', hotInputFocusRef))
    }, [])

    const clickCancel = () => {
        if (!generationRequestActive) {
            return
        }
        props.handleCancelRequest()
    }
    const clickSend = () => {
        setError('')
        if (generationRequestActive) {
            return
        }
        props.onInputRecieved(text, DataOrigin.user).catch((error: any) => {
            logError(error, true, error.stack)
            setError(`${error}`)
        })

        const element = document.querySelectorAll('.ProseMirror')[0]?.parentElement as
            | HTMLDivElement
            | undefined
        if (element) {
            element.scrollTop = element.scrollHeight
        }
        setText('')
    }
    useEffect(() => {
        if (generationRequestActive) {
            setError('')
        }
    }, [generationRequestActive, setError])

    useEffect(() => {
        if (redoMenuVisible) {
            document.addEventListener('click', hideRedoMenu)
        }
        return () => {
            document.removeEventListener('click', hideRedoMenu)
        }
    }, [redoMenuVisible])

    const tutorialState = useRecoilValue(TutorialState)

    return (
        <ConversationControlsContainer visible={props.visible} className="conversation-controls-container">
            <ConversationControlsContent
                ref={content}
                visible={true}
                className="conversation-controls-content"
                reversed={props.mode === StoryMode.adventure}
            >
                <RequestErrorInfo visible={error.length > 0} className="conversation-error">
                    {formatRequestError(error)}
                </RequestErrorInfo>
                <StyledConversationControls className="conversation-controls">
                    <ConversationControlsGroup>
                        <div style={{ display: 'flex', gap: '8px' }} className={'undo-redo'}>
                            <motion.div
                                onHoverStart={() => props.onUndoHover(true)}
                                onHoverEnd={() => props.onUndoHover(false)}
                            >
                                <IconControlButton
                                    iconUrl={Undo.src}
                                    swap={true}
                                    text="Undo"
                                    onClick={() => {
                                        props.onUndoRequest()
                                    }}
                                    disabled={generationRequestActive || !props.canUndo || !props.visible}
                                ></IconControlButton>
                            </motion.div>
                            <RedoContainer>
                                <IconControlButton
                                    iconUrl={Redo.src}
                                    swap={true}
                                    text="Redo"
                                    onClick={() => {
                                        props.onRedoRequest(void 0)
                                        if (!props.canUndo) {
                                            props.onUndoHover(false)
                                        }
                                    }}
                                    disabled={
                                        generationRequestActive ||
                                        props.redoOptions.length === 0 ||
                                        !props.visible
                                    }
                                    style={{ marginRight: '2px' }}
                                ></IconControlButton>

                                <ThinControlButton
                                    displayToggle={props.redoOptions.length === 0}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        hotInputRedoMenuRef.current()
                                    }}
                                    disabled={
                                        generationRequestActive ||
                                        props.redoOptions.length === 0 ||
                                        !props.visible
                                    }
                                >
                                    <div>
                                        {props.redoOptions.length === 0 ? (
                                            <></>
                                        ) : (
                                            <UndoMenuArrow up={!redoMenuVisible} />
                                        )}
                                        <span>{props.redoOptions.length}</span>
                                    </div>
                                </ThinControlButton>

                                {redoMenuVisible ? (
                                    <RedoScrollWrapper>
                                        <RedoMenu ref={redoMenu} className="redo-menu">
                                            {props.redoOptions.map((text, index) => {
                                                return (
                                                    <Tooltip
                                                        key={index}
                                                        delay={800}
                                                        maxWidth={'900px'}
                                                        overflowChild={'div:last-child'}
                                                        strategy="fixed"
                                                        tooltip={
                                                            (text[0].length === 1 && text[0][0].trim() === ''
                                                                ? ''
                                                                : '- ' + text[0][0].trim() + '\n') +
                                                            (text[1].length === 1 && text[1][0].trim() === ''
                                                                ? ''
                                                                : '+ ' + text[1][0].trim())
                                                        }
                                                        motionHover={true}
                                                    >
                                                        <RedoOption
                                                            key={index}
                                                            onClick={() => props.onRedoRequest(index)}
                                                            disabled={!props.visible}
                                                        >
                                                            {text[0].length === 1 &&
                                                            text[0][0].trim() === '' ? (
                                                                <></>
                                                            ) : (
                                                                <>
                                                                    <div>
                                                                        <MinusIcon></MinusIcon>{' '}
                                                                        <div> {text[0].join('... ')}</div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {text[1].length === 1 &&
                                                            text[1][0].trim() === '' ? (
                                                                <></>
                                                            ) : (
                                                                <>
                                                                    <div>
                                                                        <PlusIcon></PlusIcon>{' '}
                                                                        <div> {text[1].join('... ')}</div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </RedoOption>
                                                    </Tooltip>
                                                )
                                            })}
                                        </RedoMenu>
                                    </RedoScrollWrapper>
                                ) : (
                                    <></>
                                )}
                            </RedoContainer>
                        </div>
                        <IconControlButton
                            text="Lorebook"
                            iconUrl={Book.src}
                            showText={false}
                            onClick={() => setLorebookVisible(true)}
                            aria-label="Lorebook"
                            disabled={!props.visible}
                        ></IconControlButton>
                    </ConversationControlsGroup>
                    <ConversationControlsGroup>
                        {getUserSetting(session.settings, 'enableLogprobs') && (
                            <IconControlButton
                                text="Token Probabilities"
                                iconUrl={Mind.src}
                                showText={false}
                                onClick={() => setTokenProbVisible(true)}
                                aria-label="Token Probabilities"
                                disabled={
                                    !(
                                        lastResponse &&
                                        lastResponse.logprobs &&
                                        lastResponse.logprobs.length > 0
                                    )
                                }
                            />
                        )}
                        <motion.div
                            onHoverStart={() => props.onRetryHover(true)}
                            onHoverEnd={() => props.onRetryHover(false)}
                        >
                            <IconControlButton
                                text="Retry"
                                iconUrl={Reload.src}
                                className={'retry'}
                                onClick={() => {
                                    props.onRetryRequest()
                                    if (tutorialState.state >= 0) {
                                        tutorialState.next()
                                    }
                                    if (!props.canUndo) {
                                        props.onRetryHover(false)
                                    }
                                }}
                                disabled={generationRequestActive || !props.canRetry || !props.visible}
                            ></IconControlButton>
                        </motion.div>

                        {generationRequestActive &&
                        getUserSetting(session.settings, 'streamResponses') &&
                        (window as any).debugUI === 2 ? (
                            <IconControlButton
                                text="Cancel"
                                iconUrl={CrossRounded.src}
                                onClick={() => clickCancel()}
                                disabled={
                                    !generationRequestActive || generationRequestCancelled || !props.visible
                                }
                                highlight={true}
                            ></IconControlButton>
                        ) : (
                            <IconControlButton
                                className={'send'}
                                text="Send"
                                iconUrl={Send.src}
                                onClick={() => {
                                    if (tutorialState.state >= 0) {
                                        tutorialState.next()
                                    }
                                    clickSend()
                                }}
                                disabled={generationRequestActive || !props.visible}
                                highlight={true}
                            ></IconControlButton>
                        )}
                    </ConversationControlsGroup>
                </StyledConversationControls>
                {getUserSetting(session.settings, 'showInputBox') || props.mode === StoryMode.adventure ? (
                    <ConversationInputContainer
                        mode={props.mode}
                        inputModeIcon={inputMode.icon.src}
                        className="conversation-input-container"
                    >
                        <ConversationInput
                            ref={inputWindow}
                            disabled={!props.visible}
                            value={text}
                            placeholder={
                                props.mode === StoryMode.adventure
                                    ? inputMode.placeholderText
                                    : 'Write your input here'
                            }
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    clickSend()
                                }
                            }}
                        />
                        {props.mode === StoryMode.adventure ? (
                            <ConversationStoryControls>
                                {inputModes.map((mode, index) => {
                                    return (
                                        <ControlButton
                                            key={index}
                                            aria-label={mode.name}
                                            onClick={() => {
                                                setInputMode(mode)
                                            }}
                                            style={{
                                                background:
                                                    inputMode === mode ? theme.colors.bg3 : theme.colors.bg0,
                                                color:
                                                    inputMode === mode
                                                        ? theme.colors.textHeadings
                                                        : theme.colors.textMain,
                                            }}
                                        >
                                            {mode.name}
                                        </ControlButton>
                                    )
                                })}
                            </ConversationStoryControls>
                        ) : (
                            <></>
                        )}
                    </ConversationInputContainer>
                ) : (
                    <></>
                )}
            </ConversationControlsContent>
        </ConversationControlsContainer>
    )
}

function IconControlButton(props: {
    highlight?: boolean
    showText?: boolean
    text: string
    iconUrl: string
    onClick: () => void
    disabled?: boolean
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    style?: any
    swap?: boolean
    className?: string
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    return (
        <ControlButton
            aria-label={props.text}
            style={props.style}
            disabled={props.disabled}
            onClick={props.onClick}
            highlight={props.highlight}
            icon={props.showText ?? true}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
            additionalClasses={props.className}
        >
            {props.showText ?? true ? (
                <ControlText show={!(props.swap ?? false)}>{props.text}</ControlText>
            ) : (
                <></>
            )}
            {props.children}
            <ControlIcon
                swap={props.swap ?? false}
                icon={props.iconUrl}
                style={props.swap ?? false ? { width: '0.9rem' } : {}}
            />
        </ControlButton>
    )
}
