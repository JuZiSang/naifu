import { useMemo } from 'react'
import { GroupBase, OptionsOrGroups } from 'react-select'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { normalizeModel, TextGenerationModel } from '../data/request/model'
import { getModelLoreGenPresets, getModelPresets } from '../data/story/defaultpresets'
import { StoryPreset } from '../data/story/storysettings'
import { GlobalUserContext } from '../globals/globals'
import { SelectedStoryId, UserPresets } from '../globals/state'
import { modelsHaveSamePresets, modelName } from '../util/models'

export interface Options {
    value: string
    label: JSX.Element
    rawLabel: string
    description: string
}

export const PresetSelectOption = styled.div`
    & > div:nth-child(1) {
        font-weight: 600;
    }
    & > div:nth-child(2) {
        opacity: 0.8;
    }
    & > div:nth-child(3) {
        opacity: 0.5;
    }
    & > div:nth-child(4) {
        opacity: 0.5;
    }
`

export const PresetWarning = styled.div`
    font-size: 0.7rem;
`

function label(preset: StoryPreset, compatible: boolean = true) {
    const warn =
        (preset.parameters.repetition_penalty_frequency ?? 0) > 0 ||
        (preset.parameters.repetition_penalty_presence ?? 0) > 0
    return (
        <PresetSelectOption>
            <div>{preset.name}</div>
            {preset.description ? <div>{preset.description}</div> : null}
            {warn ? (
                <PresetWarning>
                    Contains hidden experimental settings.
                    <br /> Not recommended as a base for new presets.
                </PresetWarning>
            ) : null}
            {!compatible ? (
                <PresetWarning>
                    Preset was created for {modelName(normalizeModel(preset.model))} and might not work as
                    intended with this model.
                </PresetWarning>
            ) : null}
        </PresetSelectOption>
    )
}

export function filterPresets(model: TextGenerationModel): (preset: StoryPreset) => boolean {
    return (preset: StoryPreset) => modelsHaveSamePresets(preset.model, model)
}

export type PresetOptions = OptionsOrGroups<Options, GroupBase<Options>>
export function usePresetOptions(
    model: TextGenerationModel,
    checkStory: boolean = false,
    loreGen: boolean = false
): PresetOptions {
    const userPresets = useRecoilValue(UserPresets)
    const selectedStory = useRecoilValue(SelectedStoryId)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory)
    const options = useMemo(() => {
        const defaultPresets = [...getModelPresets(model)]
        const loreGenPresets = [...getModelLoreGenPresets(model)]

        const options = []
        if (loreGen) {
            options.push({
                label: 'Lore Generation',
                options: loreGenPresets.map((preset) => ({
                    value: preset.id,
                    description: preset.name + (preset.description ? `: ${preset.description}` : ''),
                    rawLabel: preset.name,
                    label: label(preset),
                })),
            })
        }

        options.push({
            label: 'User',
            options: userPresets.filter(filterPresets(model)).map((preset) => ({
                value: preset.id,
                description: preset.name + (preset.description ? `: ${preset.description}` : ''),
                rawLabel: preset.name,
                label: label(preset),
            })),
        })
        if (checkStory && currentStoryContent?.scenarioPreset) {
            options.push({
                label: 'Scenario',
                options: [currentStoryContent.scenarioPreset].map((preset) => ({
                    value: preset.id,
                    description: preset.name + (preset.description ? `: ${preset.description}` : ''),
                    rawLabel: preset.name,
                    label: label(
                        preset,
                        modelsHaveSamePresets(
                            currentStoryContent.settings.model,
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            currentStoryContent.scenarioPreset!.model
                        )
                    ),
                })),
            })
        }
        options.push({
            label: 'Default',
            options: defaultPresets.map((preset) => ({
                value: preset.id,
                description: preset.name + (preset.description ? `: ${preset.description}` : ''),
                rawLabel: preset.name,
                label: label(preset),
            })),
        })
        return options
    }, [
        checkStory,
        currentStoryContent?.scenarioPreset,
        currentStoryContent?.settings.model,
        loreGen,
        model,
        userPresets,
    ])
    return options
}
