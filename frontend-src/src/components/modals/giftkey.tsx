import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import {
    BackendURLUserGiftKeys,
    PaddleGitfKeyOpusID,
    PaddleGitfKeyScrollID,
    PaddleGitfKeyTabletID,
    PurchasesDisabled,
} from '../../globals/constants'
import { GiftKeyOpen, Session, SiteTheme } from '../../globals/state'
import { Button, SubtleButton } from '../../styles/ui/button'
import { CopyAltIcon, PartyIcon } from '../../styles/ui/icons'
import { FlexColSpacer } from '../../styles/ui/layout'
import { darken, mix } from '../../util/colour'
import { fetchWithTimeout } from '../../util/general'
import { sleep } from '../../util/util'
import { LoadingSpinner } from '../loading'
import { copyToClipboard } from '../sidebars/infobar/items/storyexporter'
import { SubIcon } from '../subscription'
import { UpdateNotifierBackground, UpdateNotifierOverlay } from '../updatenotifier'
import Tablet from '../../assets/images/tablet.svg'
import Scroll from '../../assets/images/scroll.svg'
import Opus from '../../assets/images/opus.svg'
import { Dark } from '../../styles/themes/dark'
import { InfoText2, WarningText } from '../../styles/components/import/importlorebook'
import { CloseButton } from './common'
import Modal, { ModalType } from './modal'

const purchase = (
    auth_token: string,
    product: number,
    success: (data: any) => void,
    close: (data: any) => void
) => {
    ;(window as any).Paddle.Checkout.open({
        product,
        passthrough: JSON.stringify({
            auth_token,
        }),
        successCallback: (data: any) => {
            if (data && data.checkout && data.checkout.id) {
                success(data)
            }
        },
        closeCallback: close,
    })
}

export const getGiftKeys = async (auth_token: string): Promise<Record<string, any>> =>
    await (
        await fetchWithTimeout(
            BackendURLUserGiftKeys,
            {
                mode: 'cors',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + auth_token,
                },
                method: 'GET',
            },
            20000
        )
    )
        // eslint-disable-next-line unicorn/no-await-expression-member
        .json()

export default function PurchaseGiftKeyModal(): JSX.Element {
    const [selectedTier, setSelectedTier] = useState(PaddleGitfKeyScrollID)
    const [open, setOpen] = useRecoilState(GiftKeyOpen)
    const theme = useRecoilValue(SiteTheme)
    const [purchasedKeys, setPurchasedKeys] = useState<[]>()
    const [purchasing, setPurchasing] = useState(false)
    const [error, setError] = useState('')

    const selectedRef = useRef(selectedTier)
    useEffect(() => {
        selectedRef.current = selectedTier
    }, [selectedTier])

    useEffect(() => {
        if (error) {
            toast(error, {
                autoClose: false,
            })
            setOpen(false)
        }
    }, [error, setOpen])

    const purchaseKey = useRecoilCallback(
        ({ snapshot }) =>
            async () => {
                setPurchasing(true)
                const session = await snapshot.getPromise(Session)

                const keysBeforePurchase = (await getGiftKeys(session.auth_token)) || { giftKeys: [] }

                const purchaseResult = (await new Promise((resolve) => {
                    purchase(session.auth_token, selectedRef.current, resolve, resolve)
                })) as any
                if (!purchaseResult.checkout.completed) {
                    setPurchasing(false)
                    return
                }

                await sleep(500)

                let keysAfterPurchase = {} as any
                let tries = 0
                while (tries < 10) {
                    keysAfterPurchase = await getGiftKeys(session.auth_token)
                    if (keysAfterPurchase.giftKeys?.length !== keysBeforePurchase.giftKeys?.length) {
                        break
                    }
                    ++tries
                    await sleep(2000)
                }
                if (
                    !keysAfterPurchase.giftKeys?.length ||
                    keysAfterPurchase.giftKeys?.length === keysBeforePurchase.giftKeys?.length
                ) {
                    setError(
                        'There was an issue receiving your gift key. Please check your emails for a confirmation, \
                        and contact our support should the gift key not arrive within the next hour.'
                    )
                    setPurchasing(false)
                    return
                }

                const filteredKeys = keysAfterPurchase.giftKeys
                    .filter((key: any) => !keysBeforePurchase.giftKeys.some((pk: any) => pk.id === key.id))
                    .map((key: any) => key.id)

                setPurchasedKeys(filteredKeys)
                setPurchasing(false)
                return
            },
        []
    )

    return (
        <Modal
            isOpen={open}
            shouldCloseOnOverlayClick={true}
            onRequestClose={() => {
                setOpen(false)
                setPurchasedKeys([])
            }}
            type={ModalType.Large}
        >
            <>
                <CloseButton
                    onClick={() => {
                        setOpen(false)
                        setPurchasedKeys([])
                    }}
                >
                    <div />
                </CloseButton>
                {purchasedKeys?.length ? (
                    <UpdateNotifierOverlay>
                        <UpdateNotifierBackground />
                        <BigIcon />
                        <PurchasedTitle>
                            Ta-da! Here’s your Key{purchasedKeys.length > 1 ? 's' : ''}!
                        </PurchasedTitle>
                        <FlexColSpacer min={8} max={8} />
                        <PurchasedText>
                            You can check the status in your Account Settings or your Emails.
                        </PurchasedText>
                        <FlexColSpacer min={30} max={30} />
                        <KeyDisplay>
                            {purchasedKeys.length > 1 ? (
                                <textarea
                                    cols={purchasedKeys.length}
                                    value={purchasedKeys.join('/n')}
                                    readOnly
                                />
                            ) : (
                                <input type="text" value={purchasedKeys.join('/n')} readOnly />
                            )}
                            <KeyCopyBorder />
                            <KeyCopy
                                aria-label={'Copy Key'}
                                onClick={() => {
                                    copyToClipboard(purchasedKeys.join('\n'))
                                    toast('Gift Key copied to clipboard.')
                                }}
                            >
                                <CopyAltIcon />
                            </KeyCopy>
                        </KeyDisplay>
                        <FlexColSpacer min={40} max={40} />
                    </UpdateNotifierOverlay>
                ) : (
                    <Container>
                        <Title>Purchase a New Gift Key</Title>
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
                                Gift Key purchases are currently disabled due to a service provider outage.
                                <br />
                                Gift Keys already purchased might take longer than expected to arrive.
                            </WarningText>
                        )}
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
                            Gift Key subscriptions are not eligible to purchase additional Anlas at this time.
                            An active, renewing subscription is required to purchase additional Anlas.
                        </WarningText>
                        <Subtitle>Select a Tier</Subtitle>
                        <ButtonContainer>
                            <TierButton
                                disabled={PurchasesDisabled}
                                onClick={() => setSelectedTier(PaddleGitfKeyTabletID)}
                                selected={selectedTier === PaddleGitfKeyTabletID}
                                color={theme.colors.textHeadingsOptions[0]}
                                name={'Tablet'}
                                price={'10'}
                                icon={
                                    <SubIcon icon={Tablet.src} color={Dark.colors.textHeadingsOptions[0]} />
                                }
                            />
                            <TierButton
                                disabled={PurchasesDisabled}
                                onClick={() => setSelectedTier(PaddleGitfKeyScrollID)}
                                selected={selectedTier === PaddleGitfKeyScrollID}
                                color={theme.colors.textHeadingsOptions[1]}
                                name={'Scroll'}
                                price={'15'}
                                icon={
                                    <SubIcon icon={Scroll.src} color={Dark.colors.textHeadingsOptions[1]} />
                                }
                            />
                            <TierButton
                                disabled={PurchasesDisabled}
                                onClick={() => setSelectedTier(PaddleGitfKeyOpusID)}
                                selected={selectedTier === PaddleGitfKeyOpusID}
                                color={theme.colors.textHeadingsOptions[3]}
                                name={'Opus'}
                                price={'25'}
                                icon={<SubIcon icon={Opus.src} color={Dark.colors.textHeadingsOptions[3]} />}
                            />
                        </ButtonContainer>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'left',
                                textAlign: 'left',
                                margin: '20px 10px 0 10px',
                                opacity: 0.8,
                            }}
                        >
                            Please note that Gift Key tiers do not allow purchase of Anlas at this time.
                            <br />
                            An active renewing subscription is required to purchase Anlas.
                            <br />
                            Note: Purchasing from Asia might currently result in additional delay in gift key
                            arrival (up to 4 hours).
                        </div>
                        <PurchaseKeyButton
                            disabled={purchasing || PurchasesDisabled}
                            onClick={() => {
                                purchaseKey()
                            }}
                        >
                            {purchasing ? <PurchasingSpinner visible={true} /> : 'Purchase Key'}
                        </PurchaseKeyButton>
                    </Container>
                )}
            </>
        </Modal>
    )
}

const PurchasingSpinner = styled(LoadingSpinner)`
    & {
        width: 20px;
        height: 20px;
    }
    > div {
        background-color: ${(props) => props.theme.colors.bg1};
    }
`

const Title = styled.div`
    font-weight: 600;
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.125rem;
`
const PurchasedTitle = styled.div`
    font-weight: 600;
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.375rem;
    color: ${(props) => props.theme.colors.textHeadings};
`

const Subtitle = styled.div`
    padding-top: 20px;
    padding-bottom: 13px;
    font-weight: 700;
`
const BigIcon = styled(PartyIcon)`
    width: 50px;
    height: 50px;
    margin-top: 60px;
    margin-bottom: 40px;
    background: ${(props) => props.theme.colors.textHeadings};
    cursor: default;
`

const Container = styled.div`
    padding: 30px;
    background: ${(props) => props.theme.colors.bg2};
`
const PurchasedText = styled.div`
    font-size: 0.875rem;
    font-weight: 600;
    padding-right: 1rem;
    padding-left: 1rem;
`
const KeyDisplay = styled.div`
    display: flex;
    align-items: center;
    width: calc(100% - 60px);
    > :first-child {
        flex: 1 1 0;
        user-select: all;
    }
    background: ${(props) => props.theme.colors.bg0};
`
const KeyCopy = styled(SubtleButton)`
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    padding: 13px 15px 13px 14px;
    > div {
        height: 1rem;
    }
`

const KeyCopyBorder = styled(SubtleButton)`
    height: 24px;
    border-left: 1px solid ${(props) => props.theme.colors.bg3};
    background: ${(props) => props.theme.colors.bg0};
`

const ButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 20px;
`
const PurchaseKeyButton = styled(Button)`
    margin-top: 30px;
    display: flex;
    justify-content: space-around;
    text-align: center;
    background: ${(props) => props.theme.colors.textHeadings};
    &:hover {
        background: ${(props) => mix(0.8, props.theme.colors.textMain, props.theme.colors.textHeadings)};
    }
    color: ${(props) => props.theme.colors.bg1};
    width: 100%;
    font-weight: 700;
    font-size: 1.125rem;
`

function TierButton(props: {
    selected: boolean
    color: string
    name: string
    price: string
    icon: JSX.Element
    onClick: () => void
    disabled?: boolean
}): JSX.Element {
    return (
        <TierButtonContainer
            selected={props.selected}
            color={props.color}
            onClick={props.onClick}
            disabled={props.disabled}
        >
            {props.icon}
            <FlexColSpacer min={10} max={10} />
            <TierButtonTitle color={props.color}>{props.name}</TierButtonTitle>
            <TierButtonPrice>
                <span>${props.price}</span>
                <span></span>
            </TierButtonPrice>
        </TierButtonContainer>
    )
}

const TierButtonContainer = styled(SubtleButton)<{ selected: boolean; color: string }>`
    flex: 1 1 auto;
    min-width: 190px;
    padding: 20px;
    background: ${(props) => props.theme.colors.bg1};
    border: 1px solid ${(props) => (props.selected ? props.color : 'transparent')};
    display: flex;
    justify-content: center;
    flex-direction: column;
    &:hover {
        background-color: ${(props) => darken(0.01, props.theme.colors.bg1)};
        transform: scale(1.015);
    }
`

const TierButtonTitle = styled.div<{ color: string }>`
    color: ${(props) => props.color};
    font-weight: 600;
    font-family: ${(props) => props.theme.fonts.headings};

    font-size: 1.125rem;
`
const TierButtonPrice = styled.div`
    > :first-child {
        font-size: 2.225rem;
        font-weight: 700;
    }
    > :last-child {
        font-size: 1.125rem;
    }
`
