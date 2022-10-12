import { useState, useEffect, useRef } from 'react'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import { MdHelpOutline } from 'react-icons/md'
import { LoreEntry } from '../../data/ai/loreentry'
import { GlobalUserContext } from '../../globals/globals'
import { SelectedStory, StoryUpdate } from '../../globals/state'
import { AdvancedSettings, ContextSettings, TwoGrid } from '../contextsettings'
import Checkbox from '../controls/checkbox'
import Tooltip from '../tooltip'
import { MainSettingSliderCard } from '../sidebars/common/editorcard'
import { FlexColSpacer, FlexRow } from '../../styles/ui/layout'

//imported in a bunch of places
export default function LorebookConfigSettings(props: {
    entry: LoreEntry | null
    disabled?: boolean
    showForceActivation?: boolean
    update?: number
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const [rangeInput, setRangeInput] = useState(1000)

    const timeout = useRef<NodeJS.Timeout | null>(null)
    const delaySave = () => {
        if (timeout.current !== null) {
            clearTimeout(timeout.current)
        }
        timeout.current = setTimeout(() => {
            if (currentStoryMetadata) {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }, 750)
    }

    useEffect(() => {
        if (!props.entry) {
            setRangeInput(1000)
            setKeyRelativeInput(false)
            setNonStoryActivatableInput(false)
            return
        }
        setRangeInput(props.entry.searchRange)
        setKeyRelativeInput(props.entry.keyRelative)
        setNonStoryActivatableInput(props.entry.nonStoryActivatable)
    }, [props.entry, props.update])

    const setSearchRange = (value: number) => {
        if (props.entry && currentStoryMetadata) {
            setRangeInput(value)
            props.entry.searchRange = value
            delaySave()
        }
    }

    const [keyRelativeInput, setKeyRelativeInput] = useState(false)
    const setKeyRelative = (state: boolean) => {
        if (props.entry && currentStoryMetadata) {
            setKeyRelativeInput(state)
            props.entry.keyRelative = state
            delaySave()
        }
    }

    const [forceActivationInput, setForceActivationInput] = useState(false)
    const setForceActivation = (state: boolean) => {
        if (props.entry && currentStoryMetadata) {
            setForceActivationInput(state)
            props.entry.forceActivation = state
            delaySave()
        }
    }

    const [nonStoryActivatableInput, setNonStoryActivatableInput] = useState(false)
    const setNonStoryActivatable = (state: boolean) => {
        if (props.entry && currentStoryMetadata) {
            setNonStoryActivatableInput(state)
            props.entry.nonStoryActivatable = state
            delaySave()
        }
    }

    return (
        <>
            <AdvancedSettings style={{ flex: '0 0 auto', opacity: props.disabled ? '0.5' : '1' }}>
                <div>
                    <div>
                        <MainSettingSliderCard
                            style={{ margin: 0 }}
                            title={
                                <FlexRow style={{ justifyContent: 'flex-start' }}>
                                    Search Range
                                    <Tooltip
                                        delay={1}
                                        tooltip={`The number of characters of the story that will be searched for keys.\
                                                Maximum of 10000.`}
                                    >
                                        <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                                    </Tooltip>
                                </FlexRow>
                            }
                            min="0"
                            max="10000"
                            hint="Default: 1000"
                            onHintClick={() => setSearchRange(1000)}
                            value={rangeInput}
                            onChange={setSearchRange}
                            step={100}
                        />
                    </div>
                </div>
                <TwoGrid>
                    <div>
                        <Checkbox
                            value={keyRelativeInput}
                            setValue={setKeyRelative}
                            disabled={props.entry === null || props.disabled === true}
                            label="Key-Relative Insertion"
                            tooltip={`Causes the Lorebook entry to be inserted relative to the \
                            last of its keys to be found within the context. \nPositive Insertion \
                            positions will insert the entry after the key. Negative insertion positions \
                            will insert the entry before the key. \nA key is not\
                             guaranteed to be found within the context, in these cases the entry \
                             will not be included. \nEntries with this setting enabled should typically have a \
                             lower Insertion Order than the story context (default 0)\
                              and a sufficient amount of reserved tokens. \n Large numbers of relatively inserted \
                              lorebook entries can slow down context creation.`}
                        />
                    </div>
                    <div>
                        <Checkbox
                            value={nonStoryActivatableInput}
                            setValue={setNonStoryActivatable}
                            disabled={props.entry === null || props.disabled === true}
                            label="Cascading Activation"
                            tooltip={`When enabled the Lorebook entry will search for keys in non-story \
                            context entries. \nSearch range is not taken into account for non-story context entries.\
                             Text from the entry that caused the activation is not guaranteed to end up within the \
                             context.`}
                        />
                    </div>
                    {props.showForceActivation && (
                        <div>
                            <Checkbox
                                value={forceActivationInput}
                                setValue={setForceActivation}
                                disabled={props.entry === null || props.disabled === true}
                                label="Always On"
                                tooltip={`Causes the Lorebook entry to always activate regardless of whether a key was detected.`}
                            />
                        </div>
                    )}
                </TwoGrid>
            </AdvancedSettings>
            <FlexColSpacer min={10} max={10} />
            <ContextSettings
                disabled={props.disabled}
                config={props.entry?.contextConfig}
                onUpdate={() => {
                    if (props.entry) props.entry.lastUpdatedAt = new Date()
                }}
                save={delaySave}
            ></ContextSettings>
        </>
    )
}
