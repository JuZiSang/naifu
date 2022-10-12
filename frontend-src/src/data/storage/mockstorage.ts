import { StoryContainer, StoryContent, StoryId, StoryMetadata } from '../story/storycontainer'
import { AIModule, PresetId, StoryPreset } from '../story/storysettings'
import { User } from '../user/user'
import { KeyStore } from './keystore/keystore'
import { IStorage } from './storage'

export default class MockStorage implements IStorage {
    user: User = new User('', '')

    async saveSettings(): Promise<void> {
        return
    }

    async getPresets(): Promise<Array<StoryPreset>> {
        return []
    }

    async savePreset(): Promise<PresetId> {
        return ''
    }

    async deletePreset(): Promise<void> {
        return
    }

    async saveStory(story: StoryContainer): Promise<string> {
        return story.metadata.id
    }

    async getStories(): Promise<Array<StoryMetadata>> {
        const stories: StoryMetadata[] = []
        return stories
    }

    async getStoryContents(): Promise<Map<StoryId, StoryContent>> {
        return new Map()
    }

    async getStoryContent(): Promise<StoryContent> {
        return new StoryContent()
    }

    async deleteStory(): Promise<void> {
        return
    }
    async getModules(): Promise<AIModule[]> {
        return []
    }
    async saveModule(): Promise<string> {
        return ''
    }
    async deleteModule(): Promise<void> {
        return
    }

    getKeyStore(): Promise<KeyStore> {
        return Promise.reject()
    }
    saveKeyStore(): Promise<void> {
        return Promise.resolve()
    }

    getStoryShelves(): Promise<Array<StoryMetadata>> {
        return Promise.resolve([])
    }
    async saveStoryShelf(): Promise<PresetId> {
        return ''
    }
    async deleteStoryShelf(): Promise<void> {
        return
    }
}
