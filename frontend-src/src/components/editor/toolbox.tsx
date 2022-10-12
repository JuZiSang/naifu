import { AnimatePresence, motion } from 'framer-motion'
import {
    forwardRef,
    RefObject,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react'
import styled, { css } from 'styled-components'

import { createPortal } from 'react-dom'
import Bold from '../../assets/images/bold.svg'
import Italic from '../../assets/images/italic.svg'
import Underline from '../../assets/images/underline.svg'
import Strikethrough from '../../assets/images/strikethrough.svg'
import Infilling from '../../assets/images/infilling.svg'
import Hamburger from '../../assets/images/hamburger_menu.svg'

import { darken, lighten, transparentize } from '../../util/colour'
import { isMobileDevice } from '../../util/compat'
import { EditorFormat, EditorHandle } from './editor'
import { EditorMenuHandle } from './menu'

interface EditorToolboxInnerState {
    visible: boolean
    position: { left: number; right: number; top: number; bottom: number }
    meta: Set<EditorFormat>
}
export interface EditorToolboxHandle {
    state: EditorToolboxInnerState
}
export interface EditorToolboxProps {
    editorRef: RefObject<EditorHandle>
    menuRef: RefObject<EditorMenuHandle>
}
export const EditorToolbox = forwardRef<EditorToolboxHandle, EditorToolboxProps>(function EditorToolbox(
    { editorRef, menuRef },
    ref
) {
    const [visible, setVisible] = useState(false)
    const [position, setPosition] = useState({ left: 0, right: 0, top: 0, bottom: 0 })
    const [meta, setMeta] = useState(new Set() as Set<EditorFormat>)
    const [offset, setOffset] = useState(0)

    useImperativeHandle(ref, () => ({
        set state({ visible, position, meta }: EditorToolboxInnerState) {
            if (menuRef.current?.state.visible) {
                setVisible(false)
            } else {
                setVisible(visible)
            }
            setPosition(position)
            setMeta(meta)
        },
        get state(): EditorToolboxInnerState {
            return {
                visible,
                position,
                meta,
            }
        },
    }))

    const updatePosition = useCallback(() => {
        const editor = editorRef.current
        const scroll = editor?.root?.getBoundingClientRect().y ?? 0
        const offset = editor?.root?.offsetTop ?? 0
        const editorScroll = editor?.view?.dom?.parentElement?.scrollTop ?? 0
        setOffset(scroll - offset - editorScroll)
    }, [editorRef])

    useEffect(() => {
        updatePosition()
    }, [visible, updatePosition])

    const updatePositionRef = useRef(0)
    useEffect(() => {
        const editor = editorRef.current
        const queueUpdatePosition = () => {
            clearTimeout(updatePositionRef.current)
            updatePositionRef.current = setTimeout(updatePosition, 50) as unknown as number
        }
        editor?.root?.addEventListener('scroll', queueUpdatePosition)
        document.querySelector('#__next')?.addEventListener('scroll', queueUpdatePosition)
        window.visualViewport?.addEventListener('resize', queueUpdatePosition)
        queueUpdatePosition()
        return () => {
            editor?.root?.removeEventListener('scroll', queueUpdatePosition)
            document.querySelector('#__next')?.removeEventListener('scroll', queueUpdatePosition)
            window.visualViewport?.removeEventListener('resize', queueUpdatePosition)
        }
    }, [editorRef, updatePosition])

    const [flipped, setFlipped] = useState(isMobileDevice)
    const [size, setSize] = useState([250, 50] as [number, number])
    const toolboxPosition = useMemo(() => {
        let x = position.left + (position.right - position.left) / 2
        let y = position.top + offset
        const left = editorRef.current?.root?.getBoundingClientRect().left ?? 0
        const right = editorRef.current?.root?.getBoundingClientRect().right ?? window.innerWidth
        const top = editorRef.current?.root?.getBoundingClientRect().top ?? 0
        const bottom = editorRef.current?.root?.getBoundingClientRect().bottom ?? window.innerHeight
        x = Math.max(x, left + size[0] / 2)
        x = Math.min(x, right - size[0] / 2)
        y = Math.max(y, top)
        y = Math.min(y, bottom)
        const flipped = isMobileDevice || y < top + size[1]
        if (flipped) {
            y = y + size[1] + (position.bottom - position.top)
        }
        setFlipped(flipped)
        return [x, y] as [number, number]
    }, [position, offset, editorRef, size])

    return createPortal(
        <AnimatePresence>
            {visible && (
                <ToolboxContainer
                    key="editor-toolbox"
                    id="editor-toolbox"
                    data-editor-internal
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: 1,
                        transition: { ease: 'easeInOut', duration: 0.1 },
                    }}
                    exit={{
                        opacity: 0,
                        transition: { duration: 0.1 },
                    }}
                    position={toolboxPosition}
                    flipped={flipped}
                    ref={(ref) => {
                        if (ref?.clientWidth && ref?.clientHeight) {
                            setSize([ref.clientWidth, ref.clientHeight])
                        }
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        editorRef.current?.focus()
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        editorRef.current?.focus()
                    }}
                >
                    <ToolboxContent flipped={flipped}>
                        <ToolboxButton
                            onClick={(e) => {
                                e.stopPropagation()
                                editorRef.current?.focus()
                                editorRef.current?.format(EditorFormat.Bold)
                            }}
                        >
                            <ToolboxIcon image={Bold.src} active={meta.has(EditorFormat.Bold)} />
                        </ToolboxButton>
                        <ToolboxButton
                            onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                editorRef.current?.focus()
                                editorRef.current?.format(EditorFormat.Italic)
                            }}
                        >
                            <ToolboxIcon image={Italic.src} active={meta.has(EditorFormat.Italic)} />
                        </ToolboxButton>
                        <ToolboxButton
                            onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                editorRef.current?.focus()
                                editorRef.current?.format(EditorFormat.Underline)
                            }}
                        >
                            <ToolboxIcon image={Underline.src} active={meta.has(EditorFormat.Underline)} />
                        </ToolboxButton>
                        <ToolboxButton
                            onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                editorRef.current?.focus()
                                editorRef.current?.format(EditorFormat.Strikethrough)
                            }}
                        >
                            <ToolboxIcon
                                image={Strikethrough.src}
                                active={meta.has(EditorFormat.Strikethrough)}
                            />
                        </ToolboxButton>
                        <ToolboxSpacer />
                        <ToolboxButton
                            onClick={(e) => {
                                setVisible(false)
                                e.stopPropagation()
                                e.preventDefault()
                                editorRef.current?.focus()
                                editorRef.current?.generate(true)
                            }}
                        >
                            <ToolboxIcon image={Infilling.src} active={false} />
                        </ToolboxButton>
                        <ToolboxSpacer />
                        <ToolboxButton
                            onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                if (menuRef.current) {
                                    menuRef.current.state = {
                                        ...menuRef.current.state,
                                        visible: true,
                                        position: {
                                            top: toolboxPosition[1],
                                            left: toolboxPosition[0],
                                        },
                                    }
                                }
                            }}
                        >
                            <ToolboxIcon image={Hamburger.src} active={false} style={{ height: 12 }} />
                        </ToolboxButton>
                    </ToolboxContent>
                </ToolboxContainer>
            )}
            )
        </AnimatePresence>,
        document.body
    )
})
export default EditorToolbox

const ToolboxContainer = styled(motion.div)<{ position: [number, number]; flipped?: boolean }>`
    position: fixed;
    z-index: 100;
    left: ${(props) => props.position[0]}px;
    top: ${(props) => props.position[1] + (props.flipped ? 15 : -15)}px;
    transform: translate(-50%, -100%);
    transition: top ease-in-out 0.1s, left ease-in-out 0.1s;
    &,
    & * {
        user-select: none;
        pointer-events: fill;
    }
    &:before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        width: 0;
        height: 0;
        margin: auto;
        opacity: 0.95;
        border: 10px solid transparent;
        ${(props) =>
            props.flipped
                ? css`
                      top: -10px;
                      border-top: 0;
                      border-bottom: 10px solid ${(props) => props.theme.colors.bg3};
                  `
                : css`
                      bottom: -10px;
                      border-bottom: 0;
                      border-top: 10px solid ${(props) => props.theme.colors.bg3};
                  `}
    }
`
const ToolboxContent = styled.div<{ flipped?: boolean }>`
    padding: 6px;
    position: relative;
    display: flex;
    flex-direction: row;
    gap: 5px;
    justify-content: space-evenly;
    border: 2px solid ${(props) => props.theme.colors.bg3};
    border-radius: 3px;
    box-shadow: 0 0 6px 0 ${(props) => transparentize(0.75, props.theme.colors.bg3)};
    &:before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 100%;
        height: 100%;
        background: ${(props) => props.theme.colors.bg1};
        border-radius: 3px;
        overflow: hidden;
        opacity: 0.95;
    }
    &:after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        width: 0;
        height: 0;
        margin: auto;
        opacity: 0.95;
        border: 10px solid transparent;
        ${(props) =>
            props.flipped
                ? css`
                      top: -10px;
                      border-top: 0;
                      border-bottom: 10px solid ${(props) => props.theme.colors.bg1};
                  `
                : css`
                      bottom: -10px;
                      border-bottom: 0;
                      border-top: 10px solid ${(props) => props.theme.colors.bg1};
                  `}
    }
`
const ToolboxButton = styled.button`
    border-radius: 3px;
    background: ${(props) => props.theme.colors.bg2};
    border: 0;
    position: relative;
    padding: 0;
    cursor: pointer;
    pointer-events: all;
    &:hover {
        background: ${(props) => lighten(0.02, props.theme.colors.bg2)};
    }
    &:active {
        background: ${(props) => darken(0.02, props.theme.colors.bg2)};
    }
`
const ToolboxIcon = styled.div<{ image: string; active?: boolean }>`
    width: 30px;
    height: 30px;
    @media (max-width: 600px) {
        width: 35px;
        height: 35px;
    }
    mask-image: url(${(props) => props.image});
    background-color: ${(props) =>
        props.active ? props.theme.colors.textHeadings : props.theme.colors.textMain};
    mask-repeat: no-repeat;
    mask-size: contain;
    mask-position: center;
`
const ToolboxSpacer = styled.div`
    position: relative;
    width: 1px;
    margin: 5px 0;
    background: ${(props) => darken(0.02, props.theme.colors.bg3)};
`
