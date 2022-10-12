import { useEffect, MutableRefObject, useRef } from 'react'
import { atom, useRecoilValue } from 'recoil'

const filterableTags = ['INPUT', 'TEXTAREA', 'SELECT'] as const
type FilterableTag = typeof filterableTags[number]
const isFilterableTag = (tag: string): tag is FilterableTag => filterableTags.includes(tag as any)

enum ModKey {
    ctrl = 'Ctrl',
    shift = 'Shift',
    alt = 'Alt',
    meta = 'Command',
}

const codeToKeyMap = new Map<string, string>()

const CodeTranslator = {
    codeMerges: new Map([
        ['NumpadEnter', 'Enter'],
        ['ShiftLeft', 'Shift'],
        ['AltLeft', 'Alt'],
        ['MetaLeft', 'Meta'],
        ['ControlLeft', 'Ctrl'],
        ['ShiftRight', 'Shift'],
        ['AltRight', 'Alt'],
        ['MetaRight', 'Meta'],
        ['ControlRight', 'Ctrl'],
    ]),

    mergeCode(code: string): string {
        if (this.codeMerges.has(code)) {
            return this.codeMerges.get(code) as string
        }
        return code
    },
}

export enum HotEvent {
    accept,
    preventEvent,
    releaseFocus,
    toggleMenuBar,
    toggleInfoBar,
    toggleBars,
    toggleContextMenu,
    editorFocus,
    editorRequest,
    editorRequestInsert,
    editorRequestCancel,
    inputFocus,
    inputSend,
    inputRedo,
    inputRedoMenu,
    inputUndo,
    inputRetry,
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight,
    navigateMenu,
    lorebook,
    contextViewer,
    tokenizer,
    closeModal,
    delete,
    toggleInputBox,
    highlighting,
    spellcheck,
    createNewStory,
    resetTheme,
    deleteStory,
    focusForward,
    focusBack,
    stopTTS,
    tokenprob,
}

class Keybind {
    event: HotEvent
    code: string
    mods: ModKey[]

    constructor(event: HotEvent, code: string, mods: Array<ModKey> = []) {
        this.event = event
        this.code = code
        this.mods = mods
    }

    checkEvent(event: KeyboardEvent, code: string): boolean {
        if (code !== this.code) {
            return false
        }
        if (event.ctrlKey !== this.mods.includes(ModKey.ctrl)) {
            return false
        }
        if (event.shiftKey !== this.mods.includes(ModKey.shift)) {
            return false
        }
        if (event.altKey !== this.mods.includes(ModKey.alt)) {
            return false
        }
        if (event.metaKey !== this.mods.includes(ModKey.meta)) {
            return false
        }

        return true
    }
}

class Keybinds {
    bindMap = new Map<HotEvent, Keybind[]>()

    addBind(bind: Keybind): void {
        bind.code = CodeTranslator.mergeCode(bind.code)
        this.bindMap.set(bind.event, [...(this.bindMap.get(bind.event) ?? []), bind])
    }

    setDefaults() {
        this.bindMap.clear()
        this.addBind(new Keybind(HotEvent.accept, 'Enter'))
        this.addBind(new Keybind(HotEvent.accept, 'Space'))
        this.addBind(new Keybind(HotEvent.releaseFocus, 'Escape'))
        this.addBind(new Keybind(HotEvent.toggleMenuBar, 'KeyQ', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.toggleInfoBar, 'KeyE', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.toggleBars, 'KeyW', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.toggleContextMenu, 'Period', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.editorFocus, 'KeyF', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.editorRequest, 'Enter', [ModKey.ctrl]))
        this.addBind(new Keybind(HotEvent.editorRequest, 'Enter', [ModKey.meta]))
        this.addBind(new Keybind(HotEvent.editorRequest, 'KeyS', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.editorRequestInsert, 'Enter', [ModKey.shift, ModKey.ctrl]))
        this.addBind(new Keybind(HotEvent.editorRequestInsert, 'Enter', [ModKey.shift, ModKey.meta]))
        this.addBind(new Keybind(HotEvent.inputFocus, 'KeyG', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.inputRedo, 'KeyY', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.inputRedoMenu, 'KeyY', [ModKey.alt, ModKey.shift]))
        this.addBind(new Keybind(HotEvent.inputUndo, 'KeyZ', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.inputRetry, 'KeyR', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.navigateUp, 'ArrowUp'))
        this.addBind(new Keybind(HotEvent.navigateDown, 'ArrowDown'))
        this.addBind(new Keybind(HotEvent.navigateLeft, 'ArrowLeft'))
        this.addBind(new Keybind(HotEvent.navigateRight, 'ArrowRight'))
        this.addBind(new Keybind(HotEvent.lorebook, 'KeyL', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.contextViewer, 'KeyK', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.tokenizer, 'KeyT', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.closeModal, 'Escape'))
        this.addBind(new Keybind(HotEvent.delete, 'Escape'))
        this.addBind(new Keybind(HotEvent.delete, 'Backspace'))
        this.addBind(new Keybind(HotEvent.toggleInputBox, 'KeyJ', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.highlighting, 'KeyH', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.spellcheck, 'KeyC', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.createNewStory, 'KeyN', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.resetTheme, 'KeyP', [ModKey.alt, ModKey.shift]))
        this.addBind(new Keybind(HotEvent.deleteStory, 'Delete', [ModKey.alt, ModKey.shift]))
        this.addBind(new Keybind(HotEvent.focusForward, 'Tab'))
        this.addBind(new Keybind(HotEvent.focusBack, 'Tab', [ModKey.shift]))
        this.addBind(new Keybind(HotEvent.stopTTS, 'KeyT', [ModKey.alt, ModKey.shift]))
        this.addBind(new Keybind(HotEvent.preventEvent, 'AltLeft', [ModKey.alt]))
        this.addBind(new Keybind(HotEvent.tokenprob, 'KeyT', [ModKey.ctrl, ModKey.alt]))
    }

    codeToKey(code: string): string {
        const mappedKey = codeToKeyMap.get(code)
        if (mappedKey) {
            return mappedKey
        }

        if (code.startsWith('Key')) {
            return code.slice(3)
        }

        return code
    }

    bindsToString(event: HotEvent): string {
        const binds = this.bindMap.get(event)

        if (binds === undefined) {
            return ''
        }

        return binds
            .map((bind) => {
                const key = this.codeToKey(bind.code)
                let entry = ''

                entry += bind.mods.length > 0 ? bind.mods.join(' + ') + ' + ' : ''
                entry += key.charAt(0).toUpperCase() + key.slice(1)

                return entry
            })
            .join(', ')
    }

    constructor(defaults: boolean) {
        if (defaults) {
            this.setDefaults()
        }
    }
}

export const HotkeysInfo = new Map<HotEvent, string>([
    [HotEvent.toggleMenuBar, 'Toggle Menu Bar'],
    [HotEvent.toggleInfoBar, 'Toggle Info Bar'],
    [HotEvent.toggleBars, 'Toggle Bars'],
    [HotEvent.editorFocus, 'Focus Editor'],
    [HotEvent.editorRequest, 'Request AI Generation'],
    [HotEvent.editorRequestInsert, 'Generate Inline'],
    [HotEvent.inputFocus, 'Focus Input Field'],
    //    [HotEvent.inputSend, 'Send Input Box Input'],
    [HotEvent.inputRedo, 'Redo'],
    [HotEvent.inputRedoMenu, 'Open Redo List'],
    [HotEvent.inputUndo, 'Undo'],
    [HotEvent.inputRetry, 'Retry AI Generation'],
    [HotEvent.lorebook, 'Open Lorebook'],
    [HotEvent.contextViewer, 'Open Context Viewer'],
    [HotEvent.tokenizer, 'Open Tokenizer'],
    [HotEvent.tokenprob, 'Open Token Probabilities'],
    [HotEvent.closeModal, 'Close Modal'],
    [HotEvent.toggleInputBox, 'Toggle Input Box'],
    [HotEvent.highlighting, 'Toggle Highlighting'],
    [HotEvent.spellcheck, 'Toggle Spellcheck'],
    [HotEvent.createNewStory, 'Create New Story'],
    [HotEvent.resetTheme, 'Reset Theme'],
    [HotEvent.deleteStory, 'Delete Current Story'],
    [HotEvent.stopTTS, 'Stop TTS'],
])

export class HotEventSub {
    uid: string
    keyDown: boolean = true
    keyUp: boolean = false
    allowRepeat: boolean = false
    enableOnTags: FilterableTag[] = ['INPUT', 'SELECT', 'TEXTAREA']
    enableOnContentEditable: boolean = true
    callback: MutableRefObject<(event: KeyboardEvent) => boolean> | ((event: KeyboardEvent) => boolean)
    preventDefault: boolean = true
    stopPropagation: boolean = true

    constructor(
        uid: string,
        callback: MutableRefObject<(event: KeyboardEvent) => boolean> | ((event: KeyboardEvent) => boolean),
        allowRepeat: boolean = false,
        preventDefault: boolean = true,
        stopPropagation: boolean = true
    ) {
        this.uid = uid
        this.callback = callback
        this.allowRepeat = allowRepeat
        this.preventDefault = preventDefault
        this.stopPropagation = stopPropagation
    }

    consume(event: KeyboardEvent): boolean {
        if (!this.keyDown && event.type === 'keydown') {
            return false
        }
        if (!this.keyUp && event.type === 'keyup') {
            return false
        }
        if (!this.allowRepeat && event.repeat) {
            return false
        }

        const target = event.target as HTMLElement
        if (target) {
            if (isFilterableTag(target.tagName) && !this.enableOnTags.includes(target.tagName)) {
                return false
            }
            if (!this.enableOnContentEditable && target.isContentEditable) {
                return false
            }
        }

        const result =
            typeof this.callback === 'function' ? this.callback(event) : this.callback.current(event)

        if (result && this.preventDefault) {
            event.preventDefault()
        }
        if (result && this.stopPropagation) {
            event.stopPropagation()
        }

        return result
    }
}

const eventSubscribers = new Map<HotEvent, HotEventSub[]>()

export const subscribeToHotEvent = (event: HotEvent, sub: HotEventSub): void => {
    const currentSubs = eventSubscribers.get(event) ?? []
    eventSubscribers.set(event, [...currentSubs.filter((value) => value.uid !== sub.uid), sub])
}

export const invokeHotkeyEvent = (event: HotEvent): void => {
    const currentSubs = eventSubscribers.get(event) ?? []
    for (const sub of currentSubs) {
        typeof sub.callback === 'function'
            ? sub.callback(new KeyboardEvent('keydown'))
            : sub.callback.current(new KeyboardEvent('keydown'))
    }
}

export const ActiveKeybinds = atom({
    key: 'activeKeybinds',
    default: new Keybinds(true),
})

export function HotkeyHandler(): JSX.Element {
    const keybinds = useRecoilValue(ActiveKeybinds)
    const actionCache = useRef(new Map())

    const handleKeyboardEvent = async (event: KeyboardEvent) => {
        if (event.key === 'Dead') {
            return
        }
        let cachable = event.code

        if (event.ctrlKey) {
            cachable += 'c'
        }
        if (event.altKey) {
            cachable += 'a'
        }
        if (event.shiftKey) {
            cachable += 's'
        }
        if (event.metaKey) {
            cachable += 'm'
        }

        let actions = actionCache.current.get(cachable)
        if (actions === undefined) {
            codeToKeyMap.set(event.code, event.key)
            actions = new Set()

            const merged = CodeTranslator.mergeCode(event.code)
            for (const binds of keybinds.bindMap.values()) {
                for (const bind of binds) {
                    const valid = bind.checkEvent(event, merged)

                    if (valid) {
                        actions.add(bind.event)
                    }
                }
            }

            actionCache.current.set(cachable, actions)
        }

        for (const action of actions) {
            const subs = eventSubscribers.get(action)
            if (subs) {
                for (const sub of subs) {
                    sub.consume(event)
                }
            }
        }
    }

    useEffect(() => {
        document.addEventListener('keydown', handleKeyboardEvent)
        document.addEventListener('keyup', handleKeyboardEvent)
        return () => {
            document.removeEventListener('keydown', handleKeyboardEvent)
            document.removeEventListener('keyup', handleKeyboardEvent)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        actionCache.current.clear()
    }, [keybinds])

    return <></>
}
