import Encoder, { EncoderType } from './encoder'
import { genjiUnitrim } from './unitrim/genji'
import { gpt2Unitrim } from './unitrim/gtp2'
import { pileUnitrim } from './unitrim/pile'

export const PILE_NAI_EXTRA_TOKENS = {
    '─': 50257,
    ' ': 50258,
    ' ': 50259,
    '⁂': 50260,
}

export const NAI_INLINE_EXTRA_TOKENS = {
    '<|infillstart|>': 50257,
    '<|infillend|>': 50258,
    '<|masklen1|>': 50259,
    '<|masklen2|>': 50260,
    '<|masklen3|>': 50261,
    '<|masklen4|>': 50262,
    '<|standartmask|>': 50263,
}

export function getTokenizerFileUrl(tokenizer: EncoderType): string {
    switch (tokenizer) {
        case EncoderType.CLIP:
            return 'clip_tokenizer.json'
        default:
            throw new Error("unhandled tokenizer " + tokenizer.toString());
    }
}

export function getTokenizerExtraTokens(tokenizer: EncoderType): any {
    switch (tokenizer) {
        case EncoderType.PileNAI:
            return PILE_NAI_EXTRA_TOKENS
        case EncoderType.NAIInline:
            return NAI_INLINE_EXTRA_TOKENS
        default:
            return {}
    }
}

export function getUnitrim(tokenizer: EncoderType): number[] {
    switch (tokenizer) {
        case EncoderType.Pile:
        case EncoderType.PileNAI:
            return pileUnitrim
        case EncoderType.Genji:
            return genjiUnitrim
        case EncoderType.CLIP:
            return []
        default:
            return gpt2Unitrim
    }
}

export function generateBanString(encoder: Encoder, input: string[]): string {
    const tokens: {
        token: string
        id: number
    }[] = []
    for (const s of input) {
        const arr = encoder.tokensContaining(s)
        for (const a of arr) {
            if (tokens.some((t) => t.id === a.id)) {
                //
            } else {
                tokens.push(a)
            }
        }
    }
    tokens.sort((a, b) => a.id - b.id)
    let str = ''
    for (const { token, id } of tokens) {
        str += `[${id}], //${token}\n`
    }
    return str
}

export function checkNeed(tokens: number[], encoderType: EncoderType): { complete: boolean; error: boolean } {
    const table = getUnitrim(encoderType)
    let need = 0
    let nonZero = false
    for (const token of tokens) {
        const val = table[token] ?? 0
        need += val
        if (val === 0 && nonZero) {
            return { complete: false, error: true }
        } else if (val !== 0) {
            nonZero = true
        }
    }
    return { complete: need === 0, error: false }
}

export function groupMultiCharacterTokens(tokens: number[], encoderType: EncoderType): number[][] {
    const grouped: number[][] = []
    let carry: number[] = []
    for (const token of tokens) {
        carry = [...carry, token]
        const need = checkNeed(carry, encoderType)
        if (need.complete) {
            grouped.push([...carry])
            carry = []
        } else if (need.error) {
            grouped.push([...carry.slice(0, -1)], [...carry.slice(-1)])
            carry = []
        }
    }
    return grouped
}
