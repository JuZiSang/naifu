import { useEffect, useRef, useState } from 'react'
import { MdOnlinePrediction } from 'react-icons/md'
import { useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import { AppUpdateAvailable, UpdateNotesVisible } from '../globals/state'
import useVersionCheck from '../hooks/useVersionCheck'
import { InvertedButton, SubtleButton } from '../styles/ui/button'
import { SignalIcon } from '../styles/ui/icons'
import { FlexCol, FlexColSpacer } from '../styles/ui/layout'
import CircleBackground from '../assets/images/circles.svg'
import { isSaving } from '../data/storage/queue'
import Modal, { ModalType } from './modals/modal'
import { CloseButton } from './modals/common'
import Spinner from './spinner'

export const UpdateNotifierOverlay = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: 440px;
    width: 100vw;
    background-color: ${(props) => props.theme.colors.bg1};
    > * {
        position: relative;
    }
    text-align: center;
`

export const UpdateNotifierBackground = styled.div`
    position: absolute !important;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    mask-repeat: no-repeat;
    background-color: ${(props) => props.theme.colors.bg3};
    mask-image: url(${CircleBackground.src});
`
export const UpdateNotifierText = styled.div`
    margin: 0 76px 0 76px;
    font-size: 0.875rem;
    line-height: 1.5rem;
    text-align: center;
    @media (max-width: 400px) {
        margin: 0 36px 0 36px;
    }
`

const BigIcon = styled(SignalIcon)`
    width: 100px;
    height: 100px;
    margin-bottom: 1rem;
    background: ${(props) => props.theme.colors.textHeadings};
    cursor: default;
    margin-top: 34px;
`

export default function UpdateNotifier(): JSX.Element {
    const setAppUpdateAvailable = useSetRecoilState(AppUpdateAvailable)
    const setUpdateNotesVisible = useSetRecoilState(UpdateNotesVisible)
    const [modalOpen, setModalOpen] = useState(false)
    const timeoutRef = useRef(0)
    const update = useVersionCheck(60000)
    useEffect(() => {
        if (update.available && !timeoutRef.current) {
            // show notifier bubble after 1-5 minutes
            setTimeout(() => setAppUpdateAvailable(true), 60000 + 300000 * Math.random())
            // open nag popup after 15 (+0-20) minutes
            timeoutRef.current = setTimeout(
                () => setModalOpen(true),
                900000 + 1200000 * Math.random()
            ) as unknown as number
        }
    }, [setAppUpdateAvailable, update])

    const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const reload = async () => {
        setButtonsDisabled(true)
        try {
            // preload html to ensure cache busting
            await fetch('/stories', {
                cache: 'no-cache',
            })
            await Promise.race([
                new Promise((_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                "Couldn't save stories. Please check your stories and reload manually, or try again."
                            ),
                        10000
                    )
                ),
                new Promise((resolve) => {
                    const check = () => {
                        if (!isSaving()) resolve(null)
                        else setTimeout(check, 100)
                    }
                    setTimeout(check, 100)
                }),
            ])
            window.location.reload()
        } catch (error: any) {
            toast(`${error?.message ?? error ?? 'Failed to reload page.'}`)
            setButtonsDisabled(false)
        }
    }

    const seeUpdates = () => {
        setModalOpen(false)
        setUpdateNotesVisible(true)
    }

    return (
        <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            showClose={true}
            iconElement={<MdOnlinePrediction />}
            label={'Updates available'}
            shouldCloseOnOverlayClick={true}
            style={{ width: 'unset', height: 'unset' }}
            type={ModalType.Large}
        >
            <>
                <CloseButton onClick={() => setModalOpen(false)}>
                    <div />
                </CloseButton>
                <UpdateNotifierOverlay>
                    <UpdateNotifierBackground />
                    <BigIcon />
                    <h2>There are updates available!</h2>
                    <FlexColSpacer min={8} max={8} />
                    <UpdateNotifierText>
                        You’re not currently experiencing the best NovelAI has to offer! Please refresh to
                        make sure you have the latest updates.
                    </UpdateNotifierText>
                    <FlexColSpacer min={40} max={40} />
                    <FlexCol style={{ gap: '12px', width: '100%', padding: '0 30px 30px 30px' }}>
                        <InvertedButton
                            disabled={buttonsDisabled}
                            onClick={reload}
                            style={{ justifyContent: 'center', flex: 1, width: '100%', fontWeight: 700 }}
                        >
                            {buttonsDisabled && <Spinner visible style={{ width: 12, height: 12 }} />} Reload
                            Page {buttonsDisabled && <div style={{ width: 24 }} />}
                        </InvertedButton>
                        <SubtleButton
                            disabled={buttonsDisabled}
                            style={{
                                justifyContent: 'center',
                                flex: 1,
                                width: '100%',
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                fontWeight: 400,
                                opacity: 0.7,
                                textAlign: 'center',
                            }}
                            onClick={seeUpdates}
                        >
                            See Updates
                        </SubtleButton>
                    </FlexCol>
                </UpdateNotifierOverlay>
            </>
        </Modal>
    )
}
