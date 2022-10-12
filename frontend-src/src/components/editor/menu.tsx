import {
    forwardRef,
    ReactNode,
    RefObject,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import {
    MenuItem,
    SubMenu,
    MenuGroup,
    ControlledMenu,
    useMenuState,
    SubMenuItemModifiers,
    ClickEvent,
    MenuInstance,
} from '@szhsin/react-menu'
import styled, { css } from 'styled-components'

import { toast } from 'react-toastify'
import { createPortal } from 'react-dom'
import { TextSelection } from 'prosemirror-state'
import { getUserSetting, UserSettings } from '../../data/user/settings'
import {
    LorebookGenerateClipboard,
    LorebookOpen,
    ScreenshotModalState,
    SelectedLorebookEntry,
    SelectedStory,
    SessionValue,
    StoryUpdate,
    TokenizerOpen,
    TokenizerText,
} from '../../globals/state'
import { useContextMenu } from '../../hooks/useContextMenu'
import { transparentize } from '../../util/colour'
import { Fade } from '../../styles/animations'
import { ArrowLeftIcon, ArrowRightIcon, SaveIcon } from '../../styles/ui/icons'
import useTTS from '../../hooks/useTTS'
import { GlobalUserContext } from '../../globals/globals'
import { createLorebookEntry } from '../lorebook/lorebookmodal'
import { useWindowSizeBreakpoint } from '../../hooks/useWindowSize'
import { addKeyToEntry } from '../lorebook/lorebookeditarea'
import { EditorHandle } from './editor'
import { EditorToolboxHandle } from './toolbox'
import { toPlainText } from './util'

interface EditorMenuInnerState {
    visible: boolean
    position: { left: number; top: number }
}
export interface EditorMenuHandle {
    state: EditorMenuInnerState
}
export interface EditorMenuProps {
    editorRef: RefObject<EditorHandle>
    toolboxRef: RefObject<EditorToolboxHandle>
}
export const EditorMenu = forwardRef<EditorMenuHandle, EditorMenuProps>(function EditorMenu(
    { editorRef, toolboxRef },
    ref
) {
    const settings = useRecoilValue(SessionValue('settings')) as UserSettings

    const contextMenuTarget = useRef(editorRef.current?.root ?? null)
    contextMenuTarget.current = editorRef.current?.root ?? null
    const { xPos, yPos, showMenu, setShowMenu, setPosition } = useContextMenu(
        contextMenuTarget,
        getUserSetting(settings, 'contextMenuSwap')
    )

    const win = useWindowSizeBreakpoint(600, 0)
    const MOBILE_DEVICE = useMemo(() => win.width <= 600, [win])

    const menuRef = useRef<HTMLDivElement>(null)
    const subMenuAddToRef = useRef<MenuInstance>(null)
    const subMenuGenRef = useRef<MenuInstance>(null)

    const [menuProps, toggleMenu] = useMenuState({ transition: true })

    const selectionRef = useRef(editorRef.current?.view?.state.selection)
    const toggleToolboxRef = useRef(0)
    useEffect(() => {
        toggleMenu(showMenu)
        clearTimeout(toggleToolboxRef.current)
        if (showMenu) {
            selectionRef.current = editorRef.current?.view?.state.selection
            toggleToolboxRef.current = setTimeout(() => {
                if (MOBILE_DEVICE) {
                    editorRef.current?.focus(false)
                }
                if (toolboxRef.current?.state.visible) {
                    toolboxRef.current.state = {
                        ...toolboxRef.current.state,
                        visible: false,
                    }
                }
            }, 50) as unknown as number
            menuRef.current?.focus()
        }
    }, [MOBILE_DEVICE, editorRef, showMenu, toggleMenu, toolboxRef])

    useImperativeHandle(ref, () => ({
        set state({ visible, position }: EditorMenuInnerState) {
            setPosition(position.left, position.top)
            setShowMenu(visible)
        },
        get state(): EditorMenuInnerState {
            return {
                visible: showMenu,
                position: {
                    left: xPos,
                    top: yPos,
                },
            }
        },
    }))

    const [hintHeight, setHintHeight] = useState(0)

    const [anchorPoint, setAnchorPoint] = useState({ x: xPos, y: yPos })
    useEffect(() => {
        setAnchorPoint({ x: xPos, y: yPos })
    }, [xPos, yPos])

    const { speak: speakTTS, download: downloadTTS } = useTTS()

    const actionCut = useCallback(() => {
        if (!navigator.clipboard) {
            toast('The clipboard is not available')
            setShowMenu(false)
        }
        const selectionEmpty = selectionRef.current?.empty ?? true
        if (selectionEmpty) return
        const text = editorRef.current?.copy(selectionRef.current) ?? ''
        navigator.clipboard
            ?.writeText(text)
            .then(() => {
                editorRef.current?.cut(selectionRef.current)
                setShowMenu(false)
            })
            .catch((error) => {
                toast(`Failed to write to clipboard: ${error?.message ?? error}`)
            })
    }, [editorRef, setShowMenu])
    const actionCopy = useCallback(() => {
        if (!navigator.clipboard) {
            toast('The clipboard is not available')
            setShowMenu(false)
        }
        const selectionEmpty = selectionRef.current?.empty ?? true
        if (selectionEmpty) return
        const text = editorRef.current?.copy(selectionRef.current) ?? ''
        navigator.clipboard
            ?.writeText(text)
            .then(() => setShowMenu(false))
            .catch((error) => {
                toast(`Failed to read from clipboard: ${error?.message ?? error}`)
            })
    }, [editorRef, setShowMenu])
    const actionPaste = useCallback(() => {
        if (!navigator.clipboard) {
            toast('The clipboard is not available')
            setShowMenu(false)
        }
        navigator.clipboard
            ?.readText()
            .then((text) => {
                editorRef.current?.replace(text, selectionRef.current)
                setShowMenu(false)
            })
            .catch((error) => {
                toast(`Failed to read from clipboard: ${error?.message ?? error}`)
            })
    }, [editorRef, setShowMenu])

    const actionGenInline = useCallback(() => {
        editorRef.current?.generate(true, selectionRef.current)
        setShowMenu(false)
    }, [editorRef, setShowMenu])

    const actionAddTo = useRecoilCallback(
        ({ snapshot, set }) =>
            async (e: ClickEvent, target: 'memory' | 'authorsnote' | 'loretext' | 'lorekey') => {
                const selectionEmpty = selectionRef.current?.empty ?? true
                if (selectionEmpty) return
                const { id: selectedStoryId } = await snapshot.getPromise(SelectedStory)
                const story = GlobalUserContext.storyContentCache.get(selectedStoryId)
                const meta = GlobalUserContext.stories.get(selectedStoryId)
                if (!story || !meta) return
                let text = editorRef.current?.copy(selectionRef.current) ?? ''
                if (target === 'memory' || target === 'authorsnote') {
                    const index = target === 'memory' ? 0 : 1
                    if (
                        !text.startsWith('\n') &&
                        story.context[index].text !== '' &&
                        !story.context[index].text.endsWith('\n')
                    ) {
                        text = '\n' + text
                    }
                    story.context[index].text += text
                    set(StoryUpdate(meta.id), meta.save())
                }
                if (target === 'loretext') {
                    const newEntry = createLorebookEntry(story)
                    newEntry.text = text
                    story.lorebook.entries.push(newEntry)
                    set(StoryUpdate(meta.id), meta.save())
                    set(SelectedLorebookEntry, newEntry.id)
                    set(LorebookOpen, true)
                }
                if (target === 'lorekey') {
                    const newEntry = createLorebookEntry(story)
                    addKeyToEntry(
                        text.trim(),
                        newEntry,
                        () => {
                            /* nothing */
                        },
                        (name) => (newEntry.displayName = name)
                    )
                    story.lorebook.entries.push(newEntry)
                    set(StoryUpdate(meta.id), meta.save())
                    set(SelectedLorebookEntry, newEntry.id)
                    set(LorebookOpen, true)
                }
                setShowMenu(false)
            },
        [editorRef, setShowMenu]
    )
    const actionGenLore = useRecoilCallback(
        ({ snapshot, set }) =>
            async (e: ClickEvent, group: string) => {
                const selectionEmpty = selectionRef.current?.empty ?? true
                if (selectionEmpty) return
                const { id: selectedStoryId } = await snapshot.getPromise(SelectedStory)
                const story = GlobalUserContext.storyContentCache.get(selectedStoryId)
                const meta = GlobalUserContext.stories.get(selectedStoryId)
                if (!story || !meta) return
                const text = editorRef.current?.copy(selectionRef.current) ?? ''
                const newEntry = createLorebookEntry(story)
                story.lorebook.entries.push(newEntry)
                set(SelectedLorebookEntry, newEntry.id)
                set(LorebookGenerateClipboard, { text: text.trim(), group })
                set(LorebookOpen, true)
                setShowMenu(false)
            },
        [editorRef, setShowMenu]
    )
    const actionTokenize = useRecoilCallback(
        ({ set }) =>
            () => {
                const selectionEmpty = selectionRef.current?.empty ?? true
                if (selectionEmpty) return
                const text = editorRef.current?.copy(selectionRef.current) ?? ''
                set(TokenizerText, text)
                set(TokenizerOpen, true)
                setShowMenu(false)
            },
        [editorRef, setShowMenu]
    )
    const actionScreenshot = useRecoilCallback(
        ({ set }) =>
            () => {
                const state = editorRef.current?.view?.state
                if (!state) return
                const selectionEmpty = state.selection?.empty ?? true
                if (selectionEmpty) return
                const beforeSelection = TextSelection.create(state.doc, 0, state.selection.from)
                const beforeContent = toPlainText(beforeSelection.content().content)
                const content = toPlainText(state.selection.content().content)
                set(ScreenshotModalState, {
                    open: true,
                    start: beforeContent.length,
                    end: beforeContent.length + content.length,
                })
                setShowMenu(false)
            },
        [editorRef, setShowMenu]
    )

    const actionTTSSpeak = useCallback(() => {
        const selectionEmpty = selectionRef.current?.empty ?? true
        if (selectionEmpty) return
        const text = editorRef.current?.copy(selectionRef.current) ?? ''
        if (text.length === 0) {
            toast("Can't speak an empty selection")
            return
        }
        speakTTS(text).catch((error: any) => {
            if (error) toast(`${error.message ?? error}`)
        })
        setShowMenu(false)
    }, [editorRef, speakTTS, setShowMenu])
    const actionTTSDownload = useCallback(() => {
        const selectionEmpty = selectionRef.current?.empty ?? true
        if (selectionEmpty) return
        const text = editorRef.current?.copy(selectionRef.current) ?? ''
        if (text.length === 0) {
            toast("Can't speak an empty selection")
            return
        }
        downloadTTS(text).catch((error: any) => {
            if (error) toast(`TTS Error: ${error.message ?? error}`)
        })
        setShowMenu(false)
    }, [editorRef, downloadTTS, setShowMenu])

    const selectionEmpty = selectionRef.current?.empty ?? true

    return createPortal(
        <ContextMenuRoot data-editor-internal>
            <ContextMenu
                {...menuProps}
                ref={menuRef}
                className="editor-contextmenu"
                id="editor-contextmenu"
                aria-label="Editor Context Menu"
                position="anchor"
                anchorPoint={anchorPoint}
                extraSpace={hintHeight}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                }}
                mobile={MOBILE_DEVICE}
            >
                {MOBILE_DEVICE && (
                    <ContextMenuOverlay
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowMenu(false)
                        }}
                    />
                )}
                <ContextMenuGroup>
                    <ContextMenuItem
                        aria-label="Cut Selection"
                        disabled={selectionEmpty || !navigator.clipboard?.writeText}
                        onClick={actionCut}
                    >
                        <ContextMenuItemLabel>Cut</ContextMenuItemLabel>
                        <ContextMenuItemHint>Ctrl+X</ContextMenuItemHint>
                    </ContextMenuItem>
                    <ContextMenuItem
                        aria-label="Copy Selection"
                        disabled={selectionEmpty || !navigator.clipboard?.writeText}
                        onClick={actionCopy}
                    >
                        <ContextMenuItemLabel>Copy</ContextMenuItemLabel>
                        <ContextMenuItemHint>Ctrl+C</ContextMenuItemHint>
                    </ContextMenuItem>
                    <ContextMenuItem
                        aria-label="Paste"
                        disabled={!navigator.clipboard?.readText}
                        onClick={actionPaste}
                    >
                        <ContextMenuItemLabel>Paste</ContextMenuItemLabel>
                        <ContextMenuItemHint>Ctrl+P</ContextMenuItemHint>
                    </ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                    <ContextMenuSubMenu
                        instanceRef={subMenuAddToRef}
                        label={(props) => (
                            <ContextEditorSubmenuLabel {...props}>Add to...</ContextEditorSubmenuLabel>
                        )}
                        direction="right"
                        aria-label="Add To... Submenu"
                        disabled={selectionEmpty}
                    >
                        {MOBILE_DEVICE && (
                            <ContextMenuOverlay
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    subMenuAddToRef.current?.closeMenu()
                                }}
                            />
                        )}
                        <ContextMenuItem aria-label="Add to Memory" onClick={(e) => actionAddTo(e, 'memory')}>
                            <ContextMenuItemLabel>Memory</ContextMenuItemLabel>
                        </ContextMenuItem>
                        <ContextMenuItem
                            aria-label="Add to Author's Note"
                            onClick={(e) => actionAddTo(e, 'authorsnote')}
                        >
                            <ContextMenuItemLabel>Author&apos;s Note</ContextMenuItemLabel>
                        </ContextMenuItem>
                        <ContextMenuItem
                            aria-label="Add to New Lore Entry as Text"
                            onClick={(e) => actionAddTo(e, 'loretext')}
                        >
                            <ContextMenuItemLabel>New Lore Entry as Text</ContextMenuItemLabel>
                        </ContextMenuItem>
                        <ContextMenuItem
                            aria-label="Add to New Lore Entry as Key"
                            onClick={(e) => actionAddTo(e, 'lorekey')}
                        >
                            <ContextMenuItemLabel>New Lore Entry as Key</ContextMenuItemLabel>
                        </ContextMenuItem>
                        {MOBILE_DEVICE && (
                            <ContextMenuBack
                                onClick={() => {
                                    subMenuAddToRef.current?.closeMenu()
                                }}
                            >
                                <ContextMenuItemLabel>
                                    <ArrowLeftIcon />
                                    Back
                                </ContextMenuItemLabel>
                            </ContextMenuBack>
                        )}
                    </ContextMenuSubMenu>
                    <ContextMenuItem aria-label="Generate Inline" onClick={actionGenInline}>
                        <ContextMenuItemLabel>Generate Inline</ContextMenuItemLabel>
                    </ContextMenuItem>
                    <ContextMenuSubMenu
                        instanceRef={subMenuGenRef}
                        label={(props) => (
                            <ContextEditorSubmenuLabel {...props}>Generate Lore...</ContextEditorSubmenuLabel>
                        )}
                        direction="right"
                        aria-label="Generate Lore... Submenu"
                        disabled={selectionEmpty}
                    >
                        {MOBILE_DEVICE && (
                            <ContextMenuOverlay
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    subMenuGenRef.current?.closeMenu()
                                }}
                            />
                        )}
                        {[
                            'General',
                            'Person',
                            'Place',
                            'Thing',
                            'Life',
                            'Faction',
                            'Role',
                            'Concept',
                            'History',
                        ].map((group) => (
                            <ContextMenuItem
                                key={group}
                                aria-label={'Generate ' + group + ' Lore'}
                                onClick={(e) => actionGenLore(e, group)}
                            >
                                <ContextMenuItemLabel>{group}</ContextMenuItemLabel>
                            </ContextMenuItem>
                        ))}
                        {MOBILE_DEVICE && (
                            <ContextMenuBack
                                onClick={() => {
                                    subMenuGenRef.current?.closeMenu()
                                }}
                            >
                                <ContextMenuItemLabel>
                                    <ArrowLeftIcon />
                                    Back
                                </ContextMenuItemLabel>
                            </ContextMenuBack>
                        )}
                    </ContextMenuSubMenu>
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                    <ContextMenuItem
                        aria-label="Tokenize Selection"
                        disabled={selectionEmpty}
                        onClick={actionTokenize}
                    >
                        <ContextMenuItemLabel>Tokenize</ContextMenuItemLabel>
                    </ContextMenuItem>
                    <ContextMenuItem
                        aria-label="Screenshot Selection"
                        // TODO: Re-enable when screenshot tool handles document
                        disabled={true}
                        onClick={actionScreenshot}
                    >
                        <ContextMenuItemLabel>Screenshot</ContextMenuItemLabel>
                    </ContextMenuItem>
                    <ContextMenuGroupSplit>
                        <ContextMenuItem
                            aria-label="Speak With TTS"
                            disabled={selectionEmpty}
                            onClick={actionTTSSpeak}
                        >
                            <ContextMenuItemLabel>Speak with TTS</ContextMenuItemLabel>
                        </ContextMenuItem>
                        <ContextMenuItem
                            aria-label="Download Spoken With TTS"
                            disabled={selectionEmpty}
                            onClick={actionTTSDownload}
                        >
                            <ContextMenuItemButton>
                                <SaveIcon />
                            </ContextMenuItemButton>
                        </ContextMenuItem>
                    </ContextMenuGroupSplit>
                </ContextMenuGroup>
                {MOBILE_DEVICE || getUserSetting(settings, 'contextMenuSwap') ? null : (
                    <ContextMenuHint ref={(e) => setHintHeight(e?.offsetHeight ?? 0)}>
                        Hint: Ctrl + Right-Click to open the regular browser context menu.
                    </ContextMenuHint>
                )}
                {MOBILE_DEVICE && (
                    <ContextMenuBack
                        onClick={() => {
                            setShowMenu(false)
                        }}
                    >
                        <ContextMenuItemLabel>
                            <ArrowLeftIcon />
                            Back
                        </ContextMenuItemLabel>
                    </ContextMenuBack>
                )}
            </ContextMenu>
        </ContextMenuRoot>,
        document.body
    )
})
export default EditorMenu

const ContextEditorSubmenuLabelContainer = styled.div`
    width: 100%;
    padding: 7px 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    > div {
        transition: opacity 0.1s ease-in-out;
    }
`
function ContextEditorSubmenuLabel({
    disabled,
    hover,
    open,
    children,
}: SubMenuItemModifiers & { children?: string | ReactNode | ReactNode[] }) {
    return (
        <ContextEditorSubmenuLabelContainer>
            {children}
            <ArrowRightIcon
                style={{ height: 14, opacity: disabled ? 0.25 : open ? 0.7 : hover ? 0.8 : 0.8 }}
            />
        </ContextEditorSubmenuLabelContainer>
    )
}

const ContextMenuRoot = styled.div`
    pointer-events: none;
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 201;
    overflow: hidden;
`
const ContextMenu = styled(ControlledMenu)<{ extraSpace: number; mobile?: boolean }>`
    pointer-events: none;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    ul {
        list-style: none;
        pointer-events: all;
        background: ${(props) => transparentize(0.025, props.theme.colors.bg2)};
        padding: 5px 0;
        padding-bottom: ${(props) => props.extraSpace + 5}px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: 2px solid ${(props) => props.theme.colors.bg3};
        border-radius: 3px;
        min-width: 200px;
        max-height: 100vh;
        overflow: auto;
        z-index: 1;
        box-shadow: 0 0 6px 0 ${(props) => transparentize(0.75, props.theme.colors.bg3)};
        font-size: 0.9rem;
        user-select: none;
        font-weight: 600;
        opacity: 1;
        transition: opacity 0.1s ease-in-out;
        overflow: visible;
        &.szh-menu--state-closed,
        &.szh-menu--state-closing {
            opacity: 0;
            pointer-events: none;
        }
        &.szh-menu--state-open,
        &.szh-menu--state-opening {
            animation: ${Fade} 0.1s ease-in-out;
        }
        & > :not(:last-child) {
            margin-bottom: 5px;
        }
        ${(props) =>
            props.mobile &&
            css`
                /* This might look bad, because it is, but it is simple and it works here. */
                position: fixed !important;
                min-width: 100vw !important;
                width: 100vw !important;
                margin: 0 !important;
                left: 0 !important;
                right: 0 !important;
                top: unset !important;
                bottom: 0 !important;
                height: min-content !important;
            `};
    }
    outline: none;
    &,
    & * {
        outline: none;
    }
`
const ContextMenuOverlay = styled.div`
    display: block;
    z-index: -1;
    position: fixed;
    width: 100vw;
    height: 100vh;
    margin: 0;
    top: 0;
    left: 0;
    background: ${(props) => transparentize(0.25, props.theme.colors.bg1)};
`
const ContextMenuGroup = styled(MenuGroup)`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    & > :not(:last-child) {
        margin-bottom: 5px;
    }
`
const ContextMenuGroupSplit = styled(MenuGroup)`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;
    & > :not(:last-child) {
        flex: 1 1 auto;
    }
    & > :last-child {
        flex: 0 1 auto;
    }
`
const ContextMenuItem = styled(MenuItem)<{ split?: boolean }>`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: nowrap;
    align-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
    &:hover,
    &:focus {
        background: ${(props) => (props.split ? 'transparent' : props.theme.colors.bg3)};
    }
    &[aria-disabled='true'] {
        background: none;
        cursor: unset;
        opacity: 0.5;
    }
`
const ContextMenuBack = styled(ContextMenuItem)`
    margin-top: 10px;
`
const ContextMenuItemLabel = styled.div`
    flex: 1 1 100%;
    word-break: keep-all;
    white-space: pre;
    text-align: left;
    padding: 7px 0 7px 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: left;
    gap: 10px;
    &:hover,
    &:focus {
        background: ${(props) => props.theme.colors.bg3};
    }
`
const ContextMenuItemButton = styled(ContextMenuItemLabel)`
    padding: 7px 20px;
`
const ContextMenuItemHint = styled.div`
    flex: 1 1 auto;
    word-break: keep-all;
    text-align: right;
    opacity: 0.5;
    padding: 7px 20px 7px 0;
`
const ContextMenuSeparator = styled.div`
    width: calc(100% - 30px);
    margin: 2px 15px 7px 15px;
    height: 2px;
    border-bottom: 2px solid ${(props) => props.theme.colors.bg3};
    pointer-events: none;
`
const ContextMenuSubMenu = styled(SubMenu)`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: nowrap;
    align-items: center;
    background: transparent;
    border: none;
    & > div {
        width: 100%;
        cursor: pointer;
        &:hover,
        &:focus {
            outline: none;
            background: ${(props) => props.theme.colors.bg3};
        }
        &[aria-disabled='true'] {
            background: none;
            cursor: unset;
            opacity: 0.5;
            cursor: unset;
        }
    }
    ul {
        padding-bottom: 5px;
    }
`
const ContextMenuHint = styled.div`
    word-break: keep-all;
    opacity: 0.5;
    padding: 0 20px 7px;
    font-size: 0.7rem;
    position: absolute;
    bottom: 0;
    width: 100%;
`
