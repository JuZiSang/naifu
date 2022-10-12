import { motion, useSpring, PanInfo, AnimatePresence } from 'framer-motion'
import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { getUserSetting, UserSettings } from '../../../data/user/settings'
import { BreakpointMobile } from '../../../globals/constants'
import { SessionValue } from '../../../globals/state'
import { useWindowSize } from '../../../hooks/useWindowSize'
import { isTouchScreenDevice } from '../../../util/compat'

const swipeConfidenceThreshold = 10000
const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity
}
const tags = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const StyledSidebar = styled(motion.div)<{
    left: boolean
    shown: boolean
    breakpointDesktop: string
    breakpointMobile: string
}>`
    ${(props) => (props.shown ? '' : 'pointer-events: none')};
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    position: relative;
    height: 100%;

    touch-action: pan-y;
    * {
        touch-action: pan-y;
    }

    @media (max-width: 350px) {
        min-width: 100vw;
    }

    user-select: none;
    z-index: 200;

    @media (max-width: ${(props) => props.breakpointDesktop}) {
        ${(props) => (props.shown ? '' : 'position : absolute')};
        ${(props) => (props.shown ? '' : props.left ? 'left:0' : 'right:0')};
    }

    @media (max-width: ${(props) => props.breakpointMobile}) {
        height: 100%;
        position: absolute;
        top: 0;
        ${(props) => (props.left ? 'left:0' : 'right:0')};
        > div {
            ${(props) => (props.left ? '' : 'right:0')};
            ${(props) => (props.left ? '' : 'position:absolute')};
        }
    }
`

export default function Sidebar(props: {
    children: JSX.Element | JSX.Element[]
    left: boolean
    open: boolean
    setOpen: (open: boolean) => void
    modalSidebar?: boolean
    breakpointDesktop?: string
    breakpointMobile?: string
    noDragPoint?: number
    overlayPoint?: number
    style?: React.CSSProperties
    initialOffset?: number
}): JSX.Element {
    const sessionSettings = useRecoilValue(SessionValue('settings')) as UserSettings
    const siteTheme = getUserSetting(sessionSettings, 'siteTheme')
    const [width, setWidth] = useState(props.initialOffset ?? 0)
    const window = useWindowSize()
    const divRef: MutableRefObject<null | HTMLDivElement> = useRef(null)

    useEffect(() => {
        if (divRef.current) {
            setWidth(divRef.current.clientWidth)
        }
    }, [window.width])

    const isOpen = props.open
    const setIsOpen = props.setOpen
    const direction = props.left ? -1 : 1
    const x = useSpring(direction * (props.initialOffset ?? 0), { stiffness: 400, damping: 40 })
    useEffect(() => {
        if (props.open) {
            x.set(props.left ? 0 : 0)
        } else {
            x.set(props.left ? -width : width)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.open, width])

    const validTouch = (e: MouseEvent | TouchEvent | PointerEvent, allowModal: boolean = false) => {
        if (props.noDragPoint && window.width > props.noDragPoint) return false
        if (!isTouchScreenDevice || sessionSettings.gestureControl === false) {
            return false
        }
        if (e.target) {
            const target = e.target as HTMLElement
            if (!allowModal && !document.querySelector('#app')?.contains(target)) {
                return false
            }
            if (tags.has(target.tagName)) {
                return false
            }
        }
        return true
    }

    const pan = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!validTouch(e, props.modalSidebar)) return
        let clampedOffset = isOpen
            ? Math.max(Math.min(info.offset.x, 0), -width)
            : Math.max(Math.min(info.offset.x, width), 0)
        if (!props.left) {
            clampedOffset = isOpen
                ? Math.max(Math.min(info.offset.x, width), 0)
                : Math.max(Math.min(info.offset.x, 0), -width)
        }

        if (props.left) {
            x.set(isOpen ? clampedOffset : clampedOffset - width)
        } else {
            x.set(isOpen ? clampedOffset : clampedOffset + width)
        }
    }

    const panEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!validTouch(e, props.modalSidebar)) return
        const swipe = swipePower(info.offset.x, info.velocity.x)
        if (swipe < -swipeConfidenceThreshold) {
            x.set(props.left ? -width : 0)
            setIsOpen(!props.left)
        } else if (swipe > swipeConfidenceThreshold) {
            x.set(props.left ? 0 : width)
            setIsOpen(props.left)
        } else {
            if (Math.abs(x.get()) < width / 2) {
                x.set(0)
                setIsOpen(true)
            } else {
                x.set(direction * width)
                setIsOpen(false)
            }
        }
    }
    return (
        <>
            <AnimatePresence>
                {isOpen && window.width < (props.overlayPoint ?? 800) ? (
                    <SidebarOverlay
                        key="sidebarOverlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7, transition: { ease: 'easeInOut' } }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                    />
                ) : (
                    <></>
                )}
            </AnimatePresence>
            <StyledSidebar
                left={props.left}
                shown={isOpen}
                style={{ height: '100%', width: width, ...props.style }}
                onPan={pan}
                onPanEnd={panEnd}
                breakpointDesktop={
                    props.breakpointDesktop ?? siteTheme.breakpoints.desktop ?? `${BreakpointMobile + 1}px`
                }
                breakpointMobile={
                    props.breakpointMobile ?? siteTheme.breakpoints.mobile ?? `${BreakpointMobile}px`
                }
            >
                <motion.div
                    ref={divRef}
                    initial={{ x: direction * (props.initialOffset ?? 0) }}
                    style={{
                        x,
                        height: '100%',
                        width: 'min-content',
                        overflowX: 'hidden',
                        overflowY: 'auto',
                    }}
                >
                    {props.children}
                    <SidebarHandle left={props.left} onPan={pan} />
                </motion.div>
            </StyledSidebar>
        </>
    )
}

const SidebarHandle = styled(motion.div)<{ left: boolean }>`
    position: absolute;
    ${(props) => (props.left ? 'right: -20px' : 'left: -20px')};
    width: 20px;
    height: 100%;
    top: 0;
    pointer-events: auto;
`

export const SidebarOverlay = styled(motion.div)`
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: ${(props) => props.theme.colors.bg0};
    z-index: 101;
`
