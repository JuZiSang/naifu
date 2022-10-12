import { CSSProperties, Fragment, useEffect, useState } from 'react'
import styled from 'styled-components'
import { useRecoilState, useRecoilValue } from 'recoil'
import { MdHelpOutline } from 'react-icons/md'
import * as dayjs from 'dayjs'
import { Button, ButtonLink } from '../styles/ui/button'
import Paper from '../assets/images/paper.svg'
import Tablet from '../assets/images/tablet.svg'
import Scroll from '../assets/images/scroll.svg'
import Opus from '../assets/images/opus.svg'
import { AnlaIcon, ArrowDownIcon, ArrowUpIcon, ExclamationPointIcon, Icon } from '../styles/ui/icons'
import { Session, SiteTheme } from '../globals/state'
import {
    getSubscriptionBindRequest,
    getSubscriptionChangeRequest,
    getSubscriptionRequest,
    ISubscriptionResponse,
} from '../data/request/request'
import {
    mobileSize,
    PaddleOpusID,
    PaddleScrollID,
    PaddleTabletID,
    PurchasesDisabled,
} from '../globals/constants'
import { mix } from '../util/colour'
import { UserSubscription } from '../data/user/user'
import { logError } from '../util/browser'
import { isMobileDevice, isTouchScreenDevice } from '../util/compat'
import { Dark } from '../styles/themes/dark'
import { tierNumberToName, tierNumberToNameCaps, subscriptionIdToName } from '../util/subscription'
import { useWindowSize } from '../hooks/useWindowSize'
import { FlexCol, FlexColSpacer, FlexRow } from '../styles/ui/layout'
import { InfoText, InfoText2, WarningText } from '../styles/components/import/importlorebook'
import { getStorage } from '../data/storage/storage'
import { getUserSetting } from '../data/user/settings'
import Spinner from './spinner'
import Modal, { ModalType } from './modals/modal'

export const SubIcon = styled(Icon)<{ icon: string; color: string }>`
    height: 14px;
    mask-image: url(${(props) => props.icon});
    background-color: ${(props) => props.color};
    cursor: default;
    margin-top: 10px;
`
export const TierBenefitDesc = styled.div<{ color?: string }>`
    margin-bottom: 20px;
    position: relative;
    line-height: 20px;
    color: ${(props) => props.color ?? props.theme.colors.textMain};
    opacity: 0.8;
    font-size: 0.875rem;
`
export const TierBenefitName = styled.div<{ color?: string }>`
    font-weight: 600;
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.color ?? props.theme.colors.textMain};
    line-height: 1.25rem;
    margin-bottom: 5px;
`
export const TierBlock = styled.div<{ color?: string }>`
    outline: 1px solid ${(props) => props.color ?? props.theme.colors.bg3};
    background: ${(props) => props.theme.colors.bg1};
    flex: 1 1 0;
    width: 100%;
    position: relative;
    max-width: 315px;
    margin-bottom: 44px;
    @media (max-width: ${mobileSize}) {
        margin-bottom: 54px;
    }
    padding-bottom: 50px;
`
export const TierName = styled.div<{ color: string }>`
    color: ${(props) => props.color};
    font-family: ${(props) => props.theme.fonts.headings};
    margin-top: 5px;
    font-size: 1.125rem;
    font-weight: 600;
`
export const TierBenefitSection = styled.div<{ border?: boolean }>`
    border-top: ${(props) => (props.border ? '1px' : '0')} solid #2b2d3f;
    padding: 20px 25px 10px;
`
export const TierBenefitSectionTitle = styled.div<{ color: string }>`
    color: ${(props) => props.color};
    font-weight: 700;
    margin-bottom: 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
`
export const TierPrice = styled.div`
    line-height: 3.25rem;
    > span:first-child {
        font-size: 2.75rem;
        font-weight: 700;
    }

    > span:last-child {
        font-size: 1.375rem;
        font-weight: 400;
    }
`
export const TierValue = styled.div<{ color: string }>`
    position: absolute;
    width: 100%;
    bottom: -24px;
    left: 0;
    height: 40px;
    top: -41px;
    background-color: ${(props) => props.color};
    padding: 10px 30px;
    line-height: 20px;
    font-weight: 700;
    color: ${(props) => props.theme.colors.bg1};
    outline: 1px solid ${(props) => props.color};
`
export const TierWow = styled.span<{ color: string }>`
    color: ${(props) => props.color};
    transform: rotate(14.44deg);
    position: absolute;
    top: -1rem;
    left: 5.8rem;
`
export const TierFinePrint = styled.div`
    color: ${(props) => props.color};
    font-weight: 600;
    font-size: 1rem;
    margin: 20px 0;
    opacity: 0.7;
`

const SubscriptionDialog = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    height: 100%;
    gap: 10px;
    overflow-y: auto;
`
const SubscribeContainer = styled.div`
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
`
const SubscribeHeader = styled.h3`
    margin-top: 0;
`
const SubscribeText = styled.div`
    margin-bottom: 2rem;
`
const SubscribeButton = styled(Button)`
    border: 2px solid ${(props) => props.theme.colors.textHeadings} !important;
    color: ${(props) => props.theme.colors.textHeadings};
    font-weight: bold;
    padding: 0.6rem;
    justify-content: center;
`
const DontButton = styled(Button)`
    border: 2px solid transparent !important;
    color: ${(props) => props.theme.colors.textMain};
    padding: 0.6rem;
    justify-content: center;
`

const ChangeSubscriptionButton = styled(Button)`
    border: 2px solid transparent !important;
    color: ${(props) => props.theme.colors.textMain};
    padding: 0.6rem;
    justify-content: center;
`
const ChangeSubscriptionLink = styled(ButtonLink)`
    border: 2px solid transparent !important;
    color: ${(props) => props.theme.colors.textMain};
    padding: 0.6rem;
    justify-content: center;
`

export const SubscriptionTierList = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    overflow-y: auto;
`
export const SubscriptionTier = styled.button<{ color: string; disabled: boolean }>`
    display: flex;
    user-select: false;
    flex-direction: column;
    background: none;
    align-items: center;
    cursor: pointer;
    flex: 1 1 30%;
    min-width: 200px;
    border: 0 !important;
    margin: 0;
    padding: 1px;
    padding-top: 41px;
    & div {
        color: ${(props) => props.theme.textMain};
    }

    ${(props) => (props.disabled ? 'opacity: 0.8;' : '')}

    ${Icon} {
        background-color: ${(props) => props.color};
    }
    > * {
        margin: 0;
        > * {
            text-align: left;
        }
        &:hover {
            background-color: ${(props) => mix(0.9, props.theme.colors.bg0, props.theme.colors.textMain)};
        }
    }
`

const SubscribeGiftKeyInput = styled.input`
    margin-bottom: 1rem;
`

export const SubscriptionInfo = styled.div`
    margin-top: 1rem;
    font-size: 0.875rem;
    opacity: 0.8;
`

const SubscriptionAboveInfo = styled.div`
    margin-bottom: 1rem;
    font-size: 1.1rem;
`

const LoadingSpinner = styled(Spinner)`
    width: 30px;
    height: 30px;
    align-self: center;
`

const ErrorInfo = styled.div`
    color: ${(props) => props.theme.colors.warning};
`

export function PaperTierContent(props: {
    style?: CSSProperties
    children: JSX.Element | JSX.Element[]
}): JSX.Element {
    const { width } = useWindowSize()
    const [collapsed, setCollapsed] = useState(false)
    useEffect(() => {
        if (width) {
            if (width > 1000 && collapsed) setCollapsed(false)
            else if (width <= 1000 && !collapsed) setCollapsed(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width])
    return (
        <TierBlock style={props.style}>
            <TierBenefitSection>
                <SubIcon icon={Paper.src} color={'#D9FFE1'} />
                <TierName color={'#D9FFE1'}>Paper</TierName>
                <TierPrice>
                    <span>Free Trial</span>
                    <span></span>
                </TierPrice>
            </TierBenefitSection>

            <TierBenefitSection border>
                <TierBenefitSectionTitle color={'#D9FFE1'}>The AI</TierBenefitSectionTitle>
                <TierBenefitName>Access to Euterpe, our Second Best AI Storyteller</TierBenefitName>
                <TierBenefitDesc>Including Calliope and Sigurd</TierBenefitDesc>
                <TierBenefitName>100 Free Text Generations*</TierBenefitName>
                <TierBenefitDesc></TierBenefitDesc>
                <TierBenefitName>2048 Tokens of Memory</TierBenefitName>
                <TierBenefitDesc>That’s about ~8192 characters that the AI can remember.</TierBenefitDesc>
            </TierBenefitSection>

            <TierBenefitSection border>
                <TierBenefitSectionTitle
                    color={'#D9FFE1'}
                    style={{ cursor: width <= 1000 ? 'pointer' : 'default' }}
                    onClick={(e) => {
                        if (width <= 1000) {
                            setCollapsed((c) => !c)
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                >
                    Extra Goodies{' '}
                    {width <= 1000 ? (
                        collapsed ? (
                            <ArrowDownIcon style={{ opacity: 0.8, width: '12px' }} />
                        ) : (
                            <ArrowUpIcon style={{ opacity: 0.3, width: '12px' }} />
                        )
                    ) : null}
                </TierBenefitSectionTitle>
                {!collapsed && (
                    <Fragment>
                        <TierBenefitName>100 Free AI TTS Generations</TierBenefitName>
                        <TierBenefitDesc>
                            Bring your stories to life with the soothing sound of our generated TTS voices.
                        </TierBenefitDesc>
                        <FlexColSpacer min={65} max={65} />
                    </Fragment>
                )}
            </TierBenefitSection>

            {props.children}
        </TierBlock>
    )
}
export function TabletTierContent(props: {
    style?: CSSProperties
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    const { width } = useWindowSize()
    const [collapsed, setCollapsed] = useState(false)
    useEffect(() => {
        if (width) {
            if (width > 1000 && collapsed) setCollapsed(false)
            else if (width <= 1000 && !collapsed) setCollapsed(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width])

    return (
        <TierBlock style={props.style}>
            <TierBenefitSection>
                <SubIcon icon={Tablet.src} color={Dark.colors.textHeadings} />
                <TierName color={Dark.colors.textHeadings}>Tablet</TierName>
                <TierPrice>
                    <span>$10</span>
                    <span>/month (USD)</span>
                </TierPrice>
            </TierBenefitSection>

            <TierBenefitSection border>
                <TierBenefitSectionTitle color={Dark.colors.textHeadings}>The AI</TierBenefitSectionTitle>
                <TierBenefitName>Access to Euterpe, our Second Best AI Storyteller</TierBenefitName>
                <TierBenefitDesc>Including Calliope and Sigurd</TierBenefitDesc>
                <TierBenefitName>Unlimited Text Generations</TierBenefitName>
                <TierBenefitDesc></TierBenefitDesc>
                <TierBenefitName>1024 Tokens of Memory</TierBenefitName>
                <TierBenefitDesc>That’s about ~4096 characters that the AI can remember.</TierBenefitDesc>
            </TierBenefitSection>

            <TierBenefitSection border>
                <TierBenefitSectionTitle
                    color={Dark.colors.textHeadings}
                    style={{ cursor: width <= 1000 ? 'pointer' : 'default' }}
                    onClick={(e) => {
                        if (width <= 1000) {
                            setCollapsed((c) => !c)
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                >
                    Extra Goodies{' '}
                    {width <= 1000 ? (
                        collapsed ? (
                            <ArrowDownIcon style={{ opacity: 0.8, width: '12px' }} />
                        ) : (
                            <ArrowUpIcon style={{ opacity: 0.3, width: '12px' }} />
                        )
                    ) : null}
                </TierBenefitSectionTitle>
                {!collapsed && (
                    <Fragment>
                        <TierBenefitName>
                            1000 <AnlaIcon style={{ display: 'inline-block', height: '1rem' }} /> Anlas/month
                        </TierBenefitName>
                        <TierBenefitDesc>
                            Currency for Custom AI Module training and Image Generation
                        </TierBenefitDesc>
                        <TierBenefitName>Advanced AI TTS</TierBenefitName>
                        <TierBenefitDesc>
                            Bring your stories to life with the soothing sound of our generated TTS voices.
                        </TierBenefitDesc>
                        <TierBenefitName>Image Generation</TierBenefitName>
                        <TierBenefitDesc>Access to our advanced image generation models.</TierBenefitDesc>
                        <FlexColSpacer min={45} max={45} />
                    </Fragment>
                )}
            </TierBenefitSection>

            {props.children}
        </TierBlock>
    )
}
export function ScrollTierContent(props: {
    style?: CSSProperties
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    const { width } = useWindowSize()
    const [collapsed, setCollapsed] = useState(false)
    useEffect(() => {
        if (width) {
            if (width > 1000 && collapsed) setCollapsed(false)
            else if (width <= 1000 && !collapsed) setCollapsed(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width])
    return (
        <TierBlock style={props.style} color={Dark.colors.textHeadingsOptions[1]}>
            <TierBenefitSection>
                <TierValue color={Dark.colors.textHeadingsOptions[1]}>Best Value</TierValue>
                <SubIcon icon={Scroll.src} color={Dark.colors.textHeadingsOptions[1]} />
                <TierName color={Dark.colors.textHeadingsOptions[1]}>Scroll</TierName>
                <TierPrice>
                    <span>$15</span>
                    <span>/month (USD)</span>
                </TierPrice>
            </TierBenefitSection>

            <TierBenefitSection border>
                <TierBenefitSectionTitle color={Dark.colors.textHeadingsOptions[1]}>
                    The AI
                </TierBenefitSectionTitle>
                <TierBenefitName>Access to Euterpe, our Second Best AI Storyteller</TierBenefitName>
                <TierBenefitDesc>Including Calliope and Sigurd</TierBenefitDesc>
                <TierBenefitName>Unlimited Text Generations</TierBenefitName>
                <TierBenefitDesc></TierBenefitDesc>
                <TierBenefitName>2048 Tokens of Memory</TierBenefitName>
                <TierBenefitDesc>That’s about ~8192 characters that the AI can remember.</TierBenefitDesc>
            </TierBenefitSection>

            <TierBenefitSection border>
                <TierBenefitSectionTitle
                    color={Dark.colors.textHeadingsOptions[1]}
                    style={{ cursor: width <= 1000 ? 'pointer' : 'default' }}
                    onClick={(e) => {
                        if (width <= 1000) {
                            setCollapsed((c) => !c)
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                >
                    Extra Goodies{' '}
                    {width <= 1000 ? (
                        collapsed ? (
                            <ArrowDownIcon style={{ opacity: 0.8, width: '12px' }} />
                        ) : (
                            <ArrowUpIcon style={{ opacity: 0.3, width: '12px' }} />
                        )
                    ) : null}
                </TierBenefitSectionTitle>
                {!collapsed && (
                    <Fragment>
                        <TierBenefitName>
                            1000 <AnlaIcon style={{ display: 'inline-block', height: '1rem' }} /> Anlas/month
                        </TierBenefitName>
                        <TierBenefitDesc>
                            Currency for Custom AI Module training and Image Generation
                        </TierBenefitDesc>
                        <TierBenefitName>Advanced AI TTS</TierBenefitName>
                        <TierBenefitDesc>
                            Bring your stories to life with the soothing sound of our generated TTS voices.
                        </TierBenefitDesc>
                        <TierBenefitName>Image Generation</TierBenefitName>
                        <TierBenefitDesc>Access to our advanced image generation models.</TierBenefitDesc>
                        <FlexColSpacer min={45} max={45} />
                    </Fragment>
                )}
            </TierBenefitSection>

            {props.children}
        </TierBlock>
    )
}
export function OpusTierContent(props: {
    style?: CSSProperties
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    const { width } = useWindowSize()
    const [collapsed, setCollapsed] = useState(false)
    useEffect(() => {
        if (width) {
            if (width > 1000 && collapsed) setCollapsed(false)
            else if (width <= 1000 && !collapsed) setCollapsed(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width])
    return (
        <TierBlock style={props.style} color={Dark.colors.textHeadingsOptions[3]}>
            <TierBenefitSection>
                <TierValue color={Dark.colors.textHeadingsOptions[3]}>For the Enthusiast</TierValue>
                <SubIcon icon={Opus.src} color={Dark.colors.textHeadingsOptions[3]} />
                <TierName color={Dark.colors.textHeadingsOptions[3]}>Opus</TierName>
                <TierPrice>
                    <span>$25</span>
                    <span>/month (USD)</span>
                </TierPrice>
            </TierBenefitSection>
            <TierBenefitSection border>
                <TierBenefitSectionTitle color={Dark.colors.textHeadingsOptions[3]}>
                    The AI
                </TierBenefitSectionTitle>
                <TierBenefitName>Access to Krake, our Best AI Storyteller</TierBenefitName>
                <TierBenefitDesc>Including all our other AI Storytellers</TierBenefitDesc>
                <TierBenefitName>Unlimited Text Generations</TierBenefitName>
                <TierBenefitDesc></TierBenefitDesc>
                <TierBenefitName>2048 Tokens of Memory</TierBenefitName>
                <TierBenefitDesc>That’s about ~8192 characters that the AI can remember.</TierBenefitDesc>
            </TierBenefitSection>

            <TierBenefitSection border>
                <TierBenefitSectionTitle
                    color={Dark.colors.textHeadingsOptions[3]}
                    style={{ cursor: width <= 1000 ? 'pointer' : 'default' }}
                    onClick={(e) => {
                        if (width <= 1000) {
                            setCollapsed((c) => !c)
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                >
                    Extra Goodies{' '}
                    {width <= 1000 ? (
                        collapsed ? (
                            <ArrowDownIcon style={{ opacity: 0.8, width: '12px' }} />
                        ) : (
                            <ArrowUpIcon style={{ opacity: 0.3, width: '12px' }} />
                        )
                    ) : null}
                </TierBenefitSectionTitle>
                {!collapsed && (
                    <Fragment>
                        <TierBenefitName>
                            10,000 <AnlaIcon style={{ display: 'inline-block', height: '1rem' }} />{' '}
                            Anlas/month
                        </TierBenefitName>
                        <TierBenefitDesc>
                            Currency for Custom AI Module training and Image Generation
                        </TierBenefitDesc>
                        <TierBenefitName>Access to new Experimental Features</TierBenefitName>
                        <TierBenefitDesc>
                            You’ll get access to the latest and coolest new stuff before everyone else.
                        </TierBenefitDesc>
                        <TierBenefitName>Advanced AI TTS</TierBenefitName>
                        <TierBenefitDesc>
                            Bring your stories to life with the soothing sound of our generated TTS voices.
                        </TierBenefitDesc>
                        <TierBenefitName>Image Generation</TierBenefitName>
                        <TierBenefitDesc>Unlimited** normal and small sized generations.</TierBenefitDesc>
                    </Fragment>
                )}
            </TierBenefitSection>

            {props.children}
        </TierBlock>
    )
}

const purchase = (auth_token: string, product: number, success: () => void) => {
    ;(window as any).Paddle.Checkout.open({
        product: product,
        passthrough: JSON.stringify({
            auth_token,
        }),
        successCallback: (data: any) => {
            if (data && data.checkout && data.checkout.id) {
                success()
            }
        },
    })
}

function SubscriptionPurchase(props: { onSuccess: () => void; explanation?: string }): JSX.Element {
    const session = useRecoilValue(Session)
    // disable purchase of sub when last attempted in the last 12 hrs
    const alreadyTriedPurchase =
        getUserSetting(session.settings, 'subscriptionPurchaseAttempt') > Date.now() - 43200000
    const [buttonsEnabled, setButtonsEnabled] = useState(!PurchasesDisabled && !alreadyTriedPurchase)
    const theme = useRecoilValue(SiteTheme)

    const paymentSuccess = () => {
        setButtonsEnabled(false)
        props.onSuccess()
    }

    return (
        <SubscriptionDialog>
            <SubscribeHeader>Tier Pricing</SubscribeHeader>
            {props.explanation ? <SubscriptionAboveInfo>{props.explanation}</SubscriptionAboveInfo> : <></>}
            {PurchasesDisabled && (
                <WarningText
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'left',
                        textAlign: 'left',
                        margin: 10,
                    }}
                >
                    Subscription purchases are currently disabled due to a service provider outage.
                    <br />
                    Subscriptions already purchased might take longer than expected to activate.
                </WarningText>
            )}
            {alreadyTriedPurchase && (
                <InfoText>
                    <FlexRow>
                        <ExclamationPointIcon />
                        <div style={{ width: 8 }} />
                        <FlexCol style={{ textAlign: 'left', gap: 8 }}>
                            <span>
                                You already purchased a subscription, but it is taking longer than expected to
                                be processed.
                            </span>
                            <span>
                                <b>Please check again in a few minutes.</b>
                            </span>
                            <span>
                                In some circumstances, it can take up to 30+ minutes or more to process.
                                Purchasing from Asia might result in additional delay in subscription
                                activation (up to 4 hours). If this situation persists, please contact us at{' '}
                                <a href="support@novelai.net">support@novelai.net</a>.
                            </span>
                        </FlexCol>
                    </FlexRow>
                </InfoText>
            )}
            {!alreadyTriedPurchase && (
                <InfoText2 style={{ opacity: 0.8 }}>
                    Note: Purchasing from Asia might currently result in additional delay in subscription
                    activation (up to 4 hours).
                </InfoText2>
            )}
            <SubscribeContainer>
                <SubscriptionTierList>
                    <SubscriptionTier
                        color={theme.colors.textHeadingsOptions[0]}
                        onClick={() => purchase(session.auth_token, PaddleTabletID, paymentSuccess)}
                        disabled={!buttonsEnabled}
                    >
                        <TabletTierContent />
                    </SubscriptionTier>
                    <SubscriptionTier
                        color={theme.colors.textHeadingsOptions[1]}
                        onClick={() => purchase(session.auth_token, PaddleScrollID, paymentSuccess)}
                        disabled={!buttonsEnabled}
                    >
                        <ScrollTierContent />
                    </SubscriptionTier>
                    <SubscriptionTier
                        color={theme.colors.textHeadingsOptions[3]}
                        onClick={() => purchase(session.auth_token, PaddleOpusID, paymentSuccess)}
                        disabled={!buttonsEnabled}
                    >
                        <OpusTierContent />
                    </SubscriptionTier>
                    <TierFinePrint>
                        **For images of up to 640x640 pixels and up to 28 steps when generating a single
                        image. Does not include img2img generations.
                    </TierFinePrint>
                </SubscriptionTierList>
            </SubscribeContainer>
        </SubscriptionDialog>
    )
}

export default function Subscription(props: { actionBlocked: boolean; onClose: () => void }): JSX.Element {
    const [paymentDialog, setPaymentDialog] = useState(0)
    const [session, setSession] = useRecoilState(Session)
    const [error, setError] = useState('')
    const [giftKey, setGiftKey] = useState('')
    const [changeTier, setChangeTier] = useState(-1)
    const [checkTimeout, setCheckTimeout] = useState(0)
    const theme = useRecoilValue(SiteTheme)
    const [unsubscribeModal, setUnsubscribeModal] = useState(false)

    useEffect(() => {
        return () => {
            clearTimeout(checkTimeout)
        }
    })

    useEffect(() => {
        setError('')
        getSubscriptionRequest(session.auth_token)
            .request()
            .then((response: ISubscriptionResponse) => {
                setSession({ ...session, subscription: response.subscription, priority: response.priority })
                if (!response.subscription.active) {
                    setPaymentDialog(2)
                } else {
                    setPaymentDialog(3)
                }
            })
            .catch((error) => {
                logError(error)
                setError(`${error}`)
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onSuccess = () => {
        setError('')
        setPaymentDialog(0)
        setSession((session) => {
            const subscriptionPurchaseAttempt = Date.now()
            getStorage(session).saveSettings({
                ...session.settings,
                subscriptionPurchaseAttempt,
            })
            return {
                ...session,
                settings: {
                    ...session.settings,
                    subscriptionPurchaseAttempt,
                },
            }
        })
        let checks = 0
        const checkSubscription = () =>
            getSubscriptionRequest(session.auth_token)
                .request()
                .then((response: ISubscriptionResponse) => {
                    if (
                        !response.subscription.active ||
                        response.subscription.paymentProcessorData?.r ===
                            session.subscription.paymentProcessorData?.r
                    ) {
                        if (checks < 3) {
                            setCheckTimeout(setTimeout(checkSubscription, 2000) as any)
                            ++checks
                        } else if (checks < 12) {
                            setError(
                                'Your payment was successful \
                                but processing it on our side is taking longer than expected... \
                                It can take up to 30+ minutes to process in some circumstances. If it \
                                takes longer than expected please contact us at support@novelai.net'
                            )
                            setCheckTimeout(setTimeout(checkSubscription, 2000) as any)
                        } else {
                            setError(
                                'Your payment was successful \
                                but processing it on our side is taking longer than expected... \
                                It can take up to 30+ minutes to process in some circumstances. If it \
                                takes longer than expected please contact us at support@novelai.net'
                            )
                            setCheckTimeout(setTimeout(checkSubscription, 2000) as any)
                        }
                    } else {
                        setSession((session) => ({
                            ...session,
                            subscription: response.subscription,
                            priority: response.priority,
                        }))
                        setPaymentDialog(3)
                    }
                })
                .catch((error) => {
                    logError(error)
                    setError(`${error}`)
                })
        setTimeout(checkSubscription, 2000)
    }

    const onGiftKey = () => {
        setError('')
        setPaymentDialog(0)
        let checks = 0
        const checkSubscription = () =>
            getSubscriptionRequest(session.auth_token)
                .request()
                .then((response: ISubscriptionResponse) => {
                    if (!response.subscription.tier) {
                        if (checks < 3) {
                            setCheckTimeout(setTimeout(checkSubscription, 2000) as any)
                            ++checks
                        } else {
                            setError('Processing your gift key is taking longer than expected...')
                            setCheckTimeout(setTimeout(checkSubscription, 2000) as any)
                        }
                    } else {
                        setSession({
                            ...session,
                            subscription: response.subscription,
                            priority: response.priority,
                        })
                        setPaymentDialog(3)
                    }
                })
                .catch((error) => {
                    logError(error)
                    setError(`${error}`)
                })
        getSubscriptionBindRequest(session.auth_token, 'giftkey', giftKey)
            .request()
            .then(() => {
                setTimeout(checkSubscription, 2000)
            })
            .catch((error) => {
                logError(error)
                setError(`${error}`)
            })
    }

    const onSubscriptionChange = (tier: number) => {
        setError('')
        setPaymentDialog(0)
        let checks = 0
        const currentSubPlan = session.subscription.paymentProcessorData?.p
        const checkSubscription = () =>
            getSubscriptionRequest(session.auth_token)
                .request()
                .then((response: ISubscriptionResponse) => {
                    if (response.subscription.paymentProcessorData?.p === currentSubPlan) {
                        if (checks < 3) {
                            setCheckTimeout(setTimeout(checkSubscription, 2000) as any)
                            ++checks
                        } else {
                            setError(
                                `Upgrading your subscription to ${tierNumberToName(tier)} was successful \
                                but processing it on our side is taking longer than expected...`
                            )
                            setCheckTimeout(setTimeout(checkSubscription, 2000) as any)
                        }
                    } else {
                        setSession({
                            ...session,
                            subscription: response.subscription,
                            priority: response.priority,
                        })
                        setPaymentDialog(3)
                    }
                })
                .catch((error) => {
                    logError(error)
                    setError(`${error}`)
                })
        getSubscriptionChangeRequest(session.auth_token, tierNumberToNameCaps(tier))
            .request()
            .then(() => {
                setTimeout(checkSubscription, 2000)
            })
            .catch((error) => {
                logError(error)
                setError(`${error}`)
            })
    }

    switch (paymentDialog) {
        case 1: {
            return (
                <SubscriptionDialog>
                    <SubscriptionPurchase onSuccess={onSuccess} />
                    {error ? <ErrorInfo>{error}</ErrorInfo> : null}
                </SubscriptionDialog>
            )
        }
        case 2: {
            return (
                <SubscriptionDialog>
                    <SubscribeHeader>
                        {props.actionBlocked
                            ? 'You need a subscription to do this!'
                            : 'You are not subscribed!'}
                    </SubscribeHeader>
                    <SubscribeText>Upgrade your subscription?</SubscribeText>
                    <SubscribeButton onClick={() => setPaymentDialog(1)}>Take me there</SubscribeButton>
                    <SubscribeButton onClick={() => setPaymentDialog(4)}>Activate a Gift Key</SubscribeButton>
                    <DontButton onClick={props.onClose}>No, take me back!</DontButton>
                    {error ? <ErrorInfo>{error}</ErrorInfo> : null}
                </SubscriptionDialog>
            )
        }
        case 3: {
            return (
                <SubscriptionDialog>
                    <SubscribeHeader>
                        You are subscribed to the {tierNumberToName(session.subscription.tier)} tier!
                    </SubscribeHeader>
                    <SubscribeText>
                        {(session.subscription.paymentProcessorData?.s === 'active' ||
                            session.subscription.paymentProcessorData?.s === 'high_risk') &&
                        session.subscription.paymentProcessorData?.p &&
                        subscriptionIdToName(session.subscription.paymentProcessorData?.p) !==
                            tierNumberToName(session.subscription.tier) ? (
                            <p>
                                Your subscription will be upgraded to{' '}
                                <strong>
                                    {subscriptionIdToName(session.subscription.paymentProcessorData?.p)}
                                </strong>{' '}
                                around{' '}
                                <strong>
                                    {dayjs
                                        .unix(session.subscription?.paymentProcessorData.n ?? 0)
                                        .format('YYYY/MM/DD @ hh:mma')}
                                </strong>
                            </p>
                        ) : null}
                        <p>
                            Your subscription{' '}
                            {session.subscription.paymentProcessorData?.s === 'active' ||
                            session.subscription.paymentProcessorData?.s === 'high_risk' ? (
                                <>
                                    renews around{' '}
                                    <strong>
                                        {session.subscription?.expiresAt
                                            ? dayjs
                                                  .unix(session.subscription?.paymentProcessorData.n ?? 0)
                                                  .format('YYYY/MM/DD @ hh:mma')
                                            : 'unknown'}
                                    </strong>
                                </>
                            ) : (
                                `ends on ${dayjs
                                    .unix(session.subscription?.expiresAt ?? 0)
                                    .format('YYYY/MM/DD @ hh:mma')} and does not renew`
                            )}
                        </p>
                        {session.subscription.paymentProcessorData?.s === 'high_risk' ? (
                            <p>
                                Your subscription is currently classified as high risk by our payment
                                provider, this can take up to a day to clear up.
                            </p>
                        ) : null}
                    </SubscribeText>
                    {session.subscription.paymentProcessorData?.s === 'active' ||
                    session.subscription.paymentProcessorData?.s === 'high_risk' ? (
                        <>
                            <Modal
                                type={ModalType.Compact}
                                onRequestClose={() => setUnsubscribeModal(false)}
                                isOpen={unsubscribeModal}
                            >
                                <>
                                    <WarningText
                                        style={{ fontWeight: '600', fontSize: '1rem', maxWidth: 400 }}
                                    >
                                        Warning: If you unsubscribe you will be unable to purchase additional
                                        Anlas for use in image generation.
                                    </WarningText>
                                    <br />
                                    <WarningText
                                        style={{ fontWeight: '600', fontSize: '1rem', maxWidth: 400 }}
                                    >
                                        注意：退会された場合、
                                        <br />
                                        追加アンラスを購入出来なくなります。
                                    </WarningText>
                                    <br />
                                    <WarningText
                                        style={{ fontWeight: '600', fontSize: '1rem', maxWidth: 400 }}
                                    >
                                        참고 : 구독을 취소하면 추가 Anlas를 구매할 수 없습니다.
                                    </WarningText>
                                    <br />
                                    <ChangeSubscriptionLink
                                        href={session.subscription.paymentProcessorData?.c}
                                        target="_blank"
                                    >
                                        Unsubscribe
                                    </ChangeSubscriptionLink>
                                </>
                            </Modal>
                            <ChangeSubscriptionButton
                                onClick={() => {
                                    setUnsubscribeModal(true)
                                }}
                            >
                                Unsubscribe
                            </ChangeSubscriptionButton>
                            {session.subscription.tier !== 3 ? (
                                <ChangeSubscriptionButton
                                    onClick={() => {
                                        setPaymentDialog(5)
                                    }}
                                >
                                    Upgrade Subscription Tier
                                </ChangeSubscriptionButton>
                            ) : (
                                <></>
                            )}
                            {session.subscription.paymentProcessorData?.u ? (
                                <ChangeSubscriptionLink
                                    href={session.subscription.paymentProcessorData?.u}
                                    target="_blank"
                                >
                                    Update Payment Method
                                </ChangeSubscriptionLink>
                            ) : null}
                            <DontButton onClick={props.onClose}>OK</DontButton>
                        </>
                    ) : (
                        <>
                            <ChangeSubscriptionButton
                                onClick={() => {
                                    setPaymentDialog(7)
                                }}
                            >
                                Replace Subscription
                            </ChangeSubscriptionButton>
                            <DontButton onClick={props.onClose}>OK</DontButton>
                        </>
                    )}
                    {error ? <ErrorInfo>{error}</ErrorInfo> : null}
                </SubscriptionDialog>
            )
        }
        case 4: {
            return (
                <SubscriptionDialog>
                    <SubscribeHeader>Activate a Gift Key</SubscribeHeader>
                    <SubscribeGiftKeyInput
                        placeholder="Key"
                        value={giftKey}
                        onChange={(e) => setGiftKey(e.target.value)}
                    />
                    <SubscribeButton onClick={() => onGiftKey()}>Activate</SubscribeButton>
                    {error ? <ErrorInfo>{error}</ErrorInfo> : null}
                </SubscriptionDialog>
            )
        }
        case 5: {
            return (
                <SubscriptionDialog>
                    <SubscribeHeader>Upgrade Subscription Tier</SubscribeHeader>
                    <SubscriptionAboveInfo>
                        Upon upgrading your new subscription tier, you will immediately be charged by the new
                        tier&apos;s monthly price with a discount based on your remaining time of usage of the
                        past tier for the current month.
                        {PurchasesDisabled && (
                            <WarningText
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'left',
                                    textAlign: 'left',
                                    margin: 10,
                                }}
                            >
                                Subscription purchases are currently disabled due to a service provider
                                outage.
                                <br />
                                Subscriptions already purchased might take longer than expected to activate.
                            </WarningText>
                        )}
                    </SubscriptionAboveInfo>
                    <SubscribeContainer>
                        <SubscriptionTierList>
                            <SubscriptionTier
                                color={theme.colors.textHeadingsOptions[0]}
                                onClick={() => {
                                    setChangeTier(1)
                                    setPaymentDialog(6)
                                }}
                                disabled={PurchasesDisabled || session.subscription.tier >= 1}
                            >
                                <TabletTierContent />
                            </SubscriptionTier>
                            <SubscriptionTier
                                color={theme.colors.textHeadingsOptions[1]}
                                onClick={() => {
                                    setChangeTier(2)
                                    setPaymentDialog(6)
                                }}
                                disabled={PurchasesDisabled || session.subscription.tier >= 2}
                            >
                                <ScrollTierContent />
                            </SubscriptionTier>
                            <SubscriptionTier
                                color={theme.colors.textHeadingsOptions[3]}
                                onClick={() => {
                                    setChangeTier(3)
                                    setPaymentDialog(6)
                                }}
                                disabled={PurchasesDisabled || session.subscription.tier >= 3}
                            >
                                <OpusTierContent />
                            </SubscriptionTier>
                        </SubscriptionTierList>
                    </SubscribeContainer>
                    <TierFinePrint>
                        **For images of up to 640x640 pixels and up to 28 steps when generating a single
                        image. Does not include img2img generations.
                    </TierFinePrint>
                    {error ? <ErrorInfo>{error}</ErrorInfo> : null}
                </SubscriptionDialog>
            )
        }
        case 6: {
            return (
                <SubscriptionDialog>
                    <SubscribeHeader>{'Upgrade Subscription Tier'}</SubscribeHeader>
                    <SubscribeText>
                        Are you sure you want to upgrade your subscription tier from{' '}
                        {tierNumberToName(session.subscription.tier)} to {tierNumberToName(changeTier)}?<br />
                        <br />
                        You will be{' '}
                        <strong>
                            immediately charged {calculateUpgradePrice(session.subscription, changeTier)} USD
                        </strong>{' '}
                        for the remainder of this month.
                    </SubscribeText>
                    <SubscribeButton
                        onClick={() => {
                            onSubscriptionChange(changeTier)
                        }}
                    >
                        Yes I want to upgrade.
                    </SubscribeButton>
                    <DontButton onClick={() => setPaymentDialog(5)}>No, take me back!</DontButton>
                    {error ? <ErrorInfo>{error}</ErrorInfo> : null}
                </SubscriptionDialog>
            )
        }
        case 7: {
            return (
                <SubscriptionDialog>
                    <SubscriptionPurchase
                        onSuccess={onSuccess}
                        explanation="Replacing your subscription will charge you the full price of the new subscription
                        and void your old one."
                    />
                    {error ? <ErrorInfo>{error}</ErrorInfo> : null}
                </SubscriptionDialog>
            )
        }
        default: {
            return (
                <SubscriptionDialog>
                    {error ? (
                        <>
                            <LoadingSpinner visible={true} />
                            <ErrorInfo>{error}</ErrorInfo>
                        </>
                    ) : (
                        <LoadingSpinner visible={true} />
                    )}
                </SubscriptionDialog>
            )
        }
    }
}

function tierToPrice(tier: number): number {
    return tier === 1 ? 10 : tier === 2 ? 15 : tier === 3 ? 25 : 0
}

function calculateUpgradePrice(subscription: UserSubscription, newTier: number): string {
    if (!subscription.paymentProcessorData?.n) {
        return 'NaN'
    }
    const newPrice = tierToPrice(newTier)
    const oldPrice = tierToPrice(subscription.tier)

    const remainingDays = Math.round(
        Math.abs((Date.now() / 1000 - subscription.paymentProcessorData.n) / 86400)
    )

    const unusedCredit = oldPrice * (remainingDays / 30)
    const remainingNew = newPrice * (remainingDays / 30)
    const calcPrice = -(unusedCredit - remainingNew)

    return calcPrice.toFixed(2)
}
