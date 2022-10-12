import Link from 'next/link'
import { useEffect } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import { User } from '../data/user/user'
import {
    IPLimitModal,
    Session,
    SettingsModalOpen,
    SiteTheme,
    SubscriptionDialogOpen,
    TrialUsageRemaining,
    TrialUsedModal,
} from '../globals/state'
import { Dark } from '../styles/themes/dark'
import { InvertedButton, SubtleButton } from '../styles/ui/button'
import { InkIcon } from '../styles/ui/icons'
import { FlexCol, FlexColSpacer } from '../styles/ui/layout'
import { getLocalStorage, setLocalStorage } from '../util/storage'
import Modal, { ModalType } from './modals/modal'
import { CloseButton } from './modals/common'
import { UpdateNotifierBackground, UpdateNotifierOverlay, UpdateNotifierText } from './updatenotifier'
import { SettingsPages } from './settings/constants'

const UsageContainer = styled.button`
    color: ${(props) => props.theme.colors.bg0};
    background-color: ${(props) => props.theme.colors.textHeadings};
    width: 100%;
    font-size: 1rem;
    font-weight: 600;
    padding: 17px 20px 15px 20px;
    > div {
        display: flex;
        justify-content: space-between;
    }
    &:focus {
        opacity: 0.9;
    }
`

const UsageBarOuter = styled.div`
    height: 17px;
    background-color: ${(props) => props.theme.colors.bg0};
    margin-top: 8px;
    padding: 5px;
`

const UsageBarInner = styled.div<{ width: number }>`
    background-color: ${(props) => props.theme.colors.textHeadings};
    height: 7px;
    width: ${(props) => props.width}%;
`

const UsageTitle = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    font-weight: bold;
`

const Bold = styled.span`
    font-weight: bold;
`

const BigIcon = styled(InkIcon)`
    width: 50px;
    height: 50px;
    margin-top: 60px;
    margin-bottom: 40px;
    background: ${(props) => props.theme.colors.textHeadings};
    cursor: default;
`

export function setLocalTrialState(trialUsageRemaining: number): void {
    setLocalStorage(
        'localTrialState2',
        Buffer.from(trialUsageRemaining.toString(), 'utf8').toString('base64')
    )
}

export function getLocalTrialState(): number {
    const number = Number.parseInt(
        Buffer.from(getLocalStorage('localTrialState2') ?? '0', 'base64').toString('utf8')
    )
    return Number.isNaN(number) ? -1 : number
}

export function TrialUsageDisplay(): JSX.Element {
    const [trialUsageRemaining, setTrialUsageRemaining] = useRecoilState(TrialUsageRemaining)
    const setModalOpen = useSetRecoilState(TrialUsedModal)
    const setSubscriptionModalOpen = useSetRecoilState(SubscriptionDialogOpen)
    const setSettingsModalOpen = useSetRecoilState(SettingsModalOpen)
    const session = useRecoilValue(Session)

    useEffect(() => {
        let remaining = 0
        remaining = session.noAccount ? getLocalTrialState() : session.information.trialActionsLeft
        if (remaining === 0) {
            setModalOpen(true)
        }
        setTrialUsageRemaining(remaining)
    }, [session.information.trialActionsLeft, session.noAccount, setModalOpen, setTrialUsageRemaining])

    useEffect(() => {
        if (session.noAccount) {
            setLocalTrialState(trialUsageRemaining)
        }
    }, [session.noAccount, trialUsageRemaining])

    return (
        <>
            {session.noAccount ? <CreateAccountPrompt /> : <SubscribePrompt />}
            <IPLimitPrompt />
            {session.information.trialActivated || session.noAccount ? (
                <UsageContainer
                    style={{ cursor: session.noAccount ? 'default' : 'pointer' }}
                    tabIndex={session.noAccount ? -1 : 0}
                    onClick={() =>
                        session.noAccount || setSubscriptionModalOpen({ open: true, blocked: false })
                    }
                >
                    <div>
                        <UsageTitle>Free Trial</UsageTitle>
                        <div>
                            You have <Bold>{Math.max(trialUsageRemaining, 0)}/50 actions left</Bold>
                        </div>
                    </div>
                    <UsageBarOuter>
                        <UsageBarInner width={(Math.max(trialUsageRemaining, 0) / 50) * 100}></UsageBarInner>
                    </UsageBarOuter>
                </UsageContainer>
            ) : !session.information.emailVerified ? (
                <UsageContainer
                    style={{ cursor: 'pointer' }}
                    tabIndex={0}
                    onClick={() => setSettingsModalOpen(SettingsPages.Account)}
                >
                    To activate the free trial and gain 50 free actions, please verify your email in account
                    settings.
                </UsageContainer>
            ) : null}
        </>
    )
}

export function CreateAccountPrompt(): JSX.Element {
    const setSession = useSetRecoilState(Session)
    const setTheme = useSetRecoilState(SiteTheme)
    const [modalOpen, setModalOpen] = useRecoilState(TrialUsedModal)

    return (
        <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            showClose={true}
            label={'The inkwell’s run dry.'}
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
                    <h2>The inkwell’s run dry.</h2>
                    <FlexColSpacer min={8} max={8} />
                    <UpdateNotifierText>
                        Create an account with us and we’ll give you another 50 actions for free to play
                        around with.
                    </UpdateNotifierText>
                    <FlexColSpacer min={40} max={40} />
                    <FlexCol style={{ gap: '12px', width: '100%', padding: '0 30px 30px 30px' }}>
                        <Link href="/register" passHref>
                            <InvertedButton
                                onClick={() => {
                                    setSession(new User('', ''))
                                    setTheme(Dark)
                                }}
                                style={{ justifyContent: 'center', flex: 1, width: '100%', fontWeight: 700 }}
                            >
                                Sign Up
                            </InvertedButton>
                        </Link>
                        <SubtleButton
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
                            onClick={() => setModalOpen(false)}
                        >
                            No thanks.
                        </SubtleButton>
                    </FlexCol>
                </UpdateNotifierOverlay>
            </>
        </Modal>
    )
}

export function SubscribePrompt(): JSX.Element {
    const [modalOpen, setModalOpen] = useRecoilState(TrialUsedModal)
    const setSubscriptionVisible = useSetRecoilState(SubscriptionDialogOpen)

    return (
        <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            showClose={true}
            label={'The inkwell’s run dry once more.'}
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
                    <h2>The inkwell’s run dry once more.</h2>
                    <FlexColSpacer min={8} max={8} />
                    <UpdateNotifierText>
                        Your actions have run out again. No worries though! If you subscribe you can continue
                        writing to your heart’s content.
                    </UpdateNotifierText>
                    <FlexColSpacer min={40} max={40} />
                    <FlexCol style={{ gap: '12px', width: '100%', padding: '0 30px 30px 30px' }}>
                        <InvertedButton
                            onClick={() => {
                                setModalOpen(false)
                                setSubscriptionVisible({ open: true, blocked: false })
                            }}
                            style={{ justifyContent: 'center', flex: 1, width: '100%', fontWeight: 700 }}
                        >
                            Take me to the Pricing
                        </InvertedButton>
                        <SubtleButton
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
                            onClick={() => setModalOpen(false)}
                        >
                            No thanks.
                        </SubtleButton>
                    </FlexCol>
                </UpdateNotifierOverlay>
            </>
        </Modal>
    )
}

export function IPLimitPrompt(): JSX.Element {
    const setSession = useSetRecoilState(Session)
    const setTheme = useSetRecoilState(SiteTheme)
    const [modalOpen, setModalOpen] = useRecoilState(IPLimitModal)

    return (
        <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            showClose={true}
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
                    <h2>IP Limit Reached</h2>
                    <FlexColSpacer min={8} max={8} />
                    <UpdateNotifierText>
                        The limit of anonymous generations for your IP address has been reached. Create an
                        account to continue with another 50 free actions.
                    </UpdateNotifierText>
                    <FlexColSpacer min={40} max={40} />
                    <FlexCol style={{ gap: '12px', width: '100%', padding: '0 30px 30px 30px' }}>
                        <Link href="/register" passHref>
                            <InvertedButton
                                onClick={() => {
                                    setSession(new User('', ''))
                                    setTheme(Dark)
                                }}
                                style={{ justifyContent: 'center', flex: 1, width: '100%', fontWeight: 700 }}
                            >
                                Sign Up
                            </InvertedButton>
                        </Link>
                        <SubtleButton
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
                            onClick={() => setModalOpen(false)}
                        >
                            No thanks.
                        </SubtleButton>
                    </FlexCol>
                </UpdateNotifierOverlay>
            </>
        </Modal>
    )
}
