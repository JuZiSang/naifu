import { SetterOrUpdater, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { createFilter, GroupBase, OptionsOrGroups } from 'react-select'
import { useEffect, useState } from 'react'
import { Session, SiteTheme, StoryUpdate, UserPresets } from '../globals/state'

import { PresetInfo } from '../hooks/usePresetInfo'
import { Options, PresetOptions, usePresetOptions } from '../hooks/usePresetOptions'
import { transparentize } from '../util/colour'
import { getModelPresets } from '../data/story/defaultpresets'
import { SetterPackage, updateStory } from '../component-logic/optionslogic'
import { StoryPreset } from '../data/story/storysettings'
import { GlobalUserContext } from '../globals/globals'
import { compareStoryAndPreset, copyPresetToStory } from '../util/presets'
import { useSelectedStoryUpdate } from '../hooks/useSelectedStory'
import { DefaultModel, normalizeModel, TextGenerationModel } from '../data/request/model'
import { getAvailiableModels, modelsCompatible } from '../util/models'
import { getUserSetting } from '../data/user/settings'
import { getDropdownStyle, getDropdownTheme, Select } from './controls/select'

let lastStoryID = ''

export function useStoryPresetSelect(
    onUpdate?: () => void,
    onPresetChange?: () => void
): {
    presetSelect: JSX.Element
    currentPreset: PresetInfo
    setUserPresets: SetterOrUpdater<StoryPreset[]>
    setPreset: (id: string) => void
    userPresets: StoryPreset[]
    defaultPresets: StoryPreset[]
} {
    const { id: storyId, update: storyUpdate, story, meta } = useSelectedStoryUpdate()
    const setStoryUpdate = useSetRecoilState(StoryUpdate(storyId))
    const session = useRecoilValue(Session)

    const modelOptions = getAvailiableModels(session.subscription.tier >= 3)
    const selectedModel =
        modelOptions.find((m) => story && m.str === normalizeModel(story.settings.model)) ??
        modelOptions.find((m) => m.str === getUserSetting(session.settings, 'defaultModel')) ??
        modelOptions.find((m) => m.str === DefaultModel) ??
        modelOptions[0]

    const settings = story?.settings

    const [userPresets, setUserPresets] = useRecoilState(UserPresets)
    const options = usePresetOptions(selectedModel.str, true)

    let defaultPresets: StoryPreset[] = []
    if (story) {
        defaultPresets = [...getModelPresets(selectedModel.str)]
        if (story.scenarioPreset) {
            defaultPresets.push(story.scenarioPreset)
        }
    }
    // eslint-disable-next-line prefer-const
    let combinedPresets = [...userPresets, ...defaultPresets]
    const modelDefaultPresets = getModelPresets(selectedModel.str)

    const [currentPreset, setCurrentPreset] = useState<PresetInfo>({
        id: settings?.preset ?? modelDefaultPresets[0].id,
        name:
            combinedPresets.find((preset) => settings?.preset === preset.id)?.name ??
            modelDefaultPresets[0].name,
        description:
            combinedPresets.find((preset) => settings?.preset === preset.id)?.description ??
            modelDefaultPresets[0].description,
        changed: !story
            ? false
            : compareStoryAndPreset(
                  combinedPresets.find((preset) => settings?.preset === preset.id) ?? modelDefaultPresets[0],
                  story
              ),
        model:
            combinedPresets.find((preset) => settings?.preset === preset.id)?.model ??
            modelDefaultPresets[0].model,
    })

    const setterPackage: SetterPackage = {
        currentStory: meta,
        currentStoryContent: story,
        genSettings: settings?.parameters,
        updateState: setStoryUpdate,
    }

    const setPreset = (id: string): void => {
        if (!settings || !story) {
            return
        }
        const preset = combinedPresets.find((preset) => preset.id === id) ?? defaultPresets[0]
        updateStory(() => {
            copyPresetToStory(preset, story, id)
        }, setterPackage)
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        if (onUpdate) {
            onUpdate()
        }

        if (!story) {
            return
        }
        const modelDefaultPresets = getModelPresets(selectedModel.str)
        const currentPresetID = settings?.preset ?? ''
        let currentPresetName = modelDefaultPresets[0].name
        let currentPresetDescription = modelDefaultPresets[0].description ?? ''
        let currentPresetModel = modelDefaultPresets[0].model
        let presetChanged = false
        const defaults = new StoryPreset('', selectedModel.str)
        const foundPreset = combinedPresets.find((preset) => preset.id === currentPresetID)
        presetChanged = compareStoryAndPreset(foundPreset ? foundPreset : defaults, story)

        if (foundPreset) {
            currentPresetName = foundPreset.name
            currentPresetDescription = foundPreset.description ?? ''
            currentPresetModel = foundPreset.model
        }
        const newPreset = {
            id: currentPresetID,
            name: currentPresetName,
            description: currentPresetDescription,
            changed: presetChanged,
            model: currentPresetModel,
        }
        if (JSON.stringify(newPreset) !== JSON.stringify(currentPreset)) {
            setCurrentPreset(newPreset)
        }
        if (presetChanged && meta?.id === lastStoryID && onPresetChange) {
            onPresetChange()
        }
        if (meta && foundPreset && presetChanged && !story.settingsDirty && meta.id !== lastStoryID) {
            updateStory(() => copyPresetToStory(foundPreset, story, currentPresetID), setterPackage, false)
        } else if (meta && foundPreset && presetChanged && !story.settingsDirty && meta.id === lastStoryID) {
            updateStory(() => {
                story.settingsDirty = true
            }, setterPackage)
        }
        lastStoryID = meta?.id ?? ''
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storyUpdate, meta, session, settings, userPresets])

    const presetSelect = (
        <PresetSelect options={options} currentPreset={currentPreset} setPreset={setPreset} />
    )

    return {
        presetSelect,
        currentPreset,
        setUserPresets,
        setPreset,
        userPresets,
        defaultPresets,
    }
}

export function PresetSelect(props: {
    currentPreset: PresetInfo
    options: OptionsOrGroups<Options, GroupBase<Options>>
    setPreset: (id: string) => void
    minMenuHeight?: number
    maxMenuHeight?: number
}): JSX.Element {
    const groupStyles = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    }
    const siteTheme = useRecoilValue(SiteTheme)

    const groupTextStyle = {
        font: siteTheme.fonts.default,
        color: transparentize(0.73, siteTheme.colors.textMain),
    }

    const formatGroupLabel = (data: any) => (
        <div style={groupStyles}>
            <span style={groupTextStyle as any}>{data.label}</span>
        </div>
    )

    return (
        <>
            <Select
                menuPlacement="auto"
                aria-label="Select a Settings Preset"
                formatGroupLabel={formatGroupLabel}
                minMenuHeight={props.minMenuHeight}
                maxMenuHeight={props.maxMenuHeight ?? 420}
                options={props.options}
                isSearchable={true}
                filterOption={createFilter({
                    ignoreCase: true,
                    ignoreAccents: true,
                    trim: false,
                    matchFrom: 'any',
                    stringify: (option) => `${option.data.rawLabel} ${option.value}`,
                })}
                onChange={(e) => e !== null && props.setPreset(e.value)}
                value={{
                    value: props.currentPreset.id,
                    label: (
                        <div>
                            {(props.currentPreset.changed ? '(edited) ' : '') + props.currentPreset.name}
                        </div>
                    ),
                    rawLabel: (props.currentPreset.changed ? '(edited) ' : '') + props.currentPreset.name,
                    description:
                        props.currentPreset.name +
                        (props.currentPreset.description ? `: ${props.currentPreset.description}` : ''),
                }}
                styles={getDropdownStyle(siteTheme)}
                theme={getDropdownTheme(siteTheme)}
            />
        </>
    )
}
