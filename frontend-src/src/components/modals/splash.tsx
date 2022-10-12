import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import Link from 'next/link'
import { GlobalUserContext } from '../../globals/globals'
import {
    SelectedStory,
    Session,
    Stories,
    SubscriptionDialogOpen,
    UpdateNotesVisible,
    UpdateNotes,
    UpdateNotesUnread,
    SplashModalOpen,
    SettingsModalOpen,
} from '../../globals/state'
import { Button, ButtonLink, LightColorButton, SubtleButton } from '../../styles/ui/button'
import { ArrowRightIcon, EaselIcon, ImportIcon, LinkIcon, PenTipIcon, PlusIcon } from '../../styles/ui/icons'
import { mix } from '../../util/colour'
import Spinner from '../spinner'
import { processLine, UpdateNotesSpacer } from '../updates'
import { getSessionStorage, setSessionStorage } from '../../util/storage'
import { subscriptionIsActive, tierNumberToName } from '../../util/subscription'
import { FileImporterButtonType, FileImporterOverlayType } from '../controls/fileimporter'
import useAddStory from '../../hooks/useAddStory'
import { getUserSetting } from '../../data/user/settings'
import { SettingsPages } from '../settings/constants'
import { CloseButton } from './common'
import Modal, { ModalType } from './modal'
import { AnyFileImporter } from './storyimporter'

const StyledSplashModal = styled.div`
    max-width: calc(100vw - 60px);
    width: 860px;
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100%;
    background: ${(props) => props.theme.colors.bg2};
    overflow: auto;

    @media (max-width: 650px) {
        max-width: 100vw;
        height: var(--app-height, 100%);
    }
`

const SplashCategoryTitle = styled.div`
    font-size: 0.875rem;
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textHeadings};
    margin-top: 20px;
    font-weight: 600;
    @media (max-width: 650px) {
        color: ${(props) => props.theme.colors.textMain};
        margin-bottom: 10px;
    }
`

const AccountStatusTitle = styled(SplashCategoryTitle)`
    @media (max-width: 650px) {
        display: none;
    }
`

const SplashHeader = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    padding: 30px 30px 0 30px;
    > :first-child {
        height: 2rem;
        width: 2rem;
        margin-bottom: 4px;
    }
    > :last-child {
        > :first-child {
            font-size: 0.75rem;
            opacity: 0.7;
        }
        > :last-child {
            font-size: 1.125rem;
            font-family: ${(props) => props.theme.fonts.headings};
        }
    }
    @media (max-width: 650px) {
        padding: 20px 20px 0 20px;
        background: ${(props) => props.theme.colors.bg1};
        margin: 0;
    }
`

const SplashContent = styled.div`
    display: grid;
    gap: 30px;
    grid-template-columns: 1fr 1fr;
    padding: 0 30px 30px 30px;
    > div {
        display: flex;
        flex-direction: column;
    }
    @media (max-width: 650px) {
        padding: 0;
        gap: 0;
        grid-template-columns: 1fr;
        > :last-child {
            grid-row: 1;
            > :nth-child(3),
            > :nth-child(4) {
                margin: 0 20px;
            }
        }
        overflow-y: auto;
        overflow-y: overlay;
        > :first-child {
            justify-content: space-between;
            flex-direction: column-reverse;
            padding: 0px 20px 20px 20px;
        }
    }
`

const SplashButtons = styled.div`
    display: grid;
    width: 100%;
    display: grid;
    grid-template-columns: auto;
    gap: 10px;
    margin-top: 20px;
    font-family: ${(props) => props.theme.fonts.headings};
    font-weight: 600;
    align-items: center;
    button,
    a {
        padding: 20px;
        justify-content: flex-start;
        > :first-child {
            width: 0.8rem;
            height: 0.8rem;
            margin-right: 10px;
        }
    }
    > {
        width: 100%;
    }
    .splash-alt-button {
        background: transparent;
        border: 1px solid ${(props) => props.theme.colors.bg3};
        width: 100%;
    }
    .splash-alt-button:hover,
    .splash-alt-button:focus {
        background: ${(props) => mix(0.02, props.theme.colors.textMain, props.theme.colors.bg2)};
        border: 1px solid ${(props) => props.theme.colors.bg3};
        color: ${(props) => props.theme.colors.textMain};
    }
`

const SplashStoryContainer = styled.div`
    display: grid;
    grid-template-columns: auto;
    gap: 10px;

    @media (max-width: 650px) {
        > :first-child {
            margin-bottom: 0;
        }
        > :last-child {
            display: none;
        }
    }
`

const SplashStory = styled(SubtleButton)`
    background-color: ${(props) => props.theme.colors.bg1};
    display: flex;
    padding: 20px 15px 15px 20px;
    align-items: center;
    text-align: left;
    justify-content: space-between;
    > :first-child {
        display: flex;
        flex-direction: column;
        > :first-child {
            font-size: 1rem;
            font-family: ${(props) => props.theme.fonts.headings};
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            // Should be replaced with line-clamp when/if it becomes availiable
            // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
        }
        > :last-child {
            font-size: 0.875rem;
            opacity: 0.5;
        }
    }
    > :last-child {
        margin-bottom: 5px;
    }

    @media (max-width: 650px) {
        padding: 15px 15px 10px 20px;
    }

    &:hover,
    &:focus {
        background: ${(props) => mix(0.01, props.theme.colors.textMain, props.theme.colors.bg1)};
    }
`

const SplashSubManagement = styled.div`
    display: flex;
    padding: 20px 15px 20px 20px;
    justify-content: space-between;
    width: 100%;
    align-items: center;
    margin-top: 10px;
    background-color: ${(props) => props.theme.colors.bg1};
    > :first-child {
        display: flex;
        flex-direction: column;
        font-weight: 600;
        > :first-child {
            font-size: 0.875rem;
            opacity: 0.7;
        }
        > :last-child {
            font-size: 1.125rem;
            font-family: ${(props) => props.theme.fonts.headings};
        }
    }
    > :last-child {
        display: flex;
        flex-direction: row;
        button {
            font-weight: bold;
            padding: 13px 20px;
            line-height: 1.125rem;
        }
        > :nth-child(1) {
            color: ${(props) => props.theme.colors.textHeadings};
            margin-right: 10px;
        }
        > :nth-child(2) {
            background: transparent;
            border: 1px solid ${(props) => props.theme.colors.bg3};
            color: ${(props) => props.theme.colors.warning};

            &:hover,
            &:focus {
                background: ${(props) => mix(0.02, props.theme.colors.textMain, props.theme.colors.bg1)};
            }
        }
    }

    @media (max-width: 800px) and (min-width: 651px) {
        flex-direction: column;
        align-items: flex-start;
        padding: 10px;
        > :first-child {
            margin-bottom: 5px;
            flex-direction: row;
            align-items: center;
            > :first-child {
                &:after {
                    content: ':';
                }
                margin-right: 10px;
            }
        }
        > :last-child {
            width: 100%;
            button {
                display: flex;
                justify-content: space-around;
                flex: 1 1 0;
            }
        }
    }
    @media (max-width: 650px) {
        margin: 0;
        padding-right: 20px;
    }
`

const TitleButtonContainer = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    align-items: baseline;
    font-weight: 600;
    padding-bottom: 5px;
    button {
        height: fit-content;
        opacity: 0.7;
    }

    button:hover,
    button:focus {
        background-color: ${(props) => props.theme.colors.bg2};
        opacity: 1;
    }
`

const UpdateNoteContainer = styled.div`
    position: relative;
    img {
        max-width: 100%;
    }
    span:first-child:empty {
        display: none;
    }
    ${UpdateNotesSpacer}:first-child {
        display: none;
    }
`

const UpdateNotesContent = styled.div`
    cursor: pointer;
    :hover,
    :focus {
        background: ${(props) => mix(0.8, props.theme.colors.bg2, props.theme.colors.bg3)};
    }
`

const UpdateNote = styled.div`
    border: 1px solid ${(props) => props.theme.colors.bg3};

    .bold {
        font-weight: 700;
    }
    .italic {
        font-style: oblique;
    }
    .strike {
        text-decoration: line-through;
    }
    .underline {
        text-decoration: underline;
    }
    > :first-child {
        background-color: ${(props) => props.theme.colors.bg1};
        padding: 20px 20px 15px 20px;
        font-weight: 600;
        > :first-child {
            font-size: 1rem;
        }
        > :last-child {
            font-size: 0.875rem;
            opacity: 0.7;
        }
        width: 100%;
        text-align: left;

        @media (max-width: 650px) {
            padding: 15px 20px 10px 20px;
        }
    }
    > :last-child {
        padding: 15px 15px 15px 20px;
        font-size: 0.875rem;
        max-height: 300px;
        overflow-y: auto;
        @media (max-width: 650px) {
            display: none;
        }
    }

    button:hover {
        background: ${(props) => mix(0.02, props.theme.colors.textMain, props.theme.colors.bg1)};
    }
`
export const NewUpdatesBubble = styled.div`
    margin-right: 15px;
    color: ${(props) => props.theme.colors.warning};
    transform: rotate(-15deg);
    position: absolute;
    right: 5px;
    top: 28px;
`

export default function SplashModal(): JSX.Element {
    const session = useRecoilValue(Session)
    const splashModalOpen = useRecoilValue(SplashModalOpen)

    const [visible, setVisible] = useState(
        getUserSetting(session.settings, 'tutorialSeen') === true && !getSessionStorage('splashSeen')
    )
    useEffect(() => {
        if (splashModalOpen !== undefined) setVisible(splashModalOpen)
    }, [splashModalOpen])

    const setSelectedStory = useSetRecoilState(SelectedStory)
    const storyMetadata = GlobalUserContext.stories
    const setSubscriptionVisible = useSetRecoilState(SubscriptionDialogOpen)
    const setUpdateNotesVisible = useSetRecoilState(UpdateNotesVisible)
    const updateNotes = useRecoilValue(UpdateNotes)
    const stories = useRecoilValue(Stories)
    const updateNotesUnread = useRecoilValue(UpdateNotesUnread)
    const importerClickRef: MutableRefObject<null | (() => boolean)> = useRef(null)
    const setSettingsPage = useSetRecoilState(SettingsModalOpen)
    const { addStory } = useAddStory({
        addToCurrentShelf: false,
        callback: () => {
            setVisible(false)
        },
    })

    const alreadyTriedPurchase =
        getUserSetting(session.settings, 'subscriptionPurchaseAttempt') > Date.now() - 43200000

    return (
        <div>
            <AnyFileImporter
                overlay={FileImporterOverlayType.None}
                button={FileImporterButtonType.None}
                buttonClickRef={importerClickRef}
                onAllFilesHandled={() => setVisible(false)}
            />
            <Modal
                isOpen={visible}
                shouldCloseOnOverlayClick={true}
                onRequestClose={() => {
                    setSessionStorage('splashSeen', 'true')
                    setVisible(false)
                }}
                type={ModalType.Large}
                ignoreOpen={true}
            >
                <StyledSplashModal>
                    <CloseButton
                        aria-label="Close Modal"
                        style={{ top: '10px', right: '10px', position: 'absolute' }}
                        onClick={() => {
                            setSessionStorage('splashSeen', 'true')
                            setVisible(false)
                        }}
                    >
                        <div />
                    </CloseButton>

                    <SplashHeader>
                        <PenTipIcon />
                        <div>
                            <div>Welcome back{','}</div>
                            <div style={{ fontWeight: 'bold' }}>
                                {session.settings?.penName ? session.settings?.penName : 'Author'}
                            </div>
                        </div>
                    </SplashHeader>
                    <SplashContent>
                        <div>
                            <SplashButtons>
                                <LightColorButton onClick={addStory}>
                                    <PlusIcon />
                                    Create New Story
                                </LightColorButton>
                                <Button
                                    additionalClasses="splash-alt-button"
                                    onClick={() => {
                                        if (importerClickRef.current) importerClickRef.current()
                                    }}
                                >
                                    <ImportIcon />
                                    Import Story
                                </Button>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '10px',
                                    }}
                                >
                                    <Link href="/image" passHref>
                                        <ButtonLink
                                            style={{
                                                flex: '8 1 max-content',
                                            }}
                                            className="splash-alt-button"
                                        >
                                            <EaselIcon />
                                            Generate Images
                                        </ButtonLink>
                                    </Link>
                                    <Button
                                        style={{
                                            flex: '2 1 max-content',
                                        }}
                                        additionalClasses="splash-alt-button"
                                        onClick={() => {
                                            setSettingsPage(SettingsPages.TextToSpeech)
                                            setVisible(false)
                                        }}
                                    >
                                        <LinkIcon />
                                        TTS
                                    </Button>
                                </div>
                            </SplashButtons>
                            <SplashStoryContainer>
                                <SplashCategoryTitle>Recent Stories</SplashCategoryTitle>
                                {stories.slice(0, 3).map((s, i) => {
                                    const storyMeta = storyMetadata.get(s)
                                    if (!storyMeta) {
                                        return <></>
                                    }
                                    const date = storyMeta.lastUpdatedAt
                                    return (
                                        <SplashStory
                                            key={i}
                                            onClick={() => {
                                                setSelectedStory({ loaded: false, id: s })
                                                setVisible(false)
                                            }}
                                        >
                                            <div>
                                                <span>{storyMeta.title}</span>
                                                {
                                                    <span>{`Last Edited: ${date
                                                        .toISOString()
                                                        .slice(0, 10)} @ ${
                                                        date.toLocaleTimeString().slice(0, -6) +
                                                        date.toLocaleTimeString().slice(-3)
                                                    }`}</span>
                                                }
                                            </div>
                                            <ArrowRightIcon />
                                        </SplashStory>
                                    )
                                })}
                            </SplashStoryContainer>
                        </div>
                        <div>
                            <AccountStatusTitle>Account Status</AccountStatusTitle>
                            <SplashSubManagement>
                                <div>
                                    <div>Current Tier</div>
                                    <div>
                                        {!subscriptionIsActive(session.subscription)
                                            ? alreadyTriedPurchase
                                                ? 'Processing'
                                                : 'Trial'
                                            : tierNumberToName(session.subscription.tier)}
                                    </div>
                                </div>
                                <div>
                                    {session.noAccount ? (
                                        <Link href="/register" passHref>
                                            <LightColorButton>Sign&nbsp;Up</LightColorButton>
                                        </Link>
                                    ) : (
                                        <LightColorButton
                                            onClick={() => {
                                                setVisible(false)
                                                setSubscriptionVisible({ open: true, blocked: false })
                                            }}
                                        >
                                            {subscriptionIsActive(session.subscription)
                                                ? 'Manage'
                                                : 'Upgrade'}
                                        </LightColorButton>
                                    )}
                                </div>
                            </SplashSubManagement>
                            <TitleButtonContainer>
                                <SplashCategoryTitle>Latest Update</SplashCategoryTitle>
                                <SubtleButton
                                    onClick={() => {
                                        setUpdateNotesVisible(true)
                                        setVisible(false)
                                    }}
                                >
                                    All Updates
                                </SubtleButton>
                            </TitleButtonContainer>
                            <UpdateNoteContainer>
                                {updateNotes.length > 0 ? (
                                    updateNotes.slice(0, 1).map((note, i) => (
                                        <UpdateNote key={i}>
                                            <SubtleButton
                                                onClick={() => {
                                                    setUpdateNotesVisible(true)
                                                    setVisible(false)
                                                }}
                                            >
                                                <div>
                                                    {note.title}
                                                    {updateNotesUnread ? (
                                                        <NewUpdatesBubble>New!</NewUpdatesBubble>
                                                    ) : null}
                                                </div>
                                                <div>{`${note.date.toISOString().slice(0, 10)}`}</div>
                                            </SubtleButton>
                                            <UpdateNotesContent
                                                onClick={() => {
                                                    setUpdateNotesVisible(true)
                                                    setVisible(false)
                                                }}
                                            >
                                                {note.message.map((el, i) =>
                                                    el.length === 0 ? (
                                                        <UpdateNotesSpacer key={i} />
                                                    ) : (
                                                        processLine(el, i)
                                                    )
                                                )}
                                            </UpdateNotesContent>
                                        </UpdateNote>
                                    ))
                                ) : (
                                    <Spinner
                                        visible={true}
                                        style={{ width: '20px', height: '20px', margin: '45px auto' }}
                                    />
                                )}
                            </UpdateNoteContainer>
                        </div>
                    </SplashContent>
                </StyledSplashModal>
            </Modal>
        </div>
    )
}
