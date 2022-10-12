import { Fragment, useEffect, useState } from 'react'
import styled from 'styled-components'
import { EncoderType } from '../tokenizer/encoder'
import { EndOfSamplingSequence } from '../data/story/eossequences'
import {
    isStringDataFormat,
    RawTokenDataFormats,
    TokenData,
    TokenDataFormat,
    tokenDataFromEncoderType,
} from '../data/story/logitbias'
import { LightColorButton, SubtleButton } from '../styles/ui/button'
import { tokenStringToTokens, splitTokenString, splitStringIntoTokens } from '../util/tokens'
import { Bracket } from '../styles/components/filter'
import { PlusIcon, SmallCrossIcon } from '../styles/ui/icons'
import { FlexRow } from '../styles/ui/layout'

function eosTokenize(text: string, encoderType: EncoderType): TokenData {
    if (text.startsWith('[') && text.endsWith(']')) {
        const tokens = tokenStringToTokens(text)
        return new TokenData(tokens.join(','), tokenDataFromEncoderType(encoderType))
    }
    return new TokenData(text.replace(/\\n/g, '\n'), TokenDataFormat.InterpretedString)
}

const StyledTokenEditor = styled.div`
    input {
        background: ${(props) => props.theme.colors.bg0};

        padding: 10px 0 10px 10px;
    }
    display: flex;
    flex-direction: column;
`
const StyledTokenDisplay = styled.div<{ border: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: ${(props) => props.theme.colors.bg2};
    button {
        width: 24px;
        display: flex;
        justify-content: center;
        > div {
            background-color: ${(props) => props.theme.colors.textMain};
        }
    }
    color: ${(props) => props.theme.colors.textMain};
    font-family: ${(props) => props.theme.fonts.code};
    font-size: 0.8rem;
    padding-left: 10px;
    word-break: keep-all;
    margin: 4px 0 0 0;
    white-space: nowrap;
    font-weight: 400;
    padding: 4px 0px 4px 10px;
`

const Container = styled.span`
    padding: 0;
`

const Opaque = styled.span`
    opacity: 0.4;
`

export interface EosInfo {
    strings: string[]
    type: TokenDataFormat
}

const STOP_SEQUENCE_LIMIT = 8

export function TokenInput(props: {
    placeholder: string
    encoderType: EncoderType
    onTokenSubmit(eosSequences: EndOfSamplingSequence[]): void
    eosSequences: EndOfSamplingSequence[]
}): JSX.Element {
    const [tokenInput, setTokenInput] = useState('')
    const [eosInfo, setEosInfo] = useState<EosInfo[]>([])
    useEffect(() => {
        const set = async () => {
            const infos = []
            for (const eos of props.eosSequences) {
                switch (eos.sequence.type) {
                    case TokenDataFormat.GPT2Tokens:
                    case TokenDataFormat.PileNaiTokens:
                    case TokenDataFormat.GenjiTokens:
                        infos.push({
                            strings: splitTokenString(eos.sequence.sequence),
                            type: eos.sequence.type,
                        })
                        break
                    default:
                        const strings = await splitStringIntoTokens(
                            eos.sequence.sequence ?? '',
                            props.encoderType
                        )

                        infos.push({
                            strings: strings.map((s) => s.replace(/\n/g, '\\n')),
                            type: eos.sequence.type,
                        })
                        break
                }
            }
            setEosInfo(infos)
        }

        set()
    }, [props.encoderType, props.eosSequences])

    const setToken = () => {
        if (props.eosSequences.length >= STOP_SEQUENCE_LIMIT) return

        if (tokenInput === '') {
            return
        }
        props.onTokenSubmit([
            ...props.eosSequences,
            new EndOfSamplingSequence(eosTokenize(tokenInput, props.encoderType)),
        ])
        setTokenInput('')
    }

    const handleKeyDown = async (e: any) => {
        if (e.key === 'Enter') {
            setToken()
        }
    }

    return (
        <StyledTokenEditor>
            <FlexRow>
                <input
                    disabled={props.eosSequences.length >= STOP_SEQUENCE_LIMIT}
                    placeholder={props.placeholder}
                    onKeyDown={handleKeyDown}
                    value={tokenInput}
                    onChange={(e) => {
                        setTokenInput(e.target.value)
                    }}
                ></input>

                <LightColorButton
                    disabled={props.eosSequences.length >= STOP_SEQUENCE_LIMIT}
                    aria-label="Add stop sequence"
                    style={{ height: '41px' }}
                    onClick={setToken}
                    onKeyDown={handleKeyDown}
                >
                    <PlusIcon />
                </LightColorButton>
            </FlexRow>
            <Container>
                {props.eosSequences.map((eos, i) => (
                    <TokenDisplay
                        key={i}
                        encoderType={props.encoderType}
                        onClick={() => {
                            props.onTokenSubmit([
                                ...props.eosSequences.slice(0, i),
                                ...props.eosSequences.slice(i + 1),
                            ])
                        }}
                        eosInfo={eosInfo[i]}
                    />
                ))}
            </Container>
            {props.eosSequences.length >= STOP_SEQUENCE_LIMIT && (
                <em style={{ paddingTop: 5 }}>
                    <Opaque>Limit of {STOP_SEQUENCE_LIMIT} Stop Sequences reached</Opaque>
                </em>
            )}
        </StyledTokenEditor>
    )
}

const WarningText = styled.span`
    color: ${(props) => props.theme.colors.warning};
`

export function TokenDisplay(props: {
    eosInfo: EosInfo
    onClick: () => void
    encoderType: EncoderType
}): JSX.Element {
    let tokenizerMismatch
    if (props.eosInfo && RawTokenDataFormats.has(props.eosInfo?.type)) {
        tokenizerMismatch = props.eosInfo.type !== tokenDataFromEncoderType(props.encoderType)
    }
    return props.eosInfo ? (
        <StyledTokenDisplay aria-label="Clear end of sampling token" border={true}>
            <span>
                {tokenizerMismatch && <WarningText>! </WarningText>}
                {!isStringDataFormat(props.eosInfo.type) ? <Bracket>[</Bracket> : <Bracket>{'{'}</Bracket>}
                {props.eosInfo.strings.map((s, i) => (
                    <Fragment key={i}>
                        {s}
                        {i !== props.eosInfo.strings.length - 1 &&
                            (isStringDataFormat(props.eosInfo.type) ? (
                                <Opaque>|</Opaque>
                            ) : (
                                <Opaque>, </Opaque>
                            ))}
                    </Fragment>
                ))}
                {!isStringDataFormat(props.eosInfo.type) ? <Bracket>]</Bracket> : <Bracket>{'}'}</Bracket>}
            </span>
            <SubtleButton
                onClick={props.onClick}
                aria-label={`Delete stop sequence ${
                    isStringDataFormat(props.eosInfo.type)
                        ? props.eosInfo.strings.join('')
                        : props.eosInfo.strings.join(', ')
                }`}
            >
                <SmallCrossIcon style={{ width: '10px' }} />
            </SubtleButton>
        </StyledTokenDisplay>
    ) : (
        <StyledTokenDisplay border={false}></StyledTokenDisplay>
    )
}
