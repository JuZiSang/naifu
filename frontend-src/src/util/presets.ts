import { serialize } from 'serializr'
import { TextGenerationModel } from '../data/request/model'
import { getModelPresets } from '../data/story/defaultpresets'
import { StoryContent } from '../data/story/storycontainer'
import { StoryPreset, TextGenerationSettings } from '../data/story/storysettings'
import { UserSettings } from '../data/user/settings'
import { modelsHaveSamePresets } from './models'

export function copyStoryToPreset(storyContent: StoryContent, preset: StoryPreset): void {
    const genSettings = storyContent.settings.parameters

    preset.parameters = JSON.parse(JSON.stringify(genSettings))
}

const excludedValues: (keyof TextGenerationSettings)[] = [
    'eos_token_id',
    'min_length',
    'max_length',
    'bad_words_ids',
    'logit_bias_groups',
]

export function copyPresetToStory(preset: StoryPreset, storyContent: StoryContent, id?: string): void {
    const settings = storyContent.settings

    // Copy all exclusions to temporary object
    const exclusions: any = []
    for (const exclusion of excludedValues) {
        exclusions[exclusion] = storyContent.settings.parameters[exclusion]
    }

    // Set story settings to preset settings
    settings.parameters = JSON.parse(JSON.stringify(preset.parameters))

    settings.preset = id ? id : preset.id

    // Copy exclusions back to story
    for (const exclusion of excludedValues) {
        storyContent.settings.parameters[exclusion] = exclusions[exclusion]
    }

    storyContent.settingsDirty = false
}

export function compareStoryAndPreset(preset: StoryPreset, storyContent: StoryContent): boolean {
    let presetChanged = false
    const settings = storyContent.settings

    const exclusions: any = []
    for (const exclusion of excludedValues) {
        exclusions[exclusion] = storyContent.settings.parameters[exclusion]
    }

    // Copy preset values for excluded elements to the story
    for (const exclusion of excludedValues) {
        storyContent.settings.parameters[exclusion] = preset.parameters[exclusion] as any
    }
    // Check for equality
    presetChanged =
        presetChanged ||
        JSON.stringify(serialize(TextGenerationSettings, preset.parameters)) !==
            JSON.stringify(serialize(TextGenerationSettings, settings.parameters))

    // Copy exclusions back to story
    for (const exclusion of excludedValues) {
        storyContent.settings.parameters[exclusion] = exclusions[exclusion]
    }

    return presetChanged
}

export function getDefaultPresetForModel(
    model: TextGenerationModel,
    settings: UserSettings,
    userPresets: StoryPreset[]
): StoryPreset {
    let defaultPreset = getModelPresets(model)[0]
    if (settings.defaultPreset) {
        let tempPreset = getModelPresets(model).find((p) => p.id === settings.defaultPreset)
        if (!tempPreset) {
            tempPreset = userPresets.find((p) => p.id === settings.defaultPreset)
        }
        if (tempPreset && modelsHaveSamePresets(tempPreset.model, model)) {
            defaultPreset = tempPreset
        }
    }
    return defaultPreset
}
