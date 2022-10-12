import { Buffer } from 'buffer'
import { logError } from '../../../util/browser'
import { StoryContent, StoryId, StoryMetadata } from '../../story/storycontainer'
import { AIModule } from '../../story/storysettings'
import { SubtleKeyStore } from './subtle'

export class KeyStoreError extends Error {
    id: string
    constructor(message: string, id: string) {
        super(message)
        this.id = id
        Object.setPrototypeOf(this, KeyStoreError.prototype)
    }
}

export interface IKeyStore {
    create(userkey: string): Promise<IKeyStore>

    load(payload: KeyStorePayload, userkey: string): Promise<IKeyStore>

    store(): Promise<KeyStorePayload>

    updateStoryId(prev: StoryId, next: StoryId): Promise<void>

    merge(otherKeyStore: IKeyStore): Promise<void>

    encryptStoryMetadata(storyMetadata: StoryMetadata, keyStoreChanged: () => void): Promise<IStoryDto>

    encryptStoryContent(
        storyContent: StoryContent,
        storyMetadata: StoryMetadata,
        keyStoreChanged: () => void
    ): Promise<IStoryDto>

    decryptStoryMetadata(dto: IStoryDto): Promise<StoryMetadata | null>

    decryptStoryContent(dto: IStoryDto): Promise<StoryContent | null>

    encryptModule(aimodule: AIModule, keyStoreChanged: () => void): Promise<IStoryDto>

    decryptModule(dto: IStoryDto): Promise<AIModule>

    changeKey(userkey: string): Promise<void>
}

export interface IStoryDto {
    id: string
    data: string
    lastUpdatedAt: number
    meta: string
    type: string
    changeIndex: number
}

export class KeyStorePayload {
    iv?: Array<number>
    data?: Array<number>

    version?: number

    nonce?: Array<number>
    sdata?: Array<number>
}

export class KeyStore {
    async create(userkey: string): Promise<KeyStore> {
        await this.keystore.create(userkey)
        return this
    }
    async load(encrypted: string, userkey: string, changeIndex: number): Promise<KeyStore> {
        const buffer = Buffer.from(encrypted, 'base64')
        const payload: KeyStorePayload | undefined = JSON.parse(buffer.toString('utf8'))

        if (!payload) {
            throw new Error("Couldn't parse the response from the server")
        }

        // load legacy keystore
        if (!payload.version || (payload.iv && payload.data)) {
            try {
                const subtle = new SubtleKeyStore()
                await subtle.load(payload, userkey)
                this.legacy = subtle
                this.legacyPayload = payload
            } catch {
                try {
                    const subtle = new SubtleKeyStore()
                    await subtle.load(payload)
                    this.legacy = subtle
                    this.legacyPayload = payload
                } catch (error: any) {
                    logError(error, false, 'There is some trouble unlocking the legacy keystore')
                }
            }
        }

        // load new keystore
        await (payload.version ? this.keystore.load(payload, userkey) : this.keystore.create(userkey))

        this.changeIndex = changeIndex
        return this
    }
    async changeKey(userkey: string): Promise<void> {
        return this.keystore.changeKey(userkey)
    }
    async store(): Promise<string> {
        const payload = await this.keystore.store()
        if (this.legacyPayload) {
            payload.iv = this.legacyPayload.iv
            payload.data = this.legacyPayload.data
        }
        return Buffer.from(JSON.stringify(payload)).toString('base64')
    }
    async updateStoryId(prev: string, next: string): Promise<void> {
        return this.keystore.updateStoryId(prev, next)
    }
    async merge(otherKeyStore: KeyStore): Promise<void> {
        return this.keystore.merge(otherKeyStore.keystore)
    }
    async encryptStoryMetadata(
        storyMetadata: StoryMetadata,
        keyStoreChanged: () => void = () => {
            /* nothing by default */
        }
    ): Promise<IStoryDto> {
        return this.keystore.encryptStoryMetadata(storyMetadata, keyStoreChanged)
    }
    async encryptStoryContent(
        storyContent: StoryContent,
        storyMetadata: StoryMetadata,
        keyStoreChanged: () => void = () => {
            /* nothing by default */
        }
    ): Promise<IStoryDto> {
        return this.keystore.encryptStoryContent(storyContent, storyMetadata, keyStoreChanged)
    }
    async decryptStoryContent(dto: IStoryDto): Promise<StoryContent | null> {
        try {
            return await this.keystore.decryptStoryContent(dto)
        } catch (error: any) {
            if (this.legacy) {
                try {
                    return await this.legacy.decryptStoryContent(dto)
                } catch {
                    throw error
                }
            } else {
                throw error
            }
        }
    }
    async decryptStoryMetadata(dto: IStoryDto): Promise<StoryMetadata | null> {
        try {
            return await this.keystore.decryptStoryMetadata(dto)
        } catch (error: any) {
            if (this.legacy) {
                try {
                    return await this.legacy.decryptStoryMetadata(dto)
                } catch {
                    throw error
                }
            } else {
                throw error
            }
        }
    }

    async encryptModule(
        aimodule: AIModule,
        keyStoreChanged: () => void = () => {
            /* nothing by default */
        }
    ): Promise<IStoryDto> {
        return await this.keystore.encryptModule(aimodule, keyStoreChanged)
    }

    async decryptModule(dto: IStoryDto): Promise<AIModule> {
        return await this.keystore.decryptModule(dto)
    }

    changeIndex?: number = 1

    private keystore: IKeyStore = new SubtleKeyStore()
    private legacy?: IKeyStore
    private legacyPayload?: KeyStorePayload
}
