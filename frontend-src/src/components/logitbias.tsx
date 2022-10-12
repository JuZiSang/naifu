import styled from 'styled-components'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { MdHelpOutline } from 'react-icons/md'
import { CrossMidIcon, PlusIcon, DeleteIcon } from '../styles/ui/icons'
import { KeyPill, KeyPillText, PillDelete } from '../styles/components/lorebook'
import { Button, LightColorButton } from '../styles/ui/button'
import { SelectedStory, SiteTheme } from '../globals/state'
import { transparentize } from '../util/colour'
import { TokenData, LogitBiasGroup, TokenDataFormat, tokenDataFromEncoderType } from '../data/story/logitbias'
import { EncoderType } from '../tokenizer/encoder'
import { isBiasNoSpaceCharacter } from '../util/generationrequest'
import { tokenStringToTokens, splitTokenString, splitStringIntoTokens } from '../util/tokens'
import { modelBiasMax, modelBiasRoundDigits, modelBiasStepSize, modelBiasStrong } from '../data/ai/model'
import { TextGenerationModel } from '../data/request/model'
import { MinorSettingSliderCard } from './sidebars/common/editorcard'
import { getDropdownStyle, getDropdownTheme, Select } from './controls/select'
import { SmallCheckbox } from './controls/checkbox'
import Tooltip from './tooltip'

function biasTokenize(text: string, encoderType: EncoderType): TokenData {
    if (text.startsWith('{') && text.endsWith('}')) {
        return new TokenData(text.slice(1, -1).replace(/\\n/g, '\n'), TokenDataFormat.RawString)
    }
    if (text.startsWith('[') && text.endsWith(']')) {
        const tokens = tokenStringToTokens(text)
        return new TokenData(tokens.join(','), tokenDataFromEncoderType(encoderType))
    }
    const trimmed = text.trim()
    if (trimmed.length === 0) return new TokenData(text.replace(/\\n/g, '\n'), TokenDataFormat.RawString)
    return new TokenData(trimmed.replace(/\\n/g, '\n'), TokenDataFormat.InterpretedString)
}

export const PhraseBiasContainer = styled.div<{ lorebook: boolean }>`
    display: flex;
    flex-direction: column;
    touch-action: pan-y;
    border: 1px solid ${(props) => (props.lorebook ? props.theme.colors.bg3 : props.theme.colors.bg2)};
    background-color: ${(props) => props.theme.colors.bg1};
    input {
        background: ${(props) => props.theme.colors.bg0};
    }
`

export const PhraseContainer = styled.div`
    padding: 15px 15px 10px 15px;
    border-top: 1px solid ${(props) => props.theme.colors.bg2};
`

export const PhrasesHeader = styled.div`
    display: flex;
    flex-direction: row;
    font-weight: 600;
    justify-content: space-between;
    > :last-child {
        opacity: 0.7;
    }
`

export const PhraseBiasSubtext = styled.div`
    opacity: 0.5;
    margin-bottom: 2px;
`

export const PhraseBiasCheckboxes = styled.div`
    display: flex;
    flex-direction: column;
    padding: 5px 15px;
    label {
        color: ${(props) => transparentize(0.2, props.theme.colors.textMain)};
    }
    > div {
        display: flex;
        padding-bottom: 5px;
    }
`

export const Phrases = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    margin-top: 10px;
    font-weight: 600;
    cursor: pointer;
    > div {
        margin-bottom: 5px;
        margin-top: 5px;
    }
    > :not(:last-child) {
        margin-right: 10px;
    }
    overflow-y: auto;
    max-height: 200px;
`

export const PhraseBiasTextInput = styled.div`
    display: flex;
    flex-direction: row;
    > :first-child {
        background-color: ${(props) => props.theme.colors.bg0};
    }
    > button {
        background-color: ${(props) => props.theme.colors.bg3};
        &:hover {
            background-color: ${(props) => props.theme.colors.bg2};
        }
    }
`

export const PhraseBiasGroupControls = styled.div`
    display: flex;
    flex-direction: row;
    > :nth-child(1) {
        flex: 0 1 auto;
        width: calc(100% - 76px);
        > :first-child {
            > :nth-child(3) {
                > :first-child {
                    > :first-child {
                        display: grid;
                    }
                }
            }
        }
    }
    padding-bottom: 5px;
`

export const PhraseGroupSelectButtons = styled.div`
    display: flex;
    flex-direction: row;
    flex: 0 0 auto;
    > button > div {
        height: 1rem;
        width: 1rem;
    }
`

export const GroupSelectOption = styled.div`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`

const OpaqueText = styled.span`
    opacity: 0.4;
`

const UnlikelyLikely = styled.span`
    opacity: 0.6;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 4px 18px 4px 18px;
    font-size: 0.7rem;
    > :first-child {
        flex-shrink: 0;
        margin-right: 5px;
    }

    > :last-child {
        flex-shrink: 0;
        margin-right: 5px;
    }
`

const Warning = styled.span`
    text-align: center;
    color: ${(props) => props.theme.colors.warning};
`

const HeaderText = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
`

const WarningText = styled.span`
    color: ${(props) => props.theme.colors.warning};
`

export interface TokenDisplay {
    strings: string[]
    type: TokenDataFormat
}

function tokenDisplayToString(tokenDisplay: TokenDisplay): string {
    switch (tokenDisplay.type) {
        case TokenDataFormat.RawString:
            return `{${tokenDisplay.strings.join('')}}`.replace(/\n/g, '\\n')
        case TokenDataFormat.InterpretedString:
            return `${tokenDisplay.strings.join('')}`.replace(/\n/g, '\\n')
        case TokenDataFormat.GPT2Tokens:
        case TokenDataFormat.PileNaiTokens:
        case TokenDataFormat.GenjiTokens:
        case TokenDataFormat.NAIInlineTokens:
            return `[${tokenDisplay.strings.join(', ')}]`
    }
}

function tokenDisplayToElement(
    tokenDisplay: TokenDisplay,
    i: number,
    last: boolean,
    encoderType: EncoderType
): JSX.Element {
    const tokenizerMismatch = tokenDisplay.type !== tokenDataFromEncoderType(encoderType)
    switch (tokenDisplay.type) {
        case TokenDataFormat.RawString:
            return (
                <span key={i}>
                    <OpaqueText>{'{'}</OpaqueText>
                    {tokenDisplay.strings.map((t, i) => {
                        return (
                            <span key={i}>
                                {i > 0 ? <OpaqueText>|</OpaqueText> : <></>}
                                <span>{t.replace(/\n/g, '\\n')}</span>
                            </span>
                        )
                    })}
                    <OpaqueText>{'}'}</OpaqueText>
                    {last ? ', ' : ''}
                </span>
            )
        case TokenDataFormat.GPT2Tokens:
        case TokenDataFormat.PileNaiTokens:
        case TokenDataFormat.GenjiTokens:
            return (
                <span key={i}>
                    {tokenizerMismatch && <WarningText>! </WarningText>}
                    <OpaqueText>[</OpaqueText>
                    {tokenDisplay.strings.map((t, i) => {
                        return (
                            <span key={i}>
                                {i > 0 ? <OpaqueText>, </OpaqueText> : <></>}
                                <HeaderText>{t}</HeaderText>
                            </span>
                        )
                    })}
                    <OpaqueText>]</OpaqueText>
                    {last ? ', ' : ''}
                </span>
            )
        case TokenDataFormat.InterpretedString:
            return (
                <span key={i}>
                    <OpaqueText>{' {'}</OpaqueText>
                    {tokenDisplay.strings.map((t, i) => {
                        return (
                            <span key={i}>
                                {i > 0 ? <OpaqueText>|</OpaqueText> : <></>}
                                <HeaderText>{t.replace(/\n/g, '\\n')}</HeaderText>
                            </span>
                        )
                    })}
                    <OpaqueText>{'}'}</OpaqueText>

                    {last ? ', ' : ''}
                </span>
            )
        default:
            break
    }
    return <></>
}

export function BiasGroupEdit(props: {
    logitBiasGroups: LogitBiasGroup[]
    encoderType: EncoderType
    model: TextGenerationModel
    lorebook?: boolean
    lorebookCategory?: boolean
    updateBiases: (logitBiasGroups: LogitBiasGroup[]) => void
    selectedGroup: number
    setSelectedGroup: (n: number) => void
}): JSX.Element {
    const [biasDisplay, setBiasDisplay] = useState<Array<Array<TokenDisplay>>>([])
    const selectedGroup = props.selectedGroup
    const setSelectedGroup = props.setSelectedGroup
    useEffect(() => {
        const setDisplay = async () => {
            const arr: TokenDisplay[][] = []
            for (const group of props.logitBiasGroups) {
                const arr2: TokenDisplay[] = []
                for (const bias of group.phrases) {
                    switch (bias.type) {
                        case TokenDataFormat.PileNaiTokens:
                        case TokenDataFormat.GPT2Tokens:
                        case TokenDataFormat.GenjiTokens:
                            arr2.push({
                                strings: splitTokenString(bias.sequence),
                                type: bias.type,
                            })
                            break
                        case TokenDataFormat.InterpretedString:
                            arr2.push({
                                strings: isBiasNoSpaceCharacter(bias.sequence?.charAt(0) ?? '')
                                    ? await splitStringIntoTokens(bias.sequence ?? '', props.encoderType)
                                    : await splitStringIntoTokens(' ' + bias.sequence, props.encoderType),
                                type: bias.type,
                            })
                            break

                        case TokenDataFormat.RawString:
                            arr2.push({
                                strings: await splitStringIntoTokens(bias.sequence ?? '', props.encoderType),
                                type: bias.type,
                            })
                            break
                    }
                }
                arr.push(arr2)
            }
            setBiasDisplay(arr)
        }
        setDisplay()
    }, [props.encoderType, props.logitBiasGroups])

    const names = useMemo(() => {
        return biasDisplay.map((d) =>
            d.map((b, i) => tokenDisplayToElement(b, i, i !== d.length - 1, props.encoderType))
        )
    }, [biasDisplay, props.encoderType])

    const siteTheme = useRecoilValue(SiteTheme)

    return (
        <div>
            <PhraseBiasGroupControls>
                <div>
                    {useMemo(
                        () => (
                            <Select
                                aria-label="Select a phrase group"
                                maxMenuHeight={420}
                                isDisabled={props.logitBiasGroups.length === 0}
                                options={props.logitBiasGroups.map((g, i) => {
                                    return {
                                        value: i,
                                        description: `Group: ${i}, Bias: ${g.bias}`,
                                        label: (
                                            <GroupSelectOption style={{ opacity: g.enabled ? '1' : '0.5' }}>
                                                Bias: {g.bias} |{' '}
                                                {names[i]?.length > 0 ? (
                                                    names[i]
                                                ) : (
                                                    <OpaqueText>
                                                        <em>empty</em>
                                                    </OpaqueText>
                                                )}
                                            </GroupSelectOption>
                                        ),
                                    }
                                })}
                                onChange={(e) => {
                                    if (e !== null) {
                                        setSelectedGroup(e.value)
                                    }
                                }}
                                value={{
                                    value: selectedGroup,
                                    description: props.logitBiasGroups[selectedGroup]
                                        ? `Group: ${selectedGroup}, Bias: ${props.logitBiasGroups[selectedGroup].bias}`
                                        : 'No Group Selected',
                                    label:
                                        props.logitBiasGroups[selectedGroup] !== undefined &&
                                        names[selectedGroup] !== undefined ? (
                                            <GroupSelectOption>
                                                Bias: {props.logitBiasGroups[selectedGroup].bias} |{' '}
                                                {names[selectedGroup].length > 0 ? (
                                                    names[selectedGroup]
                                                ) : (
                                                    <OpaqueText>
                                                        <em>empty</em>
                                                    </OpaqueText>
                                                )}
                                            </GroupSelectOption>
                                        ) : (
                                            <span>No Group Selected</span>
                                        ),
                                }}
                                styles={getDropdownStyle(siteTheme)}
                                theme={getDropdownTheme(siteTheme)}
                            />
                        ),
                        [names, props.logitBiasGroups, selectedGroup, setSelectedGroup, siteTheme]
                    )}
                </div>

                <PhraseGroupSelectButtons>
                    <LightColorButton
                        aria-label="Add Phrase Group"
                        onClick={() => {
                            setSelectedGroup(props.logitBiasGroups.length)

                            props.updateBiases([...props.logitBiasGroups, new LogitBiasGroup()])
                        }}
                    >
                        <PlusIcon />
                    </LightColorButton>
                    <LightColorButton
                        aria-label="Delete Phrase Group"
                        onClick={() => {
                            if (selectedGroup === props.logitBiasGroups.length - 1) {
                                setSelectedGroup(selectedGroup - 1)
                            }
                            props.updateBiases([
                                ...props.logitBiasGroups.slice(0, selectedGroup),
                                ...props.logitBiasGroups.slice(selectedGroup + 1),
                            ])
                        }}
                    >
                        <DeleteIcon />
                    </LightColorButton>
                </PhraseGroupSelectButtons>
            </PhraseBiasGroupControls>
            {props.logitBiasGroups[selectedGroup] !== undefined ? (
                <LogitBiasEdit
                    encoderType={props.encoderType}
                    model={props.model}
                    lorebook={props.lorebook}
                    lorebookCategory={props.lorebookCategory}
                    selectedGroup={selectedGroup}
                    biasDisplay={biasDisplay[selectedGroup] ?? []}
                    updateBiases={(g) => {
                        props.updateBiases([
                            ...props.logitBiasGroups.slice(0, selectedGroup),
                            g,
                            ...props.logitBiasGroups.slice(selectedGroup + 1),
                        ])
                    }}
                    logitBiasGroup={props.logitBiasGroups[selectedGroup]}
                    deleteGroup={() =>
                        props.updateBiases([
                            ...props.logitBiasGroups.slice(0, selectedGroup),
                            ...props.logitBiasGroups.slice(selectedGroup + 1),
                        ])
                    }
                />
            ) : (
                <></>
            )}
        </div>
    )
}

export default function LogitBiasEdit(props: {
    lorebook?: boolean
    lorebookCategory?: boolean
    logitBiasGroup?: LogitBiasGroup
    updateBiases: (logitBiasGroup: LogitBiasGroup) => void
    biasDisplay: TokenDisplay[]
    deleteGroup: () => void
    selectedGroup: number
    encoderType: EncoderType
    model: TextGenerationModel
}): JSX.Element {
    const [biasInput, setBiasInput] = useState(props.logitBiasGroup?.bias ?? 0)
    const [textInput, setTextInput] = useState('')
    const [ensureAfterStart, setEnsureAfterStart] = useState(
        props.logitBiasGroup?.ensureSequenceFinish ?? false
    )
    const [generateForOnce, setGenerateForOnce] = useState(props.logitBiasGroup?.generateOnce ?? false)
    const [enabled, setEnabled] = useState(props.logitBiasGroup?.enabled ?? true)
    const [whenInactive, setWhenInactive] = useState(props.logitBiasGroup?.whenInactive ?? false)

    const [selectedBias, setSelectedBias] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)

    const biasDisplay = props.biasDisplay
    const logitBiasGroup = props.logitBiasGroup

    const phraseData = useMemo(() => logitBiasGroup?.phrases ?? [], [logitBiasGroup?.phrases])

    const updateBiases = props.updateBiases
    const phrases = useMemo(() => {
        return biasDisplay.map((b, i) => {
            const inputText = tokenDisplayToString(b)
            const displayElement = tokenDisplayToElement(b, i, false, props.encoderType)
            return (
                <KeyPill key={i}>
                    <KeyPillText
                        selected={i === selectedBias}
                        onClick={() => {
                            if (selectedBias === i) {
                                setSelectedBias(-1)
                                setTextInput('')
                            } else {
                                setTextInput(inputText)
                                setSelectedBias(i)
                                if (inputRef.current) inputRef.current.focus()
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Delete') {
                                if (!logitBiasGroup) return

                                updateBiases({
                                    ...logitBiasGroup,
                                    phrases: [...phraseData.slice(0, i), ...phraseData.slice(i + 1)],
                                })

                                setSelectedBias(-1)
                            }
                        }}
                    >
                        {displayElement}
                    </KeyPillText>
                    {selectedBias === i ? (
                        <PillDelete
                            tabIndex={0}
                            onClick={(e) => {
                                if (!logitBiasGroup) return

                                updateBiases({
                                    ...logitBiasGroup,
                                    phrases: [
                                        ...phraseData.slice(0, selectedBias),
                                        ...phraseData.slice(selectedBias + 1),
                                    ],
                                })

                                setSelectedBias(-1)
                                setTextInput('')
                                e.stopPropagation()
                            }}
                        >
                            <CrossMidIcon />
                        </PillDelete>
                    ) : (
                        <></>
                    )}
                </KeyPill>
            )
        })
    }, [biasDisplay, logitBiasGroup, phraseData, props.encoderType, selectedBias, updateBiases])

    const selectedStory = useRecoilValue(SelectedStory)

    const selectedGroup = props.selectedGroup

    useEffect(() => {
        setTextInput('')
    }, [selectedStory.id, selectedGroup])

    useEffect(() => {
        setBiasInput(logitBiasGroup?.bias ?? 0)
        setEnsureAfterStart(logitBiasGroup?.ensureSequenceFinish ?? false)
        setGenerateForOnce(logitBiasGroup?.generateOnce ?? true)
        setEnabled(logitBiasGroup?.enabled ?? true)
        setWhenInactive(logitBiasGroup?.whenInactive ?? false)
    }, [logitBiasGroup])

    const savePhrase = async () => {
        if (!logitBiasGroup) return
        if (selectedBias >= 0) {
            if (textInput === '') {
                props.updateBiases({
                    ...logitBiasGroup,
                    phrases: [
                        ...logitBiasGroup.phrases.slice(0, selectedBias),
                        ...logitBiasGroup.phrases.slice(selectedBias + 1),
                    ],
                })
            } else {
                props.updateBiases({
                    ...logitBiasGroup,
                    phrases: [
                        ...logitBiasGroup.phrases.slice(0, selectedBias),
                        biasTokenize(textInput, props.encoderType),
                        ...logitBiasGroup.phrases.slice(selectedBias + 1),
                    ],
                })
            }

            setSelectedBias(-1)
        } else {
            if (textInput === '') return
            props.updateBiases({
                ...logitBiasGroup,
                phrases: [...logitBiasGroup.phrases, biasTokenize(textInput, props.encoderType)],
            })
        }
        setTextInput('')
    }

    return (
        <>
            <PhraseBiasSubtext>Type in the area below, then press enter to save.</PhraseBiasSubtext>
            <PhraseBiasContainer lorebook={!!props.lorebook}>
                <PhraseBiasTextInput>
                    {logitBiasGroup ? (
                        <>
                            <input
                                autoCapitalize={'false'}
                                autoCorrect={'false'}
                                ref={inputRef}
                                type="text"
                                placeholder="Enter the text you want to bias"
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        savePhrase()
                                    }
                                }}
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                            />
                            <Button
                                aria-label="Add Phrase"
                                onClick={() => {
                                    savePhrase()
                                }}
                            >
                                <PlusIcon />
                            </Button>
                        </>
                    ) : (
                        <></>
                    )}
                </PhraseBiasTextInput>
                {logitBiasGroup ? (
                    <div>
                        <MinorSettingSliderCard
                            value={biasInput}
                            title="Bias"
                            hint="Default: 0"
                            onHintClick={() => {
                                setBiasInput(0)
                                props.updateBiases({ ...logitBiasGroup, bias: 0 })
                            }}
                            step={modelBiasStepSize(props.model)}
                            min={modelBiasMax(props.model) * -1}
                            max={modelBiasMax(props.model)}
                            onChange={(e) => {
                                setBiasInput(e)
                                props.updateBiases({ ...logitBiasGroup, bias: e })
                            }}
                            logarithmic={true}
                            zeroMark={true}
                            roundDigits={modelBiasRoundDigits(props.model)}
                        ></MinorSettingSliderCard>
                        <UnlikelyLikely>
                            <span aria-hidden>LESS</span>
                            {logitBiasGroup.bias === 0 && !logitBiasGroup.ensureSequenceFinish ? (
                                <Warning>A bias of zero will have no effect.</Warning>
                            ) : (
                                ''
                            )}
                            {logitBiasGroup.bias > modelBiasStrong(props.model) ? (
                                <Warning>
                                    A bias greater than {modelBiasStrong(props.model)} will have a very strong
                                    effect. Recommended values are between -{modelBiasStrong(props.model)} and{' '}
                                    {modelBiasStrong(props.model)}.
                                </Warning>
                            ) : (
                                ''
                            )}
                            {logitBiasGroup.bias < modelBiasStrong(props.model) * -1 ? (
                                <Warning>
                                    A bias less than -{modelBiasStrong(props.model)} will have a very strong
                                    effect. Recommended values are between -{modelBiasStrong(props.model)} and{' '}
                                    {modelBiasStrong(props.model)}.{' '}
                                </Warning>
                            ) : (
                                ''
                            )}
                            <span aria-hidden>MORE</span>
                        </UnlikelyLikely>
                    </div>
                ) : (
                    <></>
                )}
                <PhraseContainer>
                    <PhrasesHeader>
                        <span>Phrases</span>
                        <span>Click a phrase to edit it.</span>
                    </PhrasesHeader>
                    <Phrases>{phrases}</Phrases>
                </PhraseContainer>
                {useMemo(() => {
                    return logitBiasGroup ? (
                        <PhraseBiasCheckboxes>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <SmallCheckbox
                                    label={'Enabled'}
                                    value={enabled}
                                    setValue={(b) => {
                                        setEnabled(b)
                                        props.updateBiases({
                                            ...logitBiasGroup,
                                            enabled: b,
                                        })
                                    }}
                                />
                                <Tooltip delay={1} tooltip={`Enable or disable this phrase group.`}>
                                    <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                                </Tooltip>
                            </div>
                            {props.lorebook ? (
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                    <SmallCheckbox
                                        label={
                                            !props.lorebookCategory
                                                ? 'When Entry Inactive'
                                                : 'When All Entries Inactive'
                                        }
                                        value={whenInactive}
                                        setValue={(b) => {
                                            setWhenInactive(b)
                                            props.updateBiases({
                                                ...logitBiasGroup,
                                                whenInactive: b,
                                            })
                                        }}
                                    />
                                    <Tooltip
                                        delay={1}
                                        tooltip={
                                            !props.lorebookCategory
                                                ? `When enabled, this group will be \
                                    applied when the entry is inactive instead of when active.`
                                                : `When enabled. this group will only be applied when \
                                            none of the entries in this category are active.`
                                        }
                                    >
                                        <MdHelpOutline
                                            style={{
                                                opacity: 0.3,
                                                marginLeft: '0.3rem',
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            ) : (
                                <></>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <SmallCheckbox
                                    label={'Ensure Completion After Start'}
                                    value={ensureAfterStart}
                                    setValue={(b) => {
                                        setEnsureAfterStart(b)
                                        props.updateBiases({
                                            ...logitBiasGroup,
                                            ensureSequenceFinish: b,
                                        })
                                    }}
                                />
                                <Tooltip
                                    delay={1}
                                    tooltip={`When enabled, if the first token of a phrase is generated, \
                                    subsequent tokens will always generate.`}
                                >
                                    <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                                </Tooltip>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <SmallCheckbox
                                    label={'Unbias When Generated'}
                                    value={generateForOnce}
                                    setValue={(b) => {
                                        setGenerateForOnce(b)
                                        props.updateBiases({
                                            ...logitBiasGroup,
                                            generateOnce: b,
                                        })
                                    }}
                                />
                                <Tooltip
                                    delay={1}
                                    tooltip={`When enabled, after a phrase is generated its bias will be removed for \
                                        the rest of the generation.
                                        This will not prevent it from being generated, only remove the bias placed on it.`}
                                >
                                    <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                                </Tooltip>
                            </div>
                        </PhraseBiasCheckboxes>
                    ) : (
                        <></>
                    )
                }, [enabled, ensureAfterStart, generateForOnce, logitBiasGroup, props, whenInactive])}
            </PhraseBiasContainer>
        </>
    )
}
