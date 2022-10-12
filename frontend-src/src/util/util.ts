import { StoryMetadata } from '../data/story/storycontainer'
import { StorySettings } from '../data/story/storysettings'
import { PrefixOptions } from '../data/story/defaultprefixes'
import { StoryMode } from '../data/story/story'
import { LogitBiasGroup } from '../data/story/logitbias'
import { BannedSequenceGroup } from '../data/story/bannedsequences'
import { logError } from './browser'

export async function formatErrorResponse(response: Response, format401: boolean = true): Promise<Error> {
    if (response.status === 401 && format401) {
        return new Error('Invalid Access Key')
    }
    let error
    try {
        const errorjson = await response.json()
        error = errorjson.message
            ? new Error(errorjson.message)
            : new Error(response.statusText ?? 'Status ' + (response as any).statusCode ?? response.status)
    } catch (error_) {
        logError(error_, false)
        error = new Error(response.statusText ?? 'Status ' + (response as any).statusCode ?? response.status)
    }
    return error
}

export function loadScript(src: string): Promise<unknown> {
    return new Promise(function (resolve, reject) {
        const scripts = document.querySelectorAll('script')
        for (const script of scripts) {
            if (script.src === src) {
                resolve({})
                return
            }
        }
        const s = document.createElement('script')
        s.src = src
        s.addEventListener('load', resolve)
        s.addEventListener('error', reject)
        document.head.append(s)
    })
}

export function unloadScript(src: string): void {
    const scripts = document.querySelectorAll('script')
    for (const script of scripts) {
        if (script.src === src) {
            script.parentElement?.removeChild(script)
        }
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function hasSameKeys(a: any, b: any, d: any = {}): boolean {
    if (Array.isArray(a) && Array.isArray(b)) return true
    if (typeof a !== 'object' && typeof a === typeof b) return true
    if (!Object.keys(a) && !Object.keys(b)) return true
    if (Object.keys(d).length > 0) {
        for (const k of Object.keys(a)) {
            if (!b[k]) b[k] = d[k]
        }
    }
    return Object.keys(a).every(
        (k) =>
            a[k] === undefined ||
            (Object.prototype.hasOwnProperty.call(b, k) && hasSameKeys(a[k], b[k], d[k] ?? {}))
    )
}

export function concatenateUint8(
    resultConstructor: Uint8ArrayConstructor,
    ...arrays: Uint8Array[]
): Uint8Array {
    let totalLength = 0
    for (const arr of arrays) {
        totalLength += arr.length
    }
    const result = new resultConstructor(totalLength)
    let offset = 0
    for (const arr of arrays) {
        result.set(arr, offset)
        offset += arr.length
    }
    return result
}

export const mod = (xx: number, yy: number): number => {
    return ((xx % yy) + yy) % yy
}

export const endingPunctuation = new Set(['.', '!', '?', '¿', '¡', '…', '؟', '。', '？', '！'])
export const continuingPunctuation = new Set([';', ',', ':', '-', '–', '—'])
export const closingCharacters = new Set(['"', '}', ')', ']', '”'])
export const returnCharacters = new Set(['\n', '\r'])
export const speechPunctuation = new Set(['"'])
export const pairedPunctuation = new Map<string, string>([
    ['"', '"'],
    ['[', ']'],
    ['(', ')'],
    ['{', '}'],
])
export const quoteCharacters = new Set(['“', '”', '"', '「', '」'])

export function getLastLine(str: string): string {
    if (str.length <= 0) {
        return ''
    }

    let position = str.length - 1
    while (position > 0) {
        if (returnCharacters.has(str.charAt(position))) {
            break
        } else {
            position--
        }
    }

    return str.slice(position)
}

export function isUpperCase(str: string): boolean {
    return str == str.toUpperCase() && str != str.toLowerCase()
}

export function stripRepeatedOpening(source: string, input: string, lastRequired?: boolean): string {
    const splits = ['"', ' ', "'", '’']
    let splitSource = source
    let splitInput = input
    for (const split of splits) {
        splitSource = splitSource.replace(new RegExp(split, 'g'), '<|>' + split)
        splitInput = splitInput.replace(new RegExp(split, 'g'), '<|>' + split)
    }

    const sourceWords: string[] = splitSource.split('<|>').filter(Boolean)
    const inputWords: string[] = splitInput.split('<|>').filter(Boolean)

    let inputIndex = 0
    let sourceIndex = 0
    let spliceStart = -1
    let spliceEnd = -1
    let consumedLast = false
    while (inputIndex < inputWords.length && sourceIndex < sourceWords.length) {
        const sourceWord = sourceWords[sourceIndex].toLowerCase()
        const inputWord = inputWords[inputIndex].toLowerCase()

        if (sourceWord.trim() === inputWord.trim()) {
            if (spliceStart < 0) {
                spliceStart = inputIndex
            }
            spliceEnd = inputIndex
            consumedLast = sourceIndex === sourceWords.length
            inputIndex++
        } else if (spliceStart > 0) {
            break
        }
        sourceIndex++
    }

    if (spliceStart + spliceEnd > -1) {
        inputWords.splice(spliceStart, spliceEnd - spliceStart + 1)
    }
    if (lastRequired && !consumedLast) return input

    return inputWords.join('').trim()
}

export function randomizeArray<T>(arr: T[]): T[] {
    return [...arr].sort(() => 0.5 - Math.random())
}

export function isAdventureModeStory(storySettings?: StorySettings): boolean {
    return (
        PrefixOptions.get(storySettings?.prefix ?? '')?.mode === (1 as StoryMode) ||
        storySettings?.prefixMode === (1 as StoryMode)
    )
}

export function metadataDiffers(a: StoryMetadata, b: StoryMetadata): boolean {
    return !(
        a.remoteId === b.remoteId &&
        a.remoteStoryId === b.remoteStoryId &&
        a.remote === b.remote &&
        a.description === b.description &&
        a.title === b.title &&
        JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
        a.favorite === b.favorite
    )
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function until(fn: () => boolean, sleep_ms: number = 25): Promise<void> {
    while (!fn()) {
        await sleep(sleep_ms)
    }
}

export const emailConfirmationRequiredDate = 1639785780

export function isModuleImageValid(image?: string): boolean {
    return !!(
        image &&
        image.length > 0 &&
        (image.startsWith('data:image') ||
            image.startsWith('https://i.imgur.com/') ||
            image.startsWith('/_next/static/media/'))
    )
}

// Taken and modified from from https://github.com/vkiryukhin/pretty-data
export function prettifyCss(text: string): string {
    const shift: string[] = ['\n']
    for (let ix = 0; ix < 100; ix++) {
        shift.push(shift[ix] + '    ')
    }
    const ar: string[] = text
        .replace(/\s+/g, ' ')
        .replace(/{/g, '{~::~')
        .replace(/}/g, '~::~}~::~')
        .replace(/;/g, ';~::~')
        .replace(/\/\*/g, '~::~/*')
        .replace(/\*\//g, '*/~::~')
        .replace(/~::~\s*~::~/g, '~::~')
        .split('~::~')
    const len = ar.length
    let deep = 0
    let str = ''
    for (let ix = 0; ix < len; ix++) {
        if (/{/.test(ar[ix])) {
            str += shift[deep++] + ar[ix]
        } else if (/}/.test(ar[ix])) {
            str += shift[--deep] + ar[ix]
        } else if (/\*\\/.test(ar[ix])) {
            str += shift[deep] + ar[ix]
        } else {
            str += shift[deep] + ar[ix]
        }
    }
    return str.replace(/^\n+/, '')
}

// Taken and modified from from https://github.com/vkiryukhin/pretty-data
export function minifyCss(text: string, preserveComments: boolean = false): string {
    const str = preserveComments ? text : text.replace(/\/\*([^*]|[\n\r]|(\*+([^*/]|[\n\r])))*\*+\//g, '')
    return str
        .replace(/\s+/g, ' ')
        .replace(/{\s+/g, '{')
        .replace(/}\s+/g, '}')
        .replace(/;\s+/g, ';')
        .replace(/\/\*\s+/g, '/*')
        .replace(/\*\/\s+/g, '*/')
}

export function addBiases(a: LogitBiasGroup[] | undefined, b: LogitBiasGroup[]): LogitBiasGroup[] {
    if (!a) return b
    return a.length === 1 && a[0].phrases.length === 0 ? b : [...(a ?? []), ...b]
}

export function logprobToPercent(logprob: number): string {
    const percent = Math.exp(logprob) * 100
    return percent.toFixed(2)
}

export function logprobToProb(logprob: number): number {
    return Math.exp(logprob)
}

export function addBans(
    a: BannedSequenceGroup[] | undefined,
    b: BannedSequenceGroup[]
): BannedSequenceGroup[] {
    if (!a) return b
    return a.length === 1 && a[0].sequences.length === 0 ? b : [...(a ?? []), ...b]
}

export function groupBy(
    values: Array<Record<string, any>>,
    key: string
): Record<string, Array<Record<string, any>>> {
    // eslint-disable-next-line unicorn/prefer-object-from-entries
    return values.reduce(function (rv, x) {
        ;(rv[x[key]] = rv[x[key]] || []).push(x)
        return rv
    }, {})
}

export function randomFromArray<T>(array: Array<T>): T {
    return array[Math.floor(Math.random() * array.length)]
}

export function authTokenToAccountId(auth_token: string): string {
    return JSON.parse(Buffer.from(auth_token.split('.')[1], 'base64').toString('utf8')).id
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const memoize = (fn: any): any => {
    const cache = {} as Record<any, any>
    return (...args: any[]) => {
        const n = args[0]
        if (n in cache) {
            return cache[n]
        } else {
            const result = fn(n)
            cache[n] = result
            return result
        }
    }
}
