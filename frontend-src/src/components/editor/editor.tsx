import { EditorState, Selection, TextSelection, Transaction } from 'prosemirror-state'
import { MarkType, Node, Slice } from 'prosemirror-model'
import {
    CSSProperties,
    forwardRef,
    UIEvent,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react'
import { EditorView } from 'prosemirror-view'

import { Document } from '../../data/document/document'
import { UniqueId } from '../../data/document/util'
import { HistoryStateId } from '../../data/document/history'
import { SectionId } from '../../data/document/section'

import { logDebug, logError } from '../../util/browser'

import { isMacOS } from '../../util/compat'
import { ProseMirrorHandle, ProseMirror, useProseMirror } from './prosemirror'
import {
    clipboardTransform,
    placeholder,
    propsOverride,
    nodeIds,
    devTool,
    keymap,
    inspectNodeChanges,
} from './plugins'
import { schema } from './schema'
import { editorKeymap } from './keymap'
import {
    highlightRedoChanges,
    highlightUndoChanges,
    insertSectionAfter,
    insertSectionBefore,
    redoChanges,
    undoChanges,
    updateOriginMarks,
} from './actions'
import { formattingToMark, nodeToSection } from './glue'
import { handlePasteText, toPlainText } from './util'

export enum EditorHighlightType {
    None = 0,
    LastHistoryEntry = 1,
    HistoryBranch = 2,
}
export interface EditorHighlight {
    type: EditorHighlightType
    branch?: HistoryStateId
}

export enum EditorFormat {
    None = 0,
    Bold = 1,
    Italic = 2,
    Underline = 3,
    Strikethrough = 4,
}

export interface EditorSelection {
    from: number
    to: number
    left: number
    right: number
    top: number
    bottom: number
    text: string
    meta: Set<EditorFormat>
}

interface EditorInnerState {
    blocked: boolean
    baseMark: MarkType
}
export type EditorHandle = {
    view: EditorView | null
    root: HTMLDivElement | null
    document: Document
    state: EditorInnerState
    focus: (focus?: boolean) => void
    reload: () => void
    generate: (inline?: boolean, selection?: Selection | false) => void
    undo: () => void
    redo: (branch?: UniqueId) => void
    highlight: (highlight?: EditorHighlight) => void
    link: (ranges?: Map<SectionId, Array<[number, number]>>) => void
    format: (format?: EditorFormat) => void
    copy: (selection?: Selection) => string
    cut: (selection?: Selection) => void
    replace: (text: string, selection?: Selection) => void
}

export type EditorId = string
export type EditorProps = {
    style?: CSSProperties
    className?: string
    editorId: EditorId
    document: Document
    onTransaction?: (transaction: Transaction, editorId: EditorId) => void
    onDocumentChange?: (document: Document, editorId: EditorId) => void
    onSelectionChange?: (selection: EditorSelection, editorId: EditorId) => void
    onReload?: (document: Document, editorId: EditorId) => void
    onRequestGeneration?: (
        onResponse: (text: string) => void,
        text: string,
        start?: number,
        end?: number
    ) => Promise<void>
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
    {
        style,
        className,
        editorId,
        document,
        onTransaction,
        onDocumentChange,
        onSelectionChange,
        onReload,
        onRequestGeneration,
    },
    ref
) {
    const documentRef = useRef(document)
    const editorIdRef = useRef(editorId)

    const blockedRef = useRef(false)
    const changeRef = useRef(false)
    const viewRef = useRef<ProseMirrorHandle>(null)
    const baseMarkRef = useRef(schema.marks.user_text)

    const onTransactionRef = useRef(onTransaction)
    onTransactionRef.current = onTransaction

    const onDocumentChangeRef = useRef(onDocumentChange)
    onDocumentChangeRef.current = onDocumentChange

    const onSelectionChangeRef = useRef(onSelectionChange)
    onSelectionChangeRef.current = onSelectionChange

    const onReloadRef = useRef(onReload)
    onReloadRef.current = onReload

    const onRequestGenerationRef = useRef(onRequestGeneration)
    onRequestGenerationRef.current = onRequestGeneration

    const onNodesChanged = useCallback((nodes: Map<UniqueId, { node?: Node; after?: Node }>) => {
        const change = new Map()
        nodes.forEach(({ node, after }, id) => {
            change.set(id, {
                changedSection: node ? nodeToSection(id, node) : undefined,
                after: after?.attrs.id ?? 0,
            })
        })
        if (change.size > 0) {
            changeRef.current = true
            documentRef.current.pushChange(change)
            onDocumentChangeRef.current?.call(
                onDocumentChangeRef.current,
                documentRef.current,
                editorIdRef.current
            )
        }
    }, [])

    const updateSelectionCallbackRef = useRef(0)
    const updateSelection = useCallback((tr?: Transaction) => {
        const selection = tr?.selection ?? viewRef.current?.view?.state.selection
        const doc = tr?.doc ?? viewRef.current?.view?.state.doc
        if (!selection || !doc) return
        clearTimeout(updateSelectionCallbackRef.current)
        const updateSelectionCallback = () => {
            if (onSelectionChangeRef.current) {
                const content = selection.content().content
                const from = Math.min(selection.from, viewRef.current?.view?.state.doc.content.size ?? 0)
                const to = Math.min(selection.to, viewRef.current?.view?.state.doc.content.size ?? 0)
                const left = viewRef.current?.view?.coordsAtPos(from).left ?? 0
                const right = viewRef.current?.view?.coordsAtPos(to).right ?? 0
                const top = viewRef.current?.view?.coordsAtPos(from).top ?? 0
                const bottom = viewRef.current?.view?.coordsAtPos(to).bottom ?? 0
                const marks = [
                    EditorFormat.Bold,
                    EditorFormat.Italic,
                    EditorFormat.Underline,
                    EditorFormat.Strikethrough,
                ].filter((format) => {
                    const mark = formattingToMark(format as number)
                    return mark && doc.rangeHasMark(from, to, mark)
                })
                const scroll = viewRef.current?.root?.getBoundingClientRect().y ?? 0
                const offset = viewRef.current?.root?.offsetTop ?? 0
                const editorScroll = viewRef.current?.view?.dom?.parentElement?.scrollTop ?? 0
                onSelectionChangeRef.current?.call(
                    onSelectionChangeRef.current,
                    {
                        from: from,
                        to: to,
                        left,
                        right,
                        top: top - (scroll - offset - editorScroll),
                        bottom: bottom - (scroll - offset - editorScroll),
                        text: content.textBetween(0, content.size, '\n'),
                        meta: new Set(marks),
                    },
                    editorIdRef.current
                )
            }
        }
        updateSelectionCallbackRef.current = setTimeout(updateSelectionCallback, 20) as unknown as number
    }, [])

    const pushHistory = useCallback(() => {
        logDebug('push history')
        if (blockedRef.current) return true
        const pushed = documentRef.current.pushHistory()
        if (pushed || changeRef.current) {
            changeRef.current = false
            onDocumentChangeRef.current?.call(
                onDocumentChangeRef.current,
                documentRef.current,
                editorIdRef.current
            )
        }
    }, [])

    const undoEdit = () => {
        queueMicrotask(() => {
            if (!documentRef.current.canPopHistory()) documentRef.current.pushHistory()
            undo()
        })
        return true
    }
    const redoEdit = () => {
        queueMicrotask(() => redo())
        return true
    }
    const saveEdit = () => {
        queueMicrotask(() => pushHistory())
        return true
    }

    const blurTimeoutRef = useRef(0)
    const blurEdit = (view: EditorView, event: Event) => {
        const eventTarget = (event as FocusEvent).relatedTarget as Element | undefined
        if (eventTarget && eventTarget.closest('[data-editor-internal]') !== null) {
            return
        }
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = setTimeout(() => {
            queueMicrotask(() => {
                pushHistory()
                unloadSections()
                unselect()
            })
        }, 50) as unknown as number
    }
    const focusEdit = () => {
        clearTimeout(blurTimeoutRef.current)
    }

    const pasteEdit = (view: EditorView, event: ClipboardEvent | undefined, slice: Slice) => {
        paste(slice, view.state.selection)
        return true
    }

    const [state, transformState] = useProseMirror({
        schema: schema,
        plugins: [
            placeholder(),
            keymap(editorKeymap),
            keymap({ 'Mod-z': undoEdit }),
            keymap({ 'Shift-Mod-z': redoEdit }),
            keymap({ 'Mod-y': redoEdit }),
            keymap({ 'Mod-s': saveEdit }),
            clipboardTransform(),
            nodeIds(),
            propsOverride({
                handlePaste: pasteEdit,
                editable: () => true,
                handleKeyDown: () => false,
                handleClick: () => {
                    updateSelection()
                    return
                },
                handleDOMEvents: {
                    blur: blurEdit,
                    focus: focusEdit,
                },
            }),
            inspectNodeChanges(onNodesChanged),
            devTool(),
        ],
    })
    const transformStateRef = useRef(transformState)
    transformStateRef.current = transformState

    const dispatchTransaction = useCallback(
        (tr: Transaction, state: EditorState) => {
            if (blockedRef.current) return
            updateSelection(tr)
            updateOriginMarks(tr, state, baseMarkRef.current)
            transformState(() => tr)
            onTransactionRef.current?.call(onTransactionRef.current, tr, editorIdRef.current)
        },
        [transformState, updateSelection]
    )

    const focus = useCallback((focus: boolean = true) => {
        if (focus) {
            viewRef.current?.view?.dom.focus()
        } else {
            viewRef.current?.view?.dom.blur()
        }
    }, [])

    const unselect = useCallback(() => {
        logDebug('unselect')
        transformState((state) => {
            const tr = state.tr
            if (!tr.selection.empty) {
                tr.setSelection(TextSelection.create(state.doc, tr.selection.to))
                window.document.getSelection()?.collapseToEnd()
            }
            tr.setMeta('internal', true)
            updateSelection(tr)
            return tr
        }, false)
    }, [transformState, updateSelection])

    const reload = useCallback(() => {
        logDebug('reload')
        if (blockedRef.current) return
        const document = documentRef.current
        const changed = document.pushHistory()
        transformState((state) => {
            const tr = state.tr
            tr.delete(0, tr.doc.content.size)
            for (const [i, { id, section }] of document.getSections().entries()) {
                insertSectionAfter(tr, { id, section }, i === 0)
            }
            tr.setMeta('internal', true)
            return tr
        }, false)
        if (changed) {
            onDocumentChangeRef.current?.call(onDocumentChangeRef, document, editorIdRef.current)
            onReloadRef.current?.call(onReloadRef.current, document, editorIdRef.current)
        }
    }, [transformState])

    const undo = useCallback(() => {
        if (blockedRef.current) return
        const document = documentRef.current
        const changes = document.popHistory()
        logDebug('<= changes', changes)
        if (!changes) return
        transformState((state) => {
            const tr = state.tr
            undoChanges(tr, changes, document)
            tr.setMeta('internal', true)
            return tr
        }, false)
        onDocumentChangeRef.current?.call(onDocumentChangeRef.current, document, editorIdRef.current)
    }, [transformState])

    const redo = useCallback(
        (branch?: UniqueId) => {
            if (blockedRef.current) return
            const document = documentRef.current
            const changes = document.descendHistory(branch)
            logDebug('=> changes', changes)
            if (!changes) return
            transformState((state) => {
                const tr = state.tr
                redoChanges(tr, changes, document)
                tr.setMeta('internal', true)
                return tr
            }, false)
            onDocumentChangeRef.current?.call(onDocumentChangeRef.current, document, editorIdRef.current)
        },
        [transformState]
    )

    const highlight = useCallback(
        (highlight?: EditorHighlight) => {
            switch (highlight?.type) {
                case EditorHighlightType.None: {
                    transformState((state) => {
                        const tr = state.tr
                        tr.removeMark(0, tr.doc.content.size, schema.mark(schema.marks.highlight))
                        tr.setMeta('internal', true)
                        return tr
                    }, false)
                    break
                }
                case EditorHighlightType.LastHistoryEntry: {
                    const node = documentRef.current.getHistoryNode()
                    if (!node) break
                    transformState((state) => {
                        const tr = state.tr
                        tr.removeMark(0, tr.doc.content.size, schema.mark(schema.marks.highlight))
                        highlightUndoChanges(tr, node.changes)
                        tr.setMeta('internal', true)
                        return tr
                    }, false)
                    break
                }
                case EditorHighlightType.HistoryBranch: {
                    const node = documentRef.current.getDescendent(highlight.branch)
                    if (!node) break
                    transformState((state) => {
                        const tr = state.tr
                        tr.removeMark(0, tr.doc.content.size, schema.mark(schema.marks.highlight))
                        highlightRedoChanges(tr, node.changes)
                        tr.setMeta('internal', true)
                        return tr
                    }, false)
                    break
                }
            }
        },
        [transformState]
    )

    const link = useCallback(
        (ranges?: Map<SectionId, Array<[number, number]>>) => {
            transformState((state) => {
                const tr = state.tr
                tr.removeMark(0, tr.doc.content.size, schema.mark(schema.marks.link))
                if (ranges) {
                    tr.doc.descendants((node, pos) => {
                        const sectionRanges = ranges.get(node.attrs.id)
                        if (sectionRanges) {
                            for (const [from, length] of sectionRanges) {
                                tr.addMark(
                                    pos + from + 1,
                                    pos + from + length + 1,
                                    schema.mark(schema.marks.link)
                                )
                            }
                        }
                        return false
                    })
                }
                tr.setMeta('internal', true)
                return tr
            }, false)
        },
        [transformState]
    )

    const format = useCallback(
        (format?: EditorFormat) => {
            if (blockedRef.current) return
            transformState((state) => {
                const tr = state.tr
                // NOTE: this will not cause a proper document change event (step map is empty), why?
                switch (format) {
                    case EditorFormat.Bold:
                        if (
                            tr.doc.rangeHasMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.bold)
                            )
                        ) {
                            tr.removeMark(tr.selection.from, tr.selection.to, schema.mark(schema.marks.bold))
                        } else {
                            tr.addMark(tr.selection.from, tr.selection.to, schema.mark(schema.marks.bold))
                        }
                        break
                    case EditorFormat.Italic:
                        if (
                            tr.doc.rangeHasMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.italic)
                            )
                        ) {
                            tr.removeMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.italic)
                            )
                        } else {
                            tr.addMark(tr.selection.from, tr.selection.to, schema.mark(schema.marks.italic))
                        }
                        break
                    case EditorFormat.Underline:
                        if (
                            tr.doc.rangeHasMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.underline)
                            )
                        ) {
                            tr.removeMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.underline)
                            )
                        } else {
                            tr.addMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.underline)
                            )
                        }
                        break
                    case EditorFormat.Strikethrough:
                        if (
                            tr.doc.rangeHasMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.strikethrough)
                            )
                        ) {
                            tr.removeMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.strikethrough)
                            )
                        } else {
                            tr.addMark(
                                tr.selection.from,
                                tr.selection.to,
                                schema.mark(schema.marks.strikethrough)
                            )
                        }
                        break
                    default:
                        tr.removeMark(tr.selection.from, tr.selection.to, schema.mark(schema.marks.bold))
                        tr.removeMark(tr.selection.from, tr.selection.to, schema.mark(schema.marks.italic))
                        tr.removeMark(tr.selection.from, tr.selection.to, schema.mark(schema.marks.underline))
                        tr.removeMark(
                            tr.selection.from,
                            tr.selection.to,
                            schema.mark(schema.marks.strikethrough)
                        )
                }
                updateSelection(tr)
                tr.setMeta('forceupdate', true)
                return tr
            }, false)
            pushHistory()
        },
        [pushHistory, transformState, updateSelection]
    )

    const unloadSections = useCallback(() => {
        if (blockedRef.current) return
        if (!viewRef.current?.view) return
        const document = documentRef.current
        // don't unload when document is being edited
        if (document.isDirty()) return
        const docDom = viewRef.current.view.dom as HTMLElement
        const domParent = docDom.parentElement
        if (!domParent) return
        // only unload when scrolled to the bottom
        if (domParent.scrollTop + domParent.offsetHeight < domParent.scrollHeight - 5) return
        const domScroll = domParent.scrollTop || 0
        transformState((state) => {
            let deleteTo = 0
            state.doc.descendants((node, pos) => {
                if (!viewRef.current?.view) return false
                const nodeDom = viewRef.current.view.nodeDOM(pos) as HTMLElement | undefined
                if (!nodeDom) return false
                if (nodeDom.offsetTop + nodeDom.offsetHeight < domScroll - 1000) {
                    deleteTo = pos + node.nodeSize
                }
                return false
            })
            if (deleteTo === 0) return
            const tr = state.tr
            try {
                tr.delete(0, deleteTo)
            } catch (error: unknown) {
                logError(error)
            }
            tr.setMeta('internal', true)
            updateSelection(tr)
            return tr
        }, false)
    }, [transformState, updateSelection])

    const reloadSections = useCallback(() => {
        if (!viewRef.current?.view) return
        const docDom = viewRef.current.view.dom as HTMLElement
        const docScroll = docDom.parentElement?.scrollTop || 0
        // only load when scrolled to the top
        if (docScroll >= 300) return
        const document = documentRef.current.withPushedHistory()
        let exhausted = false
        transformState((state) => {
            const firstNode = state.doc.firstChild
            const sectionsBefore =
                !firstNode || !firstNode.attrs.id
                    ? document.getSections().slice(-20)
                    : document.getSectionsBefore(firstNode.attrs.id, 20)
            if (sectionsBefore.length === 0) {
                exhausted = true
                return
            }
            const tr = state.tr
            for (const [i, { id, section }] of sectionsBefore.reverse().entries()) {
                insertSectionBefore(tr, { id, section }, i === 0)
            }
            tr.setMeta('internal', true)
            updateSelection(tr)
            return tr
        }, false)
        return exhausted
    }, [transformState, updateSelection])

    const reloadPartialCallbackRef = useRef(0)
    const reloadPartial = useCallback(() => {
        if (blockedRef.current) return
        if (!viewRef.current?.view) return
        blockedRef.current = true
        clearTimeout(reloadPartialCallbackRef.current)
        transformState((state) => {
            const tr = state.tr
            tr.delete(0, tr.doc.content.size)
            tr.setMeta('internal', true)
            return tr
        }, false)
        const docDom = viewRef.current.view.dom as HTMLElement
        const reloadPartialInner = () => {
            const docScroll = docDom.parentElement?.scrollTop || 0
            // only load when visible space is available
            if (docScroll >= 300) {
                blockedRef.current = false
                onReloadRef.current?.call(onReloadRef.current, documentRef.current, editorIdRef.current)
                return
            }
            const exhausted = reloadSections()
            if (exhausted) {
                blockedRef.current = false
                onReloadRef.current?.call(onReloadRef.current, documentRef.current, editorIdRef.current)
            } else {
                reloadPartialCallbackRef.current = setTimeout(reloadPartialInner, 0) as unknown as number
            }
        }
        // NOTE: consider after-view-update mechanism instead of timeouts here
        reloadPartialCallbackRef.current = setTimeout(reloadPartialInner, 0) as unknown as number
    }, [reloadSections, transformState])

    const lastGenerateSelectionRef = useRef([0, 0])
    const generate = useCallback(
        (inline?: boolean, selection?: Selection | false) => {
            if (blockedRef.current || !viewRef.current?.view) return
            pushHistory()
            let documentText = ''
            let textBetween = ''
            let textAfter = ''
            transformState((state) => {
                const docSize = state.doc.content.size
                if (!inline) {
                    selection = TextSelection.create(state.doc, docSize - 1)
                }
                if (selection === false && lastGenerateSelectionRef.current) {
                    selection = TextSelection.create(
                        state.doc,
                        docSize - 1 - lastGenerateSelectionRef.current[0],
                        docSize - 1 - lastGenerateSelectionRef.current[1]
                    )
                }
                if (!selection) {
                    selection = state.selection
                }
                lastGenerateSelectionRef.current = [
                    docSize - 1 - selection.anchor,
                    docSize - 1 - selection.head,
                ]
                logDebug(
                    'generate at',
                    selection,
                    'storing current position as',
                    lastGenerateSelectionRef.current
                )
                const start = selection.from
                const end = selection.to
                documentText = documentRef.current.getText()
                textBetween = state.doc.textBetween(start, end, '\n')
                textAfter = state.doc.textBetween(end, docSize, '\n')
                const tr = state.tr
                const _selection = selection as Selection
                tr.setSelection(TextSelection.create(tr.doc, _selection.anchor, _selection.head))
                if (tr.selection.empty) {
                    tr.setMeta('internal', true)
                } else {
                    tr.deleteSelection()
                }
                return tr
            })
            onRequestGenerationRef.current
                ?.call(
                    onRequestGenerationRef.current,
                    (responseText) => {
                        if (!responseText) return
                        const lines = responseText.split('\n')
                        transformState((state) => {
                            const tr = state.tr
                            for (const [index, line] of lines.entries()) {
                                if (index <= 0) {
                                    if (line) {
                                        tr.insert(
                                            tr.selection.anchor,
                                            schema.text(line, [schema.mark(schema.marks.ai_text)])
                                        )
                                    }
                                } else {
                                    tr.split(tr.selection.anchor, undefined, [
                                        { type: schema.nodes.paragraph },
                                    ])
                                    if (line) {
                                        tr.insert(
                                            tr.selection.anchor,
                                            schema.text(line, [schema.mark(schema.marks.ai_text)])
                                        )
                                    }
                                }
                            }
                            return tr
                        }, false)
                    },
                    documentText,
                    documentText.length - textAfter.length - textBetween.length,
                    documentText.length - textAfter.length
                )
                .catch((error) => {
                    logError(error)
                })
                .finally(() => {
                    pushHistory()
                    unloadSections()
                })
        },
        [pushHistory, transformState, unloadSections]
    )

    const paste = useCallback(
        (slice: Slice, _selection?: Selection) => {
            const text = slice.content.textBetween(0, slice.content.size, '\n')
            const selection = _selection ?? viewRef.current?.view?.state.selection
            logDebug('paste', slice, text, selection)
            if (!selection) return
            if (text.length > 0) {
                const lines = text.replace('\r', '').split('\n')
                logDebug('  lines', lines)
                queueMicrotask(() => {
                    transformState((state) => {
                        const tr = state.tr
                        tr.setSelection(
                            TextSelection.create(
                                tr.doc,
                                Math.min(selection.anchor, tr.doc.content.size - 1),
                                Math.min(selection.head, tr.doc.content.size - 1)
                            )
                        )
                        if (tr.selection.empty) {
                            tr.setMeta('internal', true)
                        } else {
                            tr.deleteSelection()
                        }
                        return tr
                    })
                })
                queueMicrotask(() => {
                    transformState((state) => {
                        const tr = state.tr
                        for (const [index, line] of lines.entries()) {
                            if (index <= 0) {
                                if (line) {
                                    const content = schema.text(line, [schema.mark(baseMarkRef.current)])
                                    tr.insert(tr.selection.anchor, content)
                                }
                            } else {
                                tr.split(tr.selection.anchor, undefined, [{ type: schema.nodes.paragraph }])
                                if (line) {
                                    const content = schema.text(line, [schema.mark(baseMarkRef.current)])
                                    tr.insert(tr.selection.anchor, content)
                                }
                            }
                        }
                        return tr
                    }, false)
                    pushHistory()
                    unloadSections()
                })
            }
        },
        [pushHistory, transformState, unloadSections]
    )

    const copy = useCallback(
        (_selection?: Selection) => {
            const selection = _selection ?? viewRef.current?.view?.state.selection
            const text = selection ? toPlainText(selection.content().content) : ''
            queueMicrotask(() => {
                focus()
            })
            return text
        },
        [focus]
    )

    const cut = useCallback(
        (_selection?: Selection) => {
            transformState((state) => {
                const tr = state.tr
                const selection = _selection ?? tr.selection
                const start = selection.from
                const end = selection.to
                if (end <= start) return
                tr.delete(start, end)
                return tr
            })
            queueMicrotask(() => {
                pushHistory()
                focus()
            })
        },
        [transformState, pushHistory, focus]
    )

    const replace = useCallback(
        (text: string, _selection?: Selection) => {
            const selection = _selection ?? viewRef.current?.view?.state.selection
            paste(handlePasteText(text), selection)
            queueMicrotask(() => {
                unselect()
                focus()
            })
        },
        [focus, paste, unselect]
    )

    useImperativeHandle(ref, () => ({
        get view() {
            return viewRef.current?.view ?? null
        },
        get root() {
            return viewRef.current?.root ?? null
        },
        get document() {
            return documentRef.current
        },
        set state({ blocked, baseMark }: EditorInnerState) {
            blockedRef.current = blocked
            baseMarkRef.current = baseMark
        },
        focus: (f) => queueMicrotask(() => focus(f)),
        reload: () => queueMicrotask(() => reload()),
        generate: (i, s) => queueMicrotask(() => generate(i, s)),
        undo: () => queueMicrotask(() => undo()),
        redo: (s) => queueMicrotask(() => redo(s)),
        highlight: (s) => queueMicrotask(() => highlight(s)),
        link: (s) => queueMicrotask(() => link(s)),
        format: (s) => queueMicrotask(() => format(s)),
        copy: (s) => copy(s),
        cut: (s) => queueMicrotask(() => cut(s)),
        replace: (t, s) => queueMicrotask(() => replace(t, s)),
    }))

    const scrollPositionRef = useRef(0)
    const scrollCallbackRef = useRef(0)
    const resizeCallbackRef = useRef(0)
    useEffect(() => {
        // eslint-disable-next-line compat/compat
        const observer = new ResizeObserver(() => {
            const domParent = viewRef.current?.root
            if (domParent && scrollPositionRef.current <= 20) {
                domParent.scrollTop = domParent.scrollHeight
            }
            clearTimeout(resizeCallbackRef.current)
            resizeCallbackRef.current = setTimeout(() => {
                transformStateRef.current.call(
                    transformStateRef.current,
                    (state) => {
                        updateSelection(state.tr)
                        return
                    },
                    false
                )
            }, 50) as unknown as number
        })
        if (viewRef.current?.root) observer.observe(viewRef.current.root)
        if (viewRef.current?.view?.dom) observer.observe(viewRef.current.view.dom)
        return () => observer.disconnect()
    }, [updateSelection, viewRef.current?.root])

    const handleScroll = useCallback(
        (view: EditorView, event: UIEvent<HTMLDivElement>) => {
            clearTimeout(scrollCallbackRef.current)
            scrollCallbackRef.current = setTimeout(() => {
                const element = event.target as HTMLDivElement
                scrollPositionRef.current = element.scrollHeight - element.scrollTop - element.clientHeight
                unloadSections()
                reloadSections()
            }, 5) as unknown as number
        },
        [reloadSections, unloadSections]
    )

    useEffect(() => {
        queueMicrotask(() => {
            clearTimeout(reloadPartialCallbackRef.current)
            blockedRef.current = false
            changeRef.current = false
            editorIdRef.current = editorId
            documentRef.current = document
            reloadPartial()
            focus()
        })
    }, [editorId, document, reloadPartial, transformState, updateSelection, focus, viewRef.current?.root])

    return (
        <ProseMirror
            style={style}
            className={className}
            ref={viewRef}
            state={state}
            dispatchTransaction={dispatchTransaction}
            handleScroll={handleScroll}
            handleClick={handleClick}
        />
    )
})

const handleClick = (view: EditorView, pos: number, event: MouseEvent) => {
    return isMacOS ? event.metaKey : event.ctrlKey
}

export default Editor
