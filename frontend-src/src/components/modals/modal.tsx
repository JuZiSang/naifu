import { createPortal } from 'react-dom'
import { useRef, useEffect } from 'react'
import { useSetRecoilState } from 'recoil'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribeToHotEvent, HotEvent, HotEventSub } from '../../data/user/hotkeys'
import {
    Modal as StyledModal,
    Header,
    HeaderContainer,
    HeaderContainerAboveLabel,
    HeaderContainerLabel,
    HeaderIcon,
    Overlay,
    Content,
    HeaderClose,
    ModalWindow,
    CompactClose,
    CompactHeader,
    CompactModalWindow,
    CompactIcon,
    CompactModal,
    CompactIcons,
    LargeModal,
    CompactBody,
} from '../../styles/components/modal'
import { mod } from '../../util/util'
import { ModalsOpen } from '../../globals/state'
import { Theme } from '../../styles/themes/theme'

export enum ModalType {
    Compact = 1,
    Large = 2,
}

export default function Modal(props: {
    isOpen?: boolean
    label?: string | JSX.Element
    aboveLabel?: string
    icon?: boolean
    iconUrl?: string
    iconElement?: JSX.Element
    onRequestClose: () => void
    shouldCloseOnOverlayClick?: boolean
    children?: React.ReactElement
    type?: ModalType
    showClose?: boolean
    style?: React.CSSProperties
    maxSize?: boolean
    zIndex?: number
    ignoreOpen?: boolean
    theme?: Theme
}): JSX.Element {
    const hotCloseModalRef = useRef<any>()
    const modalRef = useRef<any>()
    const open = useRef<boolean>(false)

    const setModalOpen = useSetRecoilState(ModalsOpen)
    useEffect(() => {
        if (props.ignoreOpen) return
        if (open.current && !props.isOpen) {
            open.current = false
            setModalOpen((o) => o - 1)
        }
        if (!open.current && props.isOpen) {
            open.current = true
            setModalOpen((o) => o + 1)
        }
        return () => {
            if (open.current) {
                open.current = false
                setModalOpen((o) => o - 1)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.isOpen])

    const hotCloseModal = () => {
        if (!(props.showClose ?? true) || !props.shouldCloseOnOverlayClick || !props.isOpen) {
            return false
        }
        props.onRequestClose()
        return true
    }
    hotCloseModalRef.current = hotCloseModal

    const focusStep = (step: number) => {
        if (modalRef.current === null || !props.isOpen) {
            return false
        }

        const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        const focusableContent: any[] = [...modalRef.current.querySelectorAll(focusableElements)].filter(
            (e) => {
                return e.disabled === false && getComputedStyle(e).display !== 'none'
            }
        )

        let tabIndex = step
        for (const [index, element] of focusableContent.entries()) {
            if (element === document.activeElement) {
                tabIndex += index
                break
            }
        }

        const elementToFocus = focusableContent[mod(tabIndex, focusableContent.length)]
        elementToFocus.focus()

        return true
    }

    const hotFocusForward = () => {
        return focusStep(1)
    }

    const hotFocusBack = () => {
        return focusStep(-1)
    }

    useEffect(() => {
        if (props.isOpen) {
            subscribeToHotEvent(HotEvent.closeModal, new HotEventSub('modalClose', hotCloseModalRef))
            subscribeToHotEvent(HotEvent.focusForward, new HotEventSub('modalFocusF', hotFocusForward))
            subscribeToHotEvent(HotEvent.focusBack, new HotEventSub('modalFocusB', hotFocusBack))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.isOpen])

    const overlay = (
        <>
            <Overlay
                theme={props.theme}
                pointer={props.shouldCloseOnOverlayClick ?? false}
                onClick={(e) => {
                    e.stopPropagation()
                    if (props.shouldCloseOnOverlayClick) props.onRequestClose()
                }}
                className="modal-overlay"
            />
        </>
    )

    let modal: JSX.Element

    switch (props.type) {
        case 1:
            modal = (
                <StyledModal style={props.zIndex ? { zIndex: props.zIndex } : {}} ref={modalRef}>
                    <CompactModalWindow
                        role="dialog"
                        aria-modal
                        className="modal modal-compact"
                        style={props.style}
                    >
                        <CompactModal>
                            <CompactIcons>
                                {props.iconElement ??
                                    ((props.icon || props.iconUrl) && <CompactIcon icon={props.iconUrl} />)}
                                {props.showClose ?? true ? (
                                    <CompactClose
                                        aria-label="Close Modal"
                                        onClick={() => props.onRequestClose()}
                                    />
                                ) : (
                                    <></>
                                )}
                            </CompactIcons>
                            <CompactHeader>{props.label}</CompactHeader>
                            <CompactBody>{props.children}</CompactBody>
                        </CompactModal>
                    </CompactModalWindow>
                    {overlay}
                </StyledModal>
            )
            break
        case 2:
            modal = (
                <StyledModal style={props.zIndex ? { zIndex: props.zIndex } : {}} ref={modalRef}>
                    <LargeModal
                        fill={props.maxSize}
                        style={{
                            ...props.style,
                        }}
                        role="dialog"
                        aria-modal
                        className="modal modal-large"
                    >
                        {props.children}
                    </LargeModal>

                    {overlay}
                </StyledModal>
            )
            break
        default:
            modal = (
                <StyledModal style={props.zIndex ? { zIndex: props.zIndex } : {}} ref={modalRef}>
                    <ModalWindow role="dialog" aria-modal className="modal modal-regular" style={props.style}>
                        <Header className="modal-header">
                            {props.iconElement ??
                                ((props.icon || props.iconUrl) && <HeaderIcon icon={props.iconUrl} />)}
                            <HeaderContainer>
                                {props.aboveLabel !== undefined ? (
                                    <HeaderContainerAboveLabel>{props.aboveLabel}</HeaderContainerAboveLabel>
                                ) : (
                                    <></>
                                )}
                                <HeaderContainerLabel>{props.label}</HeaderContainerLabel>
                            </HeaderContainer>
                            {props.showClose ?? true ? (
                                <HeaderClose
                                    aria-label="Close Modal"
                                    onClick={() => props.onRequestClose()}
                                />
                            ) : (
                                <></>
                            )}
                        </Header>
                        <Content>{props.children}</Content>
                    </ModalWindow>
                    {overlay}
                </StyledModal>
            )
    }
    return createPortal(
        <AnimatePresence>
            {props.isOpen && (
                <motion.div
                    style={{ position: 'relative', zIndex: 300 }}
                    key="modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { ease: 'easeInOut', duration: 0.15 } }}
                    exit={{ opacity: 0, transition: { ease: 'easeOut', duration: 0.1 } }}
                >
                    {modal}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
