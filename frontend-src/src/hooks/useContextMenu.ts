import { useCallback, useEffect, useState, useRef, RefObject } from 'react'
import { isTouchScreenDevice } from '../util/compat'
import { subscribeToHotEvent, HotEvent, HotEventSub } from '../data/user/hotkeys'

export const useContextMenu = (
    target?: string | RefObject<Element>,
    reverse?: boolean,
    allowMobile?: boolean
): {
    xPos: number
    yPos: number
    showMenu: boolean
    setShowMenu: (state: boolean) => void
    setPosition: (x: number, y: number) => void
} => {
    const [xPos, setXPos] = useState(0)
    const [yPos, setYPos] = useState(0)
    const [showMenu, setShowMenu] = useState(false)
    const hotToggleMenuRef = useRef<any>()
    const hotCloseMenuRef = useRef<any>()

    const setPosition = useCallback(
        (x: number, y: number) => {
            setXPos(x)
            setYPos(y)
        },
        [setXPos, setYPos]
    )

    const handleContextMenu = useCallback(
        (e: MouseEvent) => {
            if (isTouchScreenDevice && !e.ctrlKey && !e.altKey && !allowMobile) return
            if (!isTouchScreenDevice) {
                if ((e.ctrlKey || e.altKey) && !reverse) {
                    return
                } else if (!e.ctrlKey && !e.altKey && reverse) {
                    return
                }
            }

            if (target !== undefined) {
                if (typeof target === 'string') {
                    const element = document.querySelector(target)
                    if (element && element !== e.target && !element.contains(e.target as Element)) {
                        setShowMenu(false)
                        return
                    }
                } else {
                    const element = target.current
                    if (element && element !== e.target && !element.contains(e.target as Element)) {
                        setShowMenu(false)
                        return
                    }
                }
            }
            e.preventDefault()

            setXPos(e.pageX)
            setYPos(e.pageY)
            setShowMenu(true)
        },
        [allowMobile, reverse, target]
    )

    const hotToggleMenu = () => {
        if (showMenu) {
            setShowMenu(false)
        } else {
            setXPos(0)
            setYPos(0)
            setShowMenu(true)
        }

        return true
    }
    hotToggleMenuRef.current = hotToggleMenu

    const hotCloseMenu = () => {
        setShowMenu(false)
        return true
    }
    hotCloseMenuRef.current = hotCloseMenu

    const handleClick = useCallback(() => {
        showMenu && setShowMenu(false)
    }, [showMenu])

    useEffect(() => {
        subscribeToHotEvent(HotEvent.closeModal, new HotEventSub('cmClose', hotCloseMenuRef))
        subscribeToHotEvent(HotEvent.toggleContextMenu, new HotEventSub('cmToggle', hotToggleMenuRef))
    }, [])

    useEffect(() => {
        document.addEventListener('click', handleClick)
        document.addEventListener('contextmenu', handleContextMenu)

        return () => {
            document.removeEventListener('click', handleClick)
            document.removeEventListener('contextmenu', handleContextMenu)
        }
    })

    return { xPos, yPos, showMenu, setShowMenu, setPosition }
}
