import {
    canJoin,
    liftTarget,
    canSplit,
    ReplaceAroundStep,
    replaceStep,
    Step,
    ReplaceStep,
} from 'prosemirror-transform'
import { Slice, Fragment, ResolvedPos, Node, ContentMatch, NodeType } from 'prosemirror-model'
import {
    Selection,
    TextSelection,
    NodeSelection,
    AllSelection,
    EditorState,
    Transaction,
} from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { logError } from '../../util/browser'

export interface Command {
    (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean
}
export interface Keymap {
    [key: string]: Command
}
export type KeymapBindings = Record<string, Command>
export type DispatchTransaction = (tr: Transaction) => void
export type AnyStep<T extends Step = any> = T

function textblockAt(node: Node, side: 'start' | 'end', only?: boolean) {
    for (
        let tempNode: Node | null | undefined = node;
        tempNode;
        tempNode = side == 'start' ? tempNode.firstChild : tempNode.lastChild
    ) {
        if (tempNode.isTextblock) return true
        if (only && tempNode.childCount != 1) return false
    }
    return false
}

function deleteBarrier(state: EditorState, $cut: ResolvedPos, dispatch?: DispatchTransaction) {
    const before = $cut.nodeBefore
    const after = $cut.nodeAfter

    if (!before || !after) {
        logError(`undefined before or after: ${before} ${after} in state ${state}`)
        return false
    }

    if (before.type.spec.isolating || after.type.spec.isolating) return false
    if (joinMaybeClear(state, $cut, dispatch)) return true

    const canDelAfter = $cut.parent.canReplace($cut.index(), $cut.index() + 1)
    if (canDelAfter) {
        const match = before.contentMatchAt(before.childCount)
        const conn = match.findWrapping(after.type)
        if (conn && match.matchType(conn[0] || after.type)?.validEnd) {
            if (dispatch) {
                const end = $cut.pos + after.nodeSize
                let wrap = Fragment.empty
                for (let i = conn.length - 1; i >= 0; i--)
                    wrap = Fragment.from(conn[i].create(undefined, wrap))
                wrap = Fragment.from(before.copy(wrap))
                const tr = state.tr.step(
                    new ReplaceAroundStep(
                        $cut.pos - 1,
                        end,
                        $cut.pos,
                        end,
                        new Slice(wrap, 1, 0),
                        conn.length,
                        true
                    )
                )
                const joinAt = end + 2 * conn.length
                if (canJoin(tr.doc, joinAt)) tr.join(joinAt)
                dispatch(tr.scrollIntoView())
            }
            return true
        }
    }

    const selAfter = Selection.findFrom($cut, 1)
    const range = selAfter && selAfter.$from.blockRange(selAfter.$to)
    const target = range && liftTarget(range)
    if (range && target != undefined && target >= $cut.depth) {
        if (dispatch) dispatch(state.tr.lift(range, target).scrollIntoView())
        return true
    }

    if (canDelAfter && textblockAt(after, 'start', true) && textblockAt(before, 'end')) {
        let at = before
        const wrap = []
        for (;;) {
            wrap.push(at)
            if (at.isTextblock || !at.lastChild) break
            at = at.lastChild
        }
        let afterDepth = 1
        let afterText = after
        for (; !afterText.isTextblock && !!afterText.firstChild; afterText = afterText.firstChild) {
            afterDepth++
        }
        if (at.canReplace(at.childCount, at.childCount, afterText.content)) {
            if (dispatch) {
                let end = Fragment.empty
                for (let i = wrap.length - 1; i >= 0; i--) end = Fragment.from(wrap[i].copy(end))
                const tr = state.tr.step(
                    new ReplaceAroundStep(
                        $cut.pos - wrap.length,
                        $cut.pos + after.nodeSize,
                        $cut.pos + afterDepth,
                        $cut.pos + after.nodeSize - afterDepth,
                        new Slice(end, wrap.length, 0),
                        0,
                        true
                    )
                )
                dispatch(tr.scrollIntoView())
            }
            return true
        }
    }

    return false
}

function joinMaybeClear(state: EditorState, $pos: ResolvedPos, dispatch?: DispatchTransaction) {
    const before = $pos.nodeBefore,
        after = $pos.nodeAfter,
        index = $pos.index()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!before || !after || !before.type.compatibleContent(after.type)) return false
    if (before.content.size === 0 && $pos.parent.canReplace(index - 1, index)) {
        if (dispatch) dispatch(state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView())
        return true
    }
    if (!$pos.parent.canReplace(index, index + 1) || !(after.isTextblock || canJoin(state.doc, $pos.pos)))
        return false
    if (dispatch)
        dispatch(
            state.tr
                .clearIncompatible($pos.pos, before.type, before.contentMatchAt(before.childCount))
                .join($pos.pos)
                .scrollIntoView()
        )
    return true
}

function findCutBefore($pos: ResolvedPos) {
    if (!$pos.parent.type.spec.isolating)
        for (let i = $pos.depth - 1; i >= 0; i--) {
            if ($pos.index(i) > 0) return $pos.doc.resolve($pos.before(i + 1))
            if ($pos.node(i).type.spec.isolating) break
        }
    return
}

function findCutAfter($pos: ResolvedPos) {
    if (!$pos.parent.type.spec.isolating)
        for (let i = $pos.depth - 1; i >= 0; i--) {
            const parent = $pos.node(i)
            if ($pos.index(i) + 1 < parent.childCount) return $pos.doc.resolve($pos.after(i + 1))
            if (parent.type.spec.isolating) break
        }
    return
}

function defaultBlockAt(match: ContentMatch) {
    for (let i = 0; i < match.edgeCount; i++) {
        const { type } = match.edge(i)
        if (type.isTextblock && !type.hasRequiredAttrs()) return type
    }
    return
}

// Select the whole document.
export function selectAll(state: EditorState, dispatch?: DispatchTransaction): boolean {
    if (dispatch) dispatch(state.tr.setSelection(new AllSelection(state.doc)))
    return true
}

// Delete the selection, if there is one.
export function deleteSelection(state: EditorState, dispatch?: DispatchTransaction): boolean {
    if (state.selection.empty) return false
    if (dispatch) dispatch(state.tr.deleteSelection().scrollIntoView())
    return true
}

// If the selection is empty and the cursor is at the end of a
// textblock, try to reduce or remove the boundary between that block
// and the one after it, either by joining them or by moving the other
// block closer to this one in the tree structure. Will use the view
// for accurate start-of-textblock detection if given.
export function joinForward(state: EditorState, dispatch?: DispatchTransaction, view?: EditorView): boolean {
    if (!(state.selection instanceof TextSelection)) return false
    const selection = state.selection as TextSelection

    const { $cursor } = selection
    if (
        !$cursor ||
        (view ? !view.endOfTextblock('forward', state) : $cursor.parentOffset < $cursor.parent.content.size)
    )
        return false

    const $cut = findCutAfter($cursor)

    // If there is no node after this, there's nothing to do
    if (!$cut) return false

    const after = $cut.nodeAfter
    if (!after) {
        logError(`no node after ${JSON.stringify($cut)}`)
        return false
    }

    // Try the joining algorithm
    if (deleteBarrier(state, $cut, dispatch)) return true

    // If the node above has no content and the node below is
    // selectable, delete the node above and select the one below.
    if (
        $cursor.parent.content.size === 0 &&
        (textblockAt(after, 'start') || NodeSelection.isSelectable(after))
    ) {
        const delStep = replaceStep(
            state.doc,
            $cursor.before(),
            $cursor.after(),
            Slice.empty
        ) as ReplaceStep | null
        if (delStep && delStep.slice.size < delStep.to - delStep.from) {
            if (dispatch) {
                const tr = state.tr.step(delStep)
                const selection = textblockAt(after, 'start')
                    ? // eslint-disable-next-line unicorn/no-array-callback-reference
                      Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos)), 1)
                    : // eslint-disable-next-line unicorn/no-array-callback-reference
                      NodeSelection.create(tr.doc, tr.mapping.map($cut.pos))
                if (selection) {
                    tr.setSelection(selection)
                } else {
                    logError('could not set selection')
                }
                dispatch(tr.scrollIntoView())
            }
            return true
        }
    }

    // If the next node is an atom, delete it
    if (after.isAtom && $cut.depth == $cursor.depth - 1) {
        if (dispatch) dispatch(state.tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView())
        return true
    }

    return false
}

// If the selection is empty and at the start of a textblock, try to
// reduce the distance between that block and the one before it—if
// there's a block directly before it that can be joined, join them.
// If not, try to move the selected block closer to the next one in
// the document structure by lifting it out of its parent or moving it
// into a parent of the previous block. Will use the view for accurate
// (bidi-aware) start-of-textblock detection if given.
export function joinBackward(state: EditorState, dispatch?: DispatchTransaction, view?: EditorView): boolean {
    if (!(state.selection instanceof TextSelection)) return false
    const selection = state.selection as TextSelection

    const { $cursor } = selection
    if (!$cursor || (view ? !view.endOfTextblock('backward', state) : $cursor.parentOffset > 0)) return false

    const $cut = findCutBefore($cursor)

    // If there is no node before this, try to lift
    if (!$cut) {
        const range = $cursor.blockRange()
        if (!range) return false
        const target = range && liftTarget(range)
        if (target == undefined) return false
        if (dispatch) dispatch(state.tr.lift(range, target).scrollIntoView())
        return true
    }

    const before = $cut.nodeBefore
    if (!before) {
        logError(`no node before ${JSON.stringify($cut)}`)
        return false
    }

    // Apply the joining algorithm
    if (!before.type.spec.isolating && deleteBarrier(state, $cut, dispatch)) return true

    // If the node below has no content and the node above is
    // selectable, delete the node below and select the one above.
    if (
        $cursor.parent.content.size === 0 &&
        (textblockAt(before, 'end') || NodeSelection.isSelectable(before))
    ) {
        const delStep = replaceStep(
            state.doc,
            $cursor.before(),
            $cursor.after(),
            Slice.empty
        ) as ReplaceStep | null
        if (delStep && delStep.slice.size < delStep.to - delStep.from) {
            if (dispatch) {
                const tr = state.tr.step(delStep)
                const selection = textblockAt(before, 'end')
                    ? // eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
                      Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos, -1)), -1)
                    : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize)
                if (selection) {
                    tr.setSelection(selection)
                } else {
                    logError('could not set selection')
                }
                dispatch(tr.scrollIntoView())
            }
            return true
        }
    }

    // If the node before is an atom, delete it
    if (before.isAtom && $cut.depth == $cursor.depth - 1) {
        if (dispatch) dispatch(state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView())
        return true
    }

    return false
}

// When the selection is empty and at the end of a textblock, select
// the node coming after that textblock, if possible. This is intended
// to be bound to keys like delete, after
// [`joinForward`](#commands.joinForward) and similar deleting
// commands, to provide a fall-back behavior when the schema doesn't
// allow deletion at the selected point.
export function selectNodeForward(
    state: EditorState,
    dispatch?: DispatchTransaction,
    view?: EditorView
): boolean {
    const { $head, empty } = state.selection
    let $cut: ResolvedPos | null | undefined = $head
    if (!empty) return false
    if ($head.parent.isTextblock) {
        if (view ? !view.endOfTextblock('forward', state) : $head.parentOffset < $head.parent.content.size)
            return false
        $cut = findCutAfter($head)
    }
    const node = $cut && $cut.nodeAfter
    if (!$cut || !node || !NodeSelection.isSelectable(node)) return false
    if (dispatch) dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos)).scrollIntoView())
    return true
}

// When the selection is empty and at the start of a textblock, select
// the node before that textblock, if possible. This is intended to be
// bound to keys like backspace, after
// [`joinBackward`](#commands.joinBackward) or other deleting
// commands, as a fall-back behavior when the schema doesn't allow
// deletion at the selected point.
export function selectNodeBackward(
    state: EditorState,
    dispatch?: DispatchTransaction,
    view?: EditorView
): boolean {
    const { $head, empty } = state.selection
    let $cut: ResolvedPos | null | undefined = $head
    if (!empty) return false

    if ($head.parent.isTextblock) {
        if (view ? !view.endOfTextblock('backward', state) : $head.parentOffset > 0) return false
        $cut = findCutBefore($head)
    }
    const node = $cut && $cut.nodeBefore
    if (!$cut || !node || !NodeSelection.isSelectable(node)) return false
    if (dispatch)
        dispatch(
            state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos - node.nodeSize)).scrollIntoView()
        )
    return true
}

// If a block node is selected, create an empty paragraph before (if
// it is its parent's first child) or after it.
export function createParagraphNear(state: EditorState, dispatch?: DispatchTransaction): boolean {
    const selection = state.selection
    const { $from, $to } = selection
    if (selection instanceof AllSelection || $from.parent.inlineContent || $to.parent.inlineContent)
        return false
    const type = defaultBlockAt($to.parent.contentMatchAt($to.indexAfter()))
    if (!type || !type.isTextblock) return false
    if (dispatch) {
        const side = (!$from.parentOffset && $to.index() < $to.parent.childCount ? $from : $to).pos
        const fill = type.createAndFill()
        if (!fill) {
            logError('create and fill failed', false)
            return false
        }
        const tr = state.tr.insert(side, fill)
        tr.setSelection(TextSelection.create(tr.doc, side + 1))
        dispatch(tr.scrollIntoView())
    }
    return true
}

// If the cursor is in an empty textblock that can be lifted, lift the
// block.
export function liftEmptyBlock(state: EditorState, dispatch?: DispatchTransaction): boolean {
    if (!(state.selection instanceof TextSelection)) return false
    const selection = state.selection as TextSelection

    const { $cursor } = selection
    if (!$cursor || $cursor.parent.content.size > 0) return false
    if ($cursor.depth > 1 && $cursor.after() != $cursor.end(-1)) {
        const before = $cursor.before()
        if (canSplit(state.doc, before)) {
            if (dispatch) dispatch(state.tr.split(before).scrollIntoView())
            return true
        }
    }
    const range = $cursor.blockRange()
    if (!range) return false
    const target = range && liftTarget(range)
    if (target == undefined) return false
    if (dispatch) dispatch(state.tr.lift(range, target).scrollIntoView())
    return true
}

type SplitTypesAttr = {
    type: NodeType
    attrs?: { [key: string]: any } | null | undefined
}
function deleteNodeTypeId(type: SplitTypesAttr) {
    if ((type.type as any).defaultAttrs.id) {
        delete (type.type as any).defaultAttrs.id
    }
    if (type.attrs?.id) {
        delete type.attrs.id
    }
}
// Split the parent block of the selection. If the selection is a text
// selection, also delete its content.
export function splitBlock(state: EditorState, dispatch?: DispatchTransaction): boolean {
    const { $from, $to } = state.selection
    // eslint-disable-next-line unicorn/consistent-destructuring
    if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
        // eslint-disable-next-line unicorn/consistent-destructuring
        const { type, attrs } = state.selection.node
        // we have to delete the id here so it's not copied into the new node
        deleteNodeTypeId({ type, attrs })
        if (!$from.parentOffset || !canSplit(state.doc, $from.pos)) return false
        if (dispatch) dispatch(state.tr.split($from.pos, undefined, [{ type, attrs }]).scrollIntoView())
        return true
    }

    if (!$from.parent.isBlock) return false

    if (dispatch) {
        const atEnd = $to.parentOffset == $to.parent.content.size
        const tr = state.tr
        if (state.selection instanceof TextSelection || state.selection instanceof AllSelection)
            tr.deleteSelection()
        const defaultNode =
            $from.depth == 0 ? undefined : defaultBlockAt($from.node(-1).contentMatchAt($from.indexAfter(-1)))
        let types: Array<SplitTypesAttr> | undefined = /* atEnd && */ defaultNode
            ? [{ type: defaultNode }]
            : undefined
        if (types)
            for (const type of types) {
                // we have to delete the id here so it's not copied into the new node
                deleteNodeTypeId(type)
            }
        // eslint-disable-next-line unicorn/no-array-callback-reference
        let can = canSplit(tr.doc, tr.mapping.map($from.pos), 1, types)
        if (
            defaultNode &&
            !types &&
            !can &&
            // eslint-disable-next-line unicorn/no-array-callback-reference
            canSplit(tr.doc, tr.mapping.map($from.pos), 1, defaultNode && [{ type: defaultNode }])
        ) {
            types = [{ type: defaultNode }]
            can = true
        }
        if (can) {
            // eslint-disable-next-line unicorn/no-array-callback-reference
            tr.split(tr.mapping.map($from.pos), 1, types)
            if (!atEnd && !$from.parentOffset && $from.parent.type != defaultNode) {
                const first = tr.mapping.map($from.before()),
                    $first = tr.doc.resolve(first)
                if (
                    defaultNode &&
                    $from.node(-1).canReplaceWith($first.index(), $first.index() + 1, defaultNode)
                )
                    tr.setNodeMarkup(tr.mapping.map($from.before()), defaultNode)
            }
        }
        dispatch(tr.scrollIntoView())
    }
    return true
}

function selectTextblockSide(
    side: number
): (state: EditorState, dispatch?: DispatchTransaction | undefined) => boolean {
    return (state: EditorState, dispatch?: DispatchTransaction) => {
        const sel = state.selection
        const $pos = side < 0 ? sel.$from : sel.$to
        let depth = $pos.depth
        while ($pos.node(depth).isInline) {
            if (!depth) return false
            depth--
        }
        if (!$pos.node(depth).isTextblock) return false
        if (dispatch)
            dispatch(
                state.tr.setSelection(
                    TextSelection.create(state.doc, side < 0 ? $pos.start(depth) : $pos.end(depth))
                )
            )
        return true
    }
}

// Moves the cursor to the start of current text block.
export const selectTextblockStart = selectTextblockSide(-1)

// Moves the cursor to the end of current text block.
export const selectTextblockEnd = selectTextblockSide(1)

// Combine a number of command functions into a single function.
// Calls them one by one until one returns true.
export function chainCommands(...commands: Array<Command>): Command {
    return (state, dispatch, view) => {
        for (const command of commands) {
            if (command(state, dispatch, view)) return true
        }
        return false
    }
}
