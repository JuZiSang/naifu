import {
    forwardRef,
    Fragment,
    MutableRefObject,
    RefObject,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react'
import styled from 'styled-components'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { motion } from 'framer-motion'

import Book from '../../assets/images/book.svg'
import Send from '../../assets/images/send.svg'
import CrossRounded from '../../assets/images/cross-rounded.svg'
import Reload from '../../assets/images/reload.svg'
import Undo from '../../assets/images/undo.svg'
import Redo from '../../assets/images/redo.svg'
import Mind from '../../assets/images/mind.svg'

import {
    ControlButton,
    ControlIcon,
    ControlText,
    RedoContainer,
    RedoMenu,
    RedoOption,
    RedoScrollWrapper,
    ThinControlButton,
    UndoMenuArrow,
} from '../../styles/components/conversationcontrols'
import { LastResponse, LorebookOpen, SessionValue, TokenProbOpen, TutorialState } from '../../globals/state'
import { HotEvent, HotEventSub, subscribeToHotEvent } from '../../data/user/hotkeys'
import {
    HistoryNode,
    HistoryStateId,
    HistoryStepCreate,
    HistoryStepRemove,
    HistoryStepType,
    HistoryStepUpdate,
} from '../../data/document/history'
import { getUserSetting, UserSettings } from '../../data/user/settings'
import { useClickOutside } from '../../hooks/useClickOutside'
import { MinusIcon, PenWritingIcon, PlusIcon, DotDotDotIcon } from '../../styles/ui/icons'
import { SectionDiffText, SectionType } from '../../data/document/section'
import { EditorHandle, EditorHighlight, EditorHighlightType } from './editor'

interface EditorControlInnerState {
    blocked: boolean
    canUndo: boolean
    canRedo: boolean
    canRetry: boolean
    branches: Array<{ node: HistoryNode; preferred: boolean }>
}
export type EditorControlsHandle = {
    state: EditorControlInnerState
}
interface EditorControlsProps {
    editorRef: RefObject<EditorHandle>
}
export const EditorControls = forwardRef<EditorControlsHandle, EditorControlsProps>(function EditorControls(
    { editorRef },
    ref
): JSX.Element {
    const setLorebookVisible = useSetRecoilState(LorebookOpen)
    const setTokenProbVisible = useSetRecoilState(TokenProbOpen)

    const settings = useRecoilValue(SessionValue('settings')) as UserSettings
    const lastResponse = useRecoilValue(LastResponse)
    const tutorialState = useRecoilValue(TutorialState)

    const hotInputUndoRef = useRef<any>(null)
    const hotInputRedoRef = useRef<any>(null)
    const hotInputRedoMenuRef = useRef<any>(null)
    const hotNavigateDownRef = useRef<any>(null)
    const hotNavigateUpRef = useRef<any>(null)
    const hotInputRetryRef = useRef<any>(null)
    const hotInputFocusRef = useRef<any>(null)
    const hotEditorFocusRef = useRef<any>(null)
    const hotEditorRequestRef = useRef<any>(null)
    const hotEditorRequestInsertRef = useRef<any>(null)
    const hotEditorRequestCancelRef = useRef<any>(null)

    const redoMenuRef = useRef<HTMLDivElement | null>(null)

    const [redoMenuVisible, setRedoMenuVisible] = useState(false)
    const [redoMenuCursor, setRedoMenuCursor] = useState(-1)

    const showRedoMenu = () => {
        setRedoMenuVisible(true)
    }
    const hideRedoMenu = () => {
        setRedoMenuVisible(false)
        setRedoMenuCursor(-1)
    }

    useClickOutside(redoMenuRef, () => hideRedoMenu())

    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [canRetry, setCanRetry] = useState(false)
    const [blocked, setBlocked] = useState(false)
    const [branches, setBranches] = useState(new Array<{ node: HistoryNode; preferred: boolean }>())
    useImperativeHandle(ref, () => ({
        set state({ blocked, canUndo, canRedo, canRetry, branches }: EditorControlInnerState) {
            setBlocked(blocked)
            setCanUndo(canUndo)
            setCanRedo(canRedo)
            setCanRetry(canRetry)
            setBranches(branches)
            if (!canRedo) {
                hideRedoMenu()
            }
        },
    }))

    const [currentHighlight, setCurrentHighlight] = useState({
        type: EditorHighlightType.None,
    } as EditorHighlight)
    useEffect(() => {
        if (currentHighlight.type === EditorHighlightType.LastHistoryEntry && !canUndo)
            editorRef.current?.highlight({ type: EditorHighlightType.None })
        else if (currentHighlight.type === EditorHighlightType.HistoryBranch && !canRedo)
            editorRef.current?.highlight({ type: EditorHighlightType.None })
        else editorRef.current?.highlight(currentHighlight)
    }, [currentHighlight, canUndo, canRedo, branches, editorRef])

    const hotInputUndo = (): boolean => {
        if (blocked || !canUndo) {
            return false
        }
        hideRedoMenu()
        editorRef.current?.undo()
        return true
    }
    hotInputUndoRef.current = hotInputUndo
    const hotInputRedo = (branch?: HistoryStateId): boolean => {
        if (blocked || !canRedo) {
            return false
        }
        hideRedoMenu()
        editorRef.current?.redo(branch)
        return true
    }
    hotInputRedoRef.current = hotInputRedo
    const hotInputRedoMenu = () => {
        if (blocked || !canRedo) {
            return false
        }
        if (!redoMenuVisible) {
            showRedoMenu()
            setRedoMenuCursor(0)
            ;(redoMenuRef.current?.children[0] as HTMLElement | undefined)?.focus()
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
        if (newPosition >= (branches.length ?? 0)) {
            newPosition = 0
        }
        setRedoMenuCursor(newPosition)
        ;(redoMenuRef.current?.children[newPosition] as HTMLElement | undefined)?.focus()
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
            newPosition = (branches.length ?? 0) - 1
        }
        setRedoMenuCursor(newPosition)
        ;(redoMenuRef.current?.children[newPosition] as HTMLElement | undefined)?.focus()
        return true
    }
    hotNavigateUpRef.current = hotNavigateUp
    const hotInputRetry = () => {
        if (blocked || !canUndo) {
            return false
        }
        hideRedoMenu()
        editorRef.current?.undo()
        editorRef.current?.generate(true, false)
        return true
    }
    hotInputRetryRef.current = hotInputRetry
    const hotInputFocus = () => {
        hideRedoMenu()
        // TODO: focus input instead
        editorRef.current?.focus()
        return true
    }
    hotInputFocusRef.current = hotInputFocus
    const hotEditorFocus = () => {
        hideRedoMenu()
        editorRef.current?.focus()
        return true
    }
    hotEditorFocusRef.current = hotEditorFocus
    const hotEditorRequest = () => {
        hideRedoMenu()
        editorRef.current?.generate()
    }
    hotEditorRequestRef.current = hotEditorRequest
    const hotEditorRequestInsert = () => {
        hideRedoMenu()
        editorRef.current?.generate(true)
    }
    hotEditorRequestInsertRef.current = hotEditorRequestInsert
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const hotEditorRequestCancel = () => {
        hideRedoMenu()
        // TODO: add cancel
    }
    hotEditorRequestCancelRef.current = hotEditorRequestCancel

    useEffect(() => {
        subscribeToHotEvent(HotEvent.inputRedoMenu, new HotEventSub('ccIRM', hotInputRedoMenuRef))
        subscribeToHotEvent(HotEvent.inputUndo, new HotEventSub('ccIU', hotInputUndoRef))
        subscribeToHotEvent(HotEvent.inputRedo, new HotEventSub('ccIR', hotInputRedoRef))
        subscribeToHotEvent(HotEvent.navigateUp, new HotEventSub('ccNU', hotNavigateUpRef))
        subscribeToHotEvent(HotEvent.navigateDown, new HotEventSub('ccND', hotNavigateDownRef))
        subscribeToHotEvent(HotEvent.inputRetry, new HotEventSub('ccIR', hotInputRetryRef))
        subscribeToHotEvent(HotEvent.inputFocus, new HotEventSub('ccIF', hotInputFocusRef))
        subscribeToHotEvent(HotEvent.editorFocus, new HotEventSub('ceEF', hotEditorFocusRef))
        subscribeToHotEvent(HotEvent.editorRequest, new HotEventSub('ceER', hotEditorRequestRef))
        subscribeToHotEvent(HotEvent.editorRequestInsert, new HotEventSub('ceERI', hotEditorRequestInsertRef))
        subscribeToHotEvent(HotEvent.editorRequestCancel, new HotEventSub('ceERC', hotEditorRequestCancelRef))
    }, [])

    return (
        <ControlsContainer className="conversation-controls-container">
            <ControlsContent className="conversation-controls-content">
                <ControlsRow className="conversation-controls">
                    <ControlsRowGroup className="undo-redo">
                        <motion.div
                            onHoverStart={() => {
                                setCurrentHighlight({
                                    type: EditorHighlightType.LastHistoryEntry,
                                })
                            }}
                            onHoverEnd={() => {
                                setCurrentHighlight({
                                    type: EditorHighlightType.None,
                                })
                            }}
                        >
                            <IconControlButton
                                onClick={hotInputUndo}
                                disabled={blocked || !canUndo}
                                text="Undo"
                                iconUrl={Undo.src}
                                swap
                            />
                        </motion.div>
                        <RedoContainer>
                            <motion.div
                                onHoverStart={() => {
                                    setCurrentHighlight({
                                        type: EditorHighlightType.HistoryBranch,
                                    })
                                }}
                                onHoverEnd={() => {
                                    setCurrentHighlight({
                                        type: EditorHighlightType.None,
                                    })
                                }}
                            >
                                <IconControlButton
                                    onClick={() => hotInputRedo()}
                                    disabled={blocked || !canRedo}
                                    text="Redo"
                                    iconUrl={Redo.src}
                                    swap
                                />
                            </motion.div>
                            <div style={{ width: 1 }} />
                            <ThinControlButton
                                onClick={(e) => {
                                    e.stopPropagation()
                                    hotInputRedoMenuRef.current()
                                }}
                                disabled={blocked || !canRedo}
                                displayToggle={!!canRedo}
                            >
                                <div>
                                    {!canRedo ? <></> : <UndoMenuArrow up={!redoMenuVisible} />}
                                    <span>{canRedo ? branches.length : 0}</span>
                                </div>
                            </ThinControlButton>
                            {redoMenuVisible && (
                                <RedoMenuContainer
                                    menuRef={redoMenuRef}
                                    options={branches}
                                    onRedo={hotInputRedo}
                                    onHover={(branch?: HistoryStateId) => {
                                        if (branch) {
                                            setCurrentHighlight({
                                                type: EditorHighlightType.HistoryBranch,
                                                branch,
                                            })
                                        } else {
                                            setCurrentHighlight({
                                                type: EditorHighlightType.None,
                                            })
                                        }
                                    }}
                                />
                            )}
                        </RedoContainer>
                        <IconControlButton
                            text="Lorebook"
                            iconUrl={Book.src}
                            showText={false}
                            onClick={() => setLorebookVisible(true)}
                            aria-label="Lorebook"
                        />
                    </ControlsRowGroup>
                    <ControlsRowGroup>
                        {(window as any).debugUI >= 1 && (
                            <IconControlButton
                                text="Reload"
                                iconUrl={Reload.src}
                                className={'reload'}
                                onClick={() => {
                                    editorRef.current?.reload()
                                }}
                                disabled={blocked}
                            ></IconControlButton>
                        )}
                        {getUserSetting(settings, 'enableLogprobs') && (
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
                            onHoverStart={() => {
                                if (canRetry) {
                                    setCurrentHighlight({
                                        type: EditorHighlightType.LastHistoryEntry,
                                    })
                                }
                            }}
                            onHoverEnd={() =>
                                setCurrentHighlight({
                                    type: EditorHighlightType.None,
                                })
                            }
                        >
                            <IconControlButton
                                text="Retry"
                                iconUrl={Reload.src}
                                className={'retry'}
                                onClick={() => {
                                    hotInputRetry()
                                    if (tutorialState.state >= 0) {
                                        tutorialState.next()
                                    }
                                }}
                                disabled={blocked || !canRetry}
                            ></IconControlButton>
                        </motion.div>

                        {blocked &&
                        getUserSetting(settings, 'streamResponses') &&
                        (window as any).debugUI === 2 ? (
                            <IconControlButton
                                text="Cancel"
                                iconUrl={CrossRounded.src}
                                onClick={() => hotEditorRequestCancel()}
                                disabled={!blocked}
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
                                    hotEditorRequest()
                                }}
                                disabled={blocked}
                                highlight={true}
                            ></IconControlButton>
                        )}
                    </ControlsRowGroup>
                </ControlsRow>
            </ControlsContent>
        </ControlsContainer>
    )
})
export default EditorControls

interface IconControlButtonProps {
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
}
function IconControlButton(props: IconControlButtonProps): JSX.Element {
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

interface RedoMenuContainerProps {
    menuRef: MutableRefObject<HTMLDivElement | null>
    options: Array<{ node: HistoryNode; preferred: boolean }>
    onRedo: (branch: HistoryStateId) => void
    onHover: (branch?: HistoryStateId) => void
}
function RedoMenuContainer({ menuRef, options, onRedo, onHover }: RedoMenuContainerProps) {
    return (
        <RedoScrollWrapper>
            <RedoMenu ref={menuRef} className="redo-menu">
                {options.map(({ node, preferred }, index) => (
                    <RedoOption
                        key={index}
                        onClick={() => onRedo(node.id)}
                        preferred={preferred}
                        onPointerEnter={() => onHover(node.id)}
                        onPointerLeave={() => onHover()}
                    >
                        <RedoOptionContent branch={node} />
                    </RedoOption>
                ))}
            </RedoMenu>
        </RedoScrollWrapper>
    )
}

interface RedoOptionContentProps {
    branch: HistoryNode
}
function RedoOptionContent({ branch }: RedoOptionContentProps) {
    const changes = [...branch.changes.values()]
    const removes = changes.filter(
        (change) => change.type === HistoryStepType.remove
    ) as Array<HistoryStepRemove>
    const creates = changes.filter(
        (change) => change.type === HistoryStepType.create
    ) as Array<HistoryStepCreate>
    const updates = changes.filter(
        (change) => change.type === HistoryStepType.update
    ) as Array<HistoryStepUpdate>
    return (
        <Fragment>
            {removes.slice(0, 2).map((change, i) => (
                <div key={i}>
                    <MinusIcon />
                    <div>
                        {change.previous.type === SectionType.text &&
                        change.previous.text.trim().length > 0 ? (
                            change.previous.text.slice(0, 512)
                        ) : (
                            <MoreTextIcon />
                        )}
                    </div>
                </div>
            ))}
            {removes.slice(2, 3).map((change, i) => (
                <div key={i}>
                    <MinusIcon />
                    <div>
                        <MoreTextIcon />
                    </div>
                </div>
            ))}
            {creates.slice(0, 2).map((change, i) => (
                <div key={i}>
                    <PlusIcon />
                    <div>
                        {change.section.type === SectionType.text && change.section.text.trim().length > 0 ? (
                            change.section.text.slice(0, 512)
                        ) : (
                            <MoreTextIcon />
                        )}
                    </div>
                </div>
            ))}
            {creates.slice(2, 3).map((change, i) => (
                <div key={i}>
                    <MinusIcon />
                    <div>
                        <MoreTextIcon />
                    </div>
                </div>
            ))}
            {updates.slice(0, 2).map((change, i) => (
                <Fragment key={i}>
                    {(change.diff.diff as SectionDiffText).parts.length > 0 ? (
                        <Fragment>
                            {(change.diff.diff as SectionDiffText).parts
                                .filter((part) => part.insert)
                                .slice(0, 1)
                                .map((part, i) => (
                                    <div key={i}>
                                        <PlusIcon />
                                        <div>{part.insert.slice(0, 512)}</div>
                                    </div>
                                ))}
                            {(change.diff.diff as SectionDiffText).parts
                                .filter((part) => part.delete)
                                .slice(0, 1)
                                .map((part, i) => (
                                    <div key={i}>
                                        <MinusIcon />
                                        <div>{part.delete.slice(0, 512)}</div>
                                    </div>
                                ))}
                        </Fragment>
                    ) : (
                        <div>
                            <PenWritingIcon />
                            <div>
                                <MoreTextIcon />
                            </div>
                        </div>
                    )}
                </Fragment>
            ))}
            {updates.slice(2, 3).map((change, i) => (
                <Fragment key={i}>
                    <div>
                        <PenWritingIcon />
                        <div>
                            <MoreTextIcon />
                        </div>
                    </div>
                </Fragment>
            ))}
        </Fragment>
    )
}

const MoreTextIcon = styled(DotDotDotIcon)`
    height: 16px !important;
    width: 16px !important;
    pointer-events: none;
`

const ControlsContainer = styled.div``
const ControlsContent = styled.div`
    margin-top: 15px;
    opacity: 1;
    position: relative;
    transition: opacity 0.32s ease-in-out 0s, margin-bottom 0.32s ease-in-out 0s;
    display: flex;
    flex-direction: column;
`
const ControlsRow = styled.div`
    display: flex;
    flex-flow: row wrap;
    user-select: none;
    align-items: flex-end;
    -webkit-box-pack: justify;
    justify-content: space-between;
`
const ControlsRowGroup = styled.div`
    display: flex;
    flex-flow: row wrap;
    user-select: none;
    gap: 8px;
    align-items: flex-end;
`
