import { createModelSchema, list, object, optional, primitive } from 'serializr'
import { EncoderType } from '../../tokenizer/encoder'

export enum TokenDataFormat {
    RawString,
    GPT2Tokens,
    InterpretedString,
    PileNaiTokens,
    GenjiTokens,
    NAIInlineTokens,
}

export const RawTokenDataFormats = new Set([TokenDataFormat.GPT2Tokens, TokenDataFormat.PileNaiTokens])

export function tokenDataFromEncoderType(encoderType: EncoderType): TokenDataFormat {
    switch (encoderType) {
        case EncoderType.GPT2:
            return TokenDataFormat.GPT2Tokens
        case EncoderType.PileNAI:
        case EncoderType.Pile:
            return TokenDataFormat.PileNaiTokens
        case EncoderType.Genji:
            return TokenDataFormat.GenjiTokens
        case EncoderType.NAIInline:
            return TokenDataFormat.NAIInlineTokens
        default:
            throw new Error('No token data for encoder type ' + EncoderType)
    }
}

export function isStringDataFormat(format: TokenDataFormat): boolean {
    return format === TokenDataFormat.RawString || format === TokenDataFormat.InterpretedString
}

export function encoderMatchesTokenFormat(
    tokenDataFormat: TokenDataFormat,
    encoderType: EncoderType
): boolean {
    switch (tokenDataFormat) {
        case TokenDataFormat.InterpretedString:
        case TokenDataFormat.RawString:
            return true
        default:
            return tokenDataFormat === tokenDataFromEncoderType(encoderType)
    }
}

export const StringTokenFormats = new Set([TokenDataFormat.RawString, TokenDataFormat.InterpretedString])

export class TokenData {
    sequences?: number[][] = [] // Deprecated
    sequence: string = ''
    type: number = 0
    tokens?: any // intentionally excluded from serialization schema
    constructor(sequence: string, type: number) {
        this.type = type
        this.sequence = sequence
    }
}

createModelSchema(TokenData, {
    sequences: optional(list(list(primitive()))),
    sequence: optional(primitive()),
    type: primitive(),
})

export class LogitBiasGroup {
    phrases: TokenData[] = []
    bias: number = 0
    ensure_sequence_finish?: boolean = undefined // deprecated
    ensureSequenceFinish: boolean = false
    generate_once?: boolean = undefined // deprecated
    generateOnce: boolean = true
    enabled: boolean = true
    whenInactive: boolean = false
    constructor(phrases: TokenData[] = [], bias: number = 0) {
        this.phrases = phrases
        this.bias = bias
    }
}

createModelSchema(LogitBiasGroup, {
    phrases: list(object(TokenData)),
    ensure_sequence_finish: optional(primitive()), // deprecated
    ensureSequenceFinish: primitive(),
    generate_once: optional(primitive()), // deprecated
    generateOnce: primitive(),
    bias: primitive(),
    enabled: primitive(),
    whenInactive: primitive(),
})
