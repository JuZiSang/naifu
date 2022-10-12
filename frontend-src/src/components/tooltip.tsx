import { useState, useRef, useEffect, CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { usePopper } from 'react-popper'
import { useRecoilValue } from 'recoil'
import { LoreEntry } from '../data/ai/loreentry'
import { GlobalUserContext } from '../globals/globals'
import { SelectedStory } from '../globals/state'
import { MotionTooltipContainer, TooltipContainer, TooltipMain } from '../styles/ui/tooltip'
import { isTouchScreenDevice } from '../util/compat'

export default function Tooltip(props: {
    tooltip: string
    elementTooltip?: JSX.Element
    delay: number
    children: JSX.Element
    motionHover?: boolean
    overflowChild?: string
    inheritHeight?: boolean
    maxWidth?: string
    strategy?: 'absolute' | 'fixed'
    style?: CSSProperties
}): JSX.Element {
    const [referenceElement, setReferenceElement] = useState<any>(null)
    const [popperElement, setPopperElement] = useState<any>(null)
    const [arrowElement, setArrowElement] = useState<any>(null)
    const [visible, setVisible] = useState(false)
    const [seeable, setSeeable] = useState(false)
    const timer = useRef<any>()
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: 'top',
        strategy: props.strategy,
        modifiers: [
            { name: 'arrow', options: { element: arrowElement } },
            {
                name: 'offset',
                options: {
                    offset: [0, 8],
                },
            },
        ],
    })

    const hoverStart = () => {
        if (props.overflowChild) {
            let isOverflowing: boolean = false
            const children = referenceElement.querySelectorAll(props.overflowChild)

            for (const element of children) {
                if (
                    element.offsetHeight < element.scrollHeight ||
                    element.offsetWidth < element.scrollWidth
                ) {
                    isOverflowing = true
                    break
                }
            }

            if (!isOverflowing) {
                return
            }
        }

        setVisible(true)
        timer.current = setTimeout(() => {
            setSeeable(true)
        }, props.delay)
    }

    const hoverEnd = () => {
        clearTimeout(timer.current)
        setSeeable(false)
        setVisible(false)
    }

    // Remove visible when clicked outside of tooltip
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                referenceElement &&
                popperElement &&
                !referenceElement.contains(e.target as Node) &&
                !popperElement.contains(e.target as Node)
            ) {
                setSeeable(false)
                setVisible(false)
            }
        }

        document.addEventListener('click', handleClickOutside)

        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    }, [referenceElement, popperElement])

    return (
        <>
            {visible ? (
                createPortal(
                    <TooltipMain
                        visible={seeable}
                        ref={setPopperElement}
                        style={styles.popper}
                        maxWidth={props.maxWidth}
                        {...attributes.popper}
                    >
                        {props.elementTooltip
                            ? props.elementTooltip
                            : props.tooltip.split('\n').map((line, i) => {
                                  return <p key={i}>{line}</p>
                              })}
                        <div ref={setArrowElement} style={styles.arrow} />
                    </TooltipMain>,
                    document.body
                )
            ) : (
                <></>
            )}
            {props.motionHover ? (
                <MotionTooltipContainer
                    ref={setReferenceElement}
                    onHoverStart={hoverStart}
                    onHoverEnd={hoverEnd}
                    style={props.style}
                >
                    {props.children}
                </MotionTooltipContainer>
            ) : (
                <TooltipContainer
                    ref={setReferenceElement}
                    onMouseEnter={hoverStart}
                    onMouseLeave={hoverEnd}
                    inheritHeight={props.inheritHeight}
                    style={props.style}
                >
                    {props.children}
                </TooltipContainer>
            )}
        </>
    )
}

export function LoreKeyHover(props: { element: HTMLElement | null }): JSX.Element {
    const [referenceElement, setReferenceElement] = useState<any>(null)
    const [popperElement, setPopperElement] = useState<any>(null)
    const [arrowElement, setArrowElement] = useState<any>(null)
    const [entries, setEntries] = useState<Array<LoreEntry>>([])
    const [visible, setVisible] = useState(false)
    const [seeable, setSeeable] = useState(false)
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)

    const timer = useRef<any>()
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: 'top',
        modifiers: [
            { name: 'arrow', options: { element: arrowElement } },
            {
                name: 'offset',
                options: {
                    offset: [0, 8],
                },
            },
        ],
    })
    useEffect(() => {
        setReferenceElement(props.element)
        setVisible(props.element !== null)
        if (props.element) {
            timer.current = setTimeout(() => {
                setSeeable(true)
            }, 400)
        } else {
            clearTimeout(timer.current)
            setSeeable(false)
        }

        const entries = []
        if (props.element) {
            for (const c of props.element.classList) {
                if (c !== 'lorekey') {
                    const entry = currentStoryContent?.lorebook.entries.find((l) => l.id === c)
                    if (entry) entries.push(entry)
                }
            }
        }
        setEntries(entries)
    }, [currentStoryContent?.lorebook.entries, props.element])
    return (
        <>
            {visible && !isTouchScreenDevice ? (
                createPortal(
                    <TooltipMain
                        visible={seeable}
                        ref={setPopperElement}
                        style={styles.popper}
                        {...attributes.popper}
                    >
                        {entries.map((l, i) => {
                            return <div key={i}>{l.displayName}</div>
                        })}
                        <div ref={setArrowElement} style={styles.arrow} />
                    </TooltipMain>,
                    document.body
                )
            ) : (
                <></>
            )}
        </>
    )
}
