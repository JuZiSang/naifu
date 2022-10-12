import { Buffer } from 'buffer'
import { logWarning } from '../../../util/browser'
import { StoryContent, StoryId, StoryMetadata } from '../../story/storycontainer'
import { AIModule } from '../../story/storysettings'
import { IStoryDto, KeyStorePayload, IKeyStore } from './keystore'

class KeyStoreData {
    keys: Record<string, Array<number>> = {}

    constructor(keys?: Record<string, Array<number>>) {
        if (keys) this.keys = keys
    }
    hasKey(key: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.keys, key)
    }
    setKey(key: string, value: ArrayBuffer): void {
        this.keys[key] = [...Buffer.from(value)]
    }
    getKey(key: string): ArrayBuffer {
        return new Uint8Array(Buffer.from(this.keys[key])).buffer
    }
    replaceKey(prev: string, next: string): void {
        this.keys[next] = this.keys[prev]
        delete this.keys[prev]
    }
}

export class SubtleKeyStore implements IKeyStore {
    async create(userkey: string): Promise<IKeyStore> {
        const iv = crypto.getRandomValues(new Uint8Array(16))
        const param = { name: 'AES-CBC', iv }

        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userkey))
        const cipher = await crypto.subtle.importKey('raw', hash, param, false, ['encrypt', 'decrypt'])

        this.cipher = cipher
        this.param = param
        this.data = new KeyStoreData()

        return this
    }

    async load(payload: KeyStorePayload, userkey?: string): Promise<IKeyStore> {
        if (!payload || !payload.iv || !payload.data) {
            throw new Error("Couldn't parse the response from the server")
        }

        const iv = new Uint8Array(Buffer.from(payload.iv))
        const param = { name: 'AES-CBC', iv }

        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userkey))
        const cipher = await crypto.subtle.importKey('raw', hash, param, false, ['encrypt', 'decrypt'])

        const decrypted = await crypto.subtle.decrypt(param, cipher, Buffer.from(payload.data))
        const data = JSON.parse(new TextDecoder().decode(decrypted))

        this.cipher = cipher
        this.param = param
        this.data = new KeyStoreData(data.keys)

        return this
    }

    async changeKey(userkey: string): Promise<void> {
        if (!this.param) {
            throw new Error("Can't change key of unloaded keystore")
        }
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userkey))
        const cipher = await crypto.subtle.importKey('raw', hash, this.param, false, ['encrypt', 'decrypt'])

        this.cipher = cipher
    }

    async store(): Promise<KeyStorePayload> {
        if (!this.param || !this.cipher) {
            throw 'Keystore must be loaded first'
        }
        const encrypted = await crypto.subtle.encrypt(
            this.param,
            this.cipher,
            new TextEncoder().encode(JSON.stringify(this.data))
        )
        const payload: KeyStorePayload = {
            iv: [...Buffer.from(this.param.iv as ArrayBuffer)],
            data: [...Buffer.from(encrypted)],
        }
        return payload
    }

    async updateStoryId(prev: StoryId, next: StoryId): Promise<void> {
        this.data?.replaceKey(prev, next)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async merge(_otherKeyStore: IKeyStore): Promise<void> {
        throw new Error('not implemented')
    }

    async encryptStoryMetadata(
        storyMetadata: StoryMetadata,
        keyStoreChanged: () => void = () => {
            /* nothing by default */
        }
    ): Promise<IStoryDto> {
        let hash
        if (!this.data || !this.param) {
            throw 'Keystore must be loaded first'
        }

        if (!this.data.hasKey(storyMetadata.id)) {
            const pass = crypto.getRandomValues(new Uint8Array(16))
            hash = await crypto.subtle.digest('SHA-256', pass)
            this.data.setKey(storyMetadata.id, hash)
            keyStoreChanged()
        } else {
            hash = this.data.getKey(storyMetadata.id)
        }
        const cipher = await crypto.subtle.importKey('raw', hash, this.param, false, ['encrypt', 'decrypt'])

        const serialized = storyMetadata.serialize()
        const encrypted = await crypto.subtle.encrypt(
            this.param,
            cipher,
            new TextEncoder().encode(serialized)
        )

        const dto: IStoryDto = {
            id: storyMetadata.id,
            data: Buffer.from(encrypted).toString('base64'),
            lastUpdatedAt: storyMetadata.lastUpdatedAt.valueOf(),
            meta: storyMetadata.id,
            type: 'story',
            changeIndex: storyMetadata.changeIndex,
        }
        return dto
    }

    async encryptStoryContent(
        storyContent: StoryContent,
        storyMetadata: StoryMetadata,
        keyStoreChanged: () => void = () => {
            /* nothing by default */
        }
    ): Promise<IStoryDto> {
        let hash
        if (!this.data || !this.param) {
            throw 'Keystore must be loaded first'
        }
        if (!this.data.hasKey(storyMetadata.id)) {
            const pass = crypto.getRandomValues(new Uint8Array(16))
            hash = await crypto.subtle.digest('SHA-256', pass)
            this.data.setKey(storyMetadata.id, hash)
            keyStoreChanged()
        } else {
            hash = this.data.getKey(storyMetadata.id)
        }
        const cipher = await crypto.subtle.importKey('raw', hash, this.param, false, ['encrypt', 'decrypt'])

        const serialized = storyContent.serialize()
        const encrypted = await crypto.subtle.encrypt(
            this.param,
            cipher,
            new TextEncoder().encode(serialized)
        )

        const dto: IStoryDto = {
            id: storyMetadata.id,
            data: Buffer.from(encrypted).toString('base64'),
            lastUpdatedAt: storyMetadata.lastUpdatedAt.valueOf(),
            meta: storyMetadata.id,
            type: 'story',
            changeIndex: storyContent.changeIndex,
        }
        return dto
    }

    async decryptStoryMetadata(dto: IStoryDto): Promise<StoryMetadata | null> {
        if (!this.data || !this.param) {
            throw 'Keystore must be loaded first'
        }

        if (!this.data.hasKey(dto.meta)) {
            logWarning(dto.meta, false, 'No key for dto')
            return null
        }
        const hash = this.data.getKey(dto.meta)
        const cipher = await crypto.subtle.importKey('raw', hash, this.param, false, ['encrypt', 'decrypt'])

        const encrypted = new Uint8Array(Buffer.from(dto.data, 'base64')).buffer

        const decrypted = await crypto.subtle.decrypt(this.param, cipher, encrypted)

        const decoded = new TextDecoder().decode(decrypted)
        const story = StoryMetadata.deserialize(decoded)
        return story
    }

    async decryptStoryContent(dto: IStoryDto): Promise<StoryContent | null> {
        if (!this.data || !this.param) {
            throw 'Keystore must be loaded first'
        }

        if (!this.data.hasKey(dto.meta)) {
            logWarning(dto.meta, false, 'No key for dto')
            return null
        }
        const hash = this.data.getKey(dto.meta)
        const cipher = await crypto.subtle.importKey('raw', hash, this.param, false, ['encrypt', 'decrypt'])

        const encrypted = new Uint8Array(Buffer.from(dto.data, 'base64')).buffer

        const decrypted = await crypto.subtle.decrypt(this.param, cipher, encrypted)

        const decoded = new TextDecoder().decode(decrypted)
        const story = StoryContent.deserialize(decoded)
        return story
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async encryptModule(_aimodule: AIModule): Promise<IStoryDto> {
        throw undefined
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async decryptModule(_dto: IStoryDto): Promise<AIModule> {
        throw undefined
    }

    cipher?: CryptoKey
    param?: AesCbcParams
    data?: KeyStoreData
}
