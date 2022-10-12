import { openDB, IDBPDatabase } from 'idb'
import idbReady from 'safari-14-idb-fix'
import { logError, logWarning } from '../../util/browser'
import { authTokenToAccountId } from '../../util/util'
import { StoryContainer, StoryContent, StoryId, StoryMetadata } from '../story/storycontainer'
import { AIModule, PresetId, StoryPreset } from '../story/storysettings'
import { User } from '../user/user'
import { KeyStore } from './keystore/keystore'
import { IStorage } from './storage'

const dbMap = new Map<string, Promise<IDBPDatabase<any>>>()

export class IndexedDBStorage implements IStorage {
    user: User
    constructor(user: User) {
        this.user = user
    }

    static async teardown(): Promise<void> {
        for (const [, v] of dbMap)
            v.then((d) => d.close()).catch(() => {
                /*ignore*/
            })
        dbMap.clear()
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
        const [db, userdb] = [await this.getGlobalDB(), await this.getUserDB()]
        try {
            if (userdb) {
                await userdb.put('stories', story.metadata.serialize(), story.metadata.id)
                await userdb.put('storycontent', story.content.serialize(), story.metadata.id)
                await db.delete('stories', story.metadata.id)
                await db.delete('storycontent', story.metadata.id)
            } else {
                await db.put('stories', story.metadata.serialize(), story.metadata.id)
                await db.put('storycontent', story.content.serialize(), story.metadata.id)
            }
        } catch (error) {
            logError(error)
        }

        return story.metadata.id
    }
    async getStories(): Promise<Array<StoryMetadata>> {
        const [db, userdb] = [await this.getGlobalDB(), await this.getUserDB()]
        const stories: StoryMetadata[] = []
        if (userdb) {
            const userSerialized = await userdb.getAll('stories')
            for (const string of userSerialized) {
                try {
                    stories.push(StoryMetadata.deserialize(string))
                } catch (error) {
                    logError(error, true, 'Story deserialization failed:')
                }
            }
        }
        const serialized = await db.getAll('stories')
        for (const string of serialized) {
            try {
                const deserialized = StoryMetadata.deserialize(string)
                if (!stories.some((story) => story.id === deserialized.id)) {
                    stories.push(deserialized)
                } else {
                    logWarning('story in both global and user db', false, deserialized.id)
                }
            } catch (error) {
                logError(error, true, 'Story deserialization failed:')
            }
        }
        return stories
    }

    async getStoryContents(): Promise<Map<StoryId, StoryContent>> {
        const [db, userdb] = [await this.getGlobalDB(), await this.getUserDB()]
        const storyContents = new Map()
        if (userdb) {
            const userKeys = await userdb.getAllKeys('storycontent')
            for (const key of userKeys) {
                try {
                    storyContents.set(key, StoryContent.deserialize(await userdb.get('storycontent', key)))
                } catch (error) {
                    logError(error, true, 'failed loading story from indexedDB:')
                }
            }
        }
        const keys = await db.getAllKeys('storycontent')
        for (const key of keys) {
            try {
                if (!storyContents.has(key)) {
                    const deserialized = StoryContent.deserialize(await db.get('storycontent', key))
                    storyContents.set(key, deserialized)
                } else {
                    logWarning('story content in both global and user db', false, key)
                }
            } catch (error) {
                logError(error, true, 'failed loading story from indexedDB:')
            }
        }
        return storyContents
    }

    async getStoryContent(storyId: string): Promise<StoryContent> {
        const [db, userdb] = [await this.getGlobalDB(), await this.getUserDB()]
        let serialized
        if (userdb) {
            try {
                serialized = await userdb.get('storycontent', storyId)
            } catch (error) {
                logError(error, false)
            }
        }
        if (!serialized) {
            serialized = await db.get('storycontent', storyId)
        }
        if (!serialized) throw 'Story not in IndexedDB storage'
        const storyContent = StoryContent.deserialize(serialized)
        return storyContent
    }
    async deleteStory(storyMetadata: StoryMetadata): Promise<void> {
        const [db, userdb] = [await this.getGlobalDB(), await this.getUserDB()]
        db.delete('stories', storyMetadata.id)
        db.delete('storycontent', storyMetadata.id)
        if (userdb) {
            userdb.delete('stories', storyMetadata.id)
            userdb.delete('storycontent', storyMetadata.id)
        }
    }

    private async getGlobalDB() {
        await idbReady()
        let db = dbMap.get('novelai')
        if (!db) {
            db = openDB<IDBPDatabase<any>>('novelai', 1, {
                upgrade(db) {
                    db.createObjectStore('stories', {})
                    db.createObjectStore('storycontent', {})
                },
            })
            dbMap.set('novelai', db)
        }
        return await db
    }
    private async getUserDB() {
        await idbReady()
        const accountId = this.getAccountId()
        if (!accountId) return
        let db = dbMap.get('novelai.' + accountId)
        if (!db) {
            db = openDB<IDBPDatabase<any>>('novelai.' + accountId, 1, {
                upgrade(db) {
                    db.createObjectStore('stories', {})
                    db.createObjectStore('storycontent', {})
                },
            })
            dbMap.set('novelai.' + accountId, db)
        }
        return await db
    }
    private getAccountId() {
        return this.user.noAccount
            ? ''
            : (() => {
                  try {
                      return authTokenToAccountId(this.user.auth_token)
                  } catch (error: any) {
                      logError(error, false)
                      return ''
                  }
              })()
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

    async getStoryShelves(): Promise<Array<StoryMetadata>> {
        throw undefined
    }
    async saveStoryShelf(): Promise<PresetId> {
        throw undefined
    }
    async deleteStoryShelf(): Promise<void> {
        throw undefined
    }
}
