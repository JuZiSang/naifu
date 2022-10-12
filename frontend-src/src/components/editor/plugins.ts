import { Node } from 'prosemirror-model'
import { Plugin, PluginKey, TextSelection, Transaction } from 'prosemirror-state'
import { ReplaceStep, Step } from 'prosemirror-transform'
import { Decoration, DecorationSet, EditorProps } from 'prosemirror-view'

import { Environment } from '../../globals/constants'
import { uniqueid, UniqueId } from '../../data/document/util'

import { KeymapBindings } from './commands'
import { keydownHandler } from './keymap'
import { handlePasteText, mergeTransactionSteps, toPlainText, transformHTML } from './util'

export function keymap(bindings: KeymapBindings): Plugin {
    const keymapKey = new PluginKey('keymap')
    return new Plugin({
        key: keymapKey,
        props: {
            handleKeyDown: keydownHandler(bindings),
        },
    })
}

export const placeholder = (): Plugin => {
    const placeholderKey = new PluginKey('placeholder')
    return new Plugin({
        key: placeholderKey,
        props: {
            decorations: (state) => {
                const decorations: Decoration[] = []
                if (state.doc.content.size <= 2) {
                    decorations.push(
                        Decoration.node(0, state.doc.content.size, {
                            class: 'empty-node',
                        })
                    )
                }
                return DecorationSet.create(state.doc, decorations)
            },
        },
    })
}

export const clipboardTransform = (): Plugin => {
    const clipboardTransformKey = new PluginKey('clipboardTransform')
    return new Plugin({
        key: clipboardTransformKey,
        props: {
            plainTextPaste: true,
            clipboardTextSerializer: (slice) => toPlainText(slice.content),
            clipboardTextParser: handlePasteText,
            transformPastedHTML: transformHTML,
        } as EditorProps,
    })
}

export const propsOverride = (props: Partial<EditorProps>): Plugin => {
    const propsOverrideKey = new PluginKey('propsOverride')
    return new Plugin({
        key: propsOverrideKey,
        props: {
            ...props,
        },
    })
}

export const inspectNodeChanges = (
    onNodesChanged: (changedNodes: Map<UniqueId, { node?: Node; after?: Node }>) => void
): Plugin => {
    const inspectNodeChangesKey = new PluginKey('inspectNodeChangesKey')
    return new Plugin({
        key: inspectNodeChangesKey,
        state: {
            init() {
                // nothing
            },
            apply(tr, value, oldState, newState) {
                const internal = tr.getMeta('internal')
                const forceupdate = tr.getMeta('forceupdate')
                if (internal === true || (!tr.docChanged && forceupdate !== true)) return
                const mergedSteps = mergeTransactionSteps(tr, [])
                const changeMap = new Map<UniqueId, { node?: Node; after?: Node }>()
                if (newState.doc.content.size > 2) {
                    for (const step of mergedSteps) {
                        let stepHadMap = false
                        step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
                            stepHadMap = true
                            newState.doc.content.nodesBetween(
                                newStart,
                                newEnd,
                                (node, start, parent, index) => {
                                    if (parent) return false
                                    if (!node.attrs.id) return false
                                    const after =
                                        index > 0 ? newState.doc.content.child(index - 1) : undefined
                                    changeMap.set(node.attrs.id, { node, after })
                                    return false
                                }
                            )
                        })
                        // NOTE: this is a hack to forcably add the range to the change map
                        if (!stepHadMap && forceupdate) {
                            const stepJSON = step.toJSON()
                            if (stepJSON.from && stepJSON.to && stepJSON.from < stepJSON.to) {
                                newState.doc.content.nodesBetween(
                                    stepJSON.from,
                                    stepJSON.to,
                                    (node, start, parent, index) => {
                                        if (parent) return false
                                        if (!node.attrs.id) return false
                                        const after =
                                            index > 0 ? newState.doc.content.child(index - 1) : undefined
                                        changeMap.set(node.attrs.id, { node, after })
                                        return false
                                    }
                                )
                            }
                        }
                    }
                }
                for (const step of mergedSteps) {
                    // skip replace steps that don't replace anything
                    if (step instanceof ReplaceStep && step.from >= step.to) continue
                    step.getMap().forEach((oldStart, oldEnd) => {
                        oldState.doc.content.nodesBetween(oldStart, oldEnd, (node, start, parent, index) => {
                            if (parent) return false
                            if (!node.attrs.id) return false
                            const after = index > 0 ? oldState.doc.content.child(index - 1) : undefined
                            if (!changeMap.has(node.attrs.id)) {
                                changeMap.set(node.attrs.id, {
                                    after,
                                })
                            }
                            return false
                        })
                    })
                }
                if (changeMap.size > 0) {
                    onNodesChanged(changeMap)
                }
            },
        },
    })
}

export const nodeIds = (): Plugin => {
    const nodeIdsKey = new PluginKey('nodeIds')
    const instance = { active: new Set<UniqueId>() }
    return new Plugin({
        key: nodeIdsKey,
        appendTransaction(transactions, oldState, newState) {
            if (newState.doc.content.size <= 2) return
            const activeTransactions = transactions.filter((tr) => tr.docChanged)
            if (activeTransactions.length === 0) return
            const tr: Transaction = newState.tr
            let mergedSteps = [] as Array<Step>
            for (const transaction of activeTransactions) {
                mergedSteps = mergeTransactionSteps(transaction, mergedSteps)
            }
            if (!mergedSteps) return
            for (const step of mergedSteps) {
                step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
                    if (
                        newStart >= newState.doc.content.size ||
                        newStart >= newEnd ||
                        !newState.doc.content.childCount
                    )
                        return
                    if (newEnd > newState.doc.content.size) {
                        newEnd = newState.doc.content.size
                    }
                    newState.doc.content.nodesBetween(newStart, newEnd, (node, start, parent) => {
                        if (parent) return false
                        if (!node.attrs.id) {
                            let id = uniqueid()
                            while (instance.active.has(id)) {
                                id = uniqueid()
                            }
                            tr.setNodeMarkup(start, undefined, {
                                ...node.attrs,
                                id,
                            })
                            // Android Chrome + GBoard workaround:
                            // Pressing enter after typing a word keeps the cursor stuck to it
                            // while still creating a newline after.
                            // Manually set the selection to the newly created line instead.
                            if (tr.selection.anchor < start) {
                                tr.setSelection(TextSelection.create(tr.doc, start + 1))
                            }
                            instance.active.add(id)
                        } else {
                            instance.active.add(node.attrs.id)
                        }
                        return false
                    })
                })
            }
            return tr
        },
    })
}

export const devTool = (): Plugin => {
    const devToolKey = new PluginKey('devTool')
    const instance = { update: undefined } as { update?: (t: any, o: any, n: any) => void }
    return new Plugin({
        key: devToolKey,
        state: {
            init(config, state) {
                if (Environment === 'debug') {
                    import('prosemirror-dev-tools')
                        .then(({ createDevTools }) => {
                            instance.update = createDevTools({ state }, {})
                        })
                        .catch(() => {
                            // nothing
                        })
                }
            },
            apply(tr, value, oldState, newState) {
                instance.update?.call(instance, tr, oldState, newState)
            },
        },
    })
}
