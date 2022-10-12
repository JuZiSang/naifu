import { useEffect, useMemo, useRef, useState } from 'react'
import { MdHelpOutline } from 'react-icons/md'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { EncoderType } from '../tokenizer/encoder'
import { BannedSequenceGroup } from '../data/story/bannedsequences'
import { TokenData, TokenDataFormat, tokenDataFromEncoderType } from '../data/story/logitbias'
import { SelectedStory, SiteTheme } from '../globals/state'
import { KeyPill, KeyPillText, PillDelete } from '../styles/components/lorebook'
import { DEFAULT_THEME } from '../styles/themes/theme'
import { Button, LightColorButton } from '../styles/ui/button'
import { CrossMidIcon, DeleteIcon, PlusIcon } from '../styles/ui/icons'
import { tokenStringToTokens, splitTokenString, splitStringIntoTokens } from '../util/tokens'
import { SmallCheckbox } from './controls/checkbox'
import { getDropdownStyle, getDropdownTheme, Select } from './controls/select'
import {
    GroupSelectOption,
    PhraseBiasCheckboxes,
    PhraseBiasContainer,
    PhraseBiasGroupControls,
    PhraseBiasSubtext,
    PhraseBiasTextInput,
    PhraseContainer,
    PhraseGroupSelectButtons,
    Phrases,
    PhrasesHeader,
    TokenDisplay,
} from './logitbias'
import Tooltip from './tooltip'

function banTokenize(text: string, encoderType: EncoderType): TokenData {
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

const OpaqueText = styled.span`
    opacity: 0.4;
`
const HeaderText = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
`
const WarningText = styled.span`
    color: ${(props) => props.theme.colors.warning};
`

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
                    {tokenDisplay.strings.map((t, i) => {
                        return (
                            <span key={i}>
                                <HeaderText>{t.replace(/\n/g, '\\n')}</HeaderText>
                            </span>
                        )
                    })}
                    {last ? ', ' : ''}
                </span>
            )
        default:
            break
    }
    return <></>
}

export function BannedSequenceGroupEdit(props: {
    bannedSequenceGroups: BannedSequenceGroup[]
    updateBannedSequences: (logitBiasGroups: BannedSequenceGroup[]) => void
    selectedGroup: number
    encoderType: EncoderType
    setSelectedGroup: (n: number) => void
}): JSX.Element {
    const [tokenDisplay, setTokenDisplay] = useState<Array<Array<TokenDisplay>>>([])
    const selectedGroup = props.selectedGroup
    const setSelectedGroup = props.setSelectedGroup
    useEffect(() => {
        const setDisplay = async () => {
            const arr: TokenDisplay[][] = []
            for (const group of props.bannedSequenceGroups) {
                const arr2: TokenDisplay[] = []
                for (const seq of group.sequences) {
                    switch (seq.type) {
                        case TokenDataFormat.PileNaiTokens:
                        case TokenDataFormat.GPT2Tokens:
                        case TokenDataFormat.GenjiTokens:
                            arr2.push({
                                strings: splitTokenString(seq.sequence),
                                type: seq.type,
                            })
                            break
                        case TokenDataFormat.RawString:
                            arr2.push({
                                strings: await splitStringIntoTokens(seq.sequence ?? '', props.encoderType),
                                type: seq.type,
                            })
                            break

                        case TokenDataFormat.InterpretedString:
                            arr2.push({
                                strings: [seq.sequence ?? ''],
                                type: seq.type,
                            })
                            break
                    }
                }
                arr.push(arr2)
            }
            setTokenDisplay(arr)
        }
        setDisplay()
    }, [props.bannedSequenceGroups, props.encoderType])

    const names = useMemo(() => {
        return tokenDisplay.map((d) =>
            d.map((b, i) => tokenDisplayToElement(b, i, i !== d.length - 1, props.encoderType))
        )
    }, [props.encoderType, tokenDisplay])

    const siteTheme = useRecoilValue(SiteTheme)

    return (
        <div>
            <PhraseBiasGroupControls>
                <div>
                    {useMemo(
                        () => (
                            <Select
                                aria-label="Select a ban group"
                                maxMenuHeight={420}
                                isDisabled={props.bannedSequenceGroups.length === 0}
                                options={props.bannedSequenceGroups.map((g, i) => {
                                    return {
                                        value: i,
                                        description: `Group: ${i}`,
                                        label: (
                                            <GroupSelectOption style={{ opacity: g.enabled ? '1' : '0.5' }}>
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
                                    description: props.bannedSequenceGroups[selectedGroup]
                                        ? `Group: ${selectedGroup}`
                                        : 'No Group Selected',
                                    label:
                                        props.bannedSequenceGroups[selectedGroup] !== undefined &&
                                        names[selectedGroup] !== undefined ? (
                                            <GroupSelectOption>
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
                                styles={getDropdownStyle(siteTheme ?? DEFAULT_THEME)}
                                theme={getDropdownTheme(siteTheme ?? DEFAULT_THEME)}
                            />
                        ),
                        [names, props.bannedSequenceGroups, selectedGroup, setSelectedGroup, siteTheme]
                    )}
                </div>

                <PhraseGroupSelectButtons>
                    <LightColorButton
                        aria-label="Add Phrase Group"
                        onClick={() => {
                            setSelectedGroup(props.bannedSequenceGroups.length)

                            props.updateBannedSequences([
                                ...props.bannedSequenceGroups,
                                new BannedSequenceGroup(),
                            ])
                        }}
                    >
                        <PlusIcon />
                    </LightColorButton>
                    <LightColorButton
                        aria-label="Delete Phrase Group"
                        onClick={() => {
                            if (selectedGroup === props.bannedSequenceGroups.length - 1) {
                                setSelectedGroup(selectedGroup - 1)
                            }
                            props.updateBannedSequences([
                                ...props.bannedSequenceGroups.slice(0, selectedGroup),
                                ...props.bannedSequenceGroups.slice(selectedGroup + 1),
                            ])
                        }}
                    >
                        <DeleteIcon />
                    </LightColorButton>
                </PhraseGroupSelectButtons>
            </PhraseBiasGroupControls>
            {props.bannedSequenceGroups[selectedGroup] !== undefined ? (
                <BannedSequenceEdit
                    encoderType={props.encoderType}
                    selectedGroup={selectedGroup}
                    tokenDisplay={tokenDisplay[selectedGroup] ?? []}
                    updateBannedSequences={(g) => {
                        props.updateBannedSequences([
                            ...props.bannedSequenceGroups.slice(0, selectedGroup),
                            g,
                            ...props.bannedSequenceGroups.slice(selectedGroup + 1),
                        ])
                    }}
                    bannedSequenceGroup={props.bannedSequenceGroups[selectedGroup]}
                    deleteGroup={() =>
                        props.updateBannedSequences([
                            ...props.bannedSequenceGroups.slice(0, selectedGroup),
                            ...props.bannedSequenceGroups.slice(selectedGroup + 1),
                        ])
                    }
                />
            ) : (
                <></>
            )}
        </div>
    )
}

export default function BannedSequenceEdit(props: {
    bannedSequenceGroup?: BannedSequenceGroup
    updateBannedSequences: (bannedSequenceGroup: BannedSequenceGroup) => void
    tokenDisplay: TokenDisplay[]
    deleteGroup: () => void
    selectedGroup: number
    encoderType: EncoderType
}): JSX.Element {
    const [textInput, setTextInput] = useState('')
    const [enabled, setEnabled] = useState(props.bannedSequenceGroup?.enabled ?? true)

    const [selectedBias, setSelectedBias] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)

    const biasDisplay = props.tokenDisplay
    const bannedSequenceGroup = props.bannedSequenceGroup

    const sequenceData = useMemo(() => bannedSequenceGroup?.sequences ?? [], [bannedSequenceGroup?.sequences])

    const updateBiases = props.updateBannedSequences
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
                                if (!bannedSequenceGroup) return

                                updateBiases({
                                    ...bannedSequenceGroup,
                                    sequences: [...sequenceData.slice(0, i), ...sequenceData.slice(i + 1)],
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
                                if (!bannedSequenceGroup) return

                                updateBiases({
                                    ...bannedSequenceGroup,
                                    sequences: [
                                        ...sequenceData.slice(0, selectedBias),
                                        ...sequenceData.slice(selectedBias + 1),
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
    }, [biasDisplay, props.encoderType, selectedBias, bannedSequenceGroup, updateBiases, sequenceData])

    const selectedStory = useRecoilValue(SelectedStory)

    const selectedGroup = props.selectedGroup

    useEffect(() => {
        setTextInput('')
    }, [selectedStory.id, selectedGroup])

    useEffect(() => {
        setEnabled(bannedSequenceGroup?.enabled ?? true)
    }, [bannedSequenceGroup])

    const savePhrase = async () => {
        if (!bannedSequenceGroup) return
        if (selectedBias >= 0) {
            if (textInput === '') {
                props.updateBannedSequences({
                    ...bannedSequenceGroup,
                    sequences: [
                        ...bannedSequenceGroup.sequences.slice(0, selectedBias),
                        ...bannedSequenceGroup.sequences.slice(selectedBias + 1),
                    ],
                })
            } else
                props.updateBannedSequences({
                    ...bannedSequenceGroup,
                    sequences: [
                        ...bannedSequenceGroup.sequences.slice(0, selectedBias),
                        banTokenize(textInput, props.encoderType),
                        ...bannedSequenceGroup.sequences.slice(selectedBias + 1),
                    ],
                })

            setSelectedBias(-1)
        } else {
            if (textInput === '') return
            props.updateBannedSequences({
                ...bannedSequenceGroup,
                sequences: [...bannedSequenceGroup.sequences, banTokenize(textInput, props.encoderType)],
            })
        }
        setTextInput('')
    }

    return (
        <>
            <PhraseBiasSubtext>Type in the area below, then press enter to save.</PhraseBiasSubtext>
            <PhraseBiasContainer lorebook={false}>
                <PhraseBiasTextInput>
                    {bannedSequenceGroup ? (
                        <>
                            <input
                                autoCapitalize={'false'}
                                autoCorrect={'false'}
                                ref={inputRef}
                                type="text"
                                placeholder="Enter the text you want to ban"
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        savePhrase()
                                    }
                                }}
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                            />
                            <Button
                                aria-label="Add Banned Sequence"
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
                <PhraseContainer>
                    <PhrasesHeader>
                        <span>Sequences</span>
                        <span>Click a sequence to edit it.</span>
                    </PhrasesHeader>
                    <Phrases>{phrases}</Phrases>
                </PhraseContainer>
                {useMemo(() => {
                    return bannedSequenceGroup ? (
                        <PhraseBiasCheckboxes>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <SmallCheckbox
                                    label={'Enabled'}
                                    value={enabled}
                                    setValue={(b) => {
                                        setEnabled(b)
                                        props.updateBannedSequences({
                                            ...bannedSequenceGroup,
                                            enabled: b,
                                        })
                                    }}
                                />
                                <Tooltip delay={1} tooltip={`Enable or disable this banned tokens group.`}>
                                    <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                                </Tooltip>
                            </div>
                        </PhraseBiasCheckboxes>
                    ) : (
                        <></>
                    )
                }, [bannedSequenceGroup, enabled, props])}
            </PhraseBiasContainer>
        </>
    )
}
