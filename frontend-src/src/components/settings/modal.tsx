import { lazy, Suspense, useCallback } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { getStorage } from '../../data/storage/storage'
import { Session, SettingsModalOpen } from '../../globals/state'
import { LoadingSpinner } from '../loading'
import Modal, { ModalType } from '../modals/modal'

const SettingsContent = lazy(() => import('./content'))

const StyledSettingsModal = styled.div`
    display: flex;
    background-color: ${(props) => props.theme.colors.bg2};
    font-weight: 600;
    height: 100%;
    width: 100%;
    color: ${(props) => props.theme.colors.textMain};
`
const StyledSettingsModalPlaceholder = styled(StyledSettingsModal)`
    min-width: 320px;
    height: 100%;
    width: 100%;
    @media (max-width: 800px) {
        width: max(1160px, 65%);
        height: max(650px, 75%);
    }
    display: flex;
    align-items: center;
    justify-content: space-around;
`

export default function SettingsModal(): JSX.Element {
    const [settingsModalOpen, setSettingsModalOpen] = useRecoilState(SettingsModalOpen)
    const session = useRecoilValue(Session)

    const onSettingsClose = useCallback(() => {
        setSettingsModalOpen(-1)
        getStorage(session).saveSettings(session.settings)
    }, [session, setSettingsModalOpen])

    return (
        <Modal
            isOpen={settingsModalOpen >= 0}
            onRequestClose={() => onSettingsClose()}
            shouldCloseOnOverlayClick={true}
            type={ModalType.Large}
            maxSize={true}
        >
            <Suspense
                fallback={
                    <StyledSettingsModalPlaceholder>
                        <LoadingSpinner visible={true} />
                    </StyledSettingsModalPlaceholder>
                }
            >
                <StyledSettingsModal>
                    <SettingsContent onClose={onSettingsClose} />
                </StyledSettingsModal>
            </Suspense>
        </Modal>
    )
}
