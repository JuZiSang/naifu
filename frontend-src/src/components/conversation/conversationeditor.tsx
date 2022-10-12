import { v4 as uuid } from 'uuid'
import { EditorState, TextSelection, Plugin } from 'prosemirror-state'
import { undo, redo, history, clear } from 'prosemirror-history'
import { Fragment, Slice, Node } from 'prosemirror-model'
import { SetterOrUpdater, useRecoilCallback, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import React, { useEffect, useRef, useState, useLayoutEffect, useMemo, useCallback } from 'react'
import { Transform } from 'prosemirror-transform'
import styled from 'styled-components'
import { createPortal } from 'react-dom'
import { EditorProps, EditorView } from 'prosemirror-view'
import { toast } from 'react-toastify'

import { Action } from 'typescript-fsa'
import {
    GenerationRequestActive,
    GenerationRequestError,
    LorebookGenerateClipboard,
    LorebookOpen,
    ScreenshotModalState,
    SelectedLorebookEntry,
    SelectedStoryId,
    SelectedStoryLoaded,
    Session,
    SessionValue,
    StorySearch,
    StoryUpdate,
    TokenizerOpen,
    TokenizerText,
} from '../../globals/state'
import { GlobalUserContext } from '../../globals/globals'
import { StoryContainer } from '../../data/story/storycontainer'
import { ArrowRightIcon, SaveIcon } from '../../styles/ui/icons'
import { Scenario } from '../../data/story/scenario'
import { detectImportDataType, ImportDataType, naiAlphaStoryToStory } from '../../data/story/storyconverter'
import { subscribeToHotEvent, HotEvent, HotEventSub } from '../../data/user/hotkeys'
import { useContextMenu } from '../../hooks/useContextMenu'
import { useWindowSize } from '../../hooks/useWindowSize'
import { ScreenreaderToggle } from '../../styles/ui/screenreadertoggle'
import { downloadFile, logError, logInfo } from '../../util/browser'
import { isTouchScreenDevice, isSpellCheckSupported } from '../../util/compat'
import { createTTSRequest, isTTSAvailable, TTSVoices } from '../../util/tts'
import Modal, { ModalType } from '../modals/modal'
import { ImportStory } from '../import/importstory'
import { ImportScenario } from '../import/importscenario'
import { LoreKeyHover } from '../tooltip'
import { copyToClipboard } from '../sidebars/infobar/items/storyexporter'
import { createLorebookEntry } from '../lorebook/lorebookmodal'
import { addKeyToEntry } from '../lorebook/lorebookeditarea'
import { modelDifferenceToast } from '../toasts/modeldifference'
import { modelsCompatible } from '../../util/models'
import { mod } from '../../util/util'
import { getUserSetting, TTSModel, TTSType, UserSettings } from '../../data/user/settings'
import { hasStreamedTTSAccess } from '../../util/subscription'
import useAddStory from '../../hooks/useAddStory'

import { chainCommands, createParagraphNear, liftEmptyBlock, splitBlock } from '../editor/commands'
import { editorKeymap } from '../editor/keymap'
import { useProseMirror, ProseMirrorHandle, ProseMirror, TransformState } from '../editor/prosemirror'
import { placeholder, devTool, keymap } from '../editor/plugins'
import {
    ContextMenu,
    ButtonItem,
    Splitter,
    SplitButtonIcon,
    HintText,
    ExpandItem,
    SideContextMenu,
} from '../controls/contextmenu'
import { eventBus } from '../../globals/events'
import { createEditorEvent, EditorEvent, EditorEventType, EditorLoadEvent } from '../editor/events'
import { LoadingSpinner } from '../loading'
import { speakTTS, stopTTS } from '../controls/tts'
import { handlePasteText, transformHTML } from './util'
import {
    decorations,
    EditorQueueAdd,
    EditorQueueClear,
    EditorQueueFocus,
    EditorQueueItem,
    EditorQueueParagraph,
    loadWrapper,
} from './editorutils'
import { textSchema, activeNodes } from './schema'
import { editorQueue, EditorQueueUpdate } from './conversation'

const toPlainText = (content: Fragment): string => {
    let text: string = ''

    for (let index = 0; index < content.childCount; index++) {
        const element = content.child(index)
        text += index + 1 !== content.childCount ? element.textContent + '\n' : element.textContent
    }
    return text.replace(/\r/g, '')
}

export let getEditorText: (() => string) | undefined

const fromPlainText = (text: string, tr: Transform): Transform => {
    const lines = text.split(/\r?\n/)

    let validBefore = false
    for (const [index, element] of lines.entries()) {
        let node

        for (const adnode of activeNodes.adventure) {
            if (adnode.regex && adnode.regex.test(element)) {
                node = textSchema.nodes.adventureInput.create(
                    { name: adnode.name, icon: adnode.icon.src },
                    textSchema.text(element)
                )
                break
            }
        }

        if (node === undefined) {
            if (!validBefore || index + 1 >= lines.length) {
                node =
                    element === ''
                        ? textSchema.nodes.adventureStoryEnd.create()
                        : textSchema.nodes.adventureStoryEnd.create(null, textSchema.text(element))
            } else {
                node =
                    element === ''
                        ? textSchema.nodes.adventureStory.create()
                        : textSchema.nodes.adventureStory.create(null, textSchema.text(element))
            }
        }

        validBefore = node === undefined

        if (index === 0) {
            tr.replaceWith(0, tr.doc.content.size, node)
        } else {
            tr.insert(tr.doc.content.size, node)
        }
    }
    return tr
}

const handleCopyText = (slice: Slice) => {
    return toPlainText(slice.content)
}

// NOTE: This is a workaround for decoupling generation request state
// from the editor component, due to accessing the state in a recoil callback
// is asynchronous and the value is required in a synchronous callback.
// TODO: Find a better solution for this.
let _globalGenerationRequestActive = false
function getGlobalGenerationRequestActive() {
    return _globalGenerationRequestActive
}

let toAllowBlurStory: string | undefined
let blurAllowedStory: string | undefined

function ConversationEditorStateUpdater(props: {
    state: EditorState
    setFailedLoading: React.Dispatch<React.SetStateAction<boolean>>
    setEditorClean: React.Dispatch<React.SetStateAction<boolean>>
    transformState: TransformState
    setError: SetterOrUpdater<string>
    hasLoaded: React.MutableRefObject<boolean>
    viewRef: React.MutableRefObject<null | ProseMirrorHandle>
}) {
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    const [editorQueueUpdate, setEditorQueueUpdate] = useRecoilState(EditorQueueUpdate)
    const selectedStoryId = useRecoilValue(SelectedStoryId)
    const shouldScroll = useRef(false)
    const shouldFocus = useRef(false)

    useEffect(() => {
        _globalGenerationRequestActive = generationRequestActive
    }, [generationRequestActive])
    const handleQueue = useCallback(
        (queue: Array<EditorQueueItem>) => {
            if (queue.length === 0) return
            try {
                props.transformState((state) => {
                    const tr = state.tr
                    clear(props.state)
                    for (const item of queue) {
                        if (item instanceof EditorQueueAdd || item instanceof EditorQueueParagraph) {
                            const element = document.querySelectorAll('.ProseMirror')[0]?.parentElement as
                                | HTMLDivElement
                                | undefined

                            shouldScroll.current =
                                element &&
                                element.offsetHeight + element.scrollTop >= element.scrollHeight - 2
                                    ? true
                                    : false
                        }
                        if (item instanceof EditorQueueFocus) {
                            shouldFocus.current = true
                            toAllowBlurStory = selectedStoryId
                        }
                        const view = props.viewRef.current?.view
                        if (view) {
                            item.performTransform(tr, props.state, view)
                        } else {
                            logError('editor view unavailable for ' + item.constructor, false, props.state)
                        }
                    }
                    tr.setMeta('addToHistory', false)
                    return tr
                }, false)
                props.setEditorClean(false)
            } catch (error: any) {
                logError(error)
                props.setError(`${error}`)
                props.setFailedLoading(true)
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedStoryId]
    )

    useEffect(() => {
        if (editorQueue.queue.length === 0) return
        const queue = [...editorQueue.queue]
        editorQueue.queue = []
        handleQueue(queue)
        setEditorQueueUpdate(editorQueueUpdate + 1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorQueueUpdate, handleQueue])

    const handleEvent = useRecoilCallback(
        ({ snapshot }) =>
            async (event: EditorEvent) => {
                const selectedStoryId = await snapshot.getPromise(SelectedStoryId)
                const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStoryId)
                if (!currentStoryContent?.story) return
                const settings = (await snapshot.getPromise(SessionValue('settings'))) as UserSettings
                switch (event.type) {
                    case EditorEventType.clear: {
                        editorQueue.queue = [...editorQueue.queue, new EditorQueueClear()]
                        setEditorQueueUpdate((v) => v + 1)
                        break
                    }
                    case EditorEventType.decorate: {
                        editorQueue.queue = [...editorQueue.queue, ...decorations(currentStoryContent)]
                        setEditorQueueUpdate((v) => v + 1)
                        break
                    }
                    case EditorEventType.load: {
                        if (selectedStoryId !== (event as EditorLoadEvent).meta.id) {
                            logError('story load id mismatch')
                            break
                        }
                        editorQueue.queue = loadWrapper(
                            (event as EditorLoadEvent).story,
                            settings.editorLoreKeys ?? false
                        )
                        setEditorQueueUpdate((v) => v + 1)
                        break
                    }
                }
            },
        []
    )

    useEffect(() => {
        const sub = eventBus.listenQueueing(createEditorEvent.match, (event: Action<EditorEvent>) => {
            handleEvent(event.payload)
        })
        return () => sub.unsubscribe()
    }, [handleEvent])

    useLayoutEffect(() => {
        if (shouldScroll.current) {
            const element = document.querySelectorAll('.ProseMirror')[0]?.parentElement as
                | HTMLDivElement
                | undefined
            if (element) {
                element.scrollTop = element.scrollHeight
            }
            shouldScroll.current = false
        }
        if (shouldFocus.current) {
            setTimeout(() => props.viewRef.current?.view?.focus(), 0)
            shouldFocus.current = false
            blurAllowedStory = toAllowBlurStory
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.state])

    return <></>
}

function ScrollDownOnLoad(): JSX.Element {
    const storyID = useRecoilValue(SelectedStoryId)
    const storyLoaded = useRecoilValue(SelectedStoryLoaded)

    useEffect(() => {
        if (storyID && storyLoaded) {
            setTimeout(() => {
                const element = document.querySelectorAll('.ProseMirror')[0]?.parentElement as
                    | HTMLDivElement
                    | undefined
                if (element) {
                    element.scrollTop = element.scrollHeight
                }
            }, 25)
        }
    }, [storyID, storyLoaded])

    return <></>
}

export default function ConversationEditor(props: {
    onEditRequest: (
        editedText: string,
        requestGeneration: boolean,
        start?: number,
        end?: number
    ) => Promise<void>
    onContentChange: () => void
    requestScroll?: () => void
}): JSX.Element {
    const session = useRecoilValue(Session)

    const [state, transformState] = useProseMirror({
        schema: textSchema,
        plugins: [
            keymap(editorKeymap),
            history({}),
            keymap({ 'Mod-z': undo }),
            keymap({ 'Shift-Mod-z': redo }),
            keymap({ 'Mod-y': redo }),
            keymap({
                'Shift-Enter': chainCommands(createParagraphNear, liftEmptyBlock, splitBlock),
            }),
            devTool(),
            placeholder(),
            new Plugin({ props: { plainTextPaste: true } as EditorProps }),
        ],
    })

    useEffect(() => {
        viewRef.current?.view?.setProps({
            attributes: {
                spellcheck: `${
                    isSpellCheckSupported && getUserSetting(session.settings, 'editorSpellcheck')
                }`,
            },
        })
    }, [session])
    const [error, setError] = useRecoilState(GenerationRequestError)

    const selectedStoryId = useRecoilValue(SelectedStoryId)
    const selectedStoryLoaded = useRecoilValue(SelectedStoryLoaded)

    const storyRef = useRef({ id: '', loaded: false })
    useEffect(() => {
        if (storyRef.current.id === selectedStoryId && storyRef.current.loaded === true) return
        storyRef.current.id = selectedStoryId
        storyRef.current.loaded = selectedStoryLoaded
        if (!selectedStoryLoaded) return
        const story = GlobalUserContext.storyContentCache.get(selectedStoryId)
        const meta = GlobalUserContext.stories.get(selectedStoryId)
        if (!story || !meta) return
        eventBus.trigger(createEditorEvent(new EditorLoadEvent(story, meta)))
    }, [selectedStoryId, selectedStoryLoaded])

    const setSearchValue = useSetRecoilState(StorySearch)
    const setSelectedEntry = useSetRecoilState(SelectedLorebookEntry)
    const setLorebookVisible = useSetRecoilState(LorebookOpen)

    const [failedLoading, setFailedLoading] = useState(false)
    const [, setEditorClean] = useState(true)
    const [importModalVisible, setImportModalVisible] = useState(false)
    const [importScenarioModalVisible, setImportScenarioModalVisible] = useState(false)

    const [importedStory, setImportedStory] = useState(new StoryContainer())
    const [importedScenario, setImportedScenario] = useState(new Scenario())
    const [contextMenuOpen, setContextMenuOpen] = useState(false)
    const [hoveredKey, setHoveredKey] = useState<HTMLElement | null>(null)
    const [pastedText, setPastedText] = useState('')

    const viewRef = useRef<null | ProseMirrorHandle>(null)
    const outputRef = useRef<any>(null)
    const lastStory = useRef<string>('')
    const hasLoaded = useRef<boolean>(false)
    const shouldScroll = useRef<boolean>(false)

    const stateRef = useRef<EditorState>(state)
    stateRef.current = state

    const hotEditorFocusRef = useRef<any>(null)
    const hotEditorRequestInsertRef = useRef<any>(null)
    const hotEditorRequestRef = useRef<any>(null)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStoryId)

    const hotEditorFocus = () => {
        viewRef?.current?.view?.focus()
        return true
    }
    hotEditorFocusRef.current = hotEditorFocus

    const hotEditorRequestInsert = useRecoilCallback(({ snapshot }) => async () => {
        if (
            (await snapshot.getPromise(GenerationRequestActive)) ||
            failedLoading ||
            (!selectedStoryLoaded && selectedStoryId)
        ) {
            return false
        }

        generateAtSelection()
        return true
    })
    hotEditorRequestInsertRef.current = hotEditorRequestInsert

    const hotEditorRequest = useRecoilCallback(({ snapshot }) => async () => {
        if ((await snapshot.getPromise(GenerationRequestActive)) || failedLoading) {
            return false
        }

        props.onEditRequest(toPlainText(state.doc.content), true).catch((error: any) => {
            logError(error, true, error.stack)
            setError(`${error}`)
        })

        const element = document.querySelectorAll('.ProseMirror')[0]?.parentElement as
            | HTMLDivElement
            | undefined
        if (element) {
            element.scrollTop = element.scrollHeight
        }
        return true
    })
    hotEditorRequestRef.current = hotEditorRequest

    useEffect(() => {
        subscribeToHotEvent(HotEvent.editorFocus, new HotEventSub('ceEF', hotEditorFocusRef))
        subscribeToHotEvent(HotEvent.editorRequestInsert, new HotEventSub('ceERI', hotEditorRequestInsertRef))
        subscribeToHotEvent(HotEvent.editorRequest, new HotEventSub('ceER', hotEditorRequestRef))
    }, [])

    // Handle scroll requested by conversation on generation
    const scroll = props.requestScroll
    useEffect(() => {
        if (scroll) {
            scroll()
        }
    }, [state, scroll])

    // Handle scroll after switching stories
    useLayoutEffect(() => {
        if (selectedStoryId !== lastStory.current) {
            lastStory.current = selectedStoryId
            hasLoaded.current = true
            shouldScroll.current = true
        }
    }, [selectedStoryId, selectedStoryLoaded])
    useEffect(() => {
        if (shouldScroll.current === true) {
            shouldScroll.current = false
            const element = document.querySelectorAll('.ProseMirror')[0]?.parentElement as
                | HTMLDivElement
                | undefined
            if (element) element.scrollIntoView(false)
        }
    }, [state])

    const scrollPositionRef = useRef(0)
    useEffect(() => {
        // eslint-disable-next-line compat/compat
        const observer = new ResizeObserver(() => {
            if (!viewRef.current?.root) return
            if (scrollPositionRef.current <= 5) {
                viewRef.current.root.scrollTop = viewRef.current.root.scrollHeight
            }
        })
        if (viewRef.current?.root) observer.observe(viewRef.current.root)
        return () => observer.disconnect()
    }, [selectedStoryLoaded])

    const generateAtSelection = useCallback(() => {
        if (!currentStoryContent) return
        const selection = TextSelection.create(state.doc, 0, state.selection.$from.pos)
        const newlinesBefore = Math.max(selection.content().content.childCount - 1, 0)
        const newlinesIn = Math.max(state.selection.content().content.childCount - 1, 0)
        const start = Math.max(
            0,
            Math.min(state.doc.content.size - 1 - newlinesBefore, state.selection.from - 1 - newlinesBefore)
        )
        const end = Math.max(
            0,
            Math.min(
                state.doc.content.size - 1 - newlinesBefore - newlinesIn,
                state.selection.to - 1 - newlinesBefore - newlinesIn
            )
        )

        props.onEditRequest(toPlainText(state.doc.content), true, start, end).catch((error: any) => {
            logError(error, true, error.stack)
            setError(`${error}`)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStoryContent, props.onEditRequest, setError, state.doc, state.selection])

    const generateAtSelectionRef = useRef(generateAtSelection)
    generateAtSelectionRef.current = generateAtSelection

    getEditorText = () => {
        return toPlainText(state.doc.content)
    }

    const onBlur = useRecoilCallback(({ snapshot }) => async () => {
        const selectedStoryId = await snapshot.getPromise(SelectedStoryId)
        if (
            importModalVisible ||
            failedLoading ||
            (await snapshot.getPromise(GenerationRequestActive)) ||
            blurAllowedStory !== selectedStoryId
        ) {
            return
        }
        props.onEditRequest(toPlainText(state.doc.content), false).catch((error: any) => {
            logError(error, true, error.stack)
            setError(`${error}`)
        })
    })

    const handlePaste = (_view: EditorView, event: ClipboardEvent) => {
        let paste
        if (event.clipboardData) {
            paste = event.clipboardData.getData('text')
            setPastedText(paste)
        }
        if (!paste) return true
        try {
            const jsonType = detectImportDataType(paste)
            let storyContainer
            switch (jsonType) {
                case ImportDataType.naiStory:
                    storyContainer = StoryContainer.deserialize(paste)
                    storyContainer.metadata.id = uuid()
                    setImportedStory(storyContainer)
                    setImportModalVisible(true)
                    return true
                case ImportDataType.naiAlphaStory:
                    storyContainer = naiAlphaStoryToStory(paste)
                    setImportedStory(storyContainer)
                    setImportModalVisible(true)
                    return true
                case ImportDataType.naiScenario:
                    const scenario = Scenario.deserialize(paste)
                    setImportedScenario(scenario)
                    setImportScenarioModalVisible(true)
                    return true
            }
        } catch (error) {
            logInfo(error, false)
        }
        return false
    }

    const { importStory } = useAddStory({
        callback: () => {
            setSearchValue('')
            setImportModalVisible(false)
            setImportScenarioModalVisible(false)
        },
    })

    const pasteText = () => {
        transformState((state) => {
            const tr = state.tr
            tr.insertText(pastedText)
            return tr
        })
        setImportModalVisible(false)
        viewRef?.current?.view?.focus()
    }

    const handleRequestClosed = () => {
        setImportModalVisible(false)
        setImportScenarioModalVisible(false)
    }

    const onKeyDown = useMemo(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        () => (_view: EditorView, _e: KeyboardEvent) => {
            if (contextMenuOpen) return true
            if (getGlobalGenerationRequestActive()) {
                return true
            }
            return false
        },
        [contextMenuOpen]
    )

    const scrollCallbackRef = useRef(0)

    return (
        <ConversationOutput ref={outputRef} tabIndex={0} onBlur={onBlur} className="conversation-editor">
            <Modal
                label="Import Story"
                onRequestClose={handleRequestClosed}
                isOpen={importModalVisible}
                type={ModalType.Large}
                shouldCloseOnOverlayClick={true}
            >
                <ImportStory
                    importedStory={importedStory}
                    onClickPaste={pasteText}
                    onClickImport={(story) => {
                        if (
                            !modelsCompatible(
                                story.content.settings.model,
                                getUserSetting(session.settings, 'defaultModel')
                            )
                        ) {
                            modelDifferenceToast(session, story.content.settings.model, false)
                        }
                        importStory(story)
                    }}
                />
            </Modal>
            <Modal
                label="Import Scenario"
                onRequestClose={handleRequestClosed}
                isOpen={importScenarioModalVisible}
                shouldCloseOnOverlayClick={true}
                type={ModalType.Large}
            >
                <ImportScenario
                    importedScenario={importedScenario}
                    onClickImport={(story) => {
                        importStory(story)
                    }}
                    close={handleRequestClosed}
                />
            </Modal>
            {failedLoading ? (
                <FailedLoadingInfo>
                    <div>
                        Story failed to load. This is an internal error, please reload the page and try again.
                    </div>
                    <div>${error}</div>
                </FailedLoadingInfo>
            ) : !selectedStoryLoaded ? (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <LoadingSpinner visible />
                </div>
            ) : (
                <ScrollContainer
                    storySelected={selectedStoryId !== ''}
                    loaded={selectedStoryLoaded ?? false}
                    ref={viewRef}
                    state={state}
                    dispatchTransaction={(tr) => {
                        if (getGlobalGenerationRequestActive()) {
                            return
                        }
                        props.onContentChange()
                        transformState(() => tr)
                    }}
                    handlePaste={handlePaste}
                    clipboardTextSerializer={handleCopyText}
                    clipboardTextParser={handlePasteText}
                    transformPastedHTML={transformHTML}
                    handleKeyDown={onKeyDown}
                    handleScroll={(view, event) => {
                        scrollCallbackRef.current = setTimeout(() => {
                            scrollPositionRef.current =
                                (event.target as HTMLDivElement).scrollHeight -
                                (event.target as HTMLDivElement).scrollTop -
                                (event.target as HTMLDivElement).clientHeight
                        }, 20) as unknown as number
                    }}
                    handleDoubleClickOn={(
                        _view: EditorView,
                        _pos: number,
                        _node: Node,
                        _nodePos: number,
                        event: MouseEvent
                    ) => {
                        if (isTouchScreenDevice) return false
                        if (event && event.target) {
                            const node = event.target as HTMLSpanElement
                            if (node.classList[0] === 'lorekey' && node.classList[1]) {
                                setSelectedEntry(node.classList[1])
                                setLorebookVisible(true)
                                return true
                            }
                        }
                        return false
                    }}
                    handleDOMEvents={{
                        mouseover: (_view: EditorView, event: Event) => {
                            if (event && event.target) {
                                const node = event.target as HTMLSpanElement
                                if (node.classList[0] !== 'lorekey') {
                                    setHoveredKey(null)
                                    return false
                                }
                                for (const c of node.classList) {
                                    if (c !== 'lorekey') {
                                        setHoveredKey(node)
                                        return true
                                    }
                                }
                                setHoveredKey(null)
                            }
                            return false
                        },
                        mouseleave: () => {
                            setHoveredKey(null)
                            return false
                        },
                    }}
                    handleClick={(_view: EditorView, _pos: number, event: MouseEvent) => {
                        if (event.button === 2) {
                            event.preventDefault()
                            event.stopPropagation()
                            return true
                        }
                        return false
                    }}
                />
            )}
            <LoreKeyHover element={hoveredKey} />
            {useMemo(() => {
                return createPortal(
                    <EditorContextMenu
                        setContextMenuOpen={setContextMenuOpen}
                        editor={stateRef}
                        transformState={transformState}
                        generateAtSelection={() => generateAtSelectionRef.current()}
                    />,
                    document.body
                )
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [state.selection.content().content])}
            <ConversationEditorStateUpdater
                state={state}
                setFailedLoading={setFailedLoading}
                setEditorClean={setEditorClean}
                transformState={transformState}
                setError={setError}
                hasLoaded={hasLoaded}
                viewRef={viewRef}
            />
            <ScrollDownOnLoad />
        </ConversationOutput>
    )
}

function EditorContextMenu(props: {
    selection?: string
    editor: React.MutableRefObject<EditorState>
    transformState: TransformState
    generateAtSelection: () => void
    setContextMenuOpen: (state: boolean) => void
}) {
    const session = useRecoilValue(Session)

    const { xPos, yPos, showMenu, setShowMenu } = useContextMenu(
        'div.ProseMirror',
        getUserSetting(session.settings, 'contextMenuSwap')
    )

    const selectedStoryId = useRecoilValue(SelectedStoryId)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStoryId)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStoryId)
    const { height, width } = useWindowSize()
    const menuRef = useRef<HTMLDivElement>(null)
    const hintRef = useRef<HTMLDivElement>(null)

    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const setLoreGenerate = useSetRecoilState(LorebookGenerateClipboard)
    const setLorebookVisible = useSetRecoilState(LorebookOpen)
    const setSelectedEntry = useSetRecoilState(SelectedLorebookEntry)
    const [selectedListItem, setSelectedListItem] = useState(-1)
    const [nestedSelection, setNestedSelection] = useState(-1)
    const [selectedItemText, setSelectedItemText] = useState('')

    const hotNavigateDownRef = useRef<any>(null)
    const hotNavigateUpRef = useRef<any>(null)
    const hotNavigateLeftRef = useRef<any>(null)
    const hotNavigateRightRef = useRef<any>(null)
    const hotNavigateForwardRef = useRef<any>(null)

    const copy = () => {
        const selection = toPlainText(props.editor.current.selection.content().content)
        copyToClipboard(selection)
    }

    const getButtons = () => {
        const allButtons = { buttons: [] as HTMLElement[], nestedButtons: [] as HTMLElement[] }

        if (menuRef.current === null) {
            return allButtons
        }

        const element = menuRef.current.firstChild as HTMLElement
        const buttons: HTMLElement[] = [...element.querySelectorAll('button,  div')].filter(
            (e: Element) =>
                (e as HTMLElement).parentElement === element &&
                (e as HTMLElement).getAttribute('aria-disabled') !== 'true'
        ) as HTMLElement[]
        let nestedButtons: HTMLElement[] = []
        if (
            buttons[selectedListItem] &&
            buttons[selectedListItem].tagName === 'DIV' &&
            buttons[selectedListItem].lastChild
        ) {
            nestedButtons = [
                ...(buttons[selectedListItem].lastChild as HTMLElement).querySelectorAll('button'),
            ] as HTMLElement[]
        }

        allButtons.buttons = buttons
        allButtons.nestedButtons = nestedButtons

        return allButtons
    }

    const hotNavigateDown = () => {
        if (!showMenu || !menuRef || !menuRef.current) {
            return false
        }

        const buttons = getButtons()

        if (nestedSelection >= 0) {
            const newIndex = mod(nestedSelection + 1, buttons.nestedButtons.length)
            const text = buttons.nestedButtons[newIndex].children[0].textContent
            setNestedSelection(newIndex)
            if (text) setSelectedItemText(text)
        } else {
            const newIndex = mod(selectedListItem + 1, buttons.buttons.length)
            const text = buttons.buttons[newIndex].children[0].textContent
            setSelectedListItem(newIndex)
            if (text) setSelectedItemText(text)
        }

        return true
    }
    hotNavigateDownRef.current = hotNavigateDown

    const hotNavigateUp = () => {
        if (!showMenu || !menuRef || !menuRef.current) {
            return false
        }

        const buttons = getButtons()

        if (nestedSelection >= 0) {
            const newIndex = mod(nestedSelection - 1, buttons.nestedButtons.length)
            const text = buttons.nestedButtons[newIndex].children[0].textContent
            setNestedSelection(newIndex)
            if (text) setSelectedItemText(text)
        } else {
            const newIndex = mod(selectedListItem - 1, buttons.buttons.length)
            const text = buttons.buttons[newIndex].children[0].textContent
            setSelectedListItem(newIndex)
            if (text) setSelectedItemText(text)
        }

        return true
    }
    hotNavigateUpRef.current = hotNavigateUp

    const hotNavigateRight = () => {
        if (!showMenu || !menuRef || !menuRef.current) {
            return false
        }

        const buttons = getButtons()

        if (
            buttons.buttons[selectedListItem] &&
            buttons.buttons[selectedListItem].tagName === 'DIV' &&
            nestedSelection === -1
        ) {
            const text = buttons.nestedButtons[0].children[0].textContent
            if (text) setSelectedItemText(text)
            setNestedSelection(0)
        }

        return true
    }
    hotNavigateRightRef.current = hotNavigateRight

    const hotNavigateLeft = () => {
        if (!showMenu || !menuRef || !menuRef.current) {
            return false
        }

        const buttons = getButtons()
        const text = buttons.buttons[selectedListItem].children[0].textContent
        if (text) setSelectedItemText(text)

        setNestedSelection(-1)

        return true
    }
    hotNavigateLeftRef.current = hotNavigateLeft

    const hotNavigateForward = () => {
        if (!showMenu || !menuRef || !menuRef.current || selectedListItem < 0) {
            return false
        }

        const buttons = getButtons()
        if (nestedSelection >= 0) {
            buttons.nestedButtons[nestedSelection].click()
        } else {
            if (buttons.buttons[selectedListItem].tagName === 'DIV') {
                setNestedSelection(0)
            } else {
                buttons.buttons[selectedListItem].click()
            }
        }
    }
    hotNavigateForwardRef.current = hotNavigateForward

    useEffect(() => {
        subscribeToHotEvent(HotEvent.navigateDown, new HotEventSub('cmNDown', hotNavigateDownRef, true))
        subscribeToHotEvent(HotEvent.navigateUp, new HotEventSub('cmNUp', hotNavigateUpRef, true))
        subscribeToHotEvent(HotEvent.navigateLeft, new HotEventSub('cmNLeft', hotNavigateLeftRef))
        subscribeToHotEvent(HotEvent.navigateRight, new HotEventSub('cmNRight', hotNavigateRightRef))
        subscribeToHotEvent(HotEvent.accept, new HotEventSub('cnMFor', hotNavigateForwardRef))
    }, [])

    useEffect(() => {
        props.setContextMenuOpen(showMenu)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showMenu])

    useEffect(() => {
        if (!showMenu || !menuRef || !menuRef.current) {
            setSelectedListItem(-1)
            setNestedSelection(-1)
        }
    }, [nestedSelection, selectedListItem, setShowMenu, showMenu])

    const cut = () => {
        const selection = toPlainText(props.editor.current.selection.content().content)
        copyToClipboard(selection)
        const tr = props.editor.current.tr
        const content = fromPlainText('', new Transform(textSchema.nodes.doc.create())).doc.content
        tr.replaceSelection(new Slice(content, 1, 1))
        props.transformState(() => tr)
    }

    const toLoreGenerate = (group: string) => {
        if (!currentStoryContent) return
        const selection = toPlainText(props.editor.current.selection.content().content)
        const newEntry = createLorebookEntry(currentStoryContent)
        currentStoryContent.lorebook.entries.push(newEntry)
        setSelectedEntry(newEntry.id)
        setLoreGenerate({ text: selection.trim(), group })
        setLorebookVisible(true)
    }

    const toLoreAsText = () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        const selection = toPlainText(props.editor.current.selection.content().content)
        const newEntry = createLorebookEntry(currentStoryContent)
        newEntry.text = selection
        currentStoryContent.lorebook.entries.push(newEntry)
        setStoryUpdate(currentStoryMetadata.save())
        setSelectedEntry(newEntry.id)
        setLorebookVisible(true)
    }

    const toLoreAsKey = () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        const selection = toPlainText(props.editor.current.selection.content().content)
        const newEntry = createLorebookEntry(currentStoryContent)
        addKeyToEntry(
            selection.trim(),
            newEntry,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            () => {},
            (name) => (newEntry.displayName = name)
        )
        currentStoryContent.lorebook.entries.push(newEntry)
        setStoryUpdate(currentStoryMetadata.save())
        setSelectedEntry(newEntry.id)
        setLorebookVisible(true)
    }

    const paste = () => {
        if (!navigator.clipboard?.readText) return
        navigator.clipboard
            .readText()
            .then((text) => {
                const tr = props.editor.current.tr
                const content = fromPlainText(text, new Transform(textSchema.nodes.doc.create())).doc.content
                tr.replaceSelection(new Slice(content, 1, 1))
                props.transformState(() => tr)
            })
            .catch((error) => {
                logError(error, false, 'Failed to read clipboard contents:')
            })
    }

    const addToContext = (index: number) => {
        if (!currentStoryContent || !currentStoryMetadata) {
            return
        }
        let selection = toPlainText(props.editor.current.selection.content().content)
        if (
            !selection.startsWith('\n') &&
            currentStoryContent.context[index].text !== '' &&
            !currentStoryContent.context[index].text.endsWith('\n')
        ) {
            selection = '\n' + selection
        }
        currentStoryContent.context[index].text += selection
        setStoryUpdate(currentStoryMetadata.save())
    }

    const speak = () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        const selection = toPlainText(props.editor.current.selection.content().content)
        let type = getUserSetting(session.settings, 'ttsType')
        if (type === TTSType.Off) {
            type = hasStreamedTTSAccess(session) ? TTSType.Streamed : TTSType.Local
        }
        stopTTS()
        speakTTS(type, session, selection, {
            error: (error) => toast(error),
        })
    }

    const setTokenizerText = useSetRecoilState(TokenizerText)
    const setTokenizerOpen = useSetRecoilState(TokenizerOpen)

    const tokenize = () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        const selection = toPlainText(props.editor.current.selection.content().content)

        setTokenizerText(selection ?? '')
        setTokenizerOpen(true)
    }

    const setScreenshotState = useSetRecoilState(ScreenshotModalState)
    const screenshot = () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        const beforeSelection = TextSelection.create(
            props.editor.current.doc,
            0,
            props.editor.current.selection.from
        )
        const beforeContent = toPlainText(beforeSelection.content().content)
        const content = toPlainText(props.editor.current.selection.content().content)
        // unfocus editor to save changes
        ;(document.querySelector('.ProseMirror') as HTMLDivElement)?.blur()
        setTimeout(() => {
            setScreenshotState({
                open: true,
                start: beforeContent.length,
                end: beforeContent.length + content.length,
            })
        }, 200)
    }

    const [downloading, setDownloading] = useState(false)

    const speakDownload = async () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        const selection = toPlainText(props.editor.current.selection.content().content)
        if (selection.length > 1000) {
            toast(
                'TTS download limited to at most 1000 characters. Please select a smaller amount of text and try again.'
            )
            return
        }
        let type = getUserSetting(session.settings, 'ttsType')
        if (type === TTSType.Off) {
            type = hasStreamedTTSAccess(session) ? TTSType.Streamed : TTSType.Local
        }
        if (type !== TTSType.Streamed) {
            toast('Cannot download non-streamed TTS')
        }
        setDownloading(true)
        toast('Downloading TTS Audio...')
        const sid = getUserSetting(session.settings, 'sid')
        const model = getUserSetting(session.settings, 'ttsModel')
        const response = await createTTSRequest(
            model,
            selection ? selection.slice(0, 1000) : 'This is Novel AI, the GPT-powered AI Storyteller.',
            model === TTSModel.v1 ? sid : -1,
            false,
            session.auth_token,
            getUserSetting(session.settings, 'ttsModel') === TTSModel.v2
                ? getUserSetting(session.settings, 'ttsV2Seed')
                : getUserSetting(session.settings, 'ttsSeed')
        )
        if (response.status !== 200) {
            const json = await response.json()
            toast('TTS Error: ' + json.message)
            setDownloading(false)

            return
        }
        const data = await response.arrayBuffer()
        if (model === TTSModel.v2) {
            downloadFile(
                new Uint8Array(data),
                `NovelAI_TTS2-${'seed.' + (getUserSetting(session.settings, 'ttsV2Seed') ?? '')}.${
                    selection.length > 20 ? selection.slice(0, 20) + '…' : selection
                }.mp3`,
                'audio/mpeg'
            )
        } else {
            downloadFile(
                new Uint8Array(data),
                `NovelAI_TTS-${
                    sid !== -1
                        ? TTSVoices.find((v) => v.sid === sid)?.name
                        : 'seed.' + (getUserSetting(session.settings, 'ttsSeed') ?? '')
                }.${selection.length > 20 ? selection.slice(0, 20) + '…' : selection}.mp3`,
                'audio/mpeg'
            )
        }
        setDownloading(false)
    }

    let menuWidth = 0
    let menuHeight = 0

    if (menuRef !== null && menuRef.current !== null) {
        menuHeight = menuRef.current.offsetHeight
        menuWidth = menuRef.current.offsetWidth
    }

    let hintHeight = 0
    if (hintRef !== null && hintRef.current !== null) {
        hintHeight = hintRef.current.offsetHeight
    }

    const selection = props.editor.current.selection

    const top = menuHeight + yPos > height ? yPos - menuHeight : yPos
    const left = menuWidth + xPos > width ? xPos - menuWidth : xPos
    const flip = menuWidth + menuWidth + xPos > width
    const flipUp = menuHeight + menuHeight + yPos > height
    const flipUpOther =
        menuHeight + yPos > height
            ? menuHeight * 0.4 + yPos > height
            : menuHeight + menuHeight * 0.4 + yPos > height

    return (
        <>
            <ContextMenu
                ref={menuRef}
                hintHeight={hintHeight}
                style={{
                    top: showMenu ? top : '-1000px',
                    left: showMenu ? left : '-1000px',
                    visibility: showMenu ? 'visible' : 'hidden',
                }}
            >
                <div>
                    <ButtonItem
                        keyboard={!selection.empty && selectedListItem === 0}
                        disabled={selection.empty}
                        aria-disabled={selection.empty}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={cut}
                    >
                        <span>Cut</span>
                        <span>Ctrl+X</span>
                    </ButtonItem>
                    <ButtonItem
                        keyboard={!selection.empty && selectedListItem === 1}
                        disabled={selection.empty}
                        aria-disabled={selection.empty}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={copy}
                    >
                        <span>Copy</span>
                        <span>Ctrl+C</span>
                    </ButtonItem>
                    <ButtonItem
                        keyboard={selection.empty ? selectedListItem === 0 : selectedListItem === 2}
                        disabled={!navigator.clipboard?.readText}
                        aria-disabled={!navigator.clipboard?.readText}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={paste}
                    >
                        <span>Paste</span>
                        <span>Ctrl+V</span>
                    </ButtonItem>
                    <Splitter />
                    <ExpandingMenu
                        keyboard={!selection.empty && selectedListItem === 3}
                        empty={selection.empty}
                        opposite={flip}
                        text={'Add to...'}
                        menuHidden={!showMenu}
                        expandUp={flipUpOther}
                        keyboardOpen={!selection.empty && selectedListItem === 3 && nestedSelection >= 0}
                    >
                        <ButtonItem
                            keyboard={nestedSelection === 0}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                addToContext(0)
                            }}
                        >
                            <span>Memory</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 1}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                addToContext(1)
                            }}
                        >
                            <span>Author{"'"}s Note</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 2}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreAsText()
                            }}
                        >
                            <span>New Lore Entry as Text</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 3}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreAsKey()
                            }}
                        >
                            <span>New Lore Entry as Key</span>
                            <span></span>
                        </ButtonItem>
                    </ExpandingMenu>
                    <ButtonItem
                        keyboard={selection.empty ? selectedListItem === 1 : selectedListItem === 4}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={props.generateAtSelection}
                    >
                        <span>Generate Inline</span>
                        <span></span>
                    </ButtonItem>
                    <ExpandingMenu
                        keyboard={!selection.empty && selectedListItem === 5}
                        empty={selection.empty}
                        opposite={flip}
                        text={'Generate Lore...'}
                        expandUp={flipUp}
                        menuHidden={!showMenu}
                        keyboardOpen={!selection.empty && selectedListItem === 5 && nestedSelection >= 0}
                    >
                        <ButtonItem
                            keyboard={nestedSelection === 0}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('General')
                            }}
                        >
                            <span>General</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 1}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('Person')
                            }}
                        >
                            <span>Person</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 2}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('Place')
                            }}
                        >
                            <span>Place</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 3}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('Thing')
                            }}
                        >
                            <span>Thing</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 4}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('Life')
                            }}
                        >
                            <span>Life</span>
                            <span></span>
                        </ButtonItem>

                        <ButtonItem
                            keyboard={nestedSelection === 5}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('Faction')
                            }}
                        >
                            <span>Faction</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 6}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('Role')
                            }}
                        >
                            <span>Role</span>
                            <span></span>
                        </ButtonItem>

                        <ButtonItem
                            keyboard={nestedSelection === 7}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('Concept')
                            }}
                        >
                            <span>Concept</span>
                            <span></span>
                        </ButtonItem>
                        <ButtonItem
                            keyboard={nestedSelection === 8}
                            disabled={selection.empty}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setShowMenu(false)
                                toLoreGenerate('History')
                            }}
                        >
                            <span>History</span>
                            <span></span>
                        </ButtonItem>
                    </ExpandingMenu>
                    <Splitter />
                    <ButtonItem
                        keyboard={!selection.empty && selectedListItem === 6}
                        disabled={selection.empty}
                        aria-disabled={selection.empty}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={tokenize}
                    >
                        <span>Tokenize</span>
                        <span></span>
                    </ButtonItem>
                    <ButtonItem
                        keyboard={!selection.empty && selectedListItem === 7}
                        disabled={selection.empty}
                        aria-disabled={selection.empty}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={screenshot}
                    >
                        <span>Screenshot</span>
                        <span></span>
                    </ButtonItem>

                    <SplitButtonIcon>
                        <ButtonItem
                            keyboard={!selection.empty && selectedListItem === 8}
                            disabled={selection.empty || !isTTSAvailable()}
                            aria-disabled={selection.empty}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={speak}
                        >
                            <span>Speak with TTS</span>
                            <span></span>
                        </ButtonItem>
                        {(getUserSetting(session.settings, 'ttsType') === TTSType.Streamed ||
                            (getUserSetting(session.settings, 'ttsType') === TTSType.Off &&
                                hasStreamedTTSAccess(session))) && (
                            <ButtonItem
                                keyboard={!selection.empty && selectedListItem === 8}
                                disabled={selection.empty || !isTTSAvailable() || downloading}
                                aria-disabled={selection.empty}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={speakDownload}
                            >
                                <SaveIcon />
                            </ButtonItem>
                        )}
                    </SplitButtonIcon>

                    {getUserSetting(session.settings, 'contextMenuSwap') ? null : (
                        <HintText ref={hintRef}>ctrl+right click to open the browser context menu</HintText>
                    )}
                </div>
                <ScreenreaderToggle notShown={true}>
                    <blockquote aria-live="assertive">{selectedItemText}</blockquote>
                </ScreenreaderToggle>
            </ContextMenu>
        </>
    )
}

function ExpandingMenu(props: {
    children: JSX.Element[]
    empty: boolean
    opposite: boolean
    text: string
    expandUp?: boolean
    menuHidden: boolean
    keyboard: boolean
    keyboardOpen: boolean
}) {
    const [hover, setHover] = useState(false)
    const [click, setClick] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (props.menuHidden) {
            setClick(false)
        }
    }, [props.menuHidden])

    const location = props.opposite ? 'calc(-100%)' : '100%'
    return (
        <ExpandItem
            onHoverStart={() => setHover(true)}
            onHoverEnd={() => setHover(false)}
            keyboard={props.keyboard}
            tabIndex={0}
            role="button"
            aria-disabled={props.empty}
            greyed={props.empty}
            selected={click || hover}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!props.empty) setClick((v) => !v)
            }}
        >
            <span>{props.text}</span>
            <ArrowRightIcon />
            <SideContextMenu
                ref={ref}
                swapSide={location === '100%'}
                style={{
                    top: props.expandUp ? `calc(-${props.children.length - 1}00% - 8px)` : '-8px',
                    left: location,
                    visibility: props.keyboardOpen || hover || click ? 'visible' : 'hidden',
                }}
            >
                <div>{props.children}</div>
            </SideContextMenu>
        </ExpandItem>
    )
}

export const ConversationOutput = styled.div`
    display: block;
    height: 100%;
    width: 100%;
    resize: none;
    overflow: hidden;
`

export const ScrollContainer = styled(ProseMirror)<{ storySelected: boolean; loaded: boolean }>`
    opacity: ${(props) => (!props.storySelected || props.loaded ? '1' : '0')};
    transition: opacity ${(props) => props.theme.transitions.interactive};
    background: transparent;
    display: block;
    overflow-y: auto;
    height: 100%;

    p.empty-node:first-child::before {
        content: ${(props) => (!props.storySelected || props.loaded ? "'Enter your prompt here...'" : "''")};

        color: ${(props) => props.theme.colors.textPlaceholder};
        font-style: normal;
    }
`

export const FailedLoadingInfo = styled.div`
    padding: 10px;
    color: ${(props) => props.theme.colors.textHeadings};
    display: flex;
    flex-direction: column;
    gap: 10px;
    > div:nth-child(2) {
        opacity: 0.35;
    }
`
