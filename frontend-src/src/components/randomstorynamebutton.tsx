/* eslint-disable no-irregular-whitespace */
import { Fragment, useState } from 'react'
import { GiPerspectiveDiceSixFacesRandom } from 'react-icons/gi'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { toast } from 'react-toastify'
import styled from 'styled-components'
import { normalizeModel, TextGenerationModel } from '../data/request/model'
import { getGenerationRequest } from '../data/request/request'
import { getTitleGenSettings } from '../data/story/defaultpresets'
import { EndOfSamplingSequence } from '../data/story/eossequences'
import { TokenData, TokenDataFormat } from '../data/story/logitbias'
import { StoryMetadata, StoryContent } from '../data/story/storycontainer'
import { GlobalUserContext } from '../globals/globals'
import {
    GenerationRequestActive,
    IPLimitModal,
    LastResponse,
    SelectedStory,
    Session,
    SessionValue,
    StoryUpdate,
    TrialUsageRemaining,
    TrialUsedModal,
} from '../globals/state'
import { getModelEncoderType } from '../tokenizer/encoder'
import { WorkerInterface } from '../tokenizer/interface'
import { randomizeArray } from '../util/util'
import DotReset from '../assets/images/dot-reset.svg'
import { getSessionStorage, setSessionStorage } from '../util/storage'
import { modelMaxContextSize } from '../data/ai/model'
import { getAccountContextLimit, subscriptionIsActive } from '../util/subscription'
import { UserSubscription } from '../data/user/user'
import { logError } from '../util/browser'
import { DotResetIcon } from '../styles/ui/icons'
import { Button, SubtleButton } from '../styles/ui/button'
import Tooltip from './tooltip'
import WarningButton, { WarningButtonStyle } from './deletebutton'
import Modal, { ModalType } from './modals/modal'

const textTypes = ['story', 'book', 'novel', 'text', 'poem', 'article', 'essay', 'letter', 'short story']

// Title generation history indexed by story ID
const titleHistory: { [storyId: string]: string[] } = {}

export default function RandomStoryNameButton(): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStory = GlobalUserContext.stories.get(selectedStory.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    const subscription = useRecoilValue(SessionValue('subscription')) as UserSubscription

    const generateTitle = useRecoilCallback(
        ({ snapshot, set }) =>
            async (storyMetadata: StoryMetadata, storyContent: StoryContent) => {
                const session = await snapshot.getPromise(Session)
                const trialUsage = await snapshot.getPromise(TrialUsageRemaining)
                if (!subscriptionIsActive(session.subscription) && trialUsage === 0) {
                    set(TrialUsedModal, true)
                    return
                }

                set(GenerationRequestActive, true)

                const model = normalizeModel(TextGenerationModel.j6bv4)
                const encoderType = getModelEncoderType(model)

                let text = storyContent.getStoryText()
                const splitStartLines = text.slice(0, 20000).split('\n')
                const startText = splitStartLines.slice(0, 10).join('\n ')
                text = splitStartLines.slice(10).join('\n') + text.slice(20000)
                const splitEndLines = text.slice(-20000).split('\n')
                const endText = splitEndLines.slice(-10).join('\n ')
                const prompt = ` ${startText}${
                    endText !== '' ? `\n...\n ${endText}` : ''
                }\nThe above is an excerpt from the ${randomizeArray(textTypes)[0]} "`

                const worker = new WorkerInterface()

                let context = await worker.encode(prompt, encoderType)
                const limit = Math.min(getAccountContextLimit(session), modelMaxContextSize(model)) - 80
                context = context.slice(-limit)

                const eosSequences = [
                    new EndOfSamplingSequence(new TokenData('"', TokenDataFormat.RawString)),
                    new EndOfSamplingSequence(new TokenData(',"', TokenDataFormat.RawString)),
                    new EndOfSamplingSequence(new TokenData('."', TokenDataFormat.RawString)),
                ]

                const request = getGenerationRequest(session, context, getTitleGenSettings(), {
                    eosSequences,
                })

                try {
                    const response = await request.request()
                    set(TrialUsageRemaining, (v) => {
                        return Math.max(v - 1, 0)
                    })

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

                    set(LastResponse, {
                        tokens: response.tokens ?? [],
                        logprobs: response.logprobs,
                        tokenizer: encoderType,
                    })

                    const split = response.text.split(/("|,"|\.")/)
                    if (split[0] === '') {
                        toast('Generated empty title. Please try again.')
                        return
                    }
                    if (titleHistory[selectedStory.id] === undefined) {
                        titleHistory[selectedStory.id] = [storyMetadata.title]
                    }
                    storyMetadata.title = split[0]
                    titleHistory[selectedStory.id] = [
                        ...(titleHistory[selectedStory.id] ?? []).slice(-50),
                        split[0],
                    ]
                    set(StoryUpdate(storyMetadata.id), storyMetadata.save())
                } catch (error: any) {
                    logError(error, false)
                    toast('Failed to generate' + (error.message ? `: ${error.message}` : '.'))
                } finally {
                    set(GenerationRequestActive, false)
                }
            }
    )

    const setTitle = useRecoilCallback(({ set }) => async (storyMetadata: StoryMetadata, title: string) => {
        storyMetadata.title = title
        set(StoryUpdate(storyMetadata.id), storyMetadata.save())
    })

    const [showHistory, setShowHistory] = useState(false)

    return (
        <div
            style={{
                display: 'flex',
            }}
        >
            {(titleHistory[selectedStory.id] ?? []).length > 0 && (
                <Button
                    style={{
                        height: '40px',
                        width: '41px',
                        padding: '0',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                    onClick={() => setShowHistory(true)}
                >
                    <DotResetIcon style={{ width: '18px', height: '18px' }} />
                </Button>
            )}
            <Modal
                label="Title Generation History"
                isOpen={showHistory}
                onRequestClose={() => setShowHistory(false)}
                shouldCloseOnOverlayClick={true}
                type={ModalType.Compact}
            >
                <div>
                    <p>Shows the last 50 outputs. Cleared on page refresh.</p>
                    {(titleHistory[selectedStory.id] ?? []).length === 0 ? <p>History empty</p> : ''}
                    {(titleHistory[selectedStory.id] ?? []).map((m, i) => (
                        <div key={i}>
                            <HistoryButton
                                onClick={() => {
                                    if (!currentStory) return
                                    setTitle(currentStory, m)
                                    setShowHistory(false)
                                }}
                            >
                                {m}
                            </HistoryButton>
                        </div>
                    ))}
                </div>
            </Modal>
            <Tooltip tooltip={`Generate a random title for the story.`} motionHover delay={1200}>
                <WarningButton
                    ariaLabel="Generate a random title for the story"
                    disabled={generationRequestActive}
                    confirmButtonText={`Generate Title`}
                    onConfirm={async () => {
                        if (!currentStory || !currentStoryContent) {
                            return
                        }
                        generateTitle(currentStory, currentStoryContent)
                        if (!/^New Story( \(copy\)| \(\d+\))*$/.test(currentStory.title))
                            setSessionStorage('titleGenWarning', 'false')
                    }}
                    iconURL={DotReset.src}
                    buttonType={WarningButtonStyle.Dark}
                    warningText={
                        <>
                            This story seems to already have a title. Are you sure you want to generate a new
                            one?
                            <br />
                            If you do, this warning will be suppressed for the remainder of this session.
                            {!subscriptionIsActive(subscription) && (
                                <Fragment>
                                    <br />
                                    <br />
                                    Title generation uses actions just as generating in the story does.
                                </Fragment>
                            )}
                        </>
                    }
                    label={`Generate a new Title?`}
                    buttonText={<GiPerspectiveDiceSixFacesRandom style={{ width: '22px', height: '22px' }} />}
                    style={{
                        height: '40px',
                        width: '41px',
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '0',
                    }}
                    bypassWarn={() => {
                        if (!currentStory || !currentStoryContent) {
                            return true
                        }
                        return (
                            /^New Story( \(copy\)| \(\d+\))*$/.test(currentStory.title) ||
                            getSessionStorage('titleGenWarning') === 'false'
                        )
                    }}
                />
            </Tooltip>
            <div style={{ width: 3 }} />
        </div>
    )
}

const HistoryButton = styled(SubtleButton)`
    opacity: 0.7;
    &:hover {
        opacity: 1;
    }
    transition: opacity 0.1s ease-in-out;
`
