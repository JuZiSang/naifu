import { useState, useEffect } from 'react'
import { MdHelpOutline } from 'react-icons/md'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { ContextFieldConfig, SeparationType as SeparationType, TrimDirection } from '../data/ai/contextfield'
import { MaxTokens } from '../globals/constants'
import { GlobalUserContext } from '../globals/globals'
import { SelectedStory, StoryUpdate } from '../globals/state'
import { transparentize } from '../util/colour'
import { FlexRow } from '../styles/ui/layout'
import { Checkbox } from '../styles/ui/checkbox'
import { MainSettingHeading, MainSettingValue } from '../styles/ui/editorcard'
import Tooltip from './tooltip'
import Radio from './controls/radio'

export const RadioSelector = styled.span<{ selected: boolean; disabled?: boolean; focused: boolean }>`
    cursor: ${(props) => (!props.disabled ? 'pointer' : 'not-allowed')};
    background: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.bg0)};
    display: inline-block;
    padding: 6px 19px !important;
    user-select: none;
    font-size: 1rem;
    color: ${(props) =>
        props.selected ? props.theme.colors.textHeadings : transparentize(0.5, props.theme.colors.textMain)};
    border: 2px solid ${(props) => (props.focused ? props.theme.colors.bg0 : 'transparent')};
    font-weight: 600;
`

export const ConfigSettingsHeading = styled.div`
    color: ${(props) => props.theme.colors.textMain};
    font-family: ${(props) => props.theme.fonts.default};
    margin-bottom: 4px;
    font-weight: 400;
`

export const AdvancedSettings = styled.div`
    display: flex;
    flex-direction: column;
    padding-top: 5px;
    > :not(:last-child) {
        margin-bottom: 15px;
    }
    flex: 0 0 auto;
    ${Checkbox} > div > div {
        font-family: ${(props) => props.theme.fonts.default};
        font-weight: 400;
    }
    ${MainSettingHeading} > div {
        font-family: ${(props) => props.theme.fonts.default};
        font-weight: 400;
    }
    ${MainSettingValue} {
        input: {
            font-size: 1rem;
            font-weight: 400;
        }
    }
`

export const FourGrid = styled.div`
    align-items: flex-end;
    display: grid;
    gap: 20px;
    flex: 0 0 auto;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    & > div {
        justify-content: space-between;
        display: flex;
        flex-direction: column;
    }
    input {
        min-height: 40px;
    }
`

export const ThreeGrid = styled.div`
    align-items: flex-end;
    display: grid;
    gap: 20px;
    flex: 0 0 auto;
    grid-template-columns: 1fr 1fr 1fr;
    & > div {
        justify-content: space-between;
        display: flex;
        flex-direction: column;
    }
    input {
        min-height: 40px;
    }
`

export const TwoGrid = styled.div`
    align-items: flex-end;
    display: grid;
    gap: 20px;
    flex: 0 0 auto;
    grid-template-columns: 1fr 1fr;
    & > div {
        justify-content: space-between;
        display: flex;
        flex-direction: column;
    }
    input {
        min-height: 40px;
    }
`

export function ContextSettings(props: {
    disabled?: boolean
    config: ContextFieldConfig | undefined
    onUpdate?: () => void
    save?: () => void
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))

    const [budgetInput, setBudgetInput] = useState('')
    const [reservedInput, setReservedInput] = useState('')
    const [priorityInput, setPriorityInput] = useState('')
    const [positionInput, setPositionInput] = useState('')

    useEffect(() => {
        if (!props.config) {
            setBudgetInput('')
            setReservedInput('')
            setPriorityInput('')
            setPositionInput('')
            setSuffixInput('')
            setPrefixInput('')
            setTrimDirectionInput('' as TrimDirection)
            setInsertTypeInput('' as SeparationType)
            setMaxTrimInput('' as SeparationType)
            return
        }
        setBudgetInput(props.config.tokenBudget.toString())
        setReservedInput(props.config.reservedTokens.toString())
        setPriorityInput(props.config.budgetPriority.toString())
        setPositionInput(props.config.insertionPosition.toString())
        setSuffixInput(props.config.suffix)
        setPrefixInput(props.config.prefix)
        setTrimDirectionInput(props.config.trimDirection)
        setInsertTypeInput(props.config.insertionType)
        setMaxTrimInput(props.config.maximumTrimType)
    }, [props.config])

    const setTokenBudget = (range: string) => {
        if (props.config && currentStoryMetadata) {
            let value = range.replace(/[^\d.]+/g, '')
            const pattern = /((0?\.\d*)|(\d+))/g
            const matches = value.match(pattern)
            if (matches) {
                value = matches[0]
            }
            setBudgetInput(value)
            let num = Number.parseFloat(value)
            if (num < 0) {
                num = 0
                setBudgetInput(num.toString())
            }
            if (num > MaxTokens) {
                num = MaxTokens
                setBudgetInput(num.toString())
            }
            if (Number.isNaN(num)) num = 0
            props.config.tokenBudget = num
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }

    const setReservedTokens = (range: string) => {
        if (props.config && currentStoryMetadata) {
            let value = range.replace(/[^\d.]+/g, '')
            const pattern = /((0?\.\d*)|(\d+))/g
            const matches = value.match(pattern)
            if (matches) {
                value = matches[0]
            }
            setReservedInput(value)
            let num = Number.parseFloat(value)
            if (num < 0) {
                num = 0
                setReservedInput(num.toString())
            }
            if (num > MaxTokens) {
                num = MaxTokens
                setReservedInput(num.toString())
            }
            if (Number.isNaN(num)) num = 0
            props.config.reservedTokens = num
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }

    const setPosition = (position: string) => {
        if (props.config && currentStoryMetadata) {
            let value = position.replace(/[^\d-]+/g, '')
            const pattern = /(-)?(\d+)/g
            const matches = value.match(pattern)
            if (matches) {
                value = matches[0]
            }
            setPositionInput(value)
            let num = Number.parseInt(value)
            if (Number.isNaN(num)) num = 0
            props.config.insertionPosition = num
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }

    const setPriority = (position: string) => {
        if (props.config && currentStoryMetadata) {
            let value = position.replace(/[^\d-]+/g, '')
            const pattern = /(-)?(\d+)/g
            const matches = value.match(pattern)
            if (matches) {
                value = matches[0]
            }
            setPriorityInput(value)
            let num = Number.parseInt(value)
            if (Number.isNaN(num)) num = 0
            props.config.budgetPriority = num
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }

    const [prefixInput, setPrefixInput] = useState('')
    const setPrefix = (prefix: string) => {
        if (props.config && currentStoryMetadata) {
            setPrefixInput(prefix.replace(/\\n/g, '\n'))
            props.config.prefix = prefix.replace(/\\n/g, '\n')
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }

    const [suffixInput, setSuffixInput] = useState('')
    const setSuffix = (suffix: string) => {
        if (props.config && currentStoryMetadata) {
            setSuffixInput(suffix.replace(/\\n/g, '\n'))
            props.config.suffix = suffix.replace(/\\n/g, '\n')
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }

    const [trimDirectionInput, setTrimDirectionInput] = useState<TrimDirection>(TrimDirection.DoNotTrim)
    const setTrimDirection = (direction: TrimDirection) => {
        if (props.config && currentStoryMetadata) {
            setTrimDirectionInput(direction)
            props.config.trimDirection = direction
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }

    const [maxTrimInput, setMaxTrimInput] = useState<SeparationType>(SeparationType.NewLine)
    const setMaximumTrimType = (type: SeparationType) => {
        if (props.config && currentStoryMetadata) {
            setMaxTrimInput(type)
            props.config.maximumTrimType = type
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }

    const [insertTypeInput, setInsertTypeInput] = useState<SeparationType>(SeparationType.NewLine)
    const setInsertionType = (type: SeparationType) => {
        if (props.config && currentStoryMetadata) {
            setInsertTypeInput(type)
            props.config.insertionType = type
            if (props.onUpdate) props.onUpdate()
            if (props.save) {
                props.save()
            } else {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }
    }
    return (
        <AdvancedSettings style={{ opacity: props.disabled ? '0.5' : '1' }}>
            <ThreeGrid>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Prefix</span>
                            <Tooltip
                                delay={1}
                                tooltip={`Text prepended to the entry after trimming and before inserting it into context.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <input
                        aria-label="Prefix"
                        value={prefixInput.replace(/\n/g, '\\n')}
                        disabled={props.config === undefined || props.disabled === true}
                        type="text"
                        onChange={(e) => {
                            setPrefix(e.target.value)
                        }}
                    />
                </div>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Suffix</span>
                            <Tooltip
                                delay={1}
                                tooltip={`Text appended to the entry after trimming and before inserting it into context.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <input
                        aria-label="Suffix"
                        value={suffixInput.replace(/\n/g, '\\n')}
                        disabled={props.config === undefined || props.disabled === true}
                        type="text"
                        onChange={(e) => {
                            setSuffix(e.target.value)
                        }}
                    />
                </div>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Token Budget</span>
                            <Tooltip
                                delay={1}
                                tooltip={`The maximum amount of tokens of the context the entry may use. \
                            \nDecimal numbers between 0 and 1 (exclusive) will be interpreted as a percentage \
                            of the maximum context size (max tokens - output length).`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <input
                        aria-label="Token Budget"
                        value={props.config ? budgetInput : ''}
                        disabled={props.config === undefined || props.disabled === true}
                        type="text"
                        onChange={(e) => {
                            setTokenBudget(e.target.value)
                        }}
                    />
                </div>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Reserved Tokens</span>
                            <Tooltip
                                delay={1}
                                tooltip={`The number of tokens of the context the entry may reserve for itself. \
                            All reservations are made before any entries are placed in context.\
                            It will not reserve more tokens than the entry actually contains. \
                            \nDecimal numbers between 0 and 1 (exclusive) will be interpreted as a percentage \
                            of the maximum context size (max tokens - output length).`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <input
                        aria-label="Reserved Tokens"
                        value={props.config ? reservedInput : ''}
                        disabled={props.config === undefined || props.disabled === true}
                        type="text"
                        onChange={(e) => {
                            setReservedTokens(e.target.value)
                        }}
                    />
                </div>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Insertion Order</span>
                            <Tooltip
                                delay={1}
                                tooltip={`Entries are ordered by their insertion order before context is built. \
                            Entries with higher insertion order will reserve tokens and be inserted into the context first.\
                            \nIf two entries share the same insertion order there is no guarantee which will be inserted first.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <input
                        aria-label="Insertion Order"
                        value={props.config ? priorityInput : ''}
                        disabled={props.config === undefined || props.disabled === true}
                        type="text"
                        onChange={(e) => {
                            setPriority(e.target.value)
                        }}
                    />
                </div>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Insertion Position</span>
                            <Tooltip
                                delay={1}
                                tooltip={`The location the entry will be inserted into the context. \
                            0 is the very top of the context, 1 is one unit down, 2 is two units down etc.\
                            \nNegative numbers will count from the bottom of the context starting with -1 at the very bottom, \
                            making -2 one unit up, -3 two units up etc.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <input
                        aria-label="Insertion Position"
                        value={props.config ? positionInput : ''}
                        disabled={props.config === undefined || props.disabled === true}
                        type="text"
                        onChange={(e) => {
                            setPosition(e.target.value)
                        }}
                    />
                </div>
            </ThreeGrid>
            <TwoGrid>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Trim Direction</span>
                            <Tooltip
                                delay={1}
                                tooltip={`The direction the entry will be trimmed from when the\
                        entire entry will not fit in the context. \nIf set to 'Do Not Trim' the\
                        entry will only be included if the entirety of its text will fit within the context.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <Radio
                        name="Trim Direction"
                        selected={trimDirectionInput}
                        choices={[TrimDirection.TrimTop, TrimDirection.TrimBottom, TrimDirection.DoNotTrim]}
                        names={['Top', 'Bottom', 'Do Not Trim']}
                        disabled={props.config === undefined || props.disabled === true}
                        onChoiceSelected={(s) => setTrimDirection(s as TrimDirection)}
                    ></Radio>
                </div>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Maximum Trim Type</span>
                            <Tooltip
                                delay={1}
                                tooltip={`The extent to which the entry is allowed to be trimmed
                             in the order newline > sentence > token.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <Radio
                        name="Maximum Trim Type"
                        selected={maxTrimInput}
                        choices={[SeparationType.NewLine, SeparationType.Sentence, SeparationType.Token]}
                        names={['Newline', 'Sentence', 'Token']}
                        disabled={props.config === undefined || props.disabled === true}
                        onChoiceSelected={(s) => setMaximumTrimType(s as SeparationType)}
                    ></Radio>
                </div>
                <div>
                    <ConfigSettingsHeading>
                        <FlexRow style={{ justifyContent: 'flex-start' }}>
                            <span>Insertion Type</span>
                            <Tooltip
                                delay={1}
                                tooltip={`Determines what units will be used to separate the context when inserting entries.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </FlexRow>
                    </ConfigSettingsHeading>
                    <Radio
                        name="Insertion Type"
                        selected={insertTypeInput}
                        choices={[SeparationType.NewLine, SeparationType.Sentence, SeparationType.Token]}
                        names={['Newline', 'Sentence', 'Token']}
                        disabled={props.config === undefined || props.disabled === true}
                        onChoiceSelected={(s) => setInsertionType(s as SeparationType)}
                    ></Radio>
                </div>
            </TwoGrid>
        </AdvancedSettings>
    )
}
