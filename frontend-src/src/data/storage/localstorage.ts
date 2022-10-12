import { StoryContainer, StoryContent, StoryId, StoryMetadata } from '../story/storycontainer'
import { AIModule, PresetId, StoryPreset } from '../story/storysettings'
import { User } from '../user/user'
import { KeyStore } from './keystore/keystore'
import { IStorage } from './storage'

export class LocalStorage implements IStorage {
    user: User
    constructor(user: User) {
        this.user = user
    }
    async saveSettings(): Promise<void> {
        throw undefined
    }
    async savePreset(): Promise<PresetId> {
        throw undefined
    }
    async getPresets(): Promise<Array<StoryPreset>> {
        throw undefined
    }
    async deletePreset(): Promise<void> {
        throw undefined
    }
    async saveStory(story: StoryContainer): Promise<string> {
        localStorage.setItem(`story:${story.metadata.id}`, story.metadata.serialize())
        localStorage.setItem(`storycontent:${story.metadata.id}`, story.content.serialize())

        return story.metadata.id
    }
    async getStories(): Promise<Array<StoryMetadata>> {
        const stories = [] as StoryMetadata[]
        for (let i = 0; i < localStorage.length; ++i) {
            const key = localStorage.key(i)
            if (!key || !key.startsWith('story:')) {
                continue
            }
            const story = localStorage.getItem(key)
            if (!story) {
                continue
            }
            stories.push(StoryMetadata.deserialize(story))
        }
        return stories
    }
    async getStoryContents(): Promise<Map<StoryId, StoryContent>> {
        throw new Error('unimplemented')
    }
    async getStoryContent(storyId: string): Promise<StoryContent> {
        const serialized = localStorage.getItem(`storyContent:${storyId}`)
        if (!serialized) {
            throw 'Could not retrieve content from local storage'
        }
        const deserialized = StoryContent.deserialize(serialized)
        return deserialized
    }
    async deleteStory(storyMetadata: StoryMetadata): Promise<void> {
        localStorage.removeItem(`story:${storyMetadata.id}`)
        localStorage.removeItem(`storycontent:${storyMetadata.id}`)
    }
    async getModules(): Promise<AIModule[]> {
        throw undefined
    }
    async saveModule(): Promise<string> {
        throw undefined
    }
    async deleteModule(): Promise<void> {
        throw undefined
    }
    getKeyStore(): Promise<KeyStore> {
        return Promise.reject()
    }
    saveKeyStore(): Promise<void> {
        return Promise.reject()
    }
    getStoryShelves(): Promise<Array<StoryMetadata>> {
        return Promise.reject()
    }
    saveStoryShelf(): Promise<string> {
        return Promise.reject()
    }
    deleteStoryShelf(): Promise<void> {
        return Promise.reject()
    }
}
