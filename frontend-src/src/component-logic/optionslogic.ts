import { v4 as uuid } from 'uuid'
import { SetterOrUpdater } from 'recoil'
import { getStorage } from '../data/storage/storage'
import { StoryContainer, StoryContent, StoryMetadata } from '../data/story/storycontainer'
import { User } from '../data/user/user'
import { getUserSetting } from '../data/user/settings'
import { GlobalUserContext } from '../globals/globals'
import { copyStoryToPreset } from '../util/presets'
import { StoryStateValue } from '../globals/state'
import { StoryPreset, TextGenerationSettings } from '../data/story/storysettings'
import { logError, downloadTextFile } from '../util/browser'
import { TextGenerationModel } from '../data/request/model'

//===================================================================
//                            INTERFACES
//===================================================================

export interface SetterPackage {
    currentStory: StoryMetadata | undefined
    currentStoryContent: StoryContent | undefined
    genSettings: TextGenerationSettings | undefined
    updateState: SetterOrUpdater<StoryStateValue>
}

export interface LastSampling {
    top_k: number
    top_p: number
    tfs: number
}

export interface StatePackage {
    session: User
    selectedShelf?: string
    setSelectedStory: SetterOrUpdater<StoryStateValue>
    storiesState: [string[], SetterOrUpdater<string[]>]
    storyUpdateState: SetterOrUpdater<StoryStateValue>
}

//===================================================================
//                             GENERIC
//===================================================================

export const updateStory = (
    update: () => void,
    { currentStory, currentStoryContent, genSettings, updateState }: SetterPackage,
    modified = true
): void => {
    if (!currentStory || !currentStoryContent || !genSettings) return
    update()
    updateState(currentStory.save(modified))
}

//===================================================================
//                        GENERATION SETTINGS
//===================================================================

export const setMaxLength = (
    max_length: number,
    { currentStory, genSettings, updateState }: SetterPackage
): void => {
    if (!currentStory || !genSettings) return

    if (genSettings.min_length > max_length) genSettings.min_length = max_length
    genSettings.max_length = max_length

    updateState(currentStory.save())
}

export const setMinLength = (
    min_length: number,
    { currentStory, genSettings, updateState }: SetterPackage
): void => {
    if (!currentStory || !genSettings) return

    if (min_length > genSettings.max_length) genSettings.max_length = min_length
    genSettings.min_length = min_length

    updateState(currentStory.save())
}

export const setTopK = (
    top_k: number,
    lastSampling: LastSampling,
    setLastSampling: (value: LastSampling) => void,
    { currentStory, genSettings, updateState }: SetterPackage
): void => {
    if (!currentStory || !genSettings) return

    if (top_k <= 0) {
        if (genSettings.top_p >= 1) genSettings.tail_free_sampling = lastSampling.tfs
    } else {
        if (genSettings.top_p >= 1) genSettings.top_p = lastSampling.top_p
        genSettings.tail_free_sampling = 1
    }
    genSettings.top_k = top_k

    setLastSampling({ ...lastSampling, top_k: top_k })
    updateState(currentStory.save())
}

export const setTopP = (
    top_p: number,
    lastSampling: LastSampling,
    setLastSampling: (value: LastSampling) => void,
    { currentStory, genSettings, updateState }: SetterPackage
): void => {
    if (!currentStory || !genSettings) return

    if (top_p >= 1) {
        if (genSettings.top_k <= 0) genSettings.tail_free_sampling = lastSampling.tfs
    } else {
        genSettings.top_k = lastSampling.top_k
        genSettings.tail_free_sampling = 1
    }
    genSettings.top_p = top_p

    setLastSampling({ ...lastSampling, top_p: top_p })
    updateState(currentStory.save())
}

export const setTailFreeSampling = (
    tail_free_sampling: number,
    lastSampling: LastSampling,
    setLastSampling: (value: LastSampling) => void,
    { currentStory, genSettings, updateState }: SetterPackage
): void => {
    if (!currentStory || !genSettings) return

    if (tail_free_sampling >= 1) {
        genSettings.top_k = lastSampling.top_k
        genSettings.top_p = lastSampling.top_p
    } else {
        genSettings.top_k = 0
        genSettings.top_p = 1
    }
    genSettings.tail_free_sampling = tail_free_sampling

    setLastSampling({ ...lastSampling, tfs: tail_free_sampling })
    updateState(currentStory.save())
}

//===================================================================
//                        STORY MANAGEMENT
//===================================================================

export async function deleteStory(selectedStory: string, statePackage: StatePackage): Promise<boolean> {
    const currentStory = GlobalUserContext.stories.get(selectedStory)
    if (currentStory)
        return await getStorage(statePackage.session)
            .deleteStory(currentStory)
            .then(() => {
                const position = statePackage.storiesState[0]
                    .map((s) => GlobalUserContext.stories.get(s))
                    .indexOf(currentStory)
                GlobalUserContext.stories.delete(selectedStory)
                GlobalUserContext.storyContentCache.delete(selectedStory)
                const keys: string[] = [...statePackage.storiesState[0].filter((id) => id !== selectedStory)]
                statePackage.storiesState[1]([...keys])
                let newStoryID = ''
                if (keys.length > 0) {
                    const firstInLine =
                        GlobalUserContext.stories.get(
                            //keys[position < keys.length ? position : position - 1]
                            keys[position === 0 ? position : position - 1]
                        ) ?? null
                    if (firstInLine) {
                        newStoryID = firstInLine.id
                    }
                }
                statePackage.setSelectedStory({ loaded: false, id: newStoryID })
                return true
            })
            .catch((error: any) => {
                logError(error)
                return false
            })
    return false
}

export function exportPreset(selectedStory: StoryContent, name: string, model: TextGenerationModel): void {
    const preset = new StoryPreset(name, model)
    copyStoryToPreset(selectedStory, preset)
    downloadTextFile(preset.serialize(true), `${name.slice(0, 40)} (${new Date().toISOString()}).preset`)
}
