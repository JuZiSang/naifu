/* eslint-disable max-len */
import { toast } from 'react-toastify'
import { useRecoilCallback, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StaticImageData } from 'next/image'
import { normalizeModel, TextGenerationModel } from '../data/request/model'
import { getGenerationRequest } from '../data/request/request'
import { getCommentGenSettings } from '../data/story/defaultpresets'
import { GlobalUserContext } from '../globals/globals'
import {
    CommentState,
    GenerationRequestActive,
    IPLimitModal,
    SelectedStoryId,
    Session,
    SettingsModalOpen,
    SiteTheme,
    SubscriptionDialogOpen,
    TrialUsageRemaining,
    TrialUsedModal,
    TTSState,
} from '../globals/state'
import { getModelEncoderType } from '../tokenizer/encoder'
import { WorkerInterface } from '../tokenizer/interface'
import { logError } from '../util/browser'
import { subscriptionIsActive } from '../util/subscription'
import { useSelectedStory } from '../hooks/useSelectedStory'
import { EndOfSamplingSequence } from '../data/story/eossequences'
import { TokenData, TokenDataFormat } from '../data/story/logitbias'

import GooseRight from '../assets/images/goose_right.svg'
import Krake from '../assets/kit/busts/krake.webp'
import Sigurd from '../assets/kit/busts/sigurd.webp'
import Euterpe from '../assets/kit/busts/euterpe.webp'
import Genji from '../assets/kit/busts/genji.webp'
import Snek from '../assets/kit/busts/snek.webp'
import Calliope from '../assets/kit/busts/calliope.webp'
import Placeholder from '../assets/modelplaceholder.png'

import { LightColorButton, SubtleButton } from '../styles/ui/button'
import { getStorage } from '../data/storage/storage'
import { getUserSetting, TTSType } from '../data/user/settings'
import { Icon, LinkIcon, SmallCrossIcon } from '../styles/ui/icons'
import { transparentize } from '../util/colour'
import { SettingsPages } from './settings/constants'
import { speakTTS } from './controls/tts'
import { TipDisplay } from './tip'
import { InfoModal } from './modals/info'
import Tooltip from './tooltip'

export enum Avatars {
    AutoSelect,
    Calliope,
    Sigurd,
    Euterpe,
    Krake,
    Genji,
    Snek,
    Goose,
}

export const CommentAvatars = {
    [Avatars.AutoSelect]: { id: Avatars.AutoSelect, img: Placeholder, alt: 'Auto-Select' },
    [Avatars.Calliope]: { id: Avatars.Calliope, img: Calliope, alt: 'Calliope' },
    [Avatars.Sigurd]: { id: Avatars.Sigurd, img: Sigurd, alt: 'Sigurd' },
    [Avatars.Euterpe]: { id: Avatars.Euterpe, img: Euterpe, alt: 'Euterpe' },
    [Avatars.Krake]: { id: Avatars.Krake, img: Krake, alt: 'Krake' },
    [Avatars.Genji]: { id: Avatars.Genji, img: Genji, alt: 'Genji' },
    [Avatars.Snek]: { id: Avatars.Snek, img: Snek, alt: 'Snek' },
    [Avatars.Goose]: { id: Avatars.Goose, img: GooseRight, alt: 'Goose' },
}

function commentAvatarFromModel(model: TextGenerationModel) {
    switch (model) {
        case TextGenerationModel.j6bv4:
            return CommentAvatars[Avatars.Sigurd]
        case TextGenerationModel.neo2b:
            return CommentAvatars[Avatars.Calliope]
        case TextGenerationModel.genjijp6bv2:
            return CommentAvatars[Avatars.Sigurd]
        case TextGenerationModel.genjipython6b:
            return CommentAvatars[Avatars.Genji]
        case TextGenerationModel.euterpev2:
            return CommentAvatars[Avatars.Euterpe]
        case TextGenerationModel.krakev2:
            return CommentAvatars[Avatars.Krake]
        default:
            return CommentAvatars[Avatars.Goose]
    }
}

const pairMap = new Map([
    ['"', '"'],
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['“', '”'],
    ['‘', '’'],
    ['<', '>'],
    ['«', '»'],
])

export function useGenerateComment(): (force?: boolean) => Promise<void> {
    const generateComment = useRecoilCallback(({ snapshot, set }) => async (force?: boolean) => {
        const session = await snapshot.getPromise(Session)
        const random = Math.random()
        if (getUserSetting(session.settings, 'commentEnabled') === 0) {
            return
        }
        if (!force && random > getUserSetting(session.settings, 'commentChance')) {
            return
        }
        const selectedStoryId = await snapshot.getPromise(SelectedStoryId)
        const story = GlobalUserContext.storyContentCache.get(selectedStoryId)
        const commentState = await snapshot.getPromise(CommentState)
        if (commentState.generating || commentState.streaming) return // don't allow multiple generations at once
        if (!story) return // TODO: handle this
        const selectedModelImage =
            CommentAvatars[(getUserSetting(session.settings, 'commentAvatar') as Avatars) ?? Avatars.Goose]
        const modelImage =
            selectedModelImage.id === Avatars.AutoSelect
                ? commentAvatarFromModel(normalizeModel(story.settings.model))
                : selectedModelImage
        set(CommentState, {
            text: '',
            generating: true,
            streaming: false,
            hidden: false,
            image: modelImage,
        })
        const trialUsage = await snapshot.getPromise(TrialUsageRemaining)
        if (!subscriptionIsActive(session.subscription) && trialUsage === 0) {
            set(TrialUsedModal, true)
            return
        }

        const model = normalizeModel(TextGenerationModel.commentBot)
        const encoderType = getModelEncoderType(model)

        const text = story.getStoryText()
        let prompt = text.slice(-8000)
        const split = prompt.split('\n')
        const lastLine = split[split.length - 1]
        // If last line starts with an opening character and is less than 8 characters long, drop it entirely
        if (lastLine.length < 8 && pairMap.has(lastLine[0])) {
            prompt = prompt.slice(0, -lastLine.length)
        } else {
            // handle unclosed quotes and brackets in last line
            const found = []
            const openingCharacters = new Set(pairMap.keys())
            const closingCharacters = new Set(pairMap.values())
            for (const c of lastLine) {
                // if c both a closing and opening character, check found to determine which
                let opening = openingCharacters.has(c)
                const closing = closingCharacters.has(c)
                if (opening && closing) opening = found.filter((f) => f === c).length % 2 === 0
                if (opening) {
                    found.push(c)
                } else if (closing) {
                    // if closing, remove last item from found
                    found.pop()
                }
            }
            for (const c of found) {
                // append corresponding closing character via map
                const closing = pairMap.get(c)
                prompt += closing
            }
        }

        const worker = new WorkerInterface()

        let tokens = await worker.encode(prompt, encoderType)
        if (tokens.length === 0) {
            tokens = await worker.encode('What kind of story should we write?', encoderType)
        }
        const context = [...tokens.slice(-512), 49527]
        const eosSequences = [new EndOfSamplingSequence(new TokenData('48585', TokenDataFormat.GPT2Tokens))]

        const request = getGenerationRequest(session, context, getCommentGenSettings(), { eosSequences })

        set(TrialUsageRemaining, (v) => {
            return Math.max(v - 1, 0)
        })

        if (getUserSetting(session.settings, 'streamResponses')) {
            let heldToken = ''
            let timeout: any
            const queue: { token: string; final: boolean }[] = []
            let spoken = false
            request.requestStream(
                async (token, i, final) => {
                    const setToken = (token: string, final: boolean) => {
                        set(CommentState, (v) => {
                            if (
                                final &&
                                !spoken &&
                                getUserSetting(session.settings, 'speakComments') &&
                                getUserSetting(session.settings, 'ttsType') !== TTSType.Off
                            ) {
                                spoken = true
                                speakTTS(
                                    getUserSetting(session.settings, 'ttsType'),
                                    session,
                                    v.text + token,
                                    {
                                        comment: true,
                                        error: (error) => toast(`${error}`),
                                    }
                                )
                            }

                            return {
                                ...v,
                                text: v.text + token,
                                streaming: !final,
                                generating: false,
                                hidden: false,
                            }
                        })
                    }
                    if (getUserSetting(session.settings, 'commentStreamDelay') > 0 && !timeout) {
                        const delayedSet = () => {
                            const o = queue.shift()
                            if (o) {
                                setToken(o.token, o.final)
                            }
                            if (!o?.final) {
                                timeout = setTimeout(
                                    delayedSet,
                                    getUserSetting(session.settings, 'commentStreamDelay') * 20
                                )
                            }
                        }
                        delayedSet()
                    }
                    if (token.endsWith('���')) {
                        token = token.slice(0, -3)
                    }
                    if (!heldToken) {
                        heldToken = token
                        return true
                    }
                    if (final && heldToken.endsWith(',')) {
                        heldToken = heldToken.slice(0, -1) + '.'
                    }

                    if (getUserSetting(session.settings, 'commentStreamDelay') > 0) {
                        queue.push({ token: heldToken, final })
                        if (final) {
                            queue.push({ token, final })
                        }
                    } else {
                        setToken(heldToken, final)
                        if (final) {
                            setToken(token, final)
                        }
                    }
                    heldToken = token

                    return true
                },
                (err) => {
                    if (`${err.message}` === 'Unknown error, please try again.') {
                        // TODO: something? Ignore for now
                        return
                    }
                    set(CommentState, {
                        text: err.message,
                        generating: false,
                        streaming: false,
                        hidden: true,
                        image: modelImage,
                    })

                    if (err.status === 402) {
                        if (err.message?.includes?.call(err.message, 'quota reached')) {
                            set(IPLimitModal, true)
                        } else {
                            set(SubscriptionDialogOpen, { open: true, blocked: false })
                        }
                        return
                    }
                    toast(err.message)
                }
            )

            return
        }

        try {
            const response = await request.request()

            if (!response || !response.text) {
                if (response && response.error) {
                    if (response.error?.includes?.call(response.error, 'quota reached')) {
                        set(IPLimitModal, true)
                        return
                    }

                    throw new Error(response.error)
                }
                throw new Error('No response')
            }

            let text = response.text.endsWith('���') ? response.text.slice(0, -3) : response.text
            text = text.endsWith(',') ? text.slice(0, -1) + '.' : text
            if (
                getUserSetting(session.settings, 'speakComments') &&
                getUserSetting(session.settings, 'ttsType') !== TTSType.Off
            )
                speakTTS(getUserSetting(session.settings, 'ttsType'), session, text, {
                    comment: true,
                    error: (error) => toast(`${error}`),
                })

            set(CommentState, {
                text: text,
                generating: false,
                streaming: false,
                hidden: false,
                image: modelImage,
            })
        } catch (error: any) {
            logError(error, false)
            set(CommentState, {
                text: error.message,
                generating: false,
                streaming: false,
                hidden: true,
                image: modelImage,
            })
            toast('Failed to generate' + (error.message ? `: ${error.message}` : '.'))
        }
    })

    return generateComment
}

export default function CommentDisplay(): JSX.Element {
    const [commentState, setCommentState] = useRecoilState(CommentState)
    const { id, story, modified } = useSelectedStory()
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    const [session, setSession] = useRecoilState(Session)
    const setSettingsModalOpen = useSetRecoilState(SettingsModalOpen)
    const generateComment = useGenerateComment()
    const [showClose, setShowClose] = useState(false)
    const siteTheme = useRecoilValue(SiteTheme)

    useEffect(() => {
        if (!modified) return
        if (!story) return
        const selectedModelImage =
            CommentAvatars[(getUserSetting(session.settings, 'commentAvatar') as Avatars) ?? Avatars.Goose]
        const modelImage =
            selectedModelImage.id === Avatars.AutoSelect
                ? commentAvatarFromModel(normalizeModel(story.settings.model))
                : selectedModelImage

        setCommentState({
            text: '',
            generating: false,
            streaming: false,
            hidden: true,
            image: modelImage,
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, session.settings.commentEnabled, setCommentState])

    useEffect(() => {
        if (
            (generationRequestActive && getUserSetting(session.settings, 'commentEnabled') !== 2) ||
            getUserSetting(session.settings, 'commentAutoClear')
        ) {
            setCommentState((v) => ({
                ...v,
                text: '',
                hidden: true,
            }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generationRequestActive, session.settings.commentEnabled, setCommentState])

    const thinking = commentState.generating
    const idle = commentState.hidden
    const speaking = commentState.text !== '' && !thinking
    const [speakingActive, setSpeakingActive] = useState(false)
    const ttsState = useRecoilValue(TTSState)
    // set speaking active when streaming starts
    useEffect(() => {
        if (getUserSetting(session.settings, 'speakComments')) {
            if (ttsState.commentSpeaking) {
                setSpeakingActive(true)
            }
        } else if (commentState.streaming) {
            setSpeakingActive(true)
        }
    }, [commentState.streaming, session.settings, setSpeakingActive, ttsState.commentSpeaking])

    // when generation ends, start speaking active if not already and set a timer to remove speaking active
    const wasGenerating = useRef(false)
    useEffect(() => {
        setShowClose(false)
        if (getUserSetting(session.settings, 'speakComments')) {
            if (!ttsState.commentSpeaking) {
                setSpeakingActive(false)
            }
        } else if (!commentState.streaming && !commentState.generating && wasGenerating.current) {
            let timeoutTime = Math.min(3000, Math.max(1000, commentState.text.length * 20))
            if (getUserSetting(session.settings, 'streamResponses') === false) {
                setSpeakingActive(true)
                // timeout should be longer if not streaming
                timeoutTime = Math.min(4000, Math.max(1000, commentState.text.length * 30))
            }
            setTimeout(() => {
                setSpeakingActive(false)
            }, timeoutTime)
        }
        if (commentState.generating) wasGenerating.current = true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        commentState.generating,
        commentState.streaming,
        commentState.text.length,
        session.settings,
        session.settings.streamResponses,
        setSpeakingActive,
        ttsState.commentSpeaking,
    ])

    let classes = 'comment-avatar'
    if (thinking) {
        classes += ' comment-avatar-thinking'
    }
    if (speaking) {
        classes += ' comment-avatar-speaking'
    }
    if (speakingActive) {
        classes += ' comment-avatar-speaking-active'
    }
    if (idle) {
        classes += ' comment-avatar-idle'
    }

    const commentDisplayed =
        (!commentState.hidden && getUserSetting(session.settings, 'commentEnabled') === 1) ||
        getUserSetting(session.settings, 'commentEnabled') === 2

    const tipRef = useRef<HTMLDivElement>(null)
    const [whatsThisOpen, setWhatsThisOpen] = useState(false)

    return (
        <div
            style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridTemplateRows: '1fr',
                width: '100%',
            }}
        >
            <InfoModal open={whatsThisOpen} close={() => setWhatsThisOpen(false)}>
                <h3>Introducing Hype(Bot)!</h3>
                <p>
                    We&apos;ve made a fun, encouraging bot to celebrate our first anniversary:{' '}
                    <strong>HypeBot</strong>.
                </p>

                <CommentAvatarBox width={120} style={{ margin: 0 }} className={'comment-avatar-box'}>
                    <CommentAvatar
                        avatar={commentState.image?.img ?? CommentAvatars[Avatars.Goose].img}
                        className={classes}
                    />
                </CommentAvatarBox>
                <br />
                <p>
                    As your companion, it will comment on your stories and give you the occasional suggestion
                    to help move your plot forward!
                    <br />
                    <br />
                    You can change the portrait used and other settings in{' '}
                    <SubtleButton
                        style={{ display: 'inline' }}
                        onClick={() => setSettingsModalOpen(SettingsPages.AISettings)}
                    >
                        User Settings{' '}
                        <LinkIcon style={{ height: '0.8rem', width: '0.8rem', display: 'inline-block' }} />
                    </SubtleButton>
                    .
                </p>
                <p style={{ opacity: 0.6, fontWeight: 400 }}>Custom images can also be set via theme CSS.</p>

                <br />
                <LightColorButton
                    style={{
                        minHeight: '50px',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: 20,
                    }}
                    onClick={() => setWhatsThisOpen(false)}
                >
                    Got it!
                </LightColorButton>
                <SubtleButton
                    style={{ opacity: 0.5 }}
                    onClick={() => {
                        setSession((session) => {
                            const newSession = {
                                ...session,
                                settings: {
                                    ...session.settings,
                                    commentEnabled: 0,
                                },
                            }
                            getStorage(newSession).saveSettings(newSession.settings)
                            return newSession
                        })
                        setWhatsThisOpen(false)
                    }}
                >
                    No thanks turn it off.
                </SubtleButton>
            </InfoModal>

            <AnimatePresence initial={false} exitBeforeEnter>
                <>
                    {!commentDisplayed && getUserSetting(session.settings, 'showTips') && (
                        <motion.div
                            ref={tipRef}
                            initial={{ opacity: 0, x: 0 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            key="comment-tip"
                            transition={{ duration: 0.4, ease: 'easeInOut' }}
                            style={{
                                position: 'relative',
                                padding: '10px 0 0px 0',
                                display: 'flex',
                                overflow: 'hidden',
                            }}
                            className="comment-tip"
                        >
                            <TipDisplay clampLines={1} dismissable />
                        </motion.div>
                    )}
                    {commentDisplayed && (
                        <CommentContainer
                            initial={{ opacity: 0, x: -100, height: 'auto' }}
                            animate={{ opacity: 1, x: 0, height: 'auto' }}
                            exit={{ opacity: 0, x: 0, height: 0 }}
                            key="comment"
                            transition={{ duration: 0.4, ease: 'easeInOut' }}
                            className="comment-container"
                        >
                            <CommentAvatarBox
                                width={getUserSetting(session.settings, 'buttonScale') * 120}
                                className={'comment-avatar-box'}
                                onClick={() => {
                                    generateComment(true)
                                }}
                            >
                                <AnimatePresence>
                                    <CommentAvatar
                                        key={commentState.image?.id ?? ''}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                                        avatar={commentState.image?.img ?? CommentAvatars[Avatars.Goose].img}
                                        className={classes}
                                    />
                                </AnimatePresence>
                            </CommentAvatarBox>
                            <CommentButtons>
                                <SubtleButton
                                    className="comment-whatsthis"
                                    style={{ padding: 5, fontWeight: 400 }}
                                    onClick={() => {
                                        setWhatsThisOpen(true)
                                    }}
                                >
                                    {"What's this?"}
                                </SubtleButton>
                            </CommentButtons>

                            {!commentState.hidden && (
                                <CommentBox
                                    className={'comment-box'}
                                    onClick={() => {
                                        setShowClose(true)
                                    }}
                                >
                                    {!commentState.generating && (
                                        <CommentCloseButton
                                            shown={showClose}
                                            className="comment-close"
                                            onClick={() => {
                                                setCommentState((v) => ({
                                                    ...v,
                                                    text: '',
                                                    hidden: true,
                                                }))
                                            }}
                                        >
                                            <SmallCrossIcon style={{ width: '10px' }} />
                                        </CommentCloseButton>
                                    )}
                                    <CommentArrow className={'comment-arrow'} />
                                    <CommentName
                                        name={commentState.image?.alt ?? ''}
                                        className={'comment-name'}
                                    />

                                    {commentState.generating ? (
                                        <CommentText>
                                            <DotDotDot />
                                        </CommentText>
                                    ) : (
                                        <>
                                            <Tooltip
                                                delay={1}
                                                tooltip={commentState.text}
                                                overflowChild={'.comment-text'}
                                            >
                                                <CommentText className={'comment-text'}>
                                                    {commentState.text}
                                                </CommentText>
                                            </Tooltip>
                                        </>
                                    )}
                                </CommentBox>
                            )}
                            {idle && getUserSetting(session.settings, 'showTips') && (
                                <TipsBox>
                                    <div
                                        style={{
                                            maxWidth: '600px',
                                        }}
                                    >
                                        <TipDisplay clampLines={3} center />
                                    </div>
                                </TipsBox>
                            )}
                            {idle && !getUserSetting(session.settings, 'showTips') && (
                                <div
                                    style={{
                                        height: '100%',
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: '20px',
                                        opacity: 0.5,
                                    }}
                                >
                                    <svg
                                        width="58"
                                        height="48"
                                        viewBox="0 0 58 48"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M58 45.0403V2C58 0.895431 57.1046 0 56 0H2.00022C0.895652 0 0.000223091 0.895426 0.000216249 1.99999L1.23893e-05 34.9091C5.5469e-06 36.0137 0.895435 36.9091 2.00001 36.9091H46.6261C47.1566 36.9091 47.6653 37.1198 48.0403 37.4949L56.2929 45.7474C56.9229 46.3774 58 45.9312 58 45.0403Z"
                                            fill={siteTheme.colors.bg3}
                                        />
                                        <circle
                                            cx="13.1818"
                                            cy="18.4546"
                                            r="5.27273"
                                            fill={siteTheme.colors.bg1}
                                        />
                                        <circle
                                            cx="29"
                                            cy="18.4546"
                                            r="5.27273"
                                            fill={siteTheme.colors.bg1}
                                        />
                                        <circle
                                            cx="44.8181"
                                            cy="18.4546"
                                            r="5.27273"
                                            fill={siteTheme.colors.bg1}
                                        />
                                    </svg>
                                </div>
                            )}
                        </CommentContainer>
                    )}
                </>
            </AnimatePresence>
        </div>
    )
}

const CommentContainer = styled(motion.div)`
    position: relative;
    padding: 20px 0 10px 0;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    width: 100%;
    @media (max-width: 600px) {
        padding-bottom: 0;
    }
`

export function DotDotDot() {
    const [dotDotDot, setDotDotDot] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => {
            setDotDotDot((v) => (v + 1) % 3)
        }, 600)
        return () => clearInterval(interval)
    }, [])
    return (
        <>
            {[0, 1, 2].map((i) => (
                <span style={{ opacity: i <= dotDotDot ? 1 : 0 }} key={i}>
                    .
                </span>
            ))}
        </>
    )
}

const CommentCloseButton = styled(SubtleButton)<{ shown: boolean }>`
    position: absolute;
    top: 0;
    right: 0;
    padding: 0 6px;
    transition: opacity 0.2s ease-in-out;
    > div {
        background-color: ${(props) =>
            props.shown ? transparentize(0.6, props.theme.colors.textMain) : 'transparent'};
        &:hover {
            background-color: ${(props) => transparentize(0.6, props.theme.colors.textMain)};
        }
    }
`

const CommentAvatarBox = styled.div<{ width: number }>`
    border: 1px solid ${(props) => props.theme.colors.bg3};
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    width: ${(props) => props.width}px;
    height: ${(props) => props.width}px;
    @media (max-width: 600px) {
        margin-top: 10px;
        width: 80px;
        height: 80px;
    }
    margin-right: 20px;
    flex: 0 0 auto;
    position: relative;
    @media (max-width: 600px) {
        margin-right: 10px;
    }
`
const CommentAvatar = styled(motion.div)<{ avatar: StaticImageData }>`
    background-color: ${(props) => props.theme.colors.bg1};
    background-image: url(${(props) => props.avatar.src});
    background-size: contain;
    background-position: bottom center;
    background-repeat: no-repeat;
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
`

const CommentName = styled.div<{ name: string }>`
    &::after {
        content: '${(props) => props.name}';
    }
    font-family: ${(props) => props.theme.fonts.headings};
    font-weight: 600;
    font-size: 0.778em;
    opacity: 0.6;
`
const TipsBox = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    margin-right: 20px;
    align-self: center;
    strong {
        font-weight: 600;
    }
    @media (max-width: 600px) {
        margin-right: 10px;
    }
`
const CommentBox = styled.div`
    position: relative;
    padding: 16px 32px;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    background-color: ${(props) => props.theme.colors.bg1};
    border-radius: 5px;
    height: max-content;
    margin-top: 10px;
    align-self: center;
    display: flex;
    flex-direction: column;
    &:hover {
        ${Icon} {
            background-color: ${(props) => transparentize(0.6, props.theme.colors.textMain)};
        }
    }

    @media (max-width: 600px) {
        padding: 8px 12px 8px 12px;
    }
`

const CommentArrow = styled.div`
    position: absolute;
    // center
    top: calc(50% - 12px);

    left: -10px;
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-right: 10px solid ${(props) => props.theme.colors.bg3};

    &:after {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        left: 1px;
        top: -12px;
        border-top: 12px solid transparent;
        border-bottom: 12px solid transparent;
        border-right: 10px solid ${(props) => props.theme.colors.bg1};
    }
`

const CommentText = styled.span`
    transition: width 0.4s ease-in-out;
    font-size: 0.889em;
    line-height: 1.5;

    @media (max-width: 600px) {
        overflow: hidden;
        text-overflow: ellipsis;
        // Should be replaced with line-clamp when/if it becomes availiable
        // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
    }
`

const CommentButtons = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    font-size: 0.875rem;
    z-index: 1;
    > button {
        opacity: 0.3;
        &:hover {
            opacity: 0.6;
        }
    }
`
