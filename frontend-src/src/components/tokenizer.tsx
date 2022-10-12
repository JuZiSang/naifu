import { useState, useRef, useMemo, useEffect } from 'react'
import styled from 'styled-components'
import { useRecoilValue, useRecoilState } from 'recoil'
import TextareaAutosize from 'react-textarea-autosize'
import { WorkerInterface } from '../tokenizer/interface'
import { SelectedStory, SiteTheme, TokenizerOpen, TokenizerText } from '../globals/state'
import { transparentize } from '../util/colour'
import { SubtleButton } from '../styles/ui/button'
import { Dark } from '../styles/themes/dark'
import { GlobalUserContext } from '../globals/globals'
import { DefaultModel } from '../data/request/model'
import { EncoderType, getModelEncoderType } from '../tokenizer/encoder'
import { groupMultiCharacterTokens } from '../tokenizer/util'
import { DEFAULT_THEME } from '../styles/themes/theme'
import Tooltip from './tooltip'
import Modal, { ModalType } from './modals/modal'
import { getDropdownStyle, getDropdownTheme, Select } from './controls/select'

const TextInput = styled(TextareaAutosize)`
    font-family: ${(props) => props.theme.fonts.code};
    font-size: 0.9rem;
    background: ${(props) => props.theme.colors.bg2};
    border: 2px solid ${(props) => props.theme.colors.bg3};
    height: 200px;
    :focus {
        background: ${(props) => props.theme.colors.bg1};
    }
    :disabled {
        cursor: text;
    }
    flex: 0 0 auto;
    margin-bottom: 10px;
`

export const Output = styled.div<{ constrained?: boolean }>`
    background: ${(props) => props.theme.colors.bg3};
    line-height: 1.3;
    font-size: 0.9rem;
    white-space: pre-wrap;
    padding: 10px;
    > div {
        display: inline;
    }
    overflow-y: scroll;
    ${(props) => (props.constrained ? 'max-height: 200px;' : '')}

    min-height: 50px;
    font-family: ${(props) => props.theme.fonts.code};
    cursor: pointer;
`

const Token = styled.span<{ col: string }>`
    background: ${(props) => transparentize(0.85, props.col)};
    :hover {
        background: ${(props) => transparentize(0.6, props.col)};
    }
    font-family: ${(props) => props.theme.fonts.code};
`

const TokenButton = styled.span.attrs<{ col: string }>((props) => ({ style: { color: props.col } }))<{
    selected?: boolean
    col: string
}>`
    background-color: ${(props) => (props.selected ? props.theme.colors.bg1 : 'none')};
    ${(props) =>
        !props.selected
            ? `
        :hover {
        background: ${transparentize(0.6, props.theme.colors.bg1)};
    }`
            : ''}

    font-family: ${(props) => props.theme.fonts.code};
    padding: 0.05rem 0;
`

const Container = styled.div`
    min-height: 550px;
    height: max-content;
    overflow-y: auto;
    display: flex;
    flex-direction: column;

    @media (min-width: 600px) {
        width: 600px;
    }
`

const PageContainer = styled.div`
    display: flex;
    justify-content: space-around;
    height: var(--app-height, 100%);
    width: 100vw;
    overflow-y: scroll;
    > div {
        display: flex;
        flex-direction: column;
        width: 800px;
        margin: 50px 10px;
    }
`

export const TabButtons = styled.div`
    margin-top: 5px;
    margin-bottom: 0px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap-reverse;
    align-items: center;
    > div {
        display: flex;
        align-items: center;
    }
`

export const TabButton = styled(SubtleButton)<{ selected: boolean }>`
    background: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.bg1)};
    color: ${(props) => (!props.selected ? props.theme.colors.textMain : props.theme.colors.textHeadings)};

    font-weight: 600;
    padding: 6px 10px;
`

const Counter = styled.span`
    font-weight: 500;
    padding: 6px 10px;
`

const NumberSpan = styled.span`
    font-weight: 600;
    color: ${(props) => props.theme.colors.textHeadings};
`

const WarningText = styled.span`
    font-weight: 600;
    color: ${(props) => props.theme.colors.warning};
`

export function TokenizerPage(): JSX.Element {
    return (
        <PageContainer>
            <div>
                <h2>Tokenizer</h2>
                <Tokenizer contained={false} />
            </div>
        </PageContainer>
    )
}

export default function TokenizerModal(): JSX.Element {
    const [tokenizerOpen, setTokenizerOpen] = useRecoilState(TokenizerOpen)

    return (
        <Modal
            type={ModalType.Compact}
            isOpen={tokenizerOpen}
            label="Tokenizer"
            shouldCloseOnOverlayClick={true}
            onRequestClose={() => setTokenizerOpen(false)}
        >
            <Container>
                <Tokenizer contained={true} />
            </Container>
        </Modal>
    )
}

const encoders = [EncoderType.GPT2, EncoderType.Genji, EncoderType.Pile, EncoderType.CLIP]

function encoderName(encoderType: EncoderType) {
    switch (encoderType) {
        case EncoderType.GPT2:
            return 'GPT-2 Tokenizer'
        case EncoderType.Pile:
            return 'Pile Tokenizer'
        case EncoderType.PileNAI:
            return 'Pile Tokenizer (NAI ver)'
        case EncoderType.Genji:
            return 'Genji Tokenizer'
        case EncoderType.CLIP:
            return 'CLIP Tokenizer'
    }
}

export function Tokenizer(props: { contained: boolean }): JSX.Element {
    const [tokenizerText, setTokenizerText] = useRecoilState(TokenizerText)
    const [inputTokenIds, setInputTokenIds] = useState(false)

    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const [selectedTokenizer, setSelectedTokenizer] = useState(
        getModelEncoderType(currentStoryContent?.settings.model ?? DefaultModel)
    )

    useEffect(() => {
        setSelectedTokenizer(getModelEncoderType(currentStoryContent?.settings.model ?? DefaultModel))
    }, [currentStoryContent?.settings.model])
    const siteTheme = useRecoilValue(SiteTheme)

    return (
        <>
            <p>
                Before your text is sent to the AI, it gets turned into numbers in a process called
                tokenization. These tokens are how the AI reads and interprets text.
            </p>
            <p>
                The average token is around 4 characters long, but many common words are their own token.{' '}
                {props.contained && (
                    <>
                        The tokenizer for your currently selected model is the{' '}
                        <strong>
                            {encoderName(
                                getModelEncoderType(currentStoryContent?.settings.model ?? DefaultModel)
                            )}
                        </strong>
                        .
                    </>
                )}
            </p>
            <Select
                className="lorebook-generation-select"
                aria-label="Select a generation type"
                maxMenuHeight={420}
                options={encoders.map((s) => {
                    return {
                        value: s,
                        description: encoderName(s),
                        label: <div>{encoderName(s)}</div>,
                    }
                })}
                onChange={(e) => {
                    if (e !== null) {
                        setSelectedTokenizer(e.value)
                    }
                }}
                value={{
                    value: selectedTokenizer,
                    label: <div>{encoderName(selectedTokenizer)}</div>,
                    description: encoderName(selectedTokenizer),
                }}
                styles={getDropdownStyle(siteTheme)}
                theme={getDropdownTheme(siteTheme)}
            />
            <br />
            <TabButtons>
                <div>
                    <TabButton selected={!inputTokenIds} onClick={() => setInputTokenIds(false)}>
                        Text Input
                    </TabButton>
                    <TabButton selected={inputTokenIds} onClick={() => setInputTokenIds(true)}>
                        ID Input
                    </TabButton>
                </div>
            </TabButtons>
            <TextInput
                minRows={7}
                maxRows={props.contained ? 7 : 15}
                placeholder={'Type something here and the tokenized version will be shown below.'}
                onChange={(e) => {
                    setTokenizerText(e.target.value)
                }}
            >
                {tokenizerText}
            </TextInput>
            <TokenizerOutput
                encoderType={selectedTokenizer}
                contained={props.contained}
                tokenizerText={tokenizerText}
                tokenizerDelay={200}
                stringIsIds={inputTokenIds}
            />
        </>
    )
}

export function TokenizerOutput(props: {
    encoderType: EncoderType
    contained?: boolean
    tokenizerText: string | number[]
    tokenizerDelay?: number
    stringIsIds?: boolean
    selectedToken?: number
    onTokenClick?: (index: number, token: number[], repr: string) => void
    colors?: string[]
}): JSX.Element {
    const [tokens, setTokens] = useState<number[][]>([])
    const [tokenStrings, setTokenStrings] = useState<string[]>([])
    const [tokenIndexes, setTokenIndexes] = useState<number[]>([])
    const [showTokens, setShowTokens] = useState(false)
    const [encoding, setEncoding] = useState(false)
    const [runeLength, setRuneLength] = useState(0)
    const [numTokens, setNumTokens] = useState(0)
    const [error, setError] = useState('')
    const timeout = useRef<NodeJS.Timeout | null>(null)
    const siteTheme = useRecoilValue(SiteTheme)

    const colors = useMemo(
        () =>
            props.colors ?? siteTheme.colors.textHeadingsOptions ?? DEFAULT_THEME.colors.textHeadingsOptions,
        [props.colors, siteTheme.colors.textHeadingsOptions]
    )
    useEffect(() => {
        const groupDecodeRenderTokens = async (encoded: number[]) => {
            const worker = new WorkerInterface()
            const groupedTokens = groupMultiCharacterTokens(encoded, props.encoderType)
            setTokens(groupedTokens)
            const tokenStrings = []
            const tokenIndexes = []
            let tokenIdx = 0
            for (const token of groupedTokens) {
                tokenIndexes.push(tokenIdx)
                const string = await worker.decode(token, props.encoderType)
                tokenStrings.push(string.replace(/\n/g, '\\n\n'))
                tokenIdx += token.length
            }
            setNumTokens(tokenIdx)
            setTokenStrings(tokenStrings)
            setTokenIndexes(tokenIndexes)
            setRuneLength(tokenStrings.join('').length)
            setEncoding(false)
        }
        const delayTokenization = (text: string) => {
            if (timeout.current !== null) {
                clearTimeout(timeout.current)
            }
            setEncoding(true)
            setError('')
            timeout.current = setTimeout(async () => {
                try {
                    const worker = new WorkerInterface()
                    if (props.stringIsIds) {
                        let tempText = text
                        if (tempText.startsWith('[')) tempText = tempText.slice(1)
                        if (tempText.endsWith(']')) tempText = tempText.slice(0, -1)
                        const stringIds = tempText.split(/\D+/)
                        const tokens = stringIds.map((s) => {
                            const num = Number.parseInt(s)
                            if (Number.isNaN(num)) throw 'Formatting Error'
                            return num
                        })
                        await groupDecodeRenderTokens(tokens)
                    } else {
                        worker.encode(text, props.encoderType).then(async (encoded) => {
                            await groupDecodeRenderTokens(encoded)
                        })
                    }
                } catch (error: any) {
                    setError(error.toString())
                    setEncoding(false)
                }
            }, 200)
        }

        const delayArrayTokenization = (tokens: number[]) => {
            if (timeout.current !== null) {
                clearTimeout(timeout.current)
            }
            setEncoding(true)
            timeout.current = setTimeout(async () => {
                await groupDecodeRenderTokens(tokens)
            }, props.tokenizerDelay ?? 0)
        }
        if (typeof props.tokenizerText === 'string') delayTokenization(props.tokenizerText)
        else delayArrayTokenization(props.tokenizerText)
    }, [props.encoderType, props.stringIsIds, props.tokenizerDelay, props.tokenizerText])

    let counter = -1

    return (
        <>
            <TabButtons style={{ opacity: encoding ? 0.7 : 1 }}>
                <div>
                    <TabButton selected={!showTokens} onClick={() => setShowTokens(false)}>
                        Text
                    </TabButton>
                    <TabButton selected={showTokens} onClick={() => setShowTokens(true)}>
                        Token IDs
                    </TabButton>
                </div>
                <div>
                    <Counter>
                        Tokens: <NumberSpan>{numTokens}</NumberSpan>
                    </Counter>
                    <Counter>
                        Characters: <NumberSpan>{runeLength}</NumberSpan>
                    </Counter>
                </div>
            </TabButtons>
            <Output constrained={props.contained} style={{ opacity: encoding ? 0.7 : 1 }}>
                {error ? (
                    <WarningText>{error}</WarningText>
                ) : showTokens ? (
                    tokens.map((tok, i) => {
                        counter++
                        return props.onTokenClick ? (
                            tok.map((t, j) => (
                                <Tooltip
                                    key={i + '|' + j}
                                    tooltip=""
                                    elementTooltip={
                                        <Token col={colors[counter % colors.length]}>{tokenStrings[i]}</Token>
                                    }
                                    delay={500}
                                >
                                    <span key={i}>
                                        {i === 0 && j === 0 ? '[' : ''}
                                        <TokenButton
                                            selected={props.selectedToken === tokenIndexes[i]}
                                            onClick={() => {
                                                props.onTokenClick &&
                                                    props.onTokenClick(tokenIndexes[i], tokens[i], '' + t)
                                            }}
                                            col={colors[counter % colors.length]}
                                        >
                                            {t}
                                        </TokenButton>
                                        {i === tokens.length - 1 && j === tok.length - 1 ? ']' : ', '}
                                    </span>
                                </Tooltip>
                            ))
                        ) : (
                            <Tooltip
                                key={i}
                                tooltip=""
                                elementTooltip={
                                    <Token col={colors[counter % colors.length]}>{tokenStrings[i]}</Token>
                                }
                                delay={500}
                            >
                                <span key={i}>
                                    {i === 0 ? '[' : ''}
                                    {tok.join(', ')}
                                    {i < tokens.length - 1 ? ', ' : ']'}
                                </span>
                            </Tooltip>
                        )
                    })
                ) : (
                    tokenStrings.map((s, i) => {
                        counter++
                        const tokensRepr = tokens[i] ? tokens[i] : []
                        return (
                            <Tooltip key={i} tooltip={`[${tokensRepr.join(', ')}]`} delay={500}>
                                {props.onTokenClick ? (
                                    <TokenButton
                                        selected={props.selectedToken === tokenIndexes[i]}
                                        onClick={() =>
                                            props.onTokenClick &&
                                            props.onTokenClick(tokenIndexes[i], tokens[i], s)
                                        }
                                        col={colors[counter % colors.length]}
                                    >
                                        {s}
                                    </TokenButton>
                                ) : (
                                    <Token col={colors[counter % colors.length]}>{s}</Token>
                                )}
                            </Tooltip>
                        )
                    })
                )}
            </Output>
        </>
    )
}
