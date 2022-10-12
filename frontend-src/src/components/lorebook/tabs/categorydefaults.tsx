import { useEffect, useState } from 'react'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import { serialize } from 'serializr'
import LorebookConfigSettings from '../lorebookconfigsettings'
import { GlobalUserContext } from '../../../globals/globals'
import { SelectedStory, StoryUpdate } from '../../../globals/state'
import { LorebookCategory as LorebookCategoryData } from '../../../data/story/lorebook'
import { CategorySettingsCheckbox, Label } from '../../../styles/components/lorebook'
import Checkbox from '../../controls/checkbox'
import WarningButton, { WarningButtonStyle } from '../../deletebutton'
import { FlexColSpacer, FlexRow } from '../../../styles/ui/layout'
import SimpleLight from '../../../assets/images/simple-light.svg'
import { ContextFieldConfig, getDefaultLoreConfig } from '../../../data/ai/contextfield'
import DotReset from '../../../assets/images/dot-reset.svg'

export function LorebookTabCategoryDefaults(props: {
    category: LorebookCategoryData | null
    save: () => void
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const [update, setUpdate] = useState(0)

    const [useCategoryDefaultsInput, setUseCategoryDefaultsInput] = useState(false)
    const setOverrideEntries = (state: boolean) => {
        if (props.category && currentStoryMetadata) {
            props.category.useCategoryDefaults = state
            setUseCategoryDefaultsInput(state)
            props.save()
        }
    }

    useEffect(() => {
        if (!props.category) {
            setUseCategoryDefaultsInput(false)
            return
        }
        setUseCategoryDefaultsInput(props.category.useCategoryDefaults)
    }, [props.category])

    const bulkSettingsChange = () => {
        if (!currentStoryContent || !currentStoryMetadata || props.category === null) return
        for (const entry of currentStoryContent.lorebook.entries) {
            if (entry.category === props.category.id) {
                const settings = props.category.categoryDefaults
                entry.forceActivation = settings.forceActivation
                entry.keyRelative = settings.keyRelative
                entry.nonStoryActivatable = settings.nonStoryActivatable
                entry.searchRange = settings.searchRange
                entry.contextConfig = JSON.parse(JSON.stringify(settings.contextConfig))
            }
        }
        setStoryUpdate(currentStoryMetadata.save())
    }

    const resetToDefaulSettings = () => {
        if (!props.category || !currentStoryMetadata || !currentStoryContent) return
        const defaults = currentStoryContent.contextDefaults.loreDefaults[0] ?? getDefaultLoreConfig()

        props.category.categoryDefaults.contextConfig = ContextFieldConfig.deserialize(
            JSON.stringify(serialize(ContextFieldConfig, defaults.contextConfig))
        )
        props.category.categoryDefaults.searchRange = defaults.searchRange
        props.category.categoryDefaults.nonStoryActivatable = defaults.nonStoryActivatable
        props.category.categoryDefaults.keyRelative = defaults.keyRelative

        setUpdate((v) => v + 1)
        setStoryUpdate(currentStoryMetadata.save())
    }

    if (props.category === null) {
        return <></>
    }
    return (
        <>
            <FlexRow style={{ flexWrap: 'wrap' }}>
                <FlexRow grow={false}>
                    <Label>Default Placement Settings</Label>
                </FlexRow>
                <WarningButton
                    iconURL={DotReset.src}
                    confirmButtonText="Reset it!"
                    style={{ width: 'unset', fontWeight: 600 }}
                    buttonType={WarningButtonStyle.Light}
                    onConfirm={() => {
                        resetToDefaulSettings()
                    }}
                    warningText={
                        <>
                            Are you sure you want to reset the entries insertions settings to their defaults?
                            <br />
                            This cannot be reversed.
                            <FlexColSpacer min={40} max={40} />
                        </>
                    }
                    label="Reset Settings?"
                    buttonText={'Reset to Defaults'}
                />
            </FlexRow>

            <CategorySettingsCheckbox style={{ maxWidth: 300 }}>
                <Checkbox
                    alternate={true}
                    value={useCategoryDefaultsInput}
                    setValue={(value) => setOverrideEntries(value)}
                    disabled={props.category === null}
                    label="Default Entry Settings"
                    checkedText="New Lorebook entries created in this category will have the below settings."
                    uncheckedText={`New Lorebook entries created in this category
                                                will use the default Lorebook entry settings.`}
                />
            </CategorySettingsCheckbox>
            <LorebookConfigSettings
                update={update}
                entry={props.category?.categoryDefaults ?? null}
                disabled={!useCategoryDefaultsInput}
                showForceActivation={true}
            />
            <FlexColSpacer min={20} max={20} />
            <WarningButton
                iconURL={SimpleLight.src}
                onConfirm={() => {
                    bulkSettingsChange()
                }}
                warningText={
                    <>
                        Are you sure you want to update all the settings of every entry within {'"'}
                        {props.category.name}
                        {'"'}.<br />
                        This cannot be reversed.
                    </>
                }
                label="Update All Entries?"
                buttonText="Update All Entries"
            />
        </>
    )
}
