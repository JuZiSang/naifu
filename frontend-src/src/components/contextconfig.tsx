import { useRecoilValue } from 'recoil'
import { MdHelpOutline } from 'react-icons/md'
import { useMemo } from 'react'
import { serialize } from 'serializr'
import { SelectedStory, UserPresets } from '../globals/state'
import { GlobalUserContext } from '../globals/globals'
import { AdvancedContextSettings, AdvancedContextSettingsHeading } from '../styles/components/contextviewer'
import { LightColorButton } from '../styles/ui/button'
import {
    ContextFieldConfig,
    getDefaultAuthorsNoteConfig,
    getDefaultMemoryConfig,
    getDefaultStoryConfig,
} from '../data/ai/contextfield'
import { LoreEntry } from '../data/ai/loreentry'
import { useReload } from '../hooks/useReload'
import { getModelPresets } from '../data/story/defaultpresets'
import { DefaultModel } from '../data/request/model'
import { ContextSettings } from './contextsettings'
import Tooltip from './tooltip'
import LorebookConfigSettings from './lorebook/lorebookconfigsettings'

export default function ContextConfig(): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const reload = useReload()
    const userPresets = useRecoilValue(UserPresets)
    const currentModel = currentStoryContent?.settings.model
        ? currentStoryContent.settings.model
        : DefaultModel
    const currentPreset = useMemo(() => {
        let preset = getModelPresets(currentModel).find((p) => p.id === currentStoryContent?.settings.preset)
        if (!preset) preset = userPresets.find((p) => p.id === currentStoryContent?.settings.preset)
        if (!preset) preset = getModelPresets(currentModel)[0]
        return preset
    }, [currentModel, userPresets, currentStoryContent?.settings.preset])

    const applyPresetConfig = () => {
        if (!currentStoryContent || !currentPreset.contextPresets) {
            return
        }
        currentStoryContent.context[0].contextConfig = ContextFieldConfig.deserialize(
            JSON.stringify(
                serialize(ContextFieldConfig, currentPreset.contextPresets.contextDefaults[0].contextConfig)
            )
        )
        currentStoryContent.context[1].contextConfig = ContextFieldConfig.deserialize(
            JSON.stringify(
                serialize(ContextFieldConfig, currentPreset.contextPresets.contextDefaults[1].contextConfig)
            )
        )
        currentStoryContent.storyContextConfig = ContextFieldConfig.deserialize(
            JSON.stringify(serialize(ContextFieldConfig, currentPreset.contextPresets.storyDefault))
        )
        // Dates from presets break serializr serialization
        const temp = JSON.parse(JSON.stringify(currentPreset.contextPresets.loreDefaults[0]))
        temp.lastUpdatedAt = new Date()
        currentStoryContent.contextDefaults.loreDefaults[0] = LoreEntry.deserialize(
            JSON.stringify(serialize(LoreEntry, temp))
        )
        reload()
    }

    const resetToDefaults = () => {
        if (!currentStoryContent) {
            return
        }
        currentStoryContent.context[0].contextConfig = getDefaultMemoryConfig()
        currentStoryContent.context[1].contextConfig = getDefaultAuthorsNoteConfig()
        currentStoryContent.storyContextConfig = getDefaultStoryConfig()
        currentStoryContent.contextDefaults.loreDefaults[0] = new LoreEntry()
        reload()
    }

    return (
        <AdvancedContextSettings>
            {currentPreset?.contextPresets ? (
                <LightColorButton onClick={applyPresetConfig}>Apply Preset Config (Legacy)</LightColorButton>
            ) : (
                <>
                    <LightColorButton onClick={resetToDefaults}>Reset to Defaults</LightColorButton>
                </>
            )}
            <div>
                <AdvancedContextSettingsHeading>Memory Context Settings</AdvancedContextSettingsHeading>
                <ContextSettings config={currentStoryContent?.context[0].contextConfig} />
            </div>
            <div>
                <AdvancedContextSettingsHeading>
                    {"Author's Note Context Settings"}
                </AdvancedContextSettingsHeading>
                <ContextSettings config={currentStoryContent?.context[1].contextConfig} />
            </div>
            {currentStoryContent?.contextDefaults.loreDefaults ? (
                <div>
                    <AdvancedContextSettingsHeading>
                        {'Default Lorebook Settings'}
                        <Tooltip
                            delay={1}
                            tooltip={`Newly created Lorebook entries will use these settings.`}
                        >
                            <MdHelpOutline
                                style={{
                                    opacity: 0.3,

                                    marginLeft: '0.3rem',
                                }}
                            />
                        </Tooltip>
                    </AdvancedContextSettingsHeading>
                    <LorebookConfigSettings
                        entry={currentStoryContent?.contextDefaults.loreDefaults[0] ?? null}
                    />
                </div>
            ) : (
                <></>
            )}
            <div>
                <AdvancedContextSettingsHeading>Story Context Settings</AdvancedContextSettingsHeading>
                <ContextSettings config={currentStoryContent?.storyContextConfig} />
            </div>
        </AdvancedContextSettings>
    )
}
