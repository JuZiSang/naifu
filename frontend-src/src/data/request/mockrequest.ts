import { EncoderType } from '../../tokenizer/encoder'
import { WorkerInterface } from '../../tokenizer/interface'
import { KeyStore } from '../storage/keystore/keystore'
import { StorySettings, TextGenerationSettings } from '../story/storysettings'
import { User, UserInformation } from '../user/user'
import { UserSettings } from '../user/settings'
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
    StableDiffusionParameters,
    ImageGenerationModels,
    DalleMiniParameters,
} from './request'

export class MockGenerationRequest implements IGenerationRequest {
    context: number[]
    parameters: TextGenerationSettings
    user: User

    constructor(user: User, context: number[], settings: StorySettings) {
        this.context = context
        this.parameters = JSON.parse(JSON.stringify(settings.parameters))
        this.user = user
    }

    async request(): Promise<IGenerationRequestResponse> {
        await new Promise((r) => setTimeout(r, 500))
        const response = ' ' + (await new WorkerInterface().decode([...this.context], EncoderType.GPT2))
        return {
            text: response.slice(-50),
        }
    }

    async requestStream(): Promise<void> {
        throw 'unimplemented'
    }
}

export class MockLoginRequest implements ILoginRequest {
    access_key: string
    encryption_key: string
    auth_token?: string

    constructor(access_key: string, encryption_key: string, auth_token?: string) {
        this.access_key = access_key
        this.encryption_key = encryption_key
        this.auth_token = auth_token
    }

    async login(): Promise<ILoginResponse> {
        const response: ILoginResponse = {
            settings: new UserSettings(),
            session: {
                authenticated: true,
                keystore: new KeyStore(),
                auth_token: this.auth_token ?? 'mock',
            },
            subscription: {
                tier: 0,
                expiresAt: 0,
                active: false,
                perks: {
                    maxPriorityActions: 1000,
                    startPriority: 10,
                    contextTokens: 2048,
                    unlimitedMaxPriority: true,
                },
                paymentProcessorData: undefined,
                trainingStepsLeft: 100,
            },
            priority: {
                maxPriorityActions: 1000,
                nextRefillAt: 0,
                taskPriority: 0,
            },
            information: new UserInformation(),
        }
        return response
    }
}

export class MockRegisterRequest implements IRegisterRequest {
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
        return { auth_token: 'mock' }
    }
}

export class MockSubscriptionRequest implements ISubscriptionRequest {
    auth_token: string
    constructor(auth_token: string) {
        this.auth_token = auth_token
    }
    async request(): Promise<ISubscriptionResponse> {
        return {
            subscription: {
                tier: 0,
                expiresAt: 0,
                active: false,
                perks: {
                    maxPriorityActions: 1000,
                    startPriority: 10,
                    contextTokens: 2048,
                    unlimitedMaxPriority: true,
                },
                paymentProcessorData: undefined,
                trainingStepsLeft: 100,
            },
            priority: {
                maxPriorityActions: 1000,
                nextRefillAt: 0,
                taskPriority: 0,
            },
        }
    }
}

export class MockSubscriptionBindRequest implements ISubscriptionBindRequest {
    auth_token: string
    paymentProcessor: string
    subscriptionId: string

    constructor(auth_token: string, paymentProcessor: string, subscriptionId: string) {
        this.auth_token = auth_token
        this.paymentProcessor = paymentProcessor
        this.subscriptionId = subscriptionId
    }

    async request(): Promise<void> {
        return
    }
}

export class MockSubscriptionChangeRequest implements ISubscriptionChangeRequest {
    auth_token: string
    newSubscriptionPlan: string

    constructor(auth_token: string, newSubscriptionPlan: string) {
        this.auth_token = auth_token
        this.newSubscriptionPlan = newSubscriptionPlan
    }

    async request(): Promise<void> {
        return
    }
}

export class MockRecoveryInitiationRequest implements IRecoveryInitiationRequest {
    email: string

    constructor(email: string) {
        this.email = email
    }

    async request(): Promise<void> {
        return
    }
}

export class MockMockRecoverySubmitRequest implements IRecoverySubmitRequest {
    recoveryToken: string
    newAccessKey: string

    constructor(recoveryToken: string, newAccessKey: string) {
        this.recoveryToken = recoveryToken
        this.newAccessKey = newAccessKey
    }

    async request(): Promise<void> {
        return
    }
}

export class MockPurchaseStepsRequest {
    async request(): Promise<void> {
        return
    }
}

export class MockVerifyEmailRequest {
    async request(): Promise<void> {
        return
    }
}

export class MockDeleteAccountRequest {
    async request(): Promise<void> {
        return
    }
}

export class MockImageGenerationRequest {
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
        this.parameters = parameters
    }
    async requestStream(): Promise<void> {
        return
    }
}
