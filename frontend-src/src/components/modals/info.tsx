import TutorialBackground from '../../assets/images/tutorialbg.svg'
import { LineBackground } from '../util/lineBackground'
import Modal, { ModalType } from './modal'

export function InfoModal(props: {
    open: boolean
    close: () => void
    children: JSX.Element | JSX.Element[] | string
}): JSX.Element {
    return (
        <Modal
            type={ModalType.Large}
            isOpen={props.open}
            shouldCloseOnOverlayClick
            onRequestClose={props.close}
        >
            <LineBackground background={TutorialBackground.src}>
                <div
                    style={{
                        padding: 40,
                        maxWidth: 500,
                        width: '100vw',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        overflow: 'auto',
                    }}
                >
                    {props.children}
                </div>
            </LineBackground>
        </Modal>
    )
}
