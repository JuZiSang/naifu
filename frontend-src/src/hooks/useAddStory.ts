import { useRecoilCallback } from 'recoil'
import { v4 as uuid } from 'uuid'
import { Document } from '../data/document/document'
import { getStorage } from '../data/storage/storage'
import { getModelPresets } from '../data/story/defaultpresets'
import { Story } from '../data/story/story'
import { StoryContainer } from '../data/story/storycontainer'
import { DefaultPrefixOption, StorySettings } from '../data/story/storysettings'
import { getUserSetting } from '../data/user/settings'
import { GlobalUserContext } from '../globals/globals'
import {
    GenerationRequestActive,
    SelectedShelf,
    SelectedStory,
    Session,
    Stories,
    StoryUpdate,
    UserPresets,
} from '../globals/state'
import { getAvailiableModels, modelsCompatible } from '../util/models'
import { copyPresetToStory, getDefaultPresetForModel } from '../util/presets'

export default function useAddStory(options?: {
    addToCurrentShelf?: boolean
    callback?: (story: StoryContainer) => void
}): {
    createStoryWithDefaults: () => Promise<StoryContainer>
    addStory: () => Promise<StoryContainer | undefined>
    importStory: (story: StoryContainer) => Promise<void>
    duplicateStory: (story: StoryContainer) => Promise<void>
} {
    const createStoryWithDefaults = useRecoilCallback(
        ({ snapshot }) =>
            async (): Promise<StoryContainer> => {
                const session = await snapshot.getPromise(Session)
                const userPresets = await snapshot.getPromise(UserPresets)

                const story = new StoryContainer()
                if (getUserSetting(session.settings, 'useEditorV2')) {
                    story.content.document = new Document()
                    story.metadata.hasDocument = true
                } else {
                    story.content.story = new Story()
                }

                story.content.settings = new StorySettings()
                story.metadata.remote = getUserSetting(session.settings, 'remoteDefault')
                story.content.settings.prefix =
                    getUserSetting(session.settings, 'defaultModule') || DefaultPrefixOption
                story.content.settings.model = getUserSetting(session.settings, 'defaultModel')

                const presets = [...getModelPresets(story.content.settings.model), ...userPresets]
                const chosenPreset = getUserSetting(session.settings, 'defaultPreset')
                const matchedPreset =
                    presets.find(
                        (preset) =>
                            preset.id === chosenPreset &&
                            modelsCompatible(preset.model, story.content.settings.model)
                    ) || presets[0]
                copyPresetToStory(matchedPreset, story.content)

                return story
            },
        []
    )

    const addStory = useRecoilCallback(
        ({ snapshot, set }) =>
            async () => {
                const generationRequestActive = await snapshot.getPromise(GenerationRequestActive)
                const session = await snapshot.getPromise(Session)
                const stories = await snapshot.getPromise(Stories)

                if (generationRequestActive) {
                    return
                }

                const story = await createStoryWithDefaults()

                GlobalUserContext.stories.set(story.metadata.id, story.metadata)
                GlobalUserContext.storyContentCache.set(story.metadata.id, story.content)

                if (options?.callback) options.callback(story)

                set(Stories, [story.metadata.id, ...stories])
                set(SelectedStory, { loaded: false, id: story.metadata.id })
                set(StoryUpdate(story.metadata.id), story.metadata.save(false))

                await getStorage(session).saveStory(story, story.metadata.remote)

                if (options?.addToCurrentShelf ?? true) {
                    const selectedShelf = await snapshot.getPromise(SelectedShelf)
                    if (selectedShelf) {
                        const shelf = GlobalUserContext.shelves.get(selectedShelf)
                        if (!shelf) return
                        setTimeout(() => {
                            shelf.children = [
                                ...(shelf.children ?? []),
                                {
                                    type: 'story',
                                    id: story.metadata.id,
                                },
                            ]
                            set(Stories, [...stories])
                            getStorage(session).saveStoryShelf(shelf)
                        }, 50)
                    }
                }
                return story
            },
        []
    )

    const importStory = useRecoilCallback(
        ({ snapshot, set }) =>
            async (story: StoryContainer) => {
                const generationRequestActive = await snapshot.getPromise(GenerationRequestActive)

                if (generationRequestActive) {
                    return
                }

                const session = await snapshot.getPromise(Session)
                const stories = await snapshot.getPromise(Stories)
                const userPresets = await snapshot.getPromise(UserPresets)

                story.metadata.id = uuid()
                if (!story.content.story && !story.content.document) {
                    if (getUserSetting(session.settings, 'useEditorV2')) {
                        story.content.document = new Document()
                        story.metadata.hasDocument = true
                    } else {
                        story.content.story = new Story()
                    }
                }

                story.metadata.remote = getUserSetting(session.settings, 'remoteDefault')

                // set story model to user default if scenario default not availiable
                if (
                    !getAvailiableModels(session.subscription.tier === 3).some((m) =>
                        modelsCompatible(m.str, story.content.settings.model)
                    )
                ) {
                    story.content.settings.model = getUserSetting(session.settings, 'defaultModel')
                    const defaultPreset = getDefaultPresetForModel(
                        story.content.settings.model,
                        session.settings,
                        userPresets
                    )

                    story.content.settings.preset = defaultPreset.id
                }

                GlobalUserContext.stories.set(story.metadata.id, story.metadata)
                GlobalUserContext.storyContentCache.set(story.metadata.id, story.content)

                if (options?.callback) options.callback(story)

                set(Stories, [story.metadata.id, ...stories])
                set(SelectedStory, { loaded: false, id: story.metadata.id })
                set(StoryUpdate(story.metadata.id), story.metadata.save(true))

                await getStorage(session).saveStory(story, story.metadata.remote)
                window.dispatchEvent(new Event('remoteSaveQueueUpdate'))

                const selectedShelf = await snapshot.getPromise(SelectedShelf)
                if (selectedShelf) {
                    const shelf = GlobalUserContext.shelves.get(selectedShelf)
                    if (!shelf) return
                    setTimeout(() => {
                        shelf.children = [
                            ...(shelf.children ?? []),
                            {
                                type: 'story',
                                id: story.metadata.id,
                            },
                        ]
                        set(Stories, [...stories])
                        getStorage(session).saveStoryShelf(shelf)
                    }, 50)
                }
            },
        []
    )

    const duplicateStory = useRecoilCallback(
        ({ snapshot }) =>
            async (story: StoryContainer) => {
                const session = await snapshot.getPromise(Session)

                const copy = StoryContainer.deserialize(story.serialize())

                copy.metadata.id = uuid()
                // if story ends with a bracketed number increment number
                let copyNumber = 1
                if (copy.metadata.title.endsWith(')')) {
                    const match = copy.metadata.title.match(/\((\d+)\)$/)
                    if (match && match[1]) {
                        const number = Number.parseInt(match[1])
                        copyNumber = number + 1
                    }
                }
                if (copyNumber > 1) {
                    copy.metadata.title = copy.metadata.title.replace(/\(\d+\)$/, `(${copyNumber})`)
                } else {
                    copy.metadata.title += ' (1)'
                }
                copy.metadata.remote = getUserSetting(session.settings, 'remoteDefault')
                copy.metadata.remoteId = undefined
                copy.metadata.remoteStoryId = undefined
                copy.metadata.lastUpdatedAt = new Date()

                await importStory(copy)
            },
        []
    )

    return { createStoryWithDefaults, addStory, importStory, duplicateStory }
}
