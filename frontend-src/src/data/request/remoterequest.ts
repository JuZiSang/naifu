import { Buffer } from 'buffer'
import { SSE } from 'sse.js'
import { toast } from 'react-toastify'
import {
    BackendURLSubscriptions,
    BackendURLGenerate,
    BackendURLLogin,
    BackendURLRegister,
    BackendURLPriority,
    BackendURLSubscriptionBind,
    BackendURLSubscriptionsChange,
    BackendURLRecoveryInitiation,
    BackendURLRecoverySubmit,
    BackendURLPurchaseSteps,
    BackendURLGenerateStream,
    BackendURLChangeAuth,
    BackendURLVerifyEmail,
    BackendURLUserData,
    BackendURLVerifyDeleteAccount,
    BackendURLGenerateImage,
} from '../../globals/constants'
import { logError, logWarning } from '../../util/browser'
import { fetchWithTimeout } from '../../util/general'
import { KeyStore } from '../storage/keystore/keystore'
import {
    LogitWarper,
    logitWarperNum,
    NoModule,
    StorySettings,
    TextGenerationSettings,
} from '../story/storysettings'
import { User, UserInformation, UserPriority, UserSubscription } from '../user/user'
import { UserSettings } from '../user/settings'
import {
    modelHasScaledRepetitionPenalty,
    modelSupportsModules,
    modelSupportsPhraseBias,
    MODEL_EUTERPE_V2,
    MODEL_GENJIJP6B_V2,
} from '../ai/model'
import Encoder, { EncoderType, getModelEncoderType } from '../../tokenizer/encoder'
import { getGlobalEncoder, prepareGlobalEncoder, WorkerInterface } from '../../tokenizer/interface'
import { checkNeed } from '../../tokenizer/util'
import {
    prepareBadWords,
    getEncoderBannedBrackets,
    getEncoderBannedAdventureBrackets,
    prepareBiasGroups,
    getEncoderDefaultBias,
    prepareStopSequences,
} from '../../util/generationrequest'
import { getAvailiableModels, modelsCompatible } from '../../util/models'
import { isAdventureModeStory, formatErrorResponse } from '../../util/util'
import { DarkOld } from '../../styles/themes/darkold'
import { themeEquivalent } from '../../styles/themes/theme'
import { Dark } from '../../styles/themes/dark'
import { DefaultModel, modelFromModelId, normalizeModel, TextGenerationModel } from './model'
import {
    IGenerationRequest,
    IGenerationRequestResponse,
    ILoginRequest,
    ILoginResponse,
    IRegisterRequest,
    IRegisterResponse,
    IRecoveryInitiationRequest,
    ISubscriptionBindRequest,
    ISubscriptionChangeRequest,
    ISubscriptionRequest,
    ISubscriptionResponse,
    IRecoverySubmitRequest,
    AdditionalRequestData,
    StableDiffusionParameters,
    DalleMiniParameters,
    ImageGenerationModels,
} from './request'

export async function encodeInput(input: number[]): Promise<{ input: string; length: number }> {
    const length = input.length
    const buffer = new Uint16Array(input)
    const encoded = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    return { input: Buffer.from(encoded).toString('base64'), length }
}

export async function decodeOutput(
    output: string,
    encoderType: EncoderType
): Promise<{ text: string; tokens: Uint16Array }> {
    const encoded = new Uint8Array(Buffer.from(output, 'base64'))
    const buffer = new Uint16Array(encoded.buffer)
    return { text: await new WorkerInterface().decode([...buffer], encoderType), tokens: buffer }
}

export function decodeToNumber(output: string): number[] {
    const encoded = new Uint8Array(Buffer.from(output, 'base64'))
    return [...new Uint16Array(encoded.buffer).values()]
}

export interface LogProbToken {
    token: number
    str: string
    before: number
    after: number | null
}

export interface LogProbs {
    chosen: LogProbToken
    afters: LogProbToken[]
    befores: LogProbToken[]
}

async function mapLogProbs(probs: any, encoderType: EncoderType): Promise<LogProbs> {
    const worker = new WorkerInterface()
    return {
        chosen: {
            token: probs.chosen[0][0][0],
            before: probs.chosen[0][1][0],
            after: probs.chosen[0][1][1],
            // eslint-disable-next-line unicorn/no-await-expression-member
            str: (await worker.decode([probs.chosen[0][0]], encoderType)).replace(/\n/g, '\\n'),
        },
        afters: await Promise.all(
            probs.after.map(async (prob: any[]) => ({
                token: prob[0][0],
                before: prob[1][0],
                after: prob[1][1],
                // eslint-disable-next-line unicorn/no-await-expression-member
                str: (await worker.decode([prob[0][0]], encoderType)).replace(/\n/g, '\\n'),
            }))
        ),
        befores: await Promise.all(
            probs.before.map(async (prob: any[]) => ({
                token: prob[0][0],
                before: prob[1][0],
                after: prob[1][1],
                // eslint-disable-next-line unicorn/no-await-expression-member
                str: (await worker.decode([prob[0][0]], encoderType)).replace(/\n/g, '\\n'),
            }))
        ),
    }
}

function mapLogProbsSync(probs: any, encoderType: EncoderType): LogProbs {
    const encoder = getGlobalEncoder(encoderType)
    return {
        chosen: {
            token: probs.chosen[0][0][0],
            before: probs.chosen[0][1][0],
            after: probs.chosen[0][1][1],
            // eslint-disable-next-line unicorn/no-await-expression-member
            str: encoder.decode([probs.chosen[0][0]]).replace(/\n/g, '\\n'),
        },
        afters: probs.after.map((prob: any[]) => ({
            token: prob[0][0],
            before: prob[1][0],
            after: prob[1][1],
            // eslint-disable-next-line unicorn/no-await-expression-member
            str: encoder.decode([prob[0][0]]).replace(/\n/g, '\\n'),
        })),
        befores: probs.before.map((prob: any[]) => ({
            token: prob[0][0],
            before: prob[1][0],
            after: prob[1][1],
            // eslint-disable-next-line unicorn/no-await-expression-member
            str: encoder.decode([prob[0][0]]).replace(/\n/g, '\\n'),
        })),
    }
}

const excludedValues: Set<keyof TextGenerationSettings> = new Set([
    'textGenerationSettingsVersion',
    'eos_token_id',
    'bad_words_ids',
    'logit_bias_groups',
    'order',
])

function textGenToParams(settings: TextGenerationSettings) {
    const params: any = {}
    for (const key of Object.keys(settings) as (keyof TextGenerationSettings)[]) {
        if (!excludedValues.has(key)) {
            params[key] = settings[key]
        }
    }
    return params
}

export class RemoteGenerationRequest implements IGenerationRequest {
    context: number[]
    parameters: TextGenerationSettings
    user: User
    storySettings: StorySettings
    additional?: AdditionalRequestData
    paramOverride?: any
    model: TextGenerationModel
    constructor(
        user: User,
        context: number[],
        storySettings: StorySettings,
        additional?: AdditionalRequestData,
        paramOverride?: Record<string, unknown>
    ) {
        this.context = context
        this.storySettings = { ...storySettings }
        this.parameters = JSON.parse(JSON.stringify(storySettings.parameters))
        this.user = user
        this.paramOverride = paramOverride
        this.additional = additional
        this.model =
            this.paramOverride?.model ||
            this.storySettings.model ||
            this.user.settings.defaultModel ||
            DefaultModel
        if (this.paramOverride?.model) delete this.paramOverride.model
    }

    async prepareRequest(): Promise<RequestInit> {
        const encoderType = getModelEncoderType(this.model)
        await prepareGlobalEncoder(encoderType)

        if (encoderType == EncoderType.CLIP) {
            throw new Error('remote request does not support clip encoder')
        }

        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: this.user.noAccount
                ? { 'Content-Type': 'application/json' }
                : {
                      'Content-Type': 'application/json',
                      Authorization: 'Bearer ' + this.user.auth_token,
                  },
            method: 'POST',
        }
        // Copy params
        let params = textGenToParams(this.parameters)
        // downcast requested model to available model if required
        const modelOptions = getAvailiableModels(this.user.subscription.tier >= 3, true)
        this.model = (
            modelOptions.find((m) => m.str === normalizeModel(this.model)) ??
            modelOptions.find((m) => m.str === normalizeModel(this.storySettings.model)) ??
            modelOptions.find(
                (m) => m.str === normalizeModel(this.user.settings.defaultModel ?? DefaultModel)
            ) ??
            modelOptions.find((m) => m.str === DefaultModel) ??
            modelOptions[0]
        ).str

        // Add banned tokens
        params.bad_words_ids = await prepareBadWords(this.additional?.bannedTokens ?? [], encoderType)

        // Add additional banned tokens
        if (this.storySettings.banBrackets) {
            // All tokens that include [, ], {, or } characters
            params.bad_words_ids = [
                ...params.bad_words_ids,
                ...getEncoderBannedBrackets(getModelEncoderType(this.model)),
            ]
        }
        if (isAdventureModeStory(this.storySettings)) {
            params.bad_words_ids = [
                ...params.bad_words_ids,
                ...getEncoderBannedAdventureBrackets(getModelEncoderType(this.model)),
            ]
        }

        // Add phrase bias
        let logit_bias_exp = modelSupportsPhraseBias(this.model)
            ? await prepareBiasGroups(this.additional?.phraseBias ?? [], encoderType)
            : []
        logit_bias_exp = [...logit_bias_exp, ...getEncoderDefaultBias(getModelEncoderType(this.model))]
        // Set stop sequences
        const stop_sequences = await prepareStopSequences(this.additional?.eosSequences ?? [], encoderType)
        if (stop_sequences.length > 0) {
            params.stop_sequences = stop_sequences
        }

        // Add default biases
        const defaultBiasList = []
        if (this.user.settings.defaultBias && modelSupportsPhraseBias(this.model)) {
            switch (encoderType) {
                case EncoderType.GPT2:
                    defaultBiasList.push([8162], [46256, 224])
                    break
                case EncoderType.PileNAI:
                    defaultBiasList.push([9264], [50260])
                    break
                case EncoderType.Pile:
                    defaultBiasList.push([9264], [46256, 224])
                    break
            }
        }

        for (const token of defaultBiasList) {
            if (!logit_bias_exp.some((sequence) => JSON.stringify(sequence) === JSON.stringify(token))) {
                logit_bias_exp = [
                    ...logit_bias_exp,
                    {
                        sequence: token,
                        bias: -0.12,
                        ensure_sequence_finish: false,
                        generate_once: false,
                    },
                ]
            }
        }

        let translatedRepPenalty = this.parameters.repetition_penalty
        if (modelHasScaledRepetitionPenalty(this.model)) {
            const oldRange = 1 - 8.0
            const newRange = 1 - 1.525
            translatedRepPenalty = ((translatedRepPenalty - 1) * newRange) / oldRange + 1
        }

        if (!modelSupportsModules(this.model) || this.storySettings.prefix === '') {
            this.storySettings.prefix = NoModule
        }

        // Biases are backwards on Genji for unknown reasons
        if (modelsCompatible(this.model, TextGenerationModel.genjijp6bv2)) {
            const tempBiases = []
            for (const l of logit_bias_exp) {
                tempBiases.push({ ...l, bias: l.bias * -1 })
            }
            logit_bias_exp = tempBiases
        }
        // Manage Order
        const order = []
        for (const o of this.parameters.order ?? []) {
            if (!o.enabled) {
                switch (o.id) {
                    case LogitWarper.Temperature:
                        break
                    case LogitWarper.TopK:
                        delete params.top_k
                        break
                    case LogitWarper.TopP:
                        delete params.top_p
                        break
                    case LogitWarper.TFS:
                        delete params.tail_free_sampling
                        break
                    case LogitWarper.TopA:
                        delete params.top_a
                        break
                    case LogitWarper.TypicalP:
                        delete params.typical_p
                        break
                }
            } else {
                order.push(logitWarperNum(o.id))
            }
        }
        params = { ...params }

        // prevent backend from going nuts
        if (params.top_k < 0) {
            delete params.top_k
        }
        if (params.top_p <= 0 || params.top_p > 1.0) {
            delete params.top_p
        }
        if (params.tail_free_sampling <= 0 || params.tail_free_sampling > 1.0) {
            delete params.tail_free_sampling
        }
        if (!params.bad_words_ids || params.bad_words_ids.length === 0) {
            delete params.bad_words_ids
        }

        const tokenized = await encodeInput(this.context)
        if (params.repetition_penalty_range == 0) {
            delete params.repetition_penalty_range
        }
        if (params.repetition_penalty_slope == 0) {
            delete params.repetition_penalty_slope
        }

        let requestLogProbs = Number.parseInt((window as any).gimmeMoreLogProbs)
        if (Number.isNaN(requestLogProbs)) {
            requestLogProbs = 10
        }
        requestLogProbs = Math.min(100, Math.abs(requestLogProbs))

        const encoder = getGlobalEncoder(encoderType) as Encoder
        // Give warning for banned/biased tokens that are out of range
        const maxTokens = Object.keys(encoder.encoder).length + Object.keys(encoder.addedTokens).length
        const validBans = []
        for (const token of params.bad_words_ids ?? []) {
            if (token < 0 || token >= maxTokens) {
                toast(`Banned token [${token}] is out of range and will be ignored.`)
            } else {
                validBans.push(token)
            }
        }
        if (validBans.length > 0) {
            params.bad_words_ids = validBans
        } else {
            delete params.bad_words_ids
        }
        const validBias = []
        for (const bias of logit_bias_exp ?? []) {
            if (bias.sequence.some((token) => token < 0 || token >= maxTokens)) {
                toast(
                    `Bias [${bias.sequence.join(
                        ', '
                    )}] contains tokens that are out of range and will be ignored.`
                )
            } else {
                validBias.push(bias)
            }
        }
        if (validBias.length > 0) {
            logit_bias_exp = validBias
        } else {
            delete params.logit_bias_exp
        }

        request.body = JSON.stringify({
            input: tokenized.input,
            model: this.model,
            parameters: {
                ...params,
                min_length: Math.min(
                    Math.max(this.parameters.min_length, 1),
                    this.user.subscription.tier >= 3 ? 150 : 100
                ),
                max_length: Math.min(
                    Math.max(this.parameters.max_length, 1),
                    this.user.subscription.tier >= 3 ? 150 : 100
                ),
                repetition_penalty: translatedRepPenalty,
                generate_until_sentence: this.user.settings.continueGenerationToSentenceEnd ?? true,
                use_cache: false,
                use_string: false,
                return_full_text: false,
                prefix: this.storySettings.prefix,
                logit_bias_exp: logit_bias_exp.length > 0 ? logit_bias_exp : undefined,
                num_logprobs: this.user.settings.enableLogprobs ? requestLogProbs : undefined,
                order: order,
                ...this.paramOverride,
            },
        })
        return request
    }

    async request(): Promise<IGenerationRequestResponse> {
        const request = await this.prepareRequest()

        const response = await fetchWithTimeout(BackendURLGenerate, request, 40000)
        const json = await response.json()
        const encoderType = getModelEncoderType(this.model)

        let output
        if (json.output) {
            try {
                output = await decodeOutput(json.output, encoderType)
            } catch (error) {
                logError(error)
                output = json.output
            }
        }
        if (json.error)
            return {
                error: json.error ?? json.message,
            }

        if (response.status !== 200 && response.status !== 201)
            return {
                error: json.error ?? json.message,
            }

        const logprobs = json.logprobs
            ? await Promise.all(json.logprobs.map((l: any) => mapLogProbsSync(l, encoderType)))
            : undefined

        if (this.model === TextGenerationModel.infill && output.text.endsWith('<|infillend|>')) {
            output.text = output.text.slice(0, -'<|infillend|>'.length)
        }
        return {
            text: output.text,
            error: json.error ?? json.message,
            status: `${response.status}` ?? `${json.statusCode}` ?? `${json.status}`,
            tokens: output.tokens,
            logprobs: logprobs,
        }
    }

    async requestStream(
        onToken: (
            token: string,
            index: number,
            final: boolean,
            tokenArr: number[],
            logprobs: LogProbs[]
        ) => Promise<boolean>,
        onError: (err: { status: number; message: string }) => void
    ): Promise<void> {
        const request = await this.prepareRequest()
        const tokenBacklog: { token: number; ptr: number; final: boolean; logprobs?: LogProbs }[] = []
        let index = 0

        const source = new SSE(BackendURLGenerateStream, { headers: request.headers, payload: request.body })
        const encoderType = getModelEncoderType(this.model)
        const encoder = getGlobalEncoder(encoderType)
        const timeout = setTimeout(() => {
            source.close()
            onError({
                status: 408,
                message:
                    'Error: Timeout - Unable to reach NovelAI servers. Please wait for a moment and try again',
            })
        }, 40000)

        source.addEventListener('newToken', async (e: any) => {
            let cancel = false
            const data = JSON.parse(e.data)
            if (data.error) {
                clearTimeout(timeout)
                source.close()
                onError({ status: 0, message: data.error })
                return
            }
            const token = decodeToNumber(data.token)[0]
            tokenBacklog[data.ptr] = {
                token,
                ptr: data.ptr,
                final: data.final,
                logprobs: data.logprobs ? mapLogProbsSync(data.logprobs, encoderType) : undefined,
            }
            const tokens: { token: number; ptr: number; final: boolean; logprobs?: LogProbs }[] = []
            for (let i = index; i < data.ptr + 1; i++) {
                const tokenData = tokenBacklog[i]
                if (tokenData === undefined) {
                    break
                }
                tokens.push(tokenData)
            }

            // Check if more tokens required for actual character
            const need = checkNeed(
                tokens.map((t) => t.token),
                encoderType
            )
            if (need.complete || need.error) {
                // More tokens not needed or unitrim error occured and tokens should be released anyway

                const tempIndex = index
                index += tokens.length
                for (let i = tempIndex; i < tempIndex + tokens.length - 1; i++) {
                    cancel = !(await onToken('', i, false, [], [])) || cancel
                }
                const logprobs: LogProbs[] = []
                for (const token of tokens.map((t) => t.logprobs)) {
                    if (token) logprobs.push(token)
                }
                const tokenString = encoder.decode([
                    ...tokens
                        // filter out <|infillend|> when using inline model
                        .filter((t) => !(this.model === TextGenerationModel.infill && t.token === 50258))
                        .map((t) => t.token),
                ])
                cancel =
                    !(await onToken(
                        tokenString,
                        data.ptr,
                        data.final,
                        [...tokens.map((t) => t.token)],
                        logprobs
                    )) || cancel
            } else if (data.final || cancel) {
                // More tokens required but that was the last one
                for (let i = index; i < index + tokens.length - 1; i++) {
                    await onToken('', i, false, [], [])
                }

                await onToken('', data.ptr, true, [], [])
            }
            if (data.final) {
                clearTimeout(timeout)
                source.close()
            } else if (cancel) {
                clearTimeout(timeout)
                source.close()
                await onToken('', data.ptr + 1, true, [], [])
            }
        })
        source.addEventListener('error', (err: any) => {
            clearTimeout(timeout)
            source.close()
            if (err.detail.type !== 'abort') {
                onError({
                    status: err.detail.statusCode ?? 'unknown status',
                    message:
                        err.detail.message ??
                        (index === 0 ? "Couldn't connect to the AI." : 'Unknown error, please try again.'),
                })
                logWarning(err, true, 'streaming error')
            }
        })

        source.stream()
    }
}

export class RemoteLoginRequest implements ILoginRequest {
    access_key: string
    encryption_key: string
    auth_token?: string

    constructor(access_key: string, encryption_key: string, auth_token?: string) {
        this.access_key = access_key
        this.encryption_key = encryption_key
        this.auth_token = auth_token
    }

    async login(): Promise<ILoginResponse> {
        const result: ILoginResponse = {
            subscription: new UserSubscription(),
            session: {
                keystore: new KeyStore(),
                authenticated: false,
                auth_token: '',
            },
            settings: new UserSettings(),
            priority: new UserPriority(),
            information: new UserInformation(),
        }

        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                key: this.access_key,
            }),
        }

        if (!this.auth_token) {
            const login = await fetchWithTimeout(BackendURLLogin, request)
            if (!login.ok) {
                logError(login, false)
                throw await formatErrorResponse(login)
            }
            const response = await login.json()
            this.auth_token = response.accessToken
        }

        if (!this.auth_token) {
            throw new Error('missing auth token')
        }

        result.session.auth_token = this.auth_token
        request.headers = {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this.auth_token,
        }
        request.method = 'GET'
        delete request.body

        const userdata = fetchWithTimeout(BackendURLUserData, request)

        const response = await userdata
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        if (json?.statusCode && json?.statusCode !== 200) {
            throw json.message?.message || json.message || json.statusCode
        }

        const { subscription, keystore, settings, priority, information } = json

        try {
            await (keystore?.keystore
                ? result.session.keystore.load(keystore.keystore, this.encryption_key, keystore.changeIndex)
                : result.session.keystore.create(this.encryption_key))
        } catch (error) {
            logError(error)
            throw new Error('Unlocking the keystore failed, invalid Encryption Key?')
        }

        if (settings) {
            try {
                result.settings = {
                    ...result.settings,
                    ...(typeof settings === 'string' ? JSON.parse(settings) : settings),
                }
            } catch (error: any) {
                logError(error)
            }
        }
        if (subscription) result.subscription = subscription
        if (priority) result.priority = priority
        if (information) result.information = information

        if (!result.settings.forceModelUpdate) {
            // eslint-disable-next-line unicorn/no-lonely-if
            if (result.settings.model !== MODEL_GENJIJP6B_V2) {
                result.settings.forceModelUpdate = 1
                result.settings.model = MODEL_EUTERPE_V2
            }
        }

        // Switch to new tts toggle
        if (!result.settings.settingsVersion) {
            if (result.settings.useTTS === true) {
                result.settings.ttsType = 1
                result.settings.useTTS = undefined
            }
            result.settings.settingsVersion = 0
        }
        if (result.settings.settingsVersion === 0) {
            if (result.settings.model) {
                result.settings.defaultModel = modelFromModelId(result.settings.model)
            }
            result.settings.settingsVersion = 1
        }

        if (result.settings.settingsVersion === 1) {
            if (
                result.settings.siteTheme &&
                result.settings.siteTheme.name === 'NovelAI Dark' &&
                themeEquivalent(result.settings.siteTheme, DarkOld)
            ) {
                result.settings.siteTheme.colors = JSON.parse(JSON.stringify(Dark.colors))
            }
            result.settings.settingsVersion = 2
        }

        result.session.authenticated = true

        return result
    }
}

export class RemoteRegisterRequest implements IRegisterRequest {
    access_key: string
    captcha: string
    encryption_key: string
    email: string
    gift_key?: string

    constructor(
        access_key: string,
        encryption_key: string,
        captcha: string,
        email: string,
        gift_key?: string
    ) {
        this.access_key = access_key
        this.captcha = captcha
        this.encryption_key = encryption_key
        this.email = email
        this.gift_key = gift_key
    }

    async register(): Promise<IRegisterResponse> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                recaptcha: this.captcha,
                key: this.access_key,
                emailCleartext: this.email,
                giftkey: this.gift_key ? this.gift_key : undefined,
            }),
        }

        const register = await fetchWithTimeout(BackendURLRegister, request)
        if (!register.ok) {
            logError(register, false)
            throw await formatErrorResponse(register)
        }
        const response = await register.json()
        const auth_token = response.accessToken

        return { auth_token }
    }
}

export class RemoteSubscriptionRequest implements ISubscriptionRequest {
    auth_token: string
    constructor(auth_token: string) {
        this.auth_token = auth_token
    }
    async getSubscription(): Promise<UserSubscription> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.auth_token,
            },
            method: 'GET',
        }
        const response = await fetchWithTimeout(BackendURLSubscriptions, request)
        if (!response.ok) {
            logError(response, false)
            throw await formatErrorResponse(response)
        }
        return await response.json()
    }
    async getPriority(): Promise<UserPriority> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.auth_token,
            },
            method: 'GET',
        }
        const response = await fetchWithTimeout(BackendURLPriority, request)
        if (!response.ok) {
            logError(response, false)
            throw await formatErrorResponse(response)
        }
        return await response.json()
    }
    async request(): Promise<ISubscriptionResponse> {
        return {
            subscription: await this.getSubscription(),
            priority: await this.getPriority(),
        }
    }
}

export class RemoteSubscriptionBindRequest implements ISubscriptionBindRequest {
    auth_token: string
    paymentProcessor: string
    subscriptionId: string

    constructor(auth_token: string, paymentProcessor: string, subscriptionId: string) {
        this.auth_token = auth_token
        this.paymentProcessor = paymentProcessor
        this.subscriptionId = subscriptionId
    }

    async request(): Promise<void> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.auth_token,
            },
            method: 'POST',
            body: JSON.stringify({
                paymentProcessor: this.paymentProcessor,
                subscriptionId: this.subscriptionId,
            }),
        }

        const bind = await fetchWithTimeout(BackendURLSubscriptionBind, request)
        if (!bind.ok) {
            logError(bind, false)
            throw await formatErrorResponse(bind)
        }
    }
}

export class RemoteSubscriptionChangeRequest implements ISubscriptionChangeRequest {
    auth_token: string
    newSubscriptionPlan: string

    constructor(auth_token: string, newSubscriptionPlan: string) {
        this.auth_token = auth_token
        this.newSubscriptionPlan = newSubscriptionPlan
    }

    async request(): Promise<void> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.auth_token,
            },
            method: 'POST',
            body: JSON.stringify({
                newSubscriptionPlan: this.newSubscriptionPlan,
            }),
        }

        const bind = await fetchWithTimeout(BackendURLSubscriptionsChange, request)
        if (!bind.ok) {
            logError(bind, false)
            throw await formatErrorResponse(bind)
        }
    }
}

export class RemoteRecoveryInitiationRequest implements IRecoveryInitiationRequest {
    email: string

    constructor(email: string) {
        this.email = email
    }

    async request(): Promise<void> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                email: this.email,
            }),
        }

        const bind = await fetchWithTimeout(BackendURLRecoveryInitiation, request)
        if (!bind.ok) {
            logError(bind, false)
            throw await formatErrorResponse(bind, false)
        }
    }
}

export class RemoteRecoverySubmitRequest implements IRecoverySubmitRequest {
    recoveryToken: string
    newAccessKey: string

    constructor(recoveryToken: string, newAccessKey: string) {
        this.recoveryToken = recoveryToken
        this.newAccessKey = newAccessKey
    }

    async request(): Promise<void> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                recoveryToken: this.recoveryToken,
                newAccessKey: this.newAccessKey,
                deleteContent: true,
            }),
        }

        const bind = await fetchWithTimeout(BackendURLRecoverySubmit, request)
        if (!bind.ok) {
            logError(bind, false)
            throw await formatErrorResponse(bind, false)
        }
    }
}

export class RemotePurchaseStepsRequest {
    auth_token: string
    steps: number
    constructor(auth_token: string, steps: number) {
        this.auth_token = auth_token
        this.steps = steps
    }
    async request(): Promise<void> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.auth_token,
            },
            method: 'POST',
            body: JSON.stringify({
                amount: this.steps,
            }),
        }

        const bind = await fetchWithTimeout(BackendURLPurchaseSteps, request)
        if (!bind.ok) {
            logError(bind, false)
            throw await formatErrorResponse(bind, false)
        }
    }
}

export class RemoteChangeAuthRequest {
    old_key: string
    new_key: string
    auth_token: string
    email?: string
    constructor(auth_token: string, old_key: string, new_key: string, email?: string) {
        this.old_key = old_key
        this.new_key = new_key
        this.auth_token = auth_token
        this.email = email
    }
    async request(): Promise<string> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.auth_token,
            },
            method: 'POST',
            body: JSON.stringify({
                currentAccessKey: this.old_key,
                newAccessKey: this.new_key,
                newEmail: this.email,
            }),
        }
        const bind = await fetchWithTimeout(BackendURLChangeAuth, request)
        if (!bind.ok) {
            logError(bind, false)
            const error =
                bind.status === 409
                    ? new Error('The email address is already in use.')
                    : await formatErrorResponse(bind, false)
            throw error
        }
        const response = await bind.json()
        return response.accessToken
    }
}

export class RemoteVerifyEmailRequest {
    verificationToken: string
    constructor(verificationToken: string) {
        this.verificationToken = verificationToken
    }
    async request(): Promise<void> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                verificationToken: this.verificationToken,
            }),
        }

        const bind = await fetchWithTimeout(BackendURLVerifyEmail, request)
        if (!bind.ok) {
            logError(bind, false)
            throw await formatErrorResponse(bind, false)
        }
    }
}

export class RemoteDeleteAccountRequest {
    deletionToken: string
    constructor(deletionToken: string) {
        this.deletionToken = deletionToken
    }
    async request(): Promise<void> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                deletionToken: this.deletionToken,
            }),
        }

        const bind = await fetchWithTimeout(BackendURLVerifyDeleteAccount, request)
        if (!bind.ok) {
            logError(bind, false)
            throw await formatErrorResponse(bind, false)
        }
    }
}

export class RemoteImageGenerationRequest {
    user: User
    input: string
    model: ImageGenerationModels
    parameters: StableDiffusionParameters | DalleMiniParameters
    constructor(
        user: User,
        input: string,
        model: ImageGenerationModels,
        parameters: StableDiffusionParameters | DalleMiniParameters
    ) {
        this.user = user
        this.input = input
        this.model = model
        if (!(parameters as StableDiffusionParameters).image) {
            delete (parameters as StableDiffusionParameters).strength
            delete (parameters as StableDiffusionParameters).noise
        }
        this.parameters = parameters
    }
    async requestStream(
        onImage: (img: Buffer, id: string) => void,
        onError: (err: { status: number; message: string }) => void,
        onClose: () => void
    ): Promise<void> {
        const request: RequestInit = {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.user.auth_token,
            },
            method: 'POST',
            body: JSON.stringify({
                prompt: this.input,
                //model: this.model,
                ...this.parameters,
            }
            /*{
                input: this.input,
                model: this.model,
                parameters: this.parameters,
            }*/),
        }

        const timeout = setTimeout(() => {
            source.close()
            onError({
                status: 408,
                message:
                    'Error: Timeout - Unable to reach NovelAI servers. Please wait for a moment and try again',
            })
        }, 120000)

        const source = new SSE(BackendURLGenerateImage, { headers: request.headers, payload: request.body })
        source.addEventListener('newImage', (message: any) => {
            clearTimeout(timeout)
            onImage(Buffer.from(message.data, 'base64'), message.id)
        })
        source.addEventListener('error', (err: any) => {
            clearTimeout(timeout)
            source.close()
            onError({
                status: err.detail.statusCode ?? 'unknown status',
                message: err.detail.message || err.detail.error,
            })
            logWarning(err, true, 'streaming error')
        })
        source.addEventListener('readystatechange', (e: any) => {
            if (source.readyState === 2) {
                onClose()
            }
        })
        source.stream()
    }
}
