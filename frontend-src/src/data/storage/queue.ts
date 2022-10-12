import { useEffect, useState } from 'react'
import { GlobalUserContext } from '../../globals/globals'
import { logError } from '../../util/browser'
import { StoryContainer, StoryId } from '../story/storycontainer'
import { User } from '../user/user'
import { getStorage } from './storage'

type SavePromise = Promise<SaveResult | null>

export const isSaving = (): boolean => {
    return storySaveQueueRemote.size > 0
}

const SaveStoryBufferMsRemote = 5000
const SaveStoryBufferMsLocal = 500

const storySaveQueueRemote: Map<
    StoryId,
    { timeoutId: number; resolve: (value: any) => void; execute: () => Promise<void> }
> = new Map()
const storySaveQueueLocal: Map<
    StoryId,
    { timeoutId: number; resolve: (value: any) => void; execute: () => Promise<void> }
> = new Map()
const lastSavedStories: Map<StoryId, { serialized: string; timeoutId: number }> = new Map()

export function useRemoteSaveQueueStatus(): Map<StoryId, any> {
    const [queue, setQueue] = useState(1)
    useEffect(() => {
        function handleRemoteSave() {
            setQueue(queue + 1)
        }
        window.addEventListener('remoteSaveQueueUpdate', handleRemoteSave)
        return () => window.removeEventListener('remoteSaveQueueUpdate', handleRemoteSave)
    })
    return storySaveQueueRemote
}

interface SaveResult {
    newStories: StoryId[]
    newId: StoryId
}

export async function localSave(session: User, storyUpdateId: string): SavePromise {
    const updatedStory = GlobalUserContext.stories.get(storyUpdateId)
    if (!updatedStory) {
        return null
    }

    const storage = getStorage(session)

    let updatedStoryContent = GlobalUserContext.storyContentCache.get(updatedStory.id)
    if (!updatedStoryContent) {
        // if story isn't loaded yet, load it
        try {
            updatedStoryContent = await storage.getStoryContent(updatedStory)
            GlobalUserContext.storyContentCache.set(updatedStory.id, updatedStoryContent)
        } catch (error: any) {
            logError(error)
            return null
        }
    }
    const storyContainer = StoryContainer.bundle(updatedStory, updatedStoryContent)

    const newId = await storage.saveStory(storyContainer, false)
    const newStories = [...GlobalUserContext.stories.keys()].sort(
        (a, b) =>
            (GlobalUserContext.stories.get(b)?.lastUpdatedAt.valueOf() || 0) -
            (GlobalUserContext.stories.get(a)?.lastUpdatedAt.valueOf() || 0)
    )

    storySaveQueueLocal.delete(storyUpdateId)
    return { newStories, newId }
}

export async function queueLocalSave(session: User, storyId: string): SavePromise {
    // save after a delay to avoid recurrent saving of the same story
    const inQueue = storySaveQueueLocal.get(storyId)
    if (inQueue) {
        clearTimeout(inQueue.timeoutId)
        inQueue.resolve(null)
    }
    const promise: SavePromise = new Promise((resolve, reject) => {
        const execute = () => localSave(session, storyId).then(resolve).catch(reject)
        const timeoutId = setTimeout(() => {
            execute()
        }, SaveStoryBufferMsLocal) as any
        storySaveQueueLocal.set(storyId, { timeoutId, resolve, execute })
    })
    return promise
}

async function doSave(
    session: User,
    storyUpdateId: string,
    askOverwrite?: (other: StoryContainer) => Promise<boolean>
): SavePromise {
    const updatedStory = GlobalUserContext.stories.get(storyUpdateId)
    if (!updatedStory || updatedStory.serialize() === lastSavedStories.get(updatedStory.id)?.serialized) {
        // don't save if story didn't change
        storySaveQueueRemote.delete(storyUpdateId)
        return null
    }

    const storage = getStorage(session)

    let updatedStoryContent = GlobalUserContext.storyContentCache.get(updatedStory.id)
    if (!updatedStoryContent) {
        // if story isn't loaded yet, load it
        try {
            updatedStoryContent = await storage.getStoryContent(updatedStory)
            GlobalUserContext.storyContentCache.set(updatedStory.id, updatedStoryContent)
        } catch (error: any) {
            logError(error)
            storySaveQueueRemote.delete(storyUpdateId)
            return null
        }
    }

    let newId = ''
    const storyContainer = StoryContainer.bundle(updatedStory, updatedStoryContent)
    newId = await storage.saveStory(storyContainer, true, askOverwrite).catch((error) => {
        if (!`${error}`.includes('body is too large')) queueSaving(session, storyUpdateId)
        else storySaveQueueRemote.delete(storyUpdateId)
        logError(error, true, 'remote save failed')
        throw error
    })
    const newStories = [...GlobalUserContext.stories.keys()].sort(
        (a, b) =>
            (GlobalUserContext.stories.get(b)?.lastUpdatedAt.valueOf() || 0) -
            (GlobalUserContext.stories.get(a)?.lastUpdatedAt.valueOf() || 0)
    )

    const lastSavedStory = lastSavedStories.get(updatedStory.id)
    if (lastSavedStory) {
        lastSavedStory.serialized = updatedStory.serialize()
        clearTimeout(lastSavedStory.timeoutId)
        lastSavedStory.timeoutId = setTimeout(() => {
            lastSavedStories.delete(updatedStory.id)
        }, SaveStoryBufferMsRemote * 2) as any
    } else {
        lastSavedStories.set(updatedStory.id, {
            serialized: updatedStory.serialize(),
            timeoutId: setTimeout(() => {
                lastSavedStories.delete(updatedStory.id)
            }, SaveStoryBufferMsRemote * 2) as any,
        })
    }
    storySaveQueueRemote.delete(storyUpdateId)
    window.dispatchEvent(new Event('remoteSaveQueueUpdate'))
    return { newStories, newId }
}

export function queueSaving(
    session: User,
    storyId: StoryId,
    askOverwrite?: (other: StoryContainer) => Promise<boolean>
): SavePromise {
    // save after a delay to avoid recurrent saving of the same story
    const inQueue = storySaveQueueRemote.get(storyId)
    if (inQueue) {
        clearTimeout(inQueue.timeoutId)
        inQueue.resolve(null)
    }
    const promise: SavePromise = new Promise((resolve, reject) => {
        const execute = () => doSave(session, storyId, askOverwrite).then(resolve).catch(reject)
        const timeoutId = setTimeout(() => {
            execute()
        }, SaveStoryBufferMsRemote) as any
        storySaveQueueRemote.set(storyId, { timeoutId, resolve, execute })
        window.dispatchEvent(new Event('remoteSaveQueueUpdate'))
    })
    return promise
}

export function flushSavingQueue(): Promise<void[]> {
    const allSaved = Promise.all(
        [...storySaveQueueRemote.values()].map((inQueue) => {
            if (inQueue) {
                clearTimeout(inQueue.timeoutId)
                inQueue.resolve(null)
                inQueue.execute()
            }
        })
    )
    storySaveQueueRemote.clear()
    window.dispatchEvent(new Event('remoteSaveQueueUpdate'))
    return allSaved
}
