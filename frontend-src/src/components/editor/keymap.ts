import { EditorView } from 'prosemirror-view'
import { base, keyName } from 'w3c-keyname'

import { isMacOS } from '../../util/compat'
import {
    chainCommands,
    selectAll,
    selectTextblockEnd,
    selectTextblockStart,
    createParagraphNear,
    liftEmptyBlock,
    splitBlock,
    deleteSelection,
    joinBackward,
    joinForward,
    selectNodeBackward,
    selectNodeForward,
    KeymapBindings,
} from './commands'

const enter = chainCommands(createParagraphNear, liftEmptyBlock, splitBlock)
const backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward)
const del = chainCommands(deleteSelection, joinForward, selectNodeForward)

const winKeymap = {
    Enter: enter,
    'Shift-Enter': enter,
    Backspace: backspace,
    'Mod-Backspace': backspace,
    'Shift-Backspace': backspace,
    Delete: del,
    'Mod-Delete': del,
    'Mod-a': selectAll,
}
const macKeymap = {
    ...winKeymap,
    'Ctrl-h': backspace,
    'Alt-Backspace': backspace,
    'Ctrl-d': del,
    'Ctrl-Alt-Backspace': del,
    'Alt-Delete': del,
    'Alt-d': del,
    'Ctrl-a': selectTextblockStart,
    'Ctrl-e': selectTextblockEnd,
}

export const editorKeymap = isMacOS ? macKeymap : winKeymap

export function normalizeKeyName(name: string): string {
    const parts = name.split(/-(?!$)/)
    let result = parts[parts.length - 1]
    if (result == 'Space') result = ' '
    let alt, ctrl, shift, meta
    for (let i = 0; i < parts.length - 1; i++) {
        const mod = parts[i]
        if (/^(cmd|meta|m)$/i.test(mod)) meta = true
        else if (/^a(lt)?$/i.test(mod)) alt = true
        else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true
        else if (/^s(hift)?$/i.test(mod)) shift = true
        else if (/^mod$/i.test(mod)) {
            if (isMacOS) meta = true
            else ctrl = true
        } else throw new Error('Unrecognized modifier name: ' + mod)
    }
    if (alt) result = 'Alt-' + result
    if (ctrl) result = 'Ctrl-' + result
    if (meta) result = 'Meta-' + result
    if (shift) result = 'Shift-' + result
    return result
}

function normalizeKeyMap(map: KeymapBindings): KeymapBindings {
    const copy = Object.create(null)
    for (const prop in map) copy[normalizeKeyName(prop)] = map[prop]
    return copy
}

function keyNameWithModifiers(name: string, event: KeyboardEvent, shift = true) {
    if (event.altKey) name = 'Alt-' + name
    if (event.ctrlKey) name = 'Ctrl-' + name
    if (event.metaKey) name = 'Meta-' + name
    if (shift !== false && event.shiftKey) name = 'Shift-' + name
    return name
}

export function keydownHandler(
    bindings: KeymapBindings
): (view: EditorView, event: KeyboardEvent) => boolean {
    const map = normalizeKeyMap(bindings)
    return function (view, event) {
        const name = keyName(event)
        const isChar = name.length == 1 && name != ' '
        let baseName
        const direct = map[keyNameWithModifiers(name, event, !isChar)]
        if (direct && direct(view.state, view.dispatch, view)) return true
        if (
            isChar &&
            (event.shiftKey || event.altKey || event.metaKey || (name.codePointAt(0) ?? 0) > 127) &&
            (baseName = base[event.keyCode]) &&
            baseName != name
        ) {
            const fromCode = map[keyNameWithModifiers(baseName, event, true)]
            if (fromCode && fromCode(view.state, view.dispatch, view)) return true
        } else if (isChar && event.shiftKey) {
            // Otherwise, if shift is active, also try the binding with the
            // Shift- prefix enabled. See #997
            const withShift = map[keyNameWithModifiers(name, event, true)]
            if (withShift && withShift(view.state, view.dispatch, view)) return true
        }
        return false
    }
}
