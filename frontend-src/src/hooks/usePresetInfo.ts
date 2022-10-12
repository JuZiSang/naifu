import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { TextGenerationModel } from '../data/request/model'
import { getModelLoreGenPresets, getModelPresets } from '../data/story/defaultpresets'
import { GlobalUserContext } from '../globals/globals'
import { SelectedStoryId, UserPresets } from '../globals/state'

export interface PresetInfo {
    id: string
    name: string
    description?: string
    changed: boolean
    model: TextGenerationModel
}

export function usePresetInfo(
    selectedPreset: string,
    model: TextGenerationModel,
    checkStory: boolean = false,
    loreGen: boolean = false
): PresetInfo {
    const userPresets = useRecoilValue(UserPresets)
    const selectedStory = useRecoilValue(SelectedStoryId)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory)

    return useMemo(() => {
        const modelDefaultPresets = getModelPresets(model)
        const modelLoreGenPresets = getModelLoreGenPresets(model)

        const defaultPreset =
            loreGen && modelLoreGenPresets[0]
                ? {
                      id: modelLoreGenPresets[0].id,
                      name: modelLoreGenPresets[0].name,
                      description: modelLoreGenPresets[0].description,
                      changed: false,
                      model: modelLoreGenPresets[0].model,
                  }
                : {
                      id: modelDefaultPresets[0].id,
                      name: modelDefaultPresets[0].name,
                      description: modelDefaultPresets[0].description,
                      changed: false,
                      model: modelDefaultPresets[0].model,
                  }
        if (selectedPreset === '') {
            return defaultPreset
        }
        const combinedPresets = [...userPresets, ...modelDefaultPresets]
        if (checkStory && currentStoryContent?.scenarioPreset)
            combinedPresets.push(currentStoryContent.scenarioPreset)
        const preset = combinedPresets.find((p) => p.id === selectedPreset)
        if (!preset) {
            return defaultPreset
        }
        return {
            id: preset?.id ?? '',
            name: preset?.name ?? 'Unknown Preset',
            description: preset?.description,
            changed: false,
            model: preset?.model ?? '',
        }
    }, [checkStory, currentStoryContent?.scenarioPreset, loreGen, model, selectedPreset, userPresets])
}
