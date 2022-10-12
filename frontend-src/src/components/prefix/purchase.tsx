import { useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import styled from 'styled-components'
import { getPurchaseStepsRequest } from '../../data/request/request'
import { BackendURLSubscriptions } from '../../globals/constants'
import { Session } from '../../globals/state'
import { DarkColorButton, LightColorButton, SubtleButton } from '../../styles/ui/button'
import { logError } from '../../util/browser'
import { fetchWithTimeout } from '../../util/general'
import { formatErrorResponse } from '../../util/util'
import { transparentize } from '../../util/colour'
import Spinner from '../spinner'
import { AnlaIcon } from '../../styles/ui/icons'

const SubscriptionDialog = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    height: 100%;
    gap: 10px;
    overflow-y: auto;
    position: relative;
`
const SubscribeContainer = styled.div`
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    position: relative;
`

const SubscribeText = styled.div`
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
`

const SpinnerWrapper = styled.div`
    display: flex;
    justify-content: center;
    flex: 1;
`
const ErrorInfo = styled.div`
    color: ${(props) => props.theme.colors.warning};
`
const SuccessInfo = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
`

const StepsCardList = styled.div`
    display: flex;
    flex-direction: row;
`
const StepsCard = styled.div`
    &:not(:last-child) {
        margin-right: 20px;
    }
    padding: 10px 15px;
    flex: 1 1 auto;
    border: 1px solid ${(props) => transparentize(0.9, props.theme.colors.textMain)};
    width: auto;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    > div:nth-child(2) {
        font-size: 1.5rem;
        color: ${(props) => props.theme.colors.textHeadings};
    }
`

export const SubscriptionTierList = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    overflow-y: auto;
`
const PurchaseCard = styled.div`
    background: ${(props) => props.theme.colors.bg1};
    padding: 20px;
    position: relative;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1 1 30%;
    min-width: 200px;
    margin-bottom: 10px;
    cursor: default;
    user-select: none;
    & div:nth-child(1) {
        font-size: 1.1rem;
        font-weight: 600;
    }
    & div:nth-child(2) {
        color: ${(props) => props.theme.colors.textHeadings};
        font-size: 2.4rem;
        line-height: 3.2rem;
        font-weight: 700;
        white-space: pre;
    }
    & button:last-child {
        width: 100%;
        margin-top: 15px;
        background: ${(props) => props.theme.colors.bg3};
        padding: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        border: 2px solid transparent;
        &:hover,
        &:focus {
            border: 2px solid ${(props) => props.theme.colors.textHeadings};
        }
        &:active {
            background: ${(props) => props.theme.colors.bg0};
        }
    }
`

const Overlay = styled.div`
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    background: ${(props) => transparentize(0.5, props.theme.colors.bg2)};
`
const OverlayContent = styled.div`
    background: ${(props) => props.theme.colors.bg2};
    padding: 20px;
    padding-bottom: 0;
    border-top: 1px solid ${(props) => transparentize(0.9, props.theme.colors.textMain)};
    display: flex;
    flex-direction: row;
`

const PurchaseConfirmWrap = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    padding: 0;
    width: 100%;
    > div {
        flex: 0 1 50%;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        margin-right: 20px;
        p {
            margin: 0;
        }
        &:last-child {
            margin-right: 0;
            margin-left: 20px;
            align-items: flex-start;
        }
        > div:first-child {
            display: flex;
            flex-direction: column;
        }
    }
`
const PurchaseConfirmText = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-bottom: 10px;
    font-family: ${(props) => props.theme.fonts.headings};
    font-weight: 600;
`
const PurchaseConfirmContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    > :not(:last-child) {
        margin-bottom: 10px;
    }
    button {
        padding-left: 30px;
        padding-right: 30px;
        display: flex;
        justify-content: center;
        font-weight: bold;
        &:first-child {
            color: ${(props) => props.theme.colors.textHeadings};
            border: 2px solid transparent;
            &:hover {
                border: 2px solid ${(props) => props.theme.colors.textHeadings};
                background: ${(props) => props.theme.colors.bg3};
            }
        }
        &:last-child {
            background: transparent;
            border: 1px solid ${(props) => transparentize(0.9, props.theme.colors.textMain)};
            &:hover {
                background: ${(props) => props.theme.colors.bg3};
            }
        }
    }
`
const PurchaseConfirmNumbers = styled.div`
    border: 1px solid ${(props) => transparentize(0.9, props.theme.colors.textMain)};
    padding: 10px;
    strong {
        &:nth-of-type(2) {
            color: ${(props) => props.theme.colors.textHeadings};
            font-size: 1.1rem;
        }
    }
`

function roundDollars(num: number, decimalPlaces = 0): number {
    num = Math.round(Number.parseFloat(num + 'e' + decimalPlaces))
    return Number(num + 'e' + -decimalPlaces)
}

function stepsToDollars(steps: number): number {
    return roundDollars(2 + steps / 1111 - 0.01, 2)
}

export default function Purchase(): JSX.Element {
    const [session, setSession] = useRecoilState(Session)
    const [remainingSteps, setRemainingSteps] = useState({
        fixedTrainingStepsLeft: 0,
        purchasedTrainingSteps: 0,
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(true)
    const [confirmSteps, setConfirmSteps] = useState(0)
    const [canPurchase, setCanPurchase] = useState(
        session.subscription.paymentProcessorData?.s === 'active' ||
            session.subscription.paymentProcessorData?.s === 'high_risk'
    )

    const fetchSteps = async () => {
        setLoading(true)
        await fetchWithTimeout(BackendURLSubscriptions, {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + session.auth_token,
            },
            method: 'GET',
        })
            .then(async (response) => {
                if (!response.ok) {
                    logError(response)
                    throw await formatErrorResponse(response)
                }
                return response.json()
            })
            .then((json) => {
                setSession({
                    ...session,
                    subscription: json,
                })
                setCanPurchase(
                    json.paymentProcessorData?.s === 'active' || json.paymentProcessorData?.s === 'high_risk'
                )
                setRemainingSteps({
                    loaded: true,
                    ...json.trainingStepsLeft,
                })
                setLoading(false)
            })
            .catch((error) => {
                logError(error)
                setError(`${error}`)
                setLoading(false)
            })
    }
    useEffect(() => {
        fetchSteps()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const purchaseSteps = async (steps: number) => {
        setError('')
        setSuccess('')
        setLoading(true)
        try {
            await getPurchaseStepsRequest(session.auth_token, steps).request()
        } catch (error: any) {
            logError(error)
            setError(error.text ?? `${error}`)
            await fetchSteps()
            return
        }
        await fetchSteps()
        setSuccess(`Purchased ${steps} Anlas!`)
        setConfirmSteps(0)
    }

    return (
        <SubscriptionDialog>
            <>
                <SubscribeText>
                    <p>
                        Here you can purchase additional Anlas for training your AI Modules and for Image
                        Generation.
                        <br />
                        Paid Anlas will be permanent until used.
                    </p>
                    <StepsCardList>
                        <StepsCard>
                            <div>Your Free Anlas:</div>
                            <div>{remainingSteps.fixedTrainingStepsLeft}</div>
                        </StepsCard>
                        <StepsCard>
                            <div>Your Paid Anlas:</div>
                            <div>{remainingSteps.purchasedTrainingSteps}</div>
                        </StepsCard>
                    </StepsCardList>
                </SubscribeText>
                <SubscribeContainer>
                    <SubscriptionTierList>
                        <PurchaseCard>
                            <div>
                                <span>2,000</span>
                                <span>
                                    {' '}
                                    <AnlaIcon style={{ display: 'inline-block', height: '1rem' }} /> Anlas
                                </span>
                            </div>
                            <div>${stepsToDollars(2000).toFixed(2)} USD</div>
                            <div>~{Math.floor(2000 / stepsToDollars(2000))} Anlas/USD</div>
                            <SubtleButton
                                disabled={!canPurchase}
                                onClick={() => {
                                    setSuccess('')
                                    setError('')
                                    setConfirmSteps(2000)
                                }}
                            >
                                Purchase
                            </SubtleButton>
                        </PurchaseCard>
                        <PurchaseCard>
                            <div>
                                <span>5,000</span>
                                <span>
                                    {' '}
                                    <AnlaIcon style={{ display: 'inline-block', height: '1rem' }} /> Anlas
                                </span>
                            </div>
                            <div>${stepsToDollars(5000).toFixed(2)} USD</div>
                            <div>~{Math.floor(5000 / stepsToDollars(5000))} Anlas/USD</div>
                            <SubtleButton
                                disabled={!canPurchase}
                                onClick={() => {
                                    setSuccess('')
                                    setError('')
                                    setConfirmSteps(5000)
                                }}
                            >
                                Purchase
                            </SubtleButton>
                        </PurchaseCard>
                        <PurchaseCard>
                            <div>
                                <span>10,000</span>
                                <span>
                                    {' '}
                                    <AnlaIcon style={{ display: 'inline-block', height: '1rem' }} /> Anlas
                                </span>
                            </div>
                            <div>${stepsToDollars(10000).toFixed(2)} USD</div>
                            <div>~{Math.floor(10000 / stepsToDollars(10000))} Anlas/USD</div>
                            <SubtleButton
                                disabled={!canPurchase}
                                onClick={() => {
                                    setSuccess('')
                                    setError('')
                                    setConfirmSteps(10000)
                                }}
                            >
                                Purchase
                            </SubtleButton>
                        </PurchaseCard>
                    </SubscriptionTierList>
                    {confirmSteps ? (
                        <Overlay>
                            <OverlayContent>
                                <PurchaseConfirmWrap>
                                    <div>
                                        <div>
                                            <PurchaseConfirmText>
                                                <p>
                                                    Do you really want to
                                                    <br />
                                                    purchase the following?
                                                </p>
                                            </PurchaseConfirmText>
                                            <PurchaseConfirmNumbers>
                                                <strong>{confirmSteps} </strong>
                                                <span>Anlas for</span>
                                                <strong> ${stepsToDollars(confirmSteps).toFixed(2)}</strong>?
                                            </PurchaseConfirmNumbers>
                                        </div>
                                    </div>
                                    <div>
                                        <PurchaseConfirmContent>
                                            <LightColorButton onClick={() => purchaseSteps(confirmSteps)}>
                                                Confirm Purchase
                                            </LightColorButton>
                                            <DarkColorButton onClick={() => setConfirmSteps(0)}>
                                                Cancel
                                            </DarkColorButton>
                                        </PurchaseConfirmContent>
                                    </div>
                                </PurchaseConfirmWrap>
                            </OverlayContent>
                        </Overlay>
                    ) : null}
                    {loading ? (
                        <Overlay>
                            <OverlayContent>
                                <SpinnerWrapper>
                                    <Spinner visible={true} style={{ width: '25px', height: '25px' }} />
                                </SpinnerWrapper>
                            </OverlayContent>
                        </Overlay>
                    ) : null}
                </SubscribeContainer>
            </>
            {error ? <ErrorInfo>{error}</ErrorInfo> : null}
            {success ? <SuccessInfo>{success}</SuccessInfo> : null}
            {!canPurchase ? (
                <ErrorInfo>
                    You need a renewing NovelAI Subscription to purchase Anlas. You cannot purchase Anlas if
                    you have unsubscribed or subscribed by gift key.
                </ErrorInfo>
            ) : null}
        </SubscriptionDialog>
    )
}
