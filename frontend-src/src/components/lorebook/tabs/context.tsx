import { useState } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { serialize } from 'serializr'
import { ContextFieldConfig, getDefaultLoreConfig } from '../../../data/ai/contextfield'
import { LoreEntry } from '../../../data/ai/loreentry'
import { GlobalUserContext } from '../../../globals/globals'
import { SelectedStory, StoryUpdate } from '../../../globals/state'
import { Label } from '../../../styles/components/lorebook'
import { FlexColSpacer, FlexRow } from '../../../styles/ui/layout'
import WarningButton from '../../deletebutton'
import LorebookConfigSettings from '../lorebookconfigsettings'
import DotReset from '../../../assets/images/dot-reset.svg'

export function LorebookTabContext(props: { entry: LoreEntry | null }): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const [update, setUpdate] = useState(0)

    const resetToDefaulSettings = () => {
        if (!props.entry || !currentStoryMetadata || !currentStoryContent) return
        const category = currentStoryContent.lorebook.categories.find(
            (c) => c.id === props.entry?.category ?? ''
        )
        const defaults =
            (category && category.useCategoryDefaults
                ? category.categoryDefaults
                : currentStoryContent.contextDefaults.loreDefaults[0]) ?? getDefaultLoreConfig()

        props.entry.contextConfig = ContextFieldConfig.deserialize(
            JSON.stringify(serialize(ContextFieldConfig, defaults.contextConfig))
        )
        props.entry.searchRange = defaults.searchRange
        props.entry.nonStoryActivatable = defaults.nonStoryActivatable
        props.entry.keyRelative = defaults.keyRelative

        setUpdate((v) => v + 1)
        setStoryUpdate(currentStoryMetadata.save())
    }

    return (
        <>
            <FlexRow style={{ flexWrap: 'wrap' }}>
                <Label>Placement Settings</Label>
                <WarningButton
                    iconURL={DotReset.src}
                    confirmButtonText="Reset it!"
                    style={{ width: 'unset', fontWeight: 600 }}
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
            <LorebookConfigSettings entry={props.entry} update={update}></LorebookConfigSettings>
        </>
    )
}
