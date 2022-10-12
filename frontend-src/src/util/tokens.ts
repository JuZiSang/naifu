import { EncoderType } from '../tokenizer/encoder'
import { WorkerInterface } from '../tokenizer/interface'
import { groupMultiCharacterTokens } from '../tokenizer/util'

export async function splitStringIntoTokens(text: string, encoderType: EncoderType): Promise<string[]> {
    const worker = new WorkerInterface()
    const strings: string[] = []
    const tokens = await worker.encode(text, encoderType)
    const groupedTokens = groupMultiCharacterTokens(tokens, encoderType)
    for (const tokens of groupedTokens) {
        strings.push(await worker.decode(tokens, encoderType))
    }

    return strings
}

export function splitTokenString(text: string): string[] {
    if (text.startsWith('[')) text = text.slice(1)
    if (text.endsWith(']')) text = text.slice(0, -1)
    const split = text.split(/\D+/)
    return split
}

export function tokenStringToTokens(text: string): number[] {
    const split = splitTokenString(text)
    const tokens: number[] = []
    for (const s of split) {
        const n = Number.parseInt(s)
        if (Number.isNaN(n)) {
            throw `NaN when interpreting token string: "${text}" at "${s}`
        }
        tokens.push(n)
    }
    return tokens
}

export function tokenArrToString(tokens: number[]): string {
    return tokens.map((t) => t.toString()).join(',')
}
