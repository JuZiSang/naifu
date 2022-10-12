import { KeyStore } from '../storage/keystore/keystore'
import { StoryContent, StoryId, StoryMetadata } from '../story/storycontainer'
import { UserSettings } from './settings'

export class PaddleSubscriptionData {
    t: string = '' // Type
    c: string = '' // Cancel URL
    u: string = '' // Update Payment Information URL
    p: number = 0 // Subscription Plan ID
    s: string = '' // Status
    o: string = '' // Checkout ID
    r: string | null = '' // Order ID, null until subscription_payment_succeeded
    n: number = 0 // Next bill date, UNIX timestamp
}

export class UserSubscription {
    tier: number = 0
    expiresAt: number = 0
    active: boolean = false
    perks = {
        maxPriorityActions: 0,
        startPriority: 0,
        contextTokens: 1024,
        unlimitedMaxPriority: true,
    }
    paymentProcessorData?: PaddleSubscriptionData = new PaddleSubscriptionData()
    trainingStepsLeft: number = 0
}

export class UserPriority {
    maxPriorityActions: number = 0
    nextRefillAt: number = 0
    taskPriority: number = 0
}

export class User {
    auth_token: string = ''
    encryption_key: string = ''

    authenticated: boolean = false

    subscription: UserSubscription = new UserSubscription()
    settings: UserSettings = new UserSettings()
    priority: UserPriority = new UserPriority()
    information: UserInformation = new UserInformation()
    noAccount: boolean = false
    constructor(accesskey: string, encryptionkey: string, noAccount: boolean = false) {
        this.auth_token = accesskey
        this.encryption_key = encryptionkey
        this.noAccount = noAccount
    }
}

export class UserContext {
    keystore: KeyStore = new KeyStore()
    stories: Map<StoryId, StoryMetadata> = new Map()
    storyContentCache: Map<StoryId, StoryContent> = new Map()
    shelves: Map<StoryId, StoryMetadata> = new Map()

    remoteStories: Set<StoryId> = new Set()
}

export class UserInformation {
    accountCreatedAt: number = 0
    emailVerified: boolean = false
    emailVerificationLetterSent: boolean = false
    trialActivated: boolean = false
    trialActionsLeft: number = 0
}
