import { createModelSchema, primitive, date, list, deserialize, object } from 'serializr'
import { v4 as uuid } from 'uuid'
import moize from 'moize'
import { LogitBiasGroup } from '../story/logitbias'
import { ContextEntry, ContextFieldConfig, getDefaultLoreConfig } from './contextfield'

export class LoreEntry extends ContextEntry {
    lastUpdatedAt: Date = new Date()
    displayName: string = 'New Lorebook Entry'
    id: string = uuid()
    keys: string[] = []
    searchRange: number = 1000
    enabled: boolean = true
    forceActivation: boolean = false
    keyRelative: boolean = false
    nonStoryActivatable: boolean = false
    category: string = ''
    loreBiasGroups: LogitBiasGroup[] = [new LogitBiasGroup()]
    constructor(
        contextConfig: ContextFieldConfig = getDefaultLoreConfig(),
        text: string = '',
        displayName: string = 'New Lorebook Entry',
        keys: string[] = []
    ) {
        super(contextConfig, text)
        this.displayName = displayName
        this.keys = [...keys]
    }
    static deserialize(entry: string): LoreEntry {
        return deserialize(LoreEntry, JSON.parse(entry) as LoreEntry)
    }
}

function escapeRegExp(string: string) {
    return string.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') // $& means the whole matched string
}

export function findLastKeyIndex(
    text: string,
    keys: string[],
    stopAtFirst?: boolean
): { key: string; index: number; length: number } {
    let currentMatch: RegExpMatchArray | null = null
    let matchIsRegex = false
    let matchingKey: string = ''
    for (const key of keys) {
        if (key === null || key === undefined || key === '') {
            continue
        }
        if (stopAtFirst) {
            const regex = getSearchKey(key)
            const match = regex.test(text)
            if (match) {
                return { key: key, index: 0, length: 0 }
            }
            continue
        }
        const matches = [...text.matchAll(getSearchKey(key, true))]
        if (matches !== null)
            for (const match of matches) {
                if (currentMatch === null || (match.index ?? -1) > (currentMatch.index ?? -1)) {
                    currentMatch = match
                    matchIsRegex = isRegexKey(key).isRegex
                    matchingKey = key
                }
            }
    }
    if (currentMatch === null) {
        return { key: matchingKey, index: -1, length: 0 }
    }

    if (!matchIsRegex) {
        return {
            key: matchingKey,
            index: !currentMatch[1]
                ? currentMatch.index ?? -1
                : (currentMatch.index ?? -1) + currentMatch[1].length,
            length: !currentMatch[2] ? currentMatch[0].length : currentMatch[2].length,
        }
    }

    let length = currentMatch[0].length
    let start = currentMatch.index ?? -1
    if (currentMatch?.groups?.hl) {
        start += currentMatch[0].indexOf(currentMatch.groups.hl)
        length = currentMatch.groups.hl.length
    }
    return {
        key: matchingKey,
        index: start,
        length: length,
    }
}

export function isLoreEntryActive(
    entry: LoreEntry,
    searchText: string,
    stopAtFirst?: boolean,
    altSettings?: LoreEntry,
    ignoreForceActivated: boolean = false
): { key: string; index: number; length: number } {
    if (!entry.enabled) {
        return { key: '', index: -1, length: 0 }
    }
    if (entry.forceActivation && !ignoreForceActivated) {
        return { key: '', index: Number.POSITIVE_INFINITY, length: 0 }
    }
    const searchRange = altSettings ? altSettings.searchRange : entry.searchRange
    const trimmedSearchText = searchText.slice(-1 * searchRange)
    const result = findLastKeyIndex(trimmedSearchText, entry.keys, stopAtFirst)

    return {
        key: result.key,
        index: result.index < 0 ? result.index : Math.max(searchText.length - searchRange, 0) + result.index,
        length: result.length,
    }
}

export function getSearchKey(key: string, global?: boolean): RegExp {
    const regexInfo = isRegexKey(key)
    if (regexInfo.isRegex) {
        return new RegExp(regexInfo.regex, regexInfo.flags.join('') + (global ? 'g' : ''))
    }

    const endsNonLetter = key.slice(-1).match(/\W/)
    const startsNonLetter = key.slice(0, 1).match(/\W/)
    return new RegExp(
        `${startsNonLetter ? '' : '\\b'}${escapeRegExp(key.trim())}${endsNonLetter ? '' : '\\b'}`,
        'iu' + (global ? 'g' : '')
    )
}

const validFlags = new Set(['s', 'i', 'u', 'm'])

export const isRegexKey = moize({ maxSize: 50 })(
    (
        key: string
    ): {
        isRegex: boolean
        regex: string
        flags: string[]
        placeholders: boolean
    } => {
        let isRegex = true
        if (isRegex && key.length < 3) {
            isRegex = false
        }
        if (isRegex && !key.includes('/')) {
            isRegex = false
        }
        const prefix = key.slice(0, key.indexOf('/'))
        const flags = [...key.slice(key.lastIndexOf('/') + 1)]
        const regex = key.slice(key.indexOf('/') + 1, key.lastIndexOf('/'))
        if (isRegex && regex.length === 0) {
            isRegex = false
        }
        if (isRegex && prefix.length > 1) {
            isRegex = false
        }
        if (isRegex && flags.length > 4) {
            isRegex = false
        }
        if (isRegex)
            for (const flag of flags) {
                isRegex = validFlags.has(flag)
            }
        return { isRegex, regex, flags, placeholders: prefix === '$' }
    }
)

export const isInvalidRegexKey = moize({ maxSize: 50 })((text: string): boolean => {
    try {
        const regexInfo = isRegexKey(text)
        if (!regexInfo.isRegex) {
            return false
        }
        new RegExp(regexInfo.regex, regexInfo.flags.join(''))
    } catch {
        return true
    }
    return false
})

createModelSchema(LoreEntry, {
    lastUpdatedAt: date(),
    displayName: primitive(),
    id: primitive(),
    keys: list(primitive()),
    searchRange: primitive(),
    enabled: primitive(),
    forceActivation: primitive(),
    keyRelative: primitive(),
    nonStoryActivatable: primitive(),
    category: primitive(),
    loreBiasGroups: list(object(LogitBiasGroup)),
})
