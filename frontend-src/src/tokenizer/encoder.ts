/* eslint-disable array-callback-return */
// This file includes code which was modified from https://github.com/openai/gpt-2
// ... and was then further modified from https://github.com/latitudegames/GPT-3-Encoder

import { normalizeModel, TextGenerationModel } from '../data/request/model'
import { fetchWithTimeout } from '../util/general'

export enum EncoderType {
    GPT2,
    PileNAI,
    Genji,
    Pile,
    NAIInline,
    CLIP,
}

export function getModelEncoderType(model: TextGenerationModel): EncoderType {
    switch (normalizeModel(model)) {
        case TextGenerationModel.genjijp6bv2:
            return EncoderType.Genji
        case TextGenerationModel.krakev2:
            return EncoderType.Pile
        case TextGenerationModel.infill:
            return EncoderType.NAIInline
        default:
            return EncoderType.GPT2
    }
}

const textEncoder = new TextEncoder()
const encodeStr = (str: string) => {
    return [...textEncoder.encode(str)].map((x) => x.toString())
}

const textDecoder = new TextDecoder('utf8')
const decodeStr = (arr: Iterable<number>) => {
    return textDecoder.decode(new Uint8Array(arr))
}

const dictZip = (x: any, y: any) => {
    const result: any = {}
    x.map((_: any, i: any) => {
        result[x[i]] = y[i]
    })
    return result
}

const range = (x: number | undefined, y: any) => {
    const res = [...Array.from({ length: y }).keys()].slice(x)
    return res
}

const ord = (x: string) => {
    // eslint-disable-next-line unicorn/prefer-code-point
    return x.charCodeAt(0)
}

const chr = (x: number) => {
    // eslint-disable-next-line unicorn/prefer-code-point
    return String.fromCharCode(x)
}

function get_pairs(word: any[]) {
    const pairs = new Set<any>()
    let prev_char = word[0]
    for (let i = 1; i < word.length; i++) {
        const char = word[i]
        pairs.add([prev_char, char])
        prev_char = char
    }
    return pairs
}

const bytes_to_unicode = () => {
    const bs = [
        ...range(ord('!'), ord('~') + 1),
        ...range(ord('¡'), ord('¬') + 1),
        ...range(ord('®'), ord('ÿ') + 1),
    ]

    let cs: any = [...bs]
    let n = 0
    for (let b = 0; b < 2 ** 8; b++) {
        if (!bs.includes(b)) {
            bs.push(b)
            cs.push(2 ** 8 + n)
            n = n + 1
        }
    }

    cs = cs.map((x: number) => chr(x))

    const result: any = {}
    bs.map((_, i) => {
        result[bs[i]] = cs[i]
    })
    return result
}

const byte_encoder = bytes_to_unicode()
const byte_decoder: any = {}
Object.keys(byte_encoder).map((x) => {
    byte_decoder[byte_encoder[x]] = x
})

const pat = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu

export default class Encoder {
    encoder: any
    bpe_ranks: any
    decoder: any
    addedTokens: any
    private cache = new Map()
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(encoder: any, bpeArr: string[], addedTokens?: any) {
        this.addedTokens = addedTokens
        this.encoder = encoder
        const lines = bpeArr

        // bpe_merges = [tuple(merge_str.split()) for merge_str in bpe_data.split("\n")[1:-1]]
        const bpe_merges = lines.map((x) => {
            return x.split(/(\s+)/).filter(function (e) {
                return e.trim().length > 0
            })
        })
        this.bpe_ranks = dictZip(bpe_merges, range(0, bpe_merges.length))

        this.decoder = {}
        Object.keys(encoder).map((x) => {
            this.decoder[encoder[x]] = x
        })
        Object.keys(addedTokens).map((x) => {
            this.decoder[addedTokens[x]] = x
        })
    }

    private bpe(token: string) {
        if (this.cache.has(token)) {
            return this.cache.get(token)
        }

        let word: string[] = [...token]

        let pairs = get_pairs(word)

        if (!pairs) {
            return token
        }

        for (;;) {
            const minPairs: any = {}
            ;[...pairs].map((pair) => {
                const rank = this.bpe_ranks[pair]
                // eslint-disable-next-line unicorn/prefer-number-properties
                minPairs[isNaN(rank) ? 10e10 : rank] = pair
            })

            const bigram =
                minPairs[
                    Math.min(
                        ...Object.keys(minPairs).map((x) => {
                            return Number.parseInt(x)
                        })
                    )
                ]

            if (!(bigram in this.bpe_ranks)) {
                break
            }

            const first = bigram[0]
            const second = bigram[1]
            let new_word: any[] = []
            let i = 0

            while (i < word.length) {
                const j = word.indexOf(first, i)
                if (j === -1) {
                    new_word = [...new_word, ...word.slice(i)]
                    break
                }
                new_word = [...new_word, ...word.slice(i, j)]
                i = j

                if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
                    new_word.push(first + second)
                    i = i + 2
                } else {
                    new_word.push(word[i])
                    i = i + 1
                }
            }
            word = new_word
            if (word.length === 1) {
                break
            } else {
                pairs = get_pairs(word)
            }
        }

        const joined = word.join(' ')
        this.cache.set(token, joined)

        return joined
    }
    encode = (text: string): number[] => {
        let parts: any[] = []
        parts.push(text)
        for (const token of Object.keys(this.addedTokens)) {
            for (let i = 0; i < parts.length; ++i) {
                const part = parts[i]
                if (typeof part === 'string') {
                    const split = part.split(token)
                    const result: (string | number)[] = []
                    for (const [j, s] of split.entries()) {
                        result.push(s)
                        if (j < split.length - 1) {
                            result.push(this.addedTokens[token])
                        }
                    }
                    parts = [...parts.slice(0, i), ...result, ...parts.slice(i + 1)]
                }
            }
        }

        const tokens: number[] = []
        for (const part of parts) {
            if (typeof part === 'string') {
                let bpe_tokens: number[] = []
                const matches = [...part.matchAll(pat)].map((x) => x[0])

                for (let token of matches) {
                    token = encodeStr(token)
                        .map((x) => {
                            return byte_encoder[x]
                        })
                        .join('')
                    const bpe = this.bpe(token)
                    const new_tokens = bpe.split(' ').map((x: any) => this.encoder[x])
                    bpe_tokens = [...bpe_tokens, ...new_tokens]
                }
                tokens.push(...bpe_tokens)
            } else {
                tokens.push(part)
            }
        }

        return tokens
    }

    decode = (tokens: any[]): string => {
        let text = tokens.map((x) => this.decoder[x]).join('')
        text = decodeStr(
            [...text].flatMap((x) => {
                const converted = byte_decoder[x] ?? [...textEncoder.encode(x)]
                return converted
            })
        )
        return text
    }

    tokensContaining = (str: string): { token: string; id: number }[] => {
        const keys = Object.keys(this.encoder)
        const arr = []
        for (const key of keys) {
            if (key.includes(str)) arr.push({ token: key, id: this.encoder[key] })
        }
        return arr
    }
}

//
// clip encoder from https://github.com/josephrocca/clip-bpe-js
//

function basic_clean(text: string, htmlEntities: any) {
    text = htmlEntities.decode(htmlEntities.decode(text))
    return text.trim()
}
function whitespace_clean(text: string) {
    return text.replace(/\s+/g, ' ').trim()
}

function bracket_clean(text: string) {
    return text.replace(/[[\]{}]/g, ' ').trim()
}

export class ClipEncoder {
    constructor(bpeArr: string[], htmlEntities: any) {
        this.htmlEntities = htmlEntities
        const merges = bpeArr.slice(1, 49152 - 256 - 2 + 1).map((merge) => merge.split(' '))
        let vocab = [
            '!',
            '"',
            '#',
            '$',
            '%',
            '&',
            "'",
            '(',
            ')',
            '*',
            '+',
            ',',
            '-',
            '.',
            '/',
            '0',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            ':',
            ';',
            '<',
            '=',
            '>',
            '?',
            '@',
            'A',
            'B',
            'C',
            'D',
            'E',
            'F',
            'G',
            'H',
            'I',
            'J',
            'K',
            'L',
            'M',
            'N',
            'O',
            'P',
            'Q',
            'R',
            'S',
            'T',
            'U',
            'V',
            'W',
            'X',
            'Y',
            'Z',
            '[',
            '\\',
            ']',
            '^',
            '_',
            '`',
            'a',
            'b',
            'c',
            'd',
            'e',
            'f',
            'g',
            'h',
            'i',
            'j',
            'k',
            'l',
            'm',
            'n',
            'o',
            'p',
            'q',
            'r',
            's',
            't',
            'u',
            'v',
            'w',
            'x',
            'y',
            'z',
            '{',
            '|',
            '}',
            '~',
            '¡',
            '¢',
            '£',
            '¤',
            '¥',
            '¦',
            '§',
            '¨',
            '©',
            'ª',
            '«',
            '¬',
            '®',
            '¯',
            '°',
            '±',
            '²',
            '³',
            '´',
            'µ',
            '¶',
            '·',
            '¸',
            '¹',
            'º',
            '»',
            '¼',
            '½',
            '¾',
            '¿',
            'À',
            'Á',
            'Â',
            'Ã',
            'Ä',
            'Å',
            'Æ',
            'Ç',
            'È',
            'É',
            'Ê',
            'Ë',
            'Ì',
            'Í',
            'Î',
            'Ï',
            'Ð',
            'Ñ',
            'Ò',
            'Ó',
            'Ô',
            'Õ',
            'Ö',
            '×',
            'Ø',
            'Ù',
            'Ú',
            'Û',
            'Ü',
            'Ý',
            'Þ',
            'ß',
            'à',
            'á',
            'â',
            'ã',
            'ä',
            'å',
            'æ',
            'ç',
            'è',
            'é',
            'ê',
            'ë',
            'ì',
            'í',
            'î',
            'ï',
            'ð',
            'ñ',
            'ò',
            'ó',
            'ô',
            'õ',
            'ö',
            '÷',
            'ø',
            'ù',
            'ú',
            'û',
            'ü',
            'ý',
            'þ',
            'ÿ',
            'Ā',
            'ā',
            'Ă',
            'ă',
            'Ą',
            'ą',
            'Ć',
            'ć',
            'Ĉ',
            'ĉ',
            'Ċ',
            'ċ',
            'Č',
            'č',
            'Ď',
            'ď',
            'Đ',
            'đ',
            'Ē',
            'ē',
            'Ĕ',
            'ĕ',
            'Ė',
            'ė',
            'Ę',
            'ę',
            'Ě',
            'ě',
            'Ĝ',
            'ĝ',
            'Ğ',
            'ğ',
            'Ġ',
            'ġ',
            'Ģ',
            'ģ',
            'Ĥ',
            'ĥ',
            'Ħ',
            'ħ',
            'Ĩ',
            'ĩ',
            'Ī',
            'ī',
            'Ĭ',
            'ĭ',
            'Į',
            'į',
            'İ',
            'ı',
            'Ĳ',
            'ĳ',
            'Ĵ',
            'ĵ',
            'Ķ',
            'ķ',
            'ĸ',
            'Ĺ',
            'ĺ',
            'Ļ',
            'ļ',
            'Ľ',
            'ľ',
            'Ŀ',
            'ŀ',
            'Ł',
            'ł',
            'Ń',
        ]
        vocab = [...vocab, ...vocab.map((v) => v + '</w>')]
        for (const merge of merges) {
            vocab.push(merge.join(''))
        }
        vocab.push('<|startoftext|>', '<|endoftext|>')
        this.encoder = Object.fromEntries(vocab.map((v, i) => [v, i]))
        this.decoder = Object.fromEntries(Object.entries(this.encoder).map(([k, v]) => [v, k]))
        this.bpeRanks = Object.fromEntries(merges.map((v, i) => [v.join('·😎·'), i])) // ·😎· because js doesn't yet have tuples
        this.cache = { '<|startoftext|>': '<|startoftext|>', '<|endoftext|>': '<|endoftext|>' }
        this.pat =
            /<\|startoftext\|>|<\|endoftext\|>|'s|'t|'re|'ve|'m|'ll|'d|[\p{L}]+|[\p{N}]|[^\s\p{L}\p{N}]+/giu
    }

    private encoder: Record<string, number>
    private decoder: Record<number, string>
    private cache: Record<string, string>
    private bpeRanks: Record<string, number>
    private pat: RegExp
    private htmlEntities: any

    private bpe(token: string) {
        if (this.cache[token] !== undefined) {
            return this.cache[token]
        }

        let word = [...token.slice(0, -1), token.slice(-1) + '</w>']
        let pairs = get_pairs(word)

        if (pairs.size === 0) {
            return token + '</w>'
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            let bigram = null
            let minRank = Number.POSITIVE_INFINITY
            for (const p of pairs) {
                const r = this.bpeRanks[p.join('·😎·')]
                if (r === undefined) continue
                if (r < minRank) {
                    minRank = r
                    bigram = p
                }
            }

            if (bigram === null) {
                break
            }

            const [first, second] = bigram
            const newWord = []
            let i = 0
            while (i < word.length) {
                const j = word.indexOf(first, i)

                if (j === -1) {
                    newWord.push(...word.slice(i))
                    break
                }

                newWord.push(...word.slice(i, j))
                i = j

                if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
                    newWord.push(first + second)
                    i += 2
                } else {
                    newWord.push(word[i])
                    i += 1
                }
            }
            word = newWord
            if (word.length === 1) {
                break
            } else {
                pairs = get_pairs(word)
            }
        }
        const joined = word.join(' ')
        this.cache[token] = joined
        return joined
    }

    encode(text: string): number[] {
        const bpeTokens = []
        text = whitespace_clean(basic_clean(bracket_clean(text), this.htmlEntities)).toLowerCase()
        for (let token of [...text.matchAll(this.pat)].map((m) => m[0])) {
            // eslint-disable-next-line unicorn/prefer-code-point
            token = [...token].map((b) => byte_encoder[b.charCodeAt(0)]).join('')
            bpeTokens.push(
                ...this.bpe(token)
                    .split(' ')
                    .map((bpe_token) => this.encoder[bpe_token])
            )
        }
        return bpeTokens
    }

    // adds start and end token, and adds padding 0's and ensures it's 77 tokens long
    encodeForCLIP(text: string): number[] {
        let tokens = this.encode(text)
        tokens.unshift(49406) // start token
        tokens = tokens.slice(0, 76)
        tokens.push(49407) // end token
        while (tokens.length < 77) tokens.push(0)
        return tokens
    }

    decode(tokens: number[]): string {
        let text = tokens.map((token) => this.decoder[token]).join('')
        text = [...text]
            .map((c) => byte_decoder[c])
            // eslint-disable-next-line unicorn/prefer-code-point
            .map((v) => String.fromCharCode(v))
            .join('')
            .replaceAll('</w>', ' ')
        return text
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function loadEncoder(url: string, extraTokens: any) {
    const [tokenizerrq] = await Promise.all([
        fetchWithTimeout(
            '/tokenizer/' + url + '?static=true',
            {
                cache: 'force-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            15_000,
            'Timeout fetching encoder.json'
        ),
    ])
    const [tokenizer] = await Promise.all([tokenizerrq.json()])

    if (url.includes('clip')) {
        const htmlEntities = await import('html-entities')
        return new ClipEncoder(tokenizer.text.split('\n'), htmlEntities)
    } else {
        return new Encoder(tokenizer.vocab, tokenizer.merges, { ...tokenizer.addedTokens, ...extraTokens })
    }
}
