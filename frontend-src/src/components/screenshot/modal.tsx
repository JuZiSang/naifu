/* eslint-disable max-len */
import { lazy, Suspense } from 'react'
import { useRecoilState } from 'recoil'
import styled from 'styled-components'
import { ScreenshotModalState } from '../../globals/state'
import Modal, { ModalType } from '../modals/modal'
import { LoadingSpinner } from '../loading'

const ScreenshotModalContent = lazy(() => import('./content'))

const DummyModalContent = styled.div`
    background-color: ${(props) => props.theme.colors.bg2};
    border: 1px solid ${(props) => props.theme.colors.bg3};
    box-sizing: border-box;
    border-radius: 3px;
    max-width: 100vw;
    max-height: var(--app-height, 100%);
    width: 1242px;
    height: 762px;
    display: flex;
    align-items: center;
    justify-content: center;
    @media (max-width: 800px) {
        height: var(--app-height, 100%);
    }
`

export default function ScreenshotModal(): JSX.Element {
    const [screenshotState, setScreenshotState] = useRecoilState(ScreenshotModalState)
    return (
        <div>
            <Modal
                isOpen={screenshotState.open}
                onRequestClose={() => setScreenshotState({ ...screenshotState, open: false })}
                type={ModalType.Large}
                shouldCloseOnOverlayClick={true}
                style={{
                    maxWidth: '100vw',
                    maxHeight: 'var(--app-height, 100%)',
                }}
            >
                <Suspense
                    fallback={
                        <DummyModalContent>
                            <LoadingSpinner visible={true} />
                        </DummyModalContent>
                    }
                >
                    <ScreenshotModalContent />
                </Suspense>
            </Modal>
        </div>
    )
}
