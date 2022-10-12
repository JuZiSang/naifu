import {
    GenjiBracketTokens,
    GPT2AngledBrackets,
    GPT2BracketTokens,
    pileAngledBracketBans,
    pileBracketBans,
} from '../data/ai/constants'
import { BannedSequenceGroup } from '../data/story/bannedsequences'
import { EndOfSamplingSequence } from '../data/story/eossequences'
import {
    encoderMatchesTokenFormat,
    LogitBiasGroup,
    TokenData,
    TokenDataFormat,
} from '../data/story/logitbias'
import { EncoderType } from '../tokenizer/encoder'
import { WorkerInterface } from '../tokenizer/interface'
import { logError } from './browser'
import { tokenStringToTokens } from './tokens'

const BiasNoSpaceCharacters = new Set([
    '’',
    "'",
    '.',
    '"',
    '-',
    '–',
    '—',
    '―',
    '‒',
    '~',
    '!',
    '?',
    '*',
    '⁂',
    ',',
    ';',
    ':',
    '<',
    '>',
    '&',
    '@',
    '#',
    '%',
    '^',
    '\n',
])

export function isBiasNoSpaceCharacter(c: string): boolean {
    if (BiasNoSpaceCharacters.has(c)) return true
    const codepoint = c.codePointAt(0)
    if (codepoint && codepoint >= 0x3000 && codepoint <= 0x9faf) return true
    if (codepoint && codepoint >= 0xff00 && codepoint <= 0xff9f) return true
    return false
}

export async function tokenDataToPhraseBiasTokens(
    tokenData: TokenData,
    encoderType: EncoderType
): Promise<number[]> {
    if (tokenData.tokens === undefined) {
        tokenData.tokens = {}
    }
    if (tokenData.tokens[encoderType] !== undefined) {
        return tokenData.tokens[encoderType][0]
    }
    const worker = new WorkerInterface()
    switch (tokenData.type) {
        case TokenDataFormat.GPT2Tokens:
        case TokenDataFormat.PileNaiTokens:
        case TokenDataFormat.GenjiTokens:
        case TokenDataFormat.NAIInlineTokens:
            try {
                tokenData.tokens[encoderType] = [tokenStringToTokens(tokenData.sequence)]
            } catch (error) {
                logError(error)
            }
            break
        case TokenDataFormat.RawString:
            tokenData.tokens[encoderType] = [await worker.encode(tokenData.sequence, encoderType)]
            break
        case TokenDataFormat.InterpretedString:
            tokenData.tokens[encoderType] = isBiasNoSpaceCharacter(tokenData.sequence.charAt(0))
                ? [await worker.encode(tokenData.sequence, encoderType)]
                : [await worker.encode(' ' + tokenData.sequence, encoderType)]
            break
    }
    return tokenData.tokens[encoderType]?.[0] ?? []
}

export async function tokenDataToBanTokens(
    tokenData: TokenData,
    encoderType: EncoderType
): Promise<number[][]> {
    if (tokenData.tokens === undefined) {
        tokenData.tokens = {}
    }
    if (tokenData.tokens[encoderType] !== undefined) {
        return tokenData.tokens[encoderType]
    }

    const worker = new WorkerInterface()
    switch (tokenData.type) {
        case TokenDataFormat.GPT2Tokens:
        case TokenDataFormat.PileNaiTokens:
        case TokenDataFormat.GenjiTokens:
        case TokenDataFormat.NAIInlineTokens:
            try {
                tokenData.tokens[encoderType] = [tokenStringToTokens(tokenData.sequence)]
            } catch (error) {
                logError(error)
            }
            break
        case TokenDataFormat.RawString:
            tokenData.tokens[encoderType] = [await worker.encode(tokenData.sequence, encoderType)]
            break
        case TokenDataFormat.InterpretedString:
            const basic = tokenData.sequence
            const lowercase = basic.toLocaleLowerCase()
            const caps = lowercase.slice(0, 1).toLocaleUpperCase() + basic.slice(1)
            const allCaps = lowercase.toLocaleUpperCase()
            const titleCase = lowercase
                .split(' ')
                .map((s) => s.slice(0, 1).toLocaleUpperCase() + s.slice(1))
                .join(' ')
            const combined = [
                await worker.encode(basic, encoderType),
                await worker.encode(' ' + basic, encoderType),
                await worker.encode(caps, encoderType),
                await worker.encode(' ' + caps, encoderType),
                await worker.encode(allCaps, encoderType),
                await worker.encode(' ' + allCaps, encoderType),
                await worker.encode(lowercase, encoderType),
                await worker.encode(' ' + lowercase, encoderType),
                await worker.encode(titleCase, encoderType),
                await worker.encode(' ' + titleCase, encoderType),
            ]
            tokenData.tokens[encoderType] = combined
            break
    }

    return tokenData.tokens[encoderType] ?? []
}

export async function tokenDataToStopSequenceTokens(
    tokenData: TokenData,
    encoderType: EncoderType
): Promise<number[][]> {
    if (tokenData.tokens === undefined) {
        tokenData.tokens = {}
    }
    if (tokenData.tokens[encoderType] !== undefined) {
        return tokenData.tokens[encoderType]
    }
    const worker = new WorkerInterface()
    switch (tokenData.type) {
        case TokenDataFormat.GPT2Tokens:
        case TokenDataFormat.PileNaiTokens:
        case TokenDataFormat.GenjiTokens:
        case TokenDataFormat.NAIInlineTokens:
            try {
                tokenData.tokens[encoderType] = [tokenStringToTokens(tokenData.sequence)]
            } catch (error) {
                logError(error)
            }
            break
        case TokenDataFormat.RawString: {
            tokenData.tokens[encoderType] = [await worker.encode(tokenData.sequence, encoderType)]
            break
        }
        case TokenDataFormat.InterpretedString: {
            tokenData.tokens[encoderType] = [await worker.encode(tokenData.sequence, encoderType)]
            break
        }
    }

    return tokenData.tokens[encoderType] ?? []
}

interface LogitBiasExp {
    sequence: number[]
    bias: number
    ensure_sequence_finish: boolean
    generate_once: boolean
}

export async function prepareBiasGroups(
    biasGroups: LogitBiasGroup[],
    encoderType: EncoderType
): Promise<LogitBiasExp[]> {
    const logit_bias_exp_total = []

    for (const group of biasGroups) {
        if (!group.enabled) continue
        for (const phrase of group.phrases) {
            if (!encoderMatchesTokenFormat(phrase.type, encoderType)) {
                continue
            }
            const tokenArr = await tokenDataToPhraseBiasTokens(phrase, encoderType)
            if (tokenArr.length > 0) {
                const index = logit_bias_exp_total.findIndex((b) => {
                    let equal = true
                    if (b.sequence.length !== tokenArr.length) return false
                    for (const [i, t] of b.sequence.entries()) {
                        equal = equal && tokenArr[i] === t
                    }
                    return equal
                })
                if (index > -1) {
                    logit_bias_exp_total[index].bias += group.bias
                    logit_bias_exp_total[index].ensure_sequence_finish =
                        logit_bias_exp_total[index].ensure_sequence_finish || group.ensureSequenceFinish
                    logit_bias_exp_total[index].generate_once =
                        logit_bias_exp_total[index].generate_once || group.generateOnce
                    logit_bias_exp_total[index].number += 1
                } else
                    logit_bias_exp_total.push({
                        sequence: tokenArr,
                        bias: group.bias,
                        ensure_sequence_finish: group.ensureSequenceFinish,
                        generate_once: group.generateOnce,
                        number: 1,
                    })
            }
        }
    }
    const logit_bias_exp = []
    for (const b of logit_bias_exp_total) {
        logit_bias_exp.push({
            sequence: b.sequence,
            bias: b.bias / b.number,
            ensure_sequence_finish: b.ensure_sequence_finish,
            generate_once: b.generate_once,
        })
    }
    return logit_bias_exp
}

export async function prepareBadWords(
    banGroups: BannedSequenceGroup[],
    encoderType: EncoderType
): Promise<number[][]> {
    let bad_word_ids: number[][] = []
    for (const group of banGroups) {
        if (!group.enabled) continue
        for (const seq of group.sequences) {
            if (!encoderMatchesTokenFormat(seq.type, encoderType)) {
                continue
            }

            bad_word_ids = [...bad_word_ids, ...(await tokenDataToBanTokens(seq, encoderType))]
        }
    }
    return bad_word_ids
}

export async function prepareStopSequences(
    eosSeqs: EndOfSamplingSequence[],
    encoderType: EncoderType
): Promise<number[][]> {
    let stop_sequences: number[][] = []
    for (const eos of eosSeqs) {
        if (!encoderMatchesTokenFormat(eos.sequence.type, encoderType)) {
            continue
        }
        stop_sequences = [
            ...stop_sequences,
            ...(await tokenDataToStopSequenceTokens(eos.sequence, encoderType)),
        ]
    }
    return stop_sequences
}

export function getEncoderBannedBrackets(tokenizer: EncoderType): number[][] {
    switch (tokenizer) {
        case EncoderType.Genji:
            return GenjiBracketTokens
        case EncoderType.Pile:
            return pileBracketBans
        case EncoderType.PileNAI:
            return [
                ...pileBracketBans,
                [50259], // en space
                [50257], //─
                [50260], //⁂
            ]

        default:
            return GPT2BracketTokens
    }
}

export function getEncoderBannedAdventureBrackets(tokenizer: EncoderType): number[][] {
    switch (tokenizer) {
        case EncoderType.Genji:
            return []
        case EncoderType.Pile:
        case EncoderType.PileNAI:
            return pileAngledBracketBans
        default:
            return GPT2AngledBrackets
    }
}

export function getEncoderDefaultBias(tokenizer: EncoderType): LogitBiasExp[] {
    switch (tokenizer) {
        case EncoderType.Genji:
            return [
                {
                    sequence: [7398],
                    bias: -0.25,
                    ensure_sequence_finish: false,
                    generate_once: false,
                },
                {
                    sequence: [15864],
                    bias: -0.25,
                    ensure_sequence_finish: false,
                    generate_once: false,
                },
                {
                    sequence: [29146],
                    bias: -0.25,
                    ensure_sequence_finish: false,
                    generate_once: false,
                },
                {
                    sequence: [4707],
                    bias: -0.25,
                    ensure_sequence_finish: false,
                    generate_once: false,
                },
            ]
        case EncoderType.PileNAI:
            // TODO
            return []
        default:
            return []
    }
}
