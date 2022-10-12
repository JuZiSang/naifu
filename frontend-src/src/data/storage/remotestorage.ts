import { Buffer } from 'buffer'
import { serialize } from 'serializr'
import {
    BackendURLKeystore,
    BackendURLStories,
    BackendURLClientSettings,
    BackendURLStoryContent,
    BackendURLPresets,
    BackendURLAIModules,
    BackendURLStoryShelves,
} from '../../globals/constants'
import { GlobalUserContext } from '../../globals/globals'
import { logError, logInfo, logWarning } from '../../util/browser'
import { fetchWithTimeout } from '../../util/general'
import { formatErrorResponse, metadataDiffers, until } from '../../util/util'
import { StoryContainer, StoryContent, StoryId, StoryMetadata } from '../story/storycontainer'
import { PresetId, StoryPreset, AIModule } from '../story/storysettings'
import { User } from '../user/user'
import { UserSettings } from '../user/settings'
import { IStoryDto, KeyStore } from './keystore/keystore'
import { IStorage } from './storage'

export class RemoteStorage implements IStorage {
    user: User

    storySaveInProgress = new Set<StoryId>()

    constructor(user: User) {
        this.user = user
    }

    request(): RequestInit {
        return {
            mode: 'cors',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.user.auth_token,
            },
        }
    }

    async getPresets(): Promise<Array<StoryPreset>> {
        const request: RequestInit = {
            ...this.request(),
        }
        const url = BackendURLPresets
        request.method = 'GET'

        const response = await fetchWithTimeout(url, request)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        if (json?.statusCode && json?.statusCode !== 200) {
            throw new Error(json.message?.message || json.message || json.statusCode)
        }

        const presets = [] as StoryPreset[]
        if (json?.objects) {
            for (const preset of json.objects) {
                try {
                    const newPreset = StoryPreset.deserialize(
                        Buffer.from(preset.data, 'base64').toString('utf8')
                    )
                    newPreset.remoteId = preset.id
                    presets.push(newPreset)
                } catch (error) {
                    logError(error, true, 'error parsing preset')
                    continue
                }
            }
        }

        return presets
    }

    async savePreset(preset: StoryPreset): Promise<PresetId> {
        const presetSaveRequest: RequestInit = {
            ...this.request(),
        }

        let contentUrl = BackendURLPresets
        if (preset.remoteId) {
            presetSaveRequest.method = 'PATCH'
            contentUrl = contentUrl + '/' + preset.remoteId
        } else {
            presetSaveRequest.method = 'PUT'
        }

        presetSaveRequest.body = JSON.stringify({
            data: Buffer.from(JSON.stringify(serialize(StoryPreset, preset))).toString('base64'),
            meta: '',
        })
        const response = await fetchWithTimeout(contentUrl, presetSaveRequest)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        preset.remoteId = json.id

        return json.id
    }

    async deletePreset(preset: StoryPreset): Promise<void> {
        const presetDeleteRequest: RequestInit = {
            ...this.request(),
            method: 'DELETE',
        }

        const presetUrl = BackendURLPresets + '/' + preset.remoteId
        const presetResponse = await fetchWithTimeout(presetUrl, presetDeleteRequest)
        if (!presetResponse.ok) {
            if (presetResponse.status === 404) {
                logWarning(formatErrorResponse(presetResponse))
            } else {
                throw await formatErrorResponse(presetResponse)
            }
        }
    }

    async saveSettings(settings: UserSettings): Promise<void> {
        const request: RequestInit = {
            ...this.request(),
        }
        const url = BackendURLClientSettings
        request.method = 'PUT'

        request.body = JSON.stringify(settings)

        const response = await fetchWithTimeout(url, request)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
    }

    async getKeyStore(): Promise<KeyStore> {
        const request: RequestInit = {
            ...this.request(),
        }
        const keystore = new KeyStore()
        const response = await fetchWithTimeout(BackendURLKeystore, request)
        const json = await response.json()
        keystore.load(json.keystore, this.user.encryption_key, json.changeIndex)
        return keystore
    }

    async saveKeyStore(force: boolean = false): Promise<void> {
        const request: RequestInit = {
            ...this.request(),
        }
        const url = BackendURLKeystore
        request.method = 'PUT'
        const body = {
            keystore: await GlobalUserContext.keystore.store(),
        } as any
        if (!force) {
            body.changeIndex = GlobalUserContext.keystore.changeIndex
        }
        request.body = JSON.stringify(body)
        const response = await fetchWithTimeout(url, request)
        if (!response.ok) {
            // conflict, keystore changeIndex invalid
            if (response.status === 409) {
                const newKeyStore = await this.getKeyStore()
                await GlobalUserContext.keystore.merge(newKeyStore)
                GlobalUserContext.keystore.changeIndex = (newKeyStore.changeIndex ?? 0) + 1
                this.saveKeyStore(true)
            } else {
                throw await formatErrorResponse(response)
            }
        }
    }

    async saveStory(
        story: StoryContainer,
        askOverwrite: (other: StoryContainer) => Promise<boolean>
    ): Promise<string> {
        const storyId = story.metadata.id
        await until(() => !this.storySaveInProgress.has(storyId))
        this.storySaveInProgress.add(storyId)

        let result
        try {
            result = this._saveStory(story, askOverwrite)
        } finally {
            this.storySaveInProgress.delete(storyId)
        }
        return result
    }
    private async _saveStory(
        story: StoryContainer,
        askOverwrite: (other: StoryContainer) => Promise<boolean>
    ): Promise<string> {
        const contentSaveRequest: RequestInit = {
            ...this.request(),
        }

        // Save story content
        let contentUrl = BackendURLStoryContent
        if (
            story.metadata.remoteStoryId !== undefined &&
            GlobalUserContext.remoteStories.has(story.metadata.id)
        ) {
            contentSaveRequest.method = 'PATCH'
            contentUrl = contentUrl + '/' + story.metadata.remoteStoryId
        } else {
            contentSaveRequest.method = 'PUT'
        }

        let keyStoreChanged = false
        let dto = await GlobalUserContext.keystore.encryptStoryContent(
            story.content,
            story.metadata,
            async () => {
                keyStoreChanged = true
            }
        )
        contentSaveRequest.body = JSON.stringify({
            data: dto.data,
            meta: dto.meta,
            changeIndex: story.content.changeIndex,
        })
        let response = await fetchWithTimeout(contentUrl, contentSaveRequest)
        if (!response.ok) {
            if (response.status === 409 && story.metadata.remoteStoryId && story.metadata.remoteId) {
                const newStoryContent = await this.getStoryContent(story.metadata.remoteStoryId)
                const newStoryMetadata = await this.getStoryMetadata(story.metadata.remoteId)
                const newStoryContainer = StoryContainer.bundle(newStoryMetadata, newStoryContent)
                const overwrite = await askOverwrite(newStoryContainer)
                if (overwrite) {
                    story.content.changeIndex = newStoryContent.changeIndex
                    story.metadata.changeIndex = newStoryMetadata.changeIndex
                    return this._saveStory(story, async () => true)
                } else {
                    story.content = newStoryContent
                    story.metadata = newStoryMetadata
                    GlobalUserContext.stories.set(story.metadata.id, story.metadata)
                    GlobalUserContext.storyContentCache.set(story.metadata.id, story.content)
                    return story.metadata.id
                }
            } else {
                throw await formatErrorResponse(response)
            }
        }
        let json = await response.json()

        story.metadata.remoteStoryId = json.id
        story.content.changeIndex = json.changeIndex

        // Save story metadata, must be after to properly save story remote id
        const metadataSaveRequest: RequestInit = {
            ...this.request(),
        }

        let url = BackendURLStories
        if (story.metadata.remoteId !== undefined && GlobalUserContext.remoteStories.has(story.metadata.id)) {
            metadataSaveRequest.method = 'PATCH'
            url = url + '/' + story.metadata.remoteId
        } else {
            metadataSaveRequest.method = 'PUT'
        }
        dto = await GlobalUserContext.keystore.encryptStoryMetadata(story.metadata, async () => {
            keyStoreChanged = true
        })
        metadataSaveRequest.body = JSON.stringify({
            data: dto.data,
            meta: dto.meta,
            changeIndex: story.metadata.changeIndex,
        })
        response = await fetchWithTimeout(url, metadataSaveRequest)
        if (!response.ok) {
            if (response.status === 409 && story.metadata.remoteStoryId && story.metadata.remoteId) {
                const newStoryContent = await this.getStoryContent(story.metadata.remoteStoryId)
                const newStoryMetadata = await this.getStoryMetadata(story.metadata.remoteId)
                const newStoryContainer = StoryContainer.bundle(newStoryMetadata, newStoryContent)
                const overwrite =
                    !metadataDiffers(story.metadata, newStoryMetadata) ||
                    (await askOverwrite(newStoryContainer))
                if (overwrite) {
                    story.content.changeIndex = newStoryContent.changeIndex
                    story.metadata.changeIndex = newStoryMetadata.changeIndex
                    return this._saveStory(story, askOverwrite)
                } else {
                    story.content = newStoryContent
                    story.metadata = newStoryMetadata
                    GlobalUserContext.stories.set(story.metadata.id, story.metadata)
                    GlobalUserContext.storyContentCache.set(story.metadata.id, story.content)
                    return story.metadata.id
                }
            } else {
                throw await formatErrorResponse(response)
            }
        }
        json = await response.json()

        story.metadata.remoteId = json.id
        story.metadata.changeIndex = json.changeIndex

        if (keyStoreChanged) {
            await this.saveKeyStore()
        }
        if (!GlobalUserContext.remoteStories.has(story.metadata.id)) {
            GlobalUserContext.remoteStories.add(story.metadata.id)
        }
        return story.metadata.id
    }

    async getStories(): Promise<Array<StoryMetadata>> {
        const request: RequestInit = {
            ...this.request(),
            method: 'GET',
        }
        const response = await fetchWithTimeout(BackendURLStories, request)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        if (json?.statusCode && json?.statusCode !== 200) {
            throw new Error(json.message?.message || json.message || json.statusCode)
        }
        const stories = [] as StoryMetadata[]
        if (json?.objects) {
            const errors = [] as { error: any; id: string }[]
            for (const storyMetadata of json.objects) {
                try {
                    const decrypted: StoryMetadata | null =
                        await GlobalUserContext.keystore.decryptStoryMetadata(storyMetadata)
                    if (!decrypted) continue
                    decrypted.remote = true
                    decrypted.remoteId = storyMetadata.id
                    decrypted.changeIndex = storyMetadata.changeIndex
                    stories.push(decrypted)
                    GlobalUserContext.remoteStories.add(decrypted.id)
                } catch (error) {
                    errors.push({ error, id: (storyMetadata as IStoryDto).id ?? '' })
                    continue
                }
            }
            if (errors.length > 0) {
                const groupedErrors = errors.reduce((acc, cur) => {
                    const index = cur.error.message ? `${cur.error.message}` : `${cur.error}`
                    return {
                        ...acc,
                        [index]: [...(acc[index] ?? []), cur],
                    }
                }, {} as Record<string, { error: any; id: string }[]>)
                for (const [message, errors] of Object.entries(groupedErrors)) {
                    logWarning(
                        message,
                        false,
                        'failed unlocking stories ' +
                            errors
                                .map(
                                    (error) =>
                                        `${error.id}${error.error.id ? ' (' + error.error.id + ')' : ''}`
                                )
                                .join(', ')
                    )
                }
            }
        }
        return stories
    }

    async getStoryMetadata(remoteId: string): Promise<StoryMetadata> {
        const request: RequestInit = {
            ...this.request(),
            method: 'GET',
        }
        const response = await fetchWithTimeout(BackendURLStories + '/' + remoteId, request)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        if (json?.statusCode && json?.statusCode !== 200) {
            throw new Error(json.message?.message || json.message || json.statusCode)
        }

        const decrypted: StoryMetadata | null = await GlobalUserContext.keystore.decryptStoryMetadata(json)
        if (!decrypted) {
            throw 'Story content could not be decrypted'
        }
        decrypted.changeIndex = json.changeIndex
        decrypted.remoteId = json.id
        decrypted.remote = true
        return decrypted
    }

    /// load all stories without storing them in the cache
    async getStoryContents(): Promise<Map<StoryId, StoryContent>> {
        const request: RequestInit = {
            ...this.request(),
            method: 'GET',
        }
        const response = await fetchWithTimeout(BackendURLStoryContent, request)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        if (json?.statusCode && json?.statusCode !== 200) {
            throw new Error(json.message?.message || json.message || json.statusCode)
        }
        const stories = new Map()
        if (json?.objects) {
            for (const story of json.objects) {
                try {
                    const decrypted: StoryContent | null =
                        await GlobalUserContext.keystore.decryptStoryContent(story)
                    if (!decrypted) continue
                    decrypted.changeIndex = story.changeIndex
                    stories.set(story.meta, decrypted)
                } catch (error) {
                    logError(error, false, 'error unlocking story')
                    continue
                }
            }
        }
        return stories
    }

    async getStoryContent(remoteStoryId: string, remoteId?: string): Promise<StoryContent> {
        const request: RequestInit = {
            ...this.request(),
            method: 'GET',
        }
        const response = await fetchWithTimeout(BackendURLStoryContent + '/' + remoteStoryId, request)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        if (json?.statusCode && json?.statusCode !== 200) {
            throw new Error(json.message?.message || json.message || json.statusCode)
        }

        json.id = remoteId
        const decrypted: StoryContent | null = await GlobalUserContext.keystore.decryptStoryContent(json)
        if (!decrypted) {
            throw 'Story content could not be decrypted'
        }
        decrypted.changeIndex = json.changeIndex
        return decrypted
    }

    async deleteStory(metadata: StoryMetadata): Promise<void> {
        if (!GlobalUserContext.remoteStories.has(metadata.id)) {
            return
        }

        const contentDeleteRequest: RequestInit = {
            ...this.request(),
            method: 'DELETE',
        }

        const contentUrl = BackendURLStoryContent + '/' + metadata.remoteStoryId
        const contentResponse = await fetchWithTimeout(contentUrl, contentDeleteRequest)
        if (!contentResponse.ok) {
            if (contentResponse.status === 404) {
                logWarning(formatErrorResponse(contentResponse))
            } else {
                throw await formatErrorResponse(contentResponse)
            }
        }

        const metadataDeleteRequest: RequestInit = {
            ...this.request(),
            method: 'DELETE',
        }

        const metadataUrl = BackendURLStories + '/' + metadata.remoteId
        const metadataResponse = await fetchWithTimeout(metadataUrl, metadataDeleteRequest)
        if (!metadataResponse.ok) {
            throw await formatErrorResponse(metadataResponse)
        }

        GlobalUserContext.remoteStories.delete(metadata.id)
        metadata.remote = false
        metadata.remoteId = undefined
        metadata.remoteStoryId = undefined
    }

    async getModules(): Promise<Array<AIModule>> {
        const request: RequestInit = {
            ...this.request(),
        }
        const url = BackendURLAIModules
        request.method = 'GET'

        const response = await fetchWithTimeout(url, request)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        if (json?.statusCode && json?.statusCode !== 200) {
            throw new Error(json.message?.message || json.message || json.statusCode)
        }

        const modules = [] as AIModule[]
        if (json?.objects) {
            const errors = [] as { error: any; id: string }[]
            for (const encryptedModule of json.objects) {
                try {
                    const newModule = await GlobalUserContext.keystore.decryptModule(encryptedModule)
                    newModule.remoteId = encryptedModule.id
                    modules.push(newModule)
                } catch (error: any) {
                    errors.push({ error, id: (encryptedModule as IStoryDto).id ?? '' })
                    continue
                }
            }
            if (errors.length > 0) {
                const groupedErrors = errors.reduce((acc, cur) => {
                    const index = cur.error.message ? `${cur.error.message}` : `${cur.error}`
                    return {
                        ...acc,
                        [index]: [...(acc[index] ?? []), cur],
                    }
                }, {} as Record<string, { error: any; id: string }[]>)
                for (const [message, errors] of Object.entries(groupedErrors)) {
                    logWarning(
                        message,
                        false,
                        'failed parsing modules ' +
                            errors
                                .map(
                                    (error) =>
                                        `${error.id}${error.error.id ? ' (' + error.error.id + ')' : ''}`
                                )
                                .join(', ')
                    )
                }
            }
        }

        return modules
    }

    async saveModule(aiModule: AIModule): Promise<PresetId> {
        const moduleSaveRequest: RequestInit = {
            ...this.request(),
        }

        let url = BackendURLAIModules
        if (aiModule.remoteId) {
            moduleSaveRequest.method = 'PATCH'
            url = url + '/' + aiModule.remoteId
        } else {
            moduleSaveRequest.method = 'PUT'
        }

        let keyStoreChanged = false
        const dto = await GlobalUserContext.keystore.encryptModule(aiModule, async () => {
            keyStoreChanged = true
        })

        moduleSaveRequest.body = JSON.stringify({
            data: dto.data,
            meta: dto.meta,
        })
        const response = await fetchWithTimeout(url, moduleSaveRequest)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        aiModule.remoteId = json.id

        if (keyStoreChanged) {
            await this.saveKeyStore()
        }

        return json.id
    }

    async deleteModule(aiModule: AIModule): Promise<void> {
        const request: RequestInit = {
            ...this.request(),
            method: 'DELETE',
        }

        const url = BackendURLAIModules + '/' + aiModule.remoteId
        const response = await fetchWithTimeout(url, request)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
    }

    async getStoryShelves(): Promise<Array<StoryMetadata>> {
        const request: RequestInit = {
            ...this.request(),
            method: 'GET',
        }
        const url = BackendURLStoryShelves

        const response = await fetchWithTimeout(url, request)
        if (!response.ok) {
            if (response.status === 404) {
                logWarning(formatErrorResponse(response))
            } else {
                throw await formatErrorResponse(response)
            }
        }

        const json = await response.json()
        if (json?.statusCode && json?.statusCode !== 200) {
            throw new Error(json.message?.message || json.message || json.statusCode)
        }

        const shelves = [] as StoryMetadata[]
        if (json?.objects) {
            for (const shelf of json.objects) {
                try {
                    const newShelf = StoryMetadata.deserialize(
                        Buffer.from(shelf.data, 'base64').toString('utf8')
                    )
                    newShelf.remoteId = shelf.id
                    shelves.push(newShelf)
                } catch (error) {
                    logError(error, true, 'error parsing shelf')
                    continue
                }
            }
        }

        return shelves
    }

    async saveStoryShelf(storyShelf: StoryMetadata): Promise<PresetId> {
        const shelfSaveRequest: RequestInit = {
            ...this.request(),
        }
        storyShelf.lastSavedAt = new Date()
        storyShelf.lastUpdatedAt = new Date()

        let url = BackendURLStoryShelves
        if (storyShelf.remoteId) {
            shelfSaveRequest.method = 'PATCH'
            url = url + '/' + storyShelf.remoteId
        } else {
            shelfSaveRequest.method = 'PUT'
        }

        shelfSaveRequest.body = JSON.stringify({
            data: Buffer.from(storyShelf.serialize()).toString('base64'),
            meta: storyShelf.id,
        })
        const response = await fetchWithTimeout(url, shelfSaveRequest)
        if (!response.ok) {
            throw await formatErrorResponse(response)
        }
        const json = await response.json()
        storyShelf.remoteId = json.id

        return json.id
    }

    async deleteStoryShelf(storyShelf: StoryMetadata): Promise<void> {
        const request: RequestInit = {
            ...this.request(),
            method: 'DELETE',
        }

        const url = BackendURLStoryShelves + '/' + storyShelf.remoteId
        const response = await fetchWithTimeout(url, request)
        if (!response.ok) {
            if (response.status === 404) {
                logWarning(formatErrorResponse(response))
            } else {
                throw await formatErrorResponse(response)
            }
        }
    }
}
