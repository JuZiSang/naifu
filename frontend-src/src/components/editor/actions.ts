import { Mark, MarkType } from 'prosemirror-model'
import { EditorState, Transaction } from 'prosemirror-state'

import { Document } from '../../data/document/document'
import { SectionDiffText, SectionHandle, SectionType, SectionTypeTextMeta } from '../../data/document/section'
import { ChangeMap, HistoryStepType } from '../../data/document/history'

import { logError, logWarning } from '../../util/browser'

import { schema } from './schema'
import { formattingToMark, originToMark, SectionMetaFormatting, SectionMetaOrigin } from './glue'
import { mergeTransactionSteps } from './util'

export const applyMetaMarks = (
    tr: Transaction,
    startPosition: number,
    endPosition: number,
    marks: Array<SectionTypeTextMeta>,
    mapper: (mark: number) => Mark | undefined
): Transaction => {
    for (const { data, length, position } of marks) {
        const mark = mapper(data)
        if (!mark) continue
        const from = startPosition + position
        let until = length ? startPosition + position + length : endPosition + 1
        if (until > endPosition + 1) {
            logWarning(`meta until > end position: ${until} > ${endPosition + 1}`, true, {
                doc: tr.doc.content.size,
                from,
                until,
                data,
                length,
                position,
            })
            until = endPosition + 1
        }
        if (until <= from) {
            logError(`meta until <= from position: ${until} <= ${from}`, true, {
                doc: tr.doc.content.size,
                from,
                until,
                data,
                length,
                position,
            })
            continue
        }
        tr.addMark(from, until, mark)
    }
    return tr
}

export const updateOriginMarks = (
    tr: Transaction,
    state: EditorState,
    base: MarkType = schema.marks.user_text
): Transaction => {
    const mergedSteps = mergeTransactionSteps(tr, [])
    for (const step of mergedSteps) {
        let replacedIsEdit = false
        step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
            state.doc.nodesBetween(oldStart, oldEnd, (node, pos, parent) => {
                // check if replaced text is ai or edited text
                if (replacedIsEdit) return false
                if (
                    node.marks.some(
                        (mark) =>
                            mark.eq(schema.mark(schema.marks.ai_text)) ||
                            mark.eq(schema.mark(schema.marks.edit_text))
                    )
                ) {
                    replacedIsEdit = true
                }
                if (!parent) return true
                // only descend one level into the tree
                return parent.type.name === 'paragraph' ? false : true
            })
            // check if change touches ai or edit to the left
            let prevIsEdit = false
            if (oldStart > 0) {
                let prevNodeMarks = [] as readonly Mark[]
                state.doc.nodesBetween(oldStart - 1, oldStart, (node, pos, parent) => {
                    prevNodeMarks = node.marks
                    if (!parent) return true
                    return parent.type.name === 'paragraph' ? false : true
                })
                prevIsEdit = prevNodeMarks.some(
                    (mark) =>
                        mark.eq(schema.mark(schema.marks.edit_text)) ||
                        mark.eq(schema.mark(schema.marks.ai_text))
                )
            }
            // check if change touches ai or edit to the right
            let nextIsEdit = false
            if (oldEnd < state.doc.content.size) {
                let nextNodeMarks = [] as readonly Mark[]
                state.doc.nodesBetween(oldEnd, oldEnd + 1, (node, pos, parent) => {
                    nextNodeMarks = node.marks
                    if (!parent) return true
                    return parent.type.name === 'paragraph' ? false : true
                })
                nextIsEdit = nextNodeMarks.some(
                    (mark) =>
                        mark.eq(schema.mark(schema.marks.edit_text)) ||
                        mark.eq(schema.mark(schema.marks.ai_text))
                )
            }
            if ((replacedIsEdit && prevIsEdit) || (replacedIsEdit && nextIsEdit)) {
                tr.addMark(newStart, newEnd, schema.mark(schema.marks.edit_text))
                return
            } else if (prevIsEdit && nextIsEdit) {
                tr.addMark(newStart, newEnd, schema.mark(schema.marks.edit_text))
            } else {
                tr.addMark(newStart, newEnd, schema.mark(base))
            }
        })
    }
    return tr
}

export const insertSectionBefore = (
    tr: Transaction,
    { id, section }: SectionHandle,
    replaceEmpty = true
): Transaction => {
    if (section.type !== SectionType.text) {
        // skip non-text nodes for now
        return tr
    }
    const paragraph = schema.nodes.paragraph.create(
        { id },
        section.text ? schema.text(section.text) : undefined
    )
    if (replaceEmpty && tr.doc.content.size <= 2) {
        // if doc is empty replace the empty line
        tr.replaceWith(0, 1, paragraph)
    } else {
        tr.insert(0, paragraph)
    }
    applyMetaMarks(tr, 1, section.text.length, section.meta.get(SectionMetaOrigin) ?? [], originToMark)
    applyMetaMarks(
        tr,
        1,
        section.text.length,
        section.meta.get(SectionMetaFormatting) ?? [],
        formattingToMark
    )
    return tr
}

export const insertSectionAfter = (
    tr: Transaction,
    { id, section }: SectionHandle,
    replaceEmpty = true
): Transaction => {
    if (section.type !== SectionType.text) {
        // skip non-text nodes for now
        return tr
    }
    let startPosition = tr.doc.content.size
    const paragraph = schema.nodes.paragraph.create(
        { id },
        section.text ? schema.text(section.text) : undefined
    )
    if (replaceEmpty && startPosition <= 2) {
        // if doc is empty replace the empty line
        tr.replaceWith(0, 1, paragraph)
        startPosition = 1
    } else {
        tr.insert(startPosition, paragraph)
        startPosition = startPosition + 1
    }
    applyMetaMarks(
        tr,
        startPosition,
        startPosition + section.text.length,
        section.meta.get(SectionMetaOrigin) ?? [],
        originToMark
    )
    applyMetaMarks(
        tr,
        startPosition,
        startPosition + section.text.length,
        section.meta.get(SectionMetaFormatting) ?? [],
        formattingToMark
    )

    return tr
}

export const undoChanges = (tr: Transaction, changes: ChangeMap, document: Document): Transaction => {
    for (const [id, changedNode] of changes) {
        switch (changedNode.type) {
            case HistoryStepType.remove: {
                const section = changedNode.previous
                if (section.type !== SectionType.text) {
                    // skip non-text nodes for now
                    continue
                }
                let startPosition = -1
                const paragraph = schema.nodes.paragraph.create(
                    { id: id },
                    section.text ? schema.text(section.text) : undefined
                )
                // if after does not exist in the current document, ignore
                const after =
                    changedNode.after && document.getSection(changedNode.after)
                        ? changedNode.after
                        : undefined
                if (changedNode.after === 0) {
                    // if at the very beginning, add to the start
                    if (tr.doc.content.size <= 2) {
                        // if doc is empty replace the empty line
                        tr.replaceWith(0, 1, paragraph)
                    } else {
                        tr.insert(0, paragraph)
                    }
                    startPosition = 1
                } else if (after) {
                    tr.doc.descendants((node, pos) => {
                        if (node.attrs.id === after) {
                            tr.insert(pos + node.nodeSize, paragraph)
                            startPosition = pos + node.nodeSize + 1
                        }
                        return false
                    })
                } else {
                    // if not after another node, add it to the end
                    if (tr.doc.content.size <= 2) {
                        // if doc is empty replace the empty line
                        tr.replaceWith(0, 1, paragraph)
                        startPosition = 1
                    } else {
                        startPosition = tr.doc.content.size + 1
                        tr.insert(tr.doc.content.size, paragraph)
                    }
                }
                if (startPosition != -1) {
                    applyMetaMarks(
                        tr,
                        startPosition,
                        startPosition + section.text.length,
                        section.meta.get(SectionMetaOrigin) ?? [],
                        originToMark
                    )
                    applyMetaMarks(
                        tr,
                        startPosition,
                        startPosition + section.text.length,
                        section.meta.get(SectionMetaFormatting) ?? [],
                        formattingToMark
                    )
                }
                break
            }
            case HistoryStepType.create: {
                tr.doc.descendants((node, pos) => {
                    if (node.attrs.id === id) {
                        tr.delete(pos, pos + node.nodeSize)
                    }
                    return false
                })
                break
            }
            case HistoryStepType.update: {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const section = document.getSection(id)!
                if (section.type !== SectionType.text) {
                    // skip non-text nodes for now
                    continue
                }
                let startPosition = -1
                const paragraph = schema.nodes.paragraph.create(
                    { id: id },
                    section.text ? schema.text(section.text) : undefined
                )
                tr.doc.descendants((node, pos) => {
                    if (node.attrs.id === id) {
                        tr.replaceWith(pos, pos + node.nodeSize, paragraph)
                        startPosition = pos + 1
                    }
                    return false
                })
                if (startPosition != -1) {
                    applyMetaMarks(
                        tr,
                        startPosition,
                        startPosition + section.text.length,
                        section.meta.get(SectionMetaOrigin) ?? [],
                        originToMark
                    )
                    applyMetaMarks(
                        tr,
                        startPosition,
                        startPosition + section.text.length,
                        section.meta.get(SectionMetaFormatting) ?? [],
                        formattingToMark
                    )
                }
                break
            }
        }
    }
    return tr
}

export const redoChanges = (tr: Transaction, changes: ChangeMap, document: Document): Transaction => {
    for (const [id, changedNode] of changes) {
        switch (changedNode.type) {
            case HistoryStepType.remove: {
                tr.doc.descendants((node, pos) => {
                    if (node.attrs.id === id) {
                        tr.delete(pos, pos + node.nodeSize)
                    }
                    return false
                })

                break
            }
            case HistoryStepType.update: {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const section = document.getSection(id)!
                if (section.type !== SectionType.text) {
                    // skip non-text nodes for now
                    continue
                }
                let startPosition = -1
                const paragraph = schema.nodes.paragraph.create(
                    { id: id },
                    section.text ? schema.text(section.text) : undefined
                )
                tr.doc.descendants((node, pos) => {
                    if (node.attrs.id === id) {
                        tr.replaceWith(pos, pos + node.nodeSize, paragraph)
                        startPosition = pos + 1
                    }
                    return false
                })
                if (startPosition != -1) {
                    applyMetaMarks(
                        tr,
                        startPosition,
                        startPosition + section.text.length,
                        section.meta.get(SectionMetaOrigin) ?? [],
                        originToMark
                    )
                    applyMetaMarks(
                        tr,
                        startPosition,
                        startPosition + section.text.length,
                        section.meta.get(SectionMetaFormatting) ?? [],
                        formattingToMark
                    )
                }
                break
            }
            case HistoryStepType.create: {
                const section = changedNode.section
                if (section.type !== SectionType.text) {
                    // skip non-text nodes for now
                    continue
                }
                let startPosition = -1
                const paragraph = schema.nodes.paragraph.create(
                    { id: id },
                    section.text ? schema.text(section.text) : undefined
                )
                // if after does not exist in the current document, ignore
                const after =
                    changedNode.after && document.getSection(changedNode.after)
                        ? changedNode.after
                        : undefined
                if (changedNode.after === 0) {
                    // if at the very beginning, add to the start
                    if (tr.doc.content.size <= 2) {
                        // if doc is empty replace the empty line
                        tr.replaceWith(0, 1, paragraph)
                    } else {
                        tr.insert(0, paragraph)
                    }
                    startPosition = 1
                } else if (after) {
                    // trying to append after
                    tr.doc.descendants((node, pos) => {
                        if (node.attrs.id === after) {
                            // appending after
                            tr.insert(pos + node.nodeSize, paragraph)
                            startPosition = pos + node.nodeSize + 1
                        }
                        return false
                    })
                } else {
                    // if not after another node, add it to the end
                    if (tr.doc.content.size <= 2) {
                        // if doc is empty replace the empty line
                        tr.replaceWith(0, 1, paragraph)
                        startPosition = 1
                    } else {
                        startPosition = tr.doc.content.size + 1
                        tr.insert(tr.doc.content.size, paragraph)
                    }
                }
                if (startPosition != -1) {
                    applyMetaMarks(
                        tr,
                        startPosition,
                        startPosition + section.text.length,
                        section.meta.get(SectionMetaOrigin) ?? [],
                        originToMark
                    )
                    applyMetaMarks(
                        tr,
                        startPosition,
                        startPosition + section.text.length,
                        section.meta.get(SectionMetaFormatting) ?? [],
                        formattingToMark
                    )
                }
                break
            }
        }
    }
    return tr
}

export const highlightUndoChanges = (tr: Transaction, changes: ChangeMap): Transaction => {
    for (const [id, changedNode] of changes) {
        switch (changedNode.type) {
            case HistoryStepType.update: {
                if ((changedNode.diff.diff as SectionDiffText).parts) {
                    const diff = changedNode.diff.diff as SectionDiffText
                    tr.doc.descendants((node, pos) => {
                        if (node.attrs.id === id) {
                            let from = 0
                            diff.parts.forEach((part) => {
                                from = from + part.from
                                if (part.delete && !part.insert) {
                                    const end = Math.min(tr.doc.content.size, pos + from + 2)
                                    const start = end - 1
                                    tr.addMark(start, end, schema.mark(schema.marks.highlight))
                                }
                                if (part.insert) {
                                    const end = Math.min(
                                        tr.doc.content.size,
                                        pos + from + 1 + part.insert.length
                                    )
                                    const start = end - part.insert.length
                                    tr.addMark(start, end, schema.mark(schema.marks.highlight))
                                }
                                from = from + part.insert.length
                            })
                        }
                        return false
                    })
                }
                break
            }
            case HistoryStepType.create: {
                tr.doc.descendants((node, pos) => {
                    if (node.attrs.id === id) {
                        tr.addMark(pos, pos + node.nodeSize, schema.mark(schema.marks.highlight))
                    }
                    return false
                })
                break
            }
        }
    }
    return tr
}

export const highlightRedoChanges = (tr: Transaction, changes: ChangeMap): Transaction => {
    for (const [id, changedNode] of changes) {
        switch (changedNode.type) {
            case HistoryStepType.remove: {
                tr.doc.descendants((node, pos) => {
                    if (node.attrs.id === id) {
                        tr.addMark(pos, pos + node.nodeSize, schema.mark(schema.marks.highlight))
                    }
                    return false
                })
                break
            }
            case HistoryStepType.update: {
                if ((changedNode.diff.diff as SectionDiffText).parts) {
                    const diff = changedNode.diff.diff as SectionDiffText
                    tr.doc.descendants((node, pos) => {
                        if (node.attrs.id === id) {
                            let from = 0
                            diff.parts.forEach((part) => {
                                from = from + part.from
                                if (part.insert && !part.delete) {
                                    const end = Math.min(tr.doc.content.size, pos + from + 2)
                                    const start = end - 1
                                    tr.addMark(start, end, schema.mark(schema.marks.highlight))
                                }
                                if (part.delete) {
                                    const end = Math.min(
                                        tr.doc.content.size,
                                        pos + from + 1 + part.delete.length
                                    )
                                    const start = end - part.delete.length
                                    tr.addMark(start, end, schema.mark(schema.marks.highlight))
                                }
                                from = from + part.delete.length
                            })
                        }
                        return false
                    })
                }
                break
            }
        }
    }
    return tr
}
