import { useEffect, useState } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { serialize } from 'serializr'
import { GlobalUserContext } from '../../../globals/globals'
import { SelectedStory, StoryUpdate } from '../../../globals/state'
import { LorebookCategory as LorebookCategoryData } from '../../../data/story/lorebook'
import { CategorySettingsCheckbox, Label } from '../../../styles/components/lorebook'
import Checkbox from '../../controls/checkbox'
import { ContextSettings } from '../../contextsettings'
import { FlexColSpacer, FlexRow } from '../../../styles/ui/layout'
import WarningButton from '../../deletebutton'
import { ContextFieldConfig, getDefaultLoreConfig } from '../../../data/ai/contextfield'
import DotReset from '../../../assets/images/dot-reset.svg'

export function LorebookTabCategorySubcontext(props: {
    category: LorebookCategoryData | null
    save: () => void
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const [createSubcontextInpout, setCreateSubcontextInput] = useState(false)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const [, setUpdate] = useState(0)
    const setCreateSubcontext = (state: boolean) => {
        if (props.category && currentStoryMetadata) {
            props.category.createSubcontext = state
            setCreateSubcontextInput(state)
            props.save()
        }
    }

    useEffect(() => {
        if (!props.category) {
            setCreateSubcontextInput(false)
            return
        }
        setCreateSubcontextInput(props.category.createSubcontext)
    }, [props.category])

    const resetToDefaulSettings = () => {
        if (!props.category || !currentStoryMetadata || !currentStoryContent) return
        const defaults = currentStoryContent.contextDefaults.loreDefaults[0] ?? getDefaultLoreConfig()

        props.category.subcontextSettings.contextConfig = ContextFieldConfig.deserialize(
            JSON.stringify(serialize(ContextFieldConfig, defaults.contextConfig))
        )

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
                    <Label>Subcontext Settings</Label>
                </FlexRow>
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

            <CategorySettingsCheckbox style={{ maxWidth: 300 }}>
                <Checkbox
                    value={createSubcontextInpout}
                    setValue={(value) => setCreateSubcontext(value)}
                    disabled={props.category === null}
                    label="Create Subcontext"
                    alternate={true}
                    checkedText="Lorebook entries in this category will be grouped into a subcontext,
                                        which will then be inserted into context using the below settings."
                    uncheckedText="Lorebook entries in this category will be inserted into context as normal."
                />
            </CategorySettingsCheckbox>
            <ContextSettings
                config={props.category?.subcontextSettings.contextConfig ?? null}
                disabled={!createSubcontextInpout}
                save={props.save}
            />
        </>
    )
}
