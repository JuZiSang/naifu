import { toast } from 'react-toastify'
import { MockEnv } from '../../globals/constants'
import { GlobalUserContext } from '../../globals/globals'
import { logError, logWarning } from '../../util/browser'
import { setLocalStorage } from '../../util/storage'
import { StoryContainer, StoryContent, StoryId, StoryMetadata } from '../story/storycontainer'
import { PresetId, StoryPreset, AIModule } from '../story/storysettings'
import { User } from '../user/user'
import { UserSettings } from '../user/settings'
import { IndexedDBStorage } from './indexeddbstorage'
import { KeyStore } from './keystore/keystore'
import MockStorage from './mockstorage'
import { RemoteStorage } from './remotestorage'

export interface IStorage {
    user: User

    saveSettings(settings: UserSettings): Promise<void>
    getPresets(): Promise<Array<StoryPreset>>
    savePreset(preset: StoryPreset): Promise<PresetId>
    deletePreset(preset: StoryPreset): Promise<void>
    saveStory(
        story: StoryContainer,
        askOverwrite?: (other: StoryContainer) => Promise<boolean>
    ): Promise<StoryId>
    getStoryContent(id: string, additional?: string): Promise<StoryContent>
    getStoryContents(): Promise<Map<StoryId, StoryContent>>
    getStories(): Promise<Array<StoryMetadata>>
    deleteStory(storyMetadata: StoryMetadata): Promise<void>

    getModules(): Promise<Array<AIModule>>
    saveModule(aiModule: AIModule): Promise<string>
    deleteModule(aiModule: AIModule): Promise<void>

    getKeyStore(): Promise<KeyStore>
    saveKeyStore(force?: boolean): Promise<void>
    getStoryShelves(): Promise<Array<StoryMetadata>>
    saveStoryShelf(storyShelf: StoryMetadata): Promise<PresetId>
    deleteStoryShelf(storyShelf: StoryMetadata): Promise<void>
}

export class Storage {
    user: User

    localstorage: IStorage
    remotestorage: IStorage

    constructor(user: User) {
        this.user = user
        this.localstorage = new IndexedDBStorage(user)
        this.remotestorage = MockEnv ? new MockStorage() : new RemoteStorage(user)
    }
    saveSettings(settings: UserSettings): Promise<void> {
        return this.remotestorage.saveSettings(settings)
    }
    getPresets(): Promise<Array<StoryPreset>> {
        return this.remotestorage.getPresets()
    }
    savePreset(preset: StoryPreset): Promise<PresetId> {
        return this.remotestorage.savePreset(preset)
    }
    deletePreset(preset: StoryPreset): Promise<void> {
        return this.remotestorage.deletePreset(preset)
    }
    async getModules(): Promise<Array<AIModule>> {
        return await this.remotestorage.getModules()
    }
    saveModule(module: AIModule): Promise<PresetId> {
        return this.remotestorage.saveModule(module)
    }
    deleteModule(module: AIModule): Promise<void> {
        return this.remotestorage.deleteModule(module)
    }
    async getStories(): Promise<Array<StoryMetadata>> {
        const remoteStories = await this.remotestorage.getStories()
        const localStories = await this.localstorage.getStories()
        let stories = [...localStories]
        for (const story of remoteStories) {
            const dupeIndex = stories.findIndex((dstory) => dstory.id === story.id)
            if (dupeIndex >= 0) {
                stories[dupeIndex].remote = true
                stories[dupeIndex].remoteId = story.remoteId
                stories[dupeIndex].remoteStoryId = story.remoteStoryId
                if (story.lastUpdatedAt >= stories[dupeIndex].lastUpdatedAt) {
                    stories[dupeIndex] = story
                }
            } else if (dupeIndex === -1) {
                stories.push(story)
            }
        }
        stories = stories.sort((a, b) => b.lastUpdatedAt.valueOf() - a.lastUpdatedAt.valueOf())
        return stories
    }
    async getStoryContents(): Promise<Array<StoryContainer>> {
        const storyMetas = await this.getStories()

        let localStoryContents = null
        try {
            localStoryContents = await this.localstorage.getStoryContents()
        } catch (error) {
            logError(error, false, 'loading local story content failed')
        }
        let remoteStoryContents = null
        try {
            remoteStoryContents = await this.remotestorage.getStoryContents()
        } catch (error) {
            logError(error, false, 'loading remote story content failed')
        }
        const stories = []
        for (const storyMetadata of storyMetas) {
            let storyContent: StoryContent | undefined = void 0

            if (
                remoteStoryContents &&
                storyMetadata.remoteStoryId !== undefined &&
                storyMetadata.remoteId !== undefined
            )
                storyContent = remoteStoryContents.get(storyMetadata.id)
            if (localStoryContents && !storyContent) storyContent = localStoryContents.get(storyMetadata.id)

            if (storyContent) stories.push(StoryContainer.bundle(storyMetadata, storyContent))
            else logWarning('story metadata with no content: ' + storyMetadata.id)
        }
        return stories
    }
    async getStoryContent(storyMetadata: StoryMetadata): Promise<StoryContent> {
        return storyMetadata.remoteStoryId !== undefined && storyMetadata.remoteId !== undefined
            ? this.remotestorage
                  .getStoryContent(storyMetadata.remoteStoryId, storyMetadata.remoteId)
                  .catch((error) => {
                      logWarning(error)
                      return this.localstorage.getStoryContent(storyMetadata.id).catch(() => {
                          throw error
                      })
                  })
            : this.localstorage.getStoryContent(storyMetadata.id)
    }
    async saveStory(
        story: StoryContainer,
        remote?: boolean,
        askOverwrite?: (other: StoryContainer) => Promise<boolean>
    ): Promise<StoryId> {
        if (remote) {
            // eslint-disable-next-line unicorn/prefer-ternary
            if (!story.metadata.remote && GlobalUserContext.remoteStories.has(story.metadata.id)) {
                await this.localstorage.saveStory(story)
                await this.remotestorage.deleteStory(story.metadata)
                const id = await this.localstorage.saveStory(story)
                return id
            } else {
                await this.remotestorage.saveStory(story, askOverwrite)
                return this.localstorage.saveStory(story)
            }
        } else {
            return this.localstorage.saveStory(story)
        }
    }
    async deleteStory(storyMetadata: StoryMetadata): Promise<void> {
        this.remotestorage.deleteStory(storyMetadata)
        this.localstorage.deleteStory(storyMetadata)
    }

    getKeyStore(): Promise<KeyStore> {
        return this.remotestorage.getKeyStore()
    }
    saveKeyStore(force?: boolean): Promise<void> {
        return this.remotestorage.saveKeyStore(force)
    }

    async getStoryShelves(): Promise<Array<StoryMetadata>> {
        return this.remotestorage.getStoryShelves()
    }
    async saveStoryShelf(storyShelf: StoryMetadata): Promise<PresetId> {
        return this.remotestorage.saveStoryShelf(storyShelf)
    }
    async deleteStoryShelf(storyShelf: StoryMetadata): Promise<void> {
        return this.remotestorage.deleteStoryShelf(storyShelf)
    }
}

export function getStorage(user: User): Storage {
    return user.noAccount ? new NoAccountStorage(user) : new Storage(user)
}

export class NoAccountStorage extends Storage {
    saveSettings(settings: UserSettings): Promise<void> {
        setLocalStorage('noAccountSettings', JSON.stringify(settings))
        return Promise.resolve()
    }
    getPresets(): Promise<Array<StoryPreset>> {
        throw 'Not available for non-account users'
    }
    savePreset(): Promise<PresetId> {
        toast('Custom presets not available without an account.')
        throw 'Not available for non-account users'
    }
    deletePreset(): Promise<void> {
        throw 'Not available for non-account users'
    }
    getModules(): Promise<Array<AIModule>> {
        toast('Custom modules not available without an account.')
        throw 'Not available for non-account users'
    }
    saveModule(): Promise<PresetId> {
        throw 'Not available for non-account users'
    }
    deleteModule(): Promise<void> {
        throw 'Not available for non-account users'
    }
    async getStories(): Promise<Array<StoryMetadata>> {
        const localStories = await this.localstorage.getStories()
        let stories = [...localStories]
        stories = stories.sort((a, b) => b.lastUpdatedAt.valueOf() - a.lastUpdatedAt.valueOf())
        return stories
    }
    async getStoryContents(): Promise<Array<StoryContainer>> {
        const storyMetas = await this.getStories()

        const localStoryContents = await this.localstorage.getStoryContents()

        const stories = []
        for (const storyMetadata of storyMetas) {
            let storyContent

            if (!storyContent) storyContent = localStoryContents.get(storyMetadata.id)

            if (storyContent) stories.push(StoryContainer.bundle(storyMetadata, storyContent))
            else logWarning('story metadata with no content: ' + storyMetadata.id)
        }

        return stories
    }
    async getStoryContent(storyMetadata: StoryMetadata): Promise<StoryContent> {
        return this.localstorage.getStoryContent(storyMetadata.id)
    }
    async saveStory(story: StoryContainer): Promise<StoryId> {
        return this.localstorage.saveStory(story)
    }
    async deleteStory(storyMetadata: StoryMetadata): Promise<void> {
        this.localstorage.deleteStory(storyMetadata)
    }

    getKeyStore(): Promise<KeyStore> {
        throw 'Not available for non-account users'
    }
    saveKeyStore(): Promise<void> {
        throw 'Not available for non-account users'
    }

    async getStoryShelves(): Promise<Array<StoryMetadata>> {
        throw 'Not available for non-account users'
    }
    async saveStoryShelf(): Promise<PresetId> {
        throw 'Not available for non-account users'
    }
    async deleteStoryShelf(): Promise<void> {
        throw 'Not available for non-account users'
    }
}
