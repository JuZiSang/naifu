import { useRef, useEffect, CSSProperties, useState, forwardRef, MutableRefObject } from 'react'
import styled from 'styled-components'
import { DeleteButton as StyledDeleteButton, DeleteModalContent } from '../styles/components/infobar'
import CircleBackground from '../assets/images/circles.svg'
import { Icon } from '../styles/ui/icons'
import LargeTrash from '../assets/images/large-trash.svg'
import { SubtleButton } from '../styles/ui/button'
import { FlexColSpacer } from '../styles/ui/layout'
import { LargeClose } from '../styles/components/modal'
import Modal, { ModalType } from './modals/modal'
import { LineBackground } from './util/lineBackground'

export enum WarningButtonStyle {
    Default = 'default',
    Danger = 'danger',
    Light = 'light',
    Dark = 'dark',
}

interface WarningButtonProps {
    onConfirm: () => Promise<boolean> | boolean | Promise<void> | void // return true to close modal
    warningText: string | JSX.Element
    label?: string | JSX.Element
    buttonText: string | JSX.Element
    neverMindText?: string | JSX.Element
    confirmButtonText?: string | JSX.Element
    style?: CSSProperties
    className?: string
    disabled?: boolean
    iconURL?: string
    buttonType?: WarningButtonStyle
    warningColors?: boolean
    bypassWarn?: () => boolean
    ariaLabel?: string
    showModalRef?: MutableRefObject<() => void>
}
export const WarningButton = forwardRef<HTMLButtonElement, WarningButtonProps>(function WarningButton(
    props,
    ref
) {
    const confirmButton = useRef<any>(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (props.showModalRef) props.showModalRef.current = () => setShowModal(true)
    }, [props.showModalRef])

    useEffect(() => {
        if (!confirmButton.current) return
        showModal ? confirmButton.current.focus() : confirmButton.current.blur()
    }, [showModal])

    const [loading, setLoading] = useState(false)
    const confirm = async () => {
        setLoading(true)
        try {
            const close = (await props.onConfirm()) ?? true
            if (close) setShowModal(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <StyledDeleteButton
                aria-label={props.ariaLabel}
                deleteButtonType={props.buttonType}
                onClick={(e) => {
                    e.stopPropagation()
                    if (props.bypassWarn && props.bypassWarn()) {
                        props.onConfirm()
                        return
                    }
                    setShowModal(true)
                }}
                style={props.style}
                className={`${props.className} button`}
                disabled={props.disabled}
                ref={ref}
            >
                {props.buttonText}
            </StyledDeleteButton>
            <Modal
                isOpen={showModal}
                label={props.label}
                shouldCloseOnOverlayClick={true}
                onRequestClose={() => setShowModal(false)}
                type={ModalType.Large}
            >
                <>
                    <CloseButton onClick={() => setShowModal(false)}>
                        <div />
                    </CloseButton>
                    <DeleteModalContent>
                        <LineBackground
                            background={CircleBackground.src}
                            backgroundStyle={{ maskPosition: 'top' }}
                        >
                            <LargeIcon
                                url={props.iconURL ?? LargeTrash.src}
                                warning={!!props.warningColors}
                            ></LargeIcon>
                            <MainText warning={!!props.warningColors}>{props.label}</MainText>
                            <FlexColSpacer min={10} max={10} />
                            <DescriptionText>{props.warningText}</DescriptionText>
                            <FlexColSpacer min={30} max={30} />
                            <StyledDeleteButton
                                disabled={loading}
                                deleteButtonType={
                                    props.warningColors
                                        ? WarningButtonStyle.Danger
                                        : WarningButtonStyle.Default
                                }
                                onClick={confirm}
                                ref={confirmButton}
                            >
                                {props.confirmButtonText ?? props.buttonText}
                            </StyledDeleteButton>
                            <SubtleButton
                                style={{
                                    width: '100%',
                                    paddingTop: '20px',
                                    paddingBottom: '20px',
                                    fontWeight: 400,
                                    opacity: 0.7,
                                    textAlign: 'center',
                                }}
                                onClick={() => setShowModal(false)}
                            >
                                {props.neverMindText ?? 'I changed my mind.'}
                            </SubtleButton>
                        </LineBackground>
                    </DeleteModalContent>
                </>
            </Modal>
        </>
    )
})
export default WarningButton

const LargeIcon = styled(Icon)<{ url: string; warning: boolean }>`
    width: 125px;
    height: 125px;
    mask-size: 40px;
    margin-bottom: 0px;
    mask-position: center !important;
    background: ${(props) => (props.warning ? props.theme.colors.warning : props.theme.colors.textHeadings)};
    cursor: default;
    mask-image: url(${(props) => props.url});
`

const MainText = styled.div<{ warning: boolean }>`
    color: ${(props) => (props.warning ? props.theme.colors.warning : props.theme.colors.textHeadings)};
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.375rem;
    font-weight: 600;
    text-align: center;
`

const DescriptionText = styled.div`
    font-weight: 600;
    line-height: 1.5rem;
    font-size: 0.875rem;
    text-align: center;
`

export const CloseButton = styled(LargeClose)`
    position: absolute;
    right: 30px;
    top: 30px;

    > div {
        width: 2rem;
        height: 2rem;
    }
    flex: 0 0 auto;

    z-index: 1;
`
