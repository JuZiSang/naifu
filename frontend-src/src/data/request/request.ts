import { MockEnv } from '../../globals/constants'
import { KeyStore } from '../storage/keystore/keystore'
import { BannedSequenceGroup } from '../story/bannedsequences'
import { EndOfSamplingSequence } from '../story/eossequences'
import { LogitBiasGroup } from '../story/logitbias'
import { StorySettings, TextGenerationSettings } from '../story/storysettings'
import { User, UserInformation, UserPriority, UserSubscription } from '../user/user'
import { UserSettings } from '../user/settings'
import {
    MockGenerationRequest,
    MockLoginRequest,
    MockRegisterRequest,
    MockSubscriptionBindRequest,
    MockSubscriptionRequest,
    MockSubscriptionChangeRequest,
    MockRecoveryInitiationRequest,
    MockMockRecoverySubmitRequest,
    MockPurchaseStepsRequest,
    MockVerifyEmailRequest,
    MockDeleteAccountRequest,
    MockImageGenerationRequest,
} from './mockrequest'
import {
    RemoteGenerationRequest,
    RemoteLoginRequest,
    RemoteRegisterRequest,
    RemoteSubscriptionRequest,
    RemoteSubscriptionBindRequest,
    RemoteSubscriptionChangeRequest,
    RemoteRecoveryInitiationRequest,
    RemoteRecoverySubmitRequest,
    RemotePurchaseStepsRequest,
    RemoteChangeAuthRequest,
    RemoteVerifyEmailRequest,
    LogProbs,
    RemoteDeleteAccountRequest,
    RemoteImageGenerationRequest,
} from './remoterequest'

export interface IGenerationRequestResponse {
    text?: string
    error?: string
    status?: string
    tokens?: number[]
    logprobs?: LogProbs[]
}
export interface IGenerationRequest {
    context: number[]
    parameters: TextGenerationSettings
    user: User

    request(): Promise<IGenerationRequestResponse>

    requestStream(
        onToken: (
            token: string,
            index: number,
            final: boolean,
            tokenArr: number[],
            logprobs?: LogProbs[]
        ) => Promise<boolean>,
        onError: (err: { status: number; message: string }) => void
    ): Promise<void>
}

export interface ILoginResponse {
    subscription: UserSubscription
    session: {
        keystore: KeyStore
        authenticated: boolean
        auth_token: string
    }
    settings: UserSettings
    priority: UserPriority
    information: UserInformation
}
export interface ILoginRequest {
    access_key: string
    encryption_key: string
    auth_token?: string
    gift_key?: string

    login(): Promise<ILoginResponse>
}

export interface IRegisterResponse {
    auth_token: string
}
export interface IRegisterRequest {
    access_key: string
    captcha: string
    email: string

    register(): Promise<IRegisterResponse>
}

export interface ISubscriptionResponse {
    subscription: UserSubscription
    priority: UserPriority
}
export interface ISubscriptionRequest {
    auth_token: string

    request(): Promise<ISubscriptionResponse>
}

export interface ISubscriptionBindRequest {
    auth_token: string
    paymentProcessor: string
    subscriptionId: string

    request(): Promise<void>
}

export interface ISubscriptionChangeRequest {
    auth_token: string
    newSubscriptionPlan: string

    request(): Promise<void>
}

export interface IRecoveryInitiationRequest {
    email: string

    request(): Promise<void>
}

export interface IRecoverySubmitRequest {
    recoveryToken: string
    newAccessKey: string

    request(): Promise<void>
}

export interface IPurchaseStepsRequest {
    request(): Promise<void>
}

export interface IVerifyEmailRequest {
    request(): Promise<void>
}

export interface IDeleteAccountRequest {
    request(): Promise<void>
}

export interface AdditionalRequestData {
    phraseBias?: LogitBiasGroup[]
    bannedTokens?: BannedSequenceGroup[]
    eosSequences?: EndOfSamplingSequence[]
}

export enum ImageGenerationModels {
    stableDiffusion = 'stable-diffusion',
    naiDiffusion = 'nai-diffusion',
    safeDiffusion = 'safe-diffusion',
    waifuDiffusion = 'waifu-diffusion',
    naiDiffusionFurry = 'nai-diffusion-furry',
    dalleMini = 'dalle-mini',
}

export enum StableDiffusionSampler {
    plms = 'plms',
    ddim = 'ddim',
    kEuler = 'k_euler',
    kEulerAncestral = 'k_euler_ancestral',
    kHuen = 'k_heun',
    kDpm2 = 'k_dpm_2',
    kDpm2Ancestral = 'k_dpm_2_ancestral',
    kLms = 'k_lms',
}

export interface StableDiffusionParameters {
    width: number
    height: number
    scale: number
    seed?: string
    steps?: number
    n_samples: number
    advanced?: boolean
    strength?: number
    noise?: number
    sampler: StableDiffusionSampler
    image?: string
}

export interface DalleMiniParameters {
    temperature: number
    top_k: number
    supercondition_factor: number
    n_samples: number
}

export interface IImageGenerationRequest {
    user: User
    input: string
    model: ImageGenerationModels
    parameters: StableDiffusionParameters | DalleMiniParameters
    requestStream(
        onImage: (image: Buffer, id: string) => Promise<void>,
        onError: (err: { status: number; message: string }) => void,
        onClose: () => void
    ): Promise<void>
}

export function getGenerationRequest(
    user: User,
    context: number[],
    storySettings: StorySettings,
    additional?: AdditionalRequestData,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    paramOverride?: any
): IGenerationRequest {
    return MockEnv
        ? new MockGenerationRequest(user, context, storySettings)
        : new RemoteGenerationRequest(user, context, storySettings, additional, paramOverride)
}

export function getLoginRequest(
    accesskey: string,
    encryptionkey: string,
    auth_token?: string
): ILoginRequest {
    return MockEnv
        ? new MockLoginRequest(accesskey, encryptionkey, auth_token)
        : new RemoteLoginRequest(accesskey, encryptionkey, auth_token)
}

export function getRegisterRequest(
    accesskey: string,
    encryptionkey: string,
    captcha: string,
    email: string,
    giftkey?: string
): IRegisterRequest {
    return MockEnv
        ? new MockRegisterRequest(accesskey, encryptionkey, captcha, email, giftkey)
        : new RemoteRegisterRequest(accesskey, encryptionkey, captcha, email, giftkey)
}

export function getSubscriptionRequest(auth_token: string): ISubscriptionRequest {
    return MockEnv ? new MockSubscriptionRequest(auth_token) : new RemoteSubscriptionRequest(auth_token)
}

export function getSubscriptionBindRequest(
    auth_token: string,
    paymentProcessor: string,
    subscriptionId: string
): ISubscriptionBindRequest {
    return MockEnv
        ? new MockSubscriptionBindRequest(auth_token, paymentProcessor, subscriptionId)
        : new RemoteSubscriptionBindRequest(auth_token, paymentProcessor, subscriptionId)
}

export function getSubscriptionChangeRequest(
    auth_token: string,
    newSubscriptionPlan: string
): ISubscriptionChangeRequest {
    return MockEnv
        ? new MockSubscriptionChangeRequest(auth_token, newSubscriptionPlan)
        : new RemoteSubscriptionChangeRequest(auth_token, newSubscriptionPlan)
}

export function getRecoveryInitiationRequest(email: string): IRecoveryInitiationRequest {
    return MockEnv ? new MockRecoveryInitiationRequest(email) : new RemoteRecoveryInitiationRequest(email)
}

export function getResetSubmitRequest(recoveryToken: string, newAccessKey: string): IRecoverySubmitRequest {
    return MockEnv
        ? new MockMockRecoverySubmitRequest(recoveryToken, newAccessKey)
        : new RemoteRecoverySubmitRequest(recoveryToken, newAccessKey)
}

export function getPurchaseStepsRequest(auth_token: string, steps: number): IPurchaseStepsRequest {
    return MockEnv ? new MockPurchaseStepsRequest() : new RemotePurchaseStepsRequest(auth_token, steps)
}

export function getChangeAuthRequest(
    auth_token: string,
    old_key: string,
    new_key: string,
    email?: string
): RemoteChangeAuthRequest {
    // TODO: no mock env
    return new RemoteChangeAuthRequest(auth_token, old_key, new_key, email)
}

export function getVerifyEmailRequest(verificationToken: string): IVerifyEmailRequest {
    return MockEnv ? new MockVerifyEmailRequest() : new RemoteVerifyEmailRequest(verificationToken)
}

export function getDeleteAccountRequest(deletionToken: string): IDeleteAccountRequest {
    return MockEnv ? new MockDeleteAccountRequest() : new RemoteDeleteAccountRequest(deletionToken)
}

export function getImageGenerationRequest(
    user: User,
    input: string,
    model: ImageGenerationModels,
    parameters: StableDiffusionParameters | DalleMiniParameters
): IImageGenerationRequest {
    return MockEnv
        ? new MockImageGenerationRequest(user, input, model, parameters)
        : new RemoteImageGenerationRequest(user, input, model, parameters)
}
