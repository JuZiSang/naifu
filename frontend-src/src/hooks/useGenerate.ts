import { useRecoilCallback } from 'recoil'

import { EventHandler } from '../data/event/eventhandling'
import { DefaultModel, TextGenerationModel } from '../data/request/model'
import { StoryContent, StoryMetadata } from '../data/story/storycontainer'
import {
    CustomModules,
    GenerationRequestActive,
    GenerationRequestCancelled,
    LastContextReport,
    LastResponse,
    Session,
    StoryUpdate,
    TrialUsageRemaining,
} from '../globals/state'
import { getAvailiableModels, modelsCompatible, prefixModel } from '../util/models'
import { getAccountContextLimit, subscriptionIsActive } from '../util/subscription'
import { buildContext, ContextFieldStatus, ContextReport } from '../data/ai/context'
import { AdditionalRequestData, getGenerationRequest, IGenerationRequest } from '../data/request/request'
import {
    adjustableParams,
    adjustSetting,
    chooseGenerationPlacebo,
    GenerationPlacebo,
    getRandomInt,
    getRandomPlaceboBias,
    isNonsenseAllowed,
    randomArrayElement,
} from '../util/placebo'
import { ContextEntry, getDefaultAuthorsNoteConfig } from '../data/ai/contextfield'
import { PrefixOptions } from '../data/story/defaultprefixes'
import { GlobalUserContext } from '../globals/globals'
import { getStorage } from '../data/storage/storage'
import { modelMaxContextSize, modelSupportsModules } from '../data/ai/model'
import { MaxTokens } from '../globals/constants'
import { getModelEncoderType } from '../tokenizer/encoder'
import { WorkerInterface } from '../tokenizer/interface'
import { DataOrigin } from '../data/story/story'
import { getSessionStorage, setSessionStorage } from '../util/storage'
import { playAudio } from '../util/extras'
import { getUserSetting, TTSType } from '../data/user/settings'
import { LogProbs } from '../data/request/remoterequest'
import { speakTTS } from '../components/controls/tts'
import { useGenerateComment } from '../components/comment'
import { getInlineGenSettings } from '../data/story/defaultpresets'
import { logDebug } from '../util/browser'

export const enum GenerateErrorType {
    generic = 0,
    modelUnavailable = 1,
    contextSetup = 2,
    trialUsed = 4,
    freeLimitReached = 5,
    noSubscription = 6,
    requestFailed = 7,
    unauthorized = 8,
}
interface ModelUnavailableWarning {
    type: GenerateErrorType.modelUnavailable
    model: string
    changedTo?: string
}
interface GenericError {
    type: GenerateErrorType.generic
    message: string
}
interface RequestError {
    type: GenerateErrorType.requestFailed
    message: string
}
interface OtherError {
    type:
        | GenerateErrorType.contextSetup
        | GenerateErrorType.trialUsed
        | GenerateErrorType.noSubscription
        | GenerateErrorType.freeLimitReached
        | GenerateErrorType.unauthorized
}
export type GenerateError = ModelUnavailableWarning | GenericError | RequestError | OtherError

export type GenerationCompleteCallback = (
    response: string,
    tokenResponse: number[],
    logprobs?: LogProbs[],
    shouldComment?: boolean
) => void
export type RequestWrapper = (
    story: StoryContent,
    request: IGenerationRequest,
    startIndex: number,
    endIndex: number,
    onGenerationComplete: GenerationCompleteCallback,
    onGenerationError: (error: any) => void,
    onGenerationUpdate: () => Promise<boolean>,
    context: ContextReport
) => Promise<void>

type GenerateFunction = (
    storyText: string,
    storyMetadata: StoryMetadata,
    storyContent: StoryContent,
    eventHandler: EventHandler,
    start?: number | undefined,
    end?: number | undefined
) => Promise<void>
export interface UseGenerateProps {
    onError: (error: GenerateError) => void
    onRequest: RequestWrapper
}
export const useGenerate = ({ onError, onRequest }: UseGenerateProps): GenerateFunction => {
    const isCancelled = useRecoilCallback(({ snapshot }) => async () => {
        return await snapshot.getPromise(GenerationRequestCancelled)
    })

    const generateComment = useGenerateComment()

    const generate = useRecoilCallback(
        ({ snapshot, set }) =>
            async (
                storyText: string,
                storyMetadata: StoryMetadata,
                storyContent: StoryContent,
                eventHandler: EventHandler,
                start?: number,
                end?: number
            ) => {
                const session = await snapshot.getPromise(Session)
                const userModules = await snapshot.getPromise(CustomModules)
                const trialUsage = await snapshot.getPromise(TrialUsageRemaining)

                const models = getAvailiableModels(session.subscription.tier >= 3)
                const allModels = getAvailiableModels(true)

                let model =
                    storyContent.settings.model ||
                    getUserSetting(session.settings, 'defaultModel') ||
                    DefaultModel

                if (!models.some((m) => modelsCompatible(m.str, model))) {
                    onError({
                        type: GenerateErrorType.modelUnavailable,
                        model: allModels.find((m) => modelsCompatible(m.str, model))?.label ?? 'Unknown',
                        changedTo: allModels.find((m) => m.str === DefaultModel)?.label,
                    })

                    storyContent.settings.model = DefaultModel
                    model = DefaultModel
                    set(StoryUpdate(storyMetadata.id), storyMetadata.save())
                }
                const modules = [
                    ...PrefixOptions.keys(),
                    ...userModules.filter((m) => modelsCompatible(prefixModel(m.id), model)).map((m) => m.id),
                ]
                if (!subscriptionIsActive(session.subscription) && trialUsage === 0) {
                    onError({ type: GenerateErrorType.trialUsed })
                    return
                }

                set(GenerationRequestActive, true)
                set(GenerationRequestCancelled, false)
                let context: ContextReport | undefined

                const contextInserts: ContextFieldStatus[] = []
                const placebos: GenerationPlacebo[] = []
                if (isNonsenseAllowed()) {
                    placebos.unshift(
                        ...(getUserSetting(session.settings, 'april2022') ? chooseGenerationPlacebo() : [])
                    )
                    if (
                        getUserSetting(session.settings, 'april2022') &&
                        storyMetadata?.tags.includes('force error')
                    ) {
                        placebos.push(GenerationPlacebo.FalseError)
                    }
                }

                // Some nonsense
                const loadOtherStoryText = () => {
                    const randomStories = [...GlobalUserContext.storyContentCache.values()].filter((s) => {
                        return s !== storyContent
                    })
                    if (randomStories.length === 0) {
                        return
                    }
                    const randomStory = randomArrayElement(randomStories)
                    const lines = randomStory.getStoryText().split('\n')
                    const lineIndex = getRandomInt(lines.length - 1)
                    const randomText = lines.slice(lineIndex, lineIndex + 3).join('\n')
                    const entry = new ContextEntry(getDefaultAuthorsNoteConfig(), randomText)
                    entry.contextConfig.insertionPosition = -1 * getRandomInt(6, 2)
                    entry.contextConfig.budgetPriority = Number.NEGATIVE_INFINITY
                    const entryStatus = new ContextFieldStatus(entry)
                    entryStatus.type = 'redacted'
                    entryStatus.identifier = '█████████'
                    contextInserts.push(entryStatus)
                }

                for (const p of placebos) {
                    switch (p) {
                        case GenerationPlacebo.InsertOtherUnloadedStory:
                            if (GlobalUserContext.storyContentCache.size <= 5) {
                                const randomStory = randomArrayElement([
                                    ...GlobalUserContext.stories.values(),
                                ])
                                if (randomStory.id === storyMetadata?.id) break
                                const storage = getStorage(session)
                                const storyContent = await storage.getStoryContent(randomStory)
                                GlobalUserContext.storyContentCache.set(randomStory.id, storyContent)
                            }
                            loadOtherStoryText()
                            break
                        case GenerationPlacebo.InsertOtherLoadedStory:
                            loadOtherStoryText()
                            break
                        case GenerationPlacebo.Dinkus:
                            {
                                const entry = new ContextEntry(getDefaultAuthorsNoteConfig(), '\n***')
                                entry.contextConfig.insertionPosition = -1
                                entry.contextConfig.budgetPriority = Number.NEGATIVE_INFINITY
                                entry.contextConfig.suffix = ''
                                const entryStatus = new ContextFieldStatus(entry)
                                entryStatus.type = 'redacted'
                                entryStatus.identifier = 'Dinkus'
                                contextInserts.push(entryStatus)
                            }
                            break
                        case GenerationPlacebo.LoadedStoryLorebookEntry: {
                            const randomStories = [...GlobalUserContext.storyContentCache.values()].filter(
                                (s) => {
                                    return s !== storyContent
                                }
                            )
                            if (randomStories.length === 0) {
                                break
                            }
                            const randomStory = randomArrayElement(randomStories)
                            if (randomStory.lorebook.entries.length === 0) {
                                break
                            }
                            const randomLoreEntry = randomArrayElement(randomStory.lorebook.entries)
                            const entryStatus = new ContextFieldStatus(randomLoreEntry)
                            entryStatus.type = 'redacted'
                            entryStatus.identifier = randomLoreEntry.displayName
                            contextInserts.push(entryStatus)
                        }
                    }
                }
                //

                const actualStart = start && start < 0 ? storyText.length - start : start
                const actualEnd = end && end < 0 ? storyText.length - end : end

                let tokensReservedAfter = 0
                const isBidirectionalInlineGeneration =
                    actualStart !== undefined &&
                    (actualEnd ?? actualStart) !== storyText.length &&
                    getUserSetting(session.settings, 'bidirectionalInline') === true

                const encoderType = getModelEncoderType(
                    isBidirectionalInlineGeneration ? TextGenerationModel.infill : storyContent.settings.model
                )

                try {
                    let limit = Math.min(getAccountContextLimit(session), modelMaxContextSize(model))
                    limit = limit - storyContent.settings.parameters.max_length
                    if (
                        getUserSetting(session.settings, 'continueGenerationToSentenceEnd') &&
                        !isBidirectionalInlineGeneration
                    ) {
                        limit -= 20
                    }
                    if (isBidirectionalInlineGeneration) {
                        limit += storyContent.settings.parameters.max_length
                        limit -= 100 // Max length for bidirectional inline generation
                        tokensReservedAfter = Math.floor(limit * 0.35)
                        limit -= tokensReservedAfter
                    }
                    context = await buildContext(
                        storyContent,
                        eventHandler,
                        limit,
                        getUserSetting(session.settings, 'prependPreamble'),
                        actualStart,
                        undefined,
                        contextInserts,
                        storyText,
                        encoderType
                    )
                } catch (error) {
                    set(GenerationRequestActive, false)
                    throw error
                }
                const slicedStoryText = context.preContextText.slice(
                    Math.max(0, (actualStart ?? context.preContextText.length) - MaxTokens * 20),
                    Math.min(context.preContextText.length, actualStart ?? context.preContextText.length)
                )

                let spacesToTrim = 0
                let actualContextText = context.output
                if (getUserSetting(session.settings, 'trimTrailingSpaces')) {
                    const matchContextSpaces = actualContextText.match(/ +$/)
                    let contextSpaces = 0
                    if (matchContextSpaces && matchContextSpaces[0]) {
                        contextSpaces = matchContextSpaces[0].length
                    }
                    const matchStorySpaces = slicedStoryText.match(/ +$/)
                    let storySpaces = 0
                    if (matchStorySpaces && matchStorySpaces[0]) {
                        storySpaces = matchStorySpaces[0].length
                    }
                    spacesToTrim = contextSpaces === storySpaces ? contextSpaces : 0
                    if (spacesToTrim !== 0) {
                        actualContextText = actualContextText.slice(0, -1 * spacesToTrim)
                    }
                    actualContextText = actualContextText.replace(/ +$/gm, '')
                    actualContextText = actualContextText.replace(/\n+/g, '\n')
                    const startTrimmed = actualContextText.trimStart()
                    if (startTrimmed.length > 0) actualContextText = startTrimmed
                }
                context.spacesTrimmed = spacesToTrim
                if (context.contextStatuses.find((s) => s.type === 'story')?.included) {
                    const lastSection = context.structuredOutput.slice(-1)[0]
                    if (lastSection && lastSection.type !== 'story' && lastSection.type !== 'redacted') {
                        onError({ type: GenerateErrorType.contextSetup })
                    }
                }

                //some nonsense
                for (const p of placebos) {
                    switch (p) {
                        case GenerationPlacebo.FalseError:
                            actualContextText += '\nError:'
                            break
                    }
                }
                //
                const worker = new WorkerInterface()
                set(LastContextReport, context)
                let requestInput = await worker.encode(actualContextText, encoderType)
                requestInput = [...context.preamble.tokens, ...requestInput]
                if (isBidirectionalInlineGeneration) {
                    const afterContextStartIndex = actualEnd ?? actualStart ?? storyText.length - spacesToTrim
                    const afterContextText = storyText.slice(
                        afterContextStartIndex,
                        afterContextStartIndex + tokensReservedAfter * 8
                    )
                    const afterContextTokens = await worker.encode(afterContextText, encoderType)
                    const fillToken = await worker.encode('<|masklen3|>', encoderType)
                    const fillStartToken = await worker.encode(`<|infillstart|>`, encoderType)

                    requestInput = [
                        ...requestInput,
                        ...fillToken,
                        ...afterContextTokens.slice(0, tokensReservedAfter),
                        ...fillStartToken,
                    ]
                }

                // setEdited(true) // TODO
                const paramOverride: any = {}
                if (isBidirectionalInlineGeneration) {
                    paramOverride.model = TextGenerationModel.infill
                    paramOverride.max_length = 100
                    paramOverride.generate_until_sentence = false
                    const [fillEndToken] = await worker.encode(`<|infillend|>`, encoderType)
                    paramOverride.eos_token_id = fillEndToken
                }
                if (storyContent.settings.dynamicPenaltyRange) {
                    const encoded = await worker.encode(
                        context.output.slice(context.orderZeroPoint),
                        encoderType
                    )
                    paramOverride.repetition_penalty_range = Math.max(encoded.length, 1)
                }

                const additional: AdditionalRequestData = {
                    phraseBias: [
                        ...(storyContent.phraseBiasGroups ?? []),
                        ...context.biases.flatMap((b) => b.groups),
                    ],
                    eosSequences: storyContent.eosSequences,
                    bannedTokens: storyContent.bannedSequenceGroups,
                }

                //some nonsense
                for (const p of placebos) {
                    switch (p) {
                        case GenerationPlacebo.RandomModule:
                            if (modelSupportsModules(storyContent.settings.model)) {
                                const randomPrefix = randomArrayElement(modules)
                                if (randomPrefix) paramOverride.prefix = randomPrefix
                            }
                            break
                        case GenerationPlacebo.BiasRandom:
                            additional.phraseBias = [
                                ...(additional?.phraseBias ?? []),
                                getRandomPlaceboBias(storyContent.settings.model),
                            ]
                            break
                        case GenerationPlacebo.AdjustSettings:
                            for (const [param, val] of Object.entries(storyContent.settings.parameters)) {
                                if (
                                    typeof val === 'number' &&
                                    Math.random() < 0.25 &&
                                    adjustableParams.includes(param)
                                ) {
                                    paramOverride[param] = adjustSetting(param, val)
                                }
                            }

                            break
                    }
                }
                //

                const request = getGenerationRequest(
                    session,
                    requestInput,
                    isBidirectionalInlineGeneration ? getInlineGenSettings() : storyContent.settings,
                    additional,
                    paramOverride
                )
                logDebug(request)
                const length = storyText.length
                const startIndex =
                    actualStart !== undefined ? actualStart - spacesToTrim : length - spacesToTrim
                let endIndex = actualEnd ?? length
                if (isBidirectionalInlineGeneration && actualStart === actualEnd) {
                    endIndex = startIndex
                }

                if (startIndex < 0 || startIndex > endIndex || startIndex > length || endIndex > length) {
                    throw `Something went wrong calculating actualStart and actualEnd index of \
                        response: actualStart ${startIndex}, actualEnd ${endIndex}, length ${length}`
                }

                storyContent.didGenerate = true

                let textToRead = ''
                if (storyContent.story) {
                    // TODO: handle document
                    const lastInsertion = storyContent.story.lastInsertionInfo()
                    if (
                        getUserSetting(session.settings, 'speakInputs') &&
                        lastInsertion[lastInsertion.length - 1].type === DataOrigin.user
                    ) {
                        textToRead += lastInsertion[lastInsertion.length - 1].text
                    }
                }

                // Some nonsense
                for (const p of placebos) {
                    switch (p) {
                        case GenerationPlacebo.FalseError:
                            const response = await request.request()
                            set(GenerationRequestActive, false)
                            const lines = (response?.text ?? '').split('\n')
                            onError({
                                type: GenerateErrorType.generic,
                                message: `Error:${lines[0] ? lines[0] : lines[1]}`,
                            })
                            return
                    }
                }
                //

                const onGenerationComplete = (
                    response: string,
                    tokenResponse: number[],
                    logprobs?: LogProbs[],
                    shouldComment?: boolean
                ) => {
                    if (shouldComment) generateComment()
                    set(GenerationRequestCancelled, false)
                    set(GenerationRequestActive, false)
                    set(LastResponse, { tokens: tokenResponse, logprobs, tokenizer: encoderType })
                    storyMetadata.textPreview = storyText.slice(0, 250)
                    set(StoryUpdate(storyMetadata.id), storyMetadata.save())
                    textToRead += response

                    //some nonsense
                    if (isNonsenseAllowed() && (response.includes(' sans') || response.includes(' Sans'))) {
                        const lastMegPlay = getSessionStorage('lastMegPlay')
                        // play at most once every 3 hours
                        if (!lastMegPlay || Number.parseInt(lastMegPlay) < Date.now() - 10800000) {
                            playAudio('/audio/meg.mp3').then(() =>
                                setSessionStorage('lastMegPlay', `${Date.now()}`)
                            )
                        }
                    }
                    //

                    if (
                        getUserSetting(session.settings, 'speakOutputs') &&
                        getUserSetting(session.settings, 'ttsType') !== TTSType.Off
                    )
                        speakTTS(getUserSetting(session.settings, 'ttsType'), session, textToRead, {
                            error: (error) => onError({ type: GenerateErrorType.generic, message: error }),
                        })
                }

                const onGenerationError = (err: any) => {
                    set(GenerationRequestActive, false)
                    set(GenerationRequestCancelled, false)
                    if (err.status === 402 || err.status === '402') {
                        if (err.message?.includes?.call(err.message, 'quota reached')) {
                            onError({ type: GenerateErrorType.freeLimitReached })
                        } else {
                            onError({ type: GenerateErrorType.noSubscription })
                        }
                        return
                    }
                    if (err.status === 401 || err.status === '401') {
                        onError({ type: GenerateErrorType.unauthorized })
                        return
                    }
                    if (`${err.message}` === 'Unknown error, please try again.') {
                        // TODO: something? Ignore for now
                    } else {
                        onError({ type: GenerateErrorType.requestFailed, message: `${err.message}` })
                    }
                }

                // eslint-disable-next-line unicorn/consistent-function-scoping
                const onGenerationUpdate = async () => {
                    if (await isCancelled()) {
                        return false
                    }
                    return true
                }

                try {
                    await onRequest(
                        storyContent,
                        request,
                        startIndex,
                        endIndex,
                        onGenerationComplete,
                        onGenerationError,
                        onGenerationUpdate,
                        context
                    )
                } catch (error) {
                    onGenerationError(error)
                    set(GenerationRequestCancelled, false)
                    set(GenerationRequestActive, false)
                }

                set(TrialUsageRemaining, (v) => {
                    return Math.max(v - 1, 0)
                })
            }
    )
    return generate
}
