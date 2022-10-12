/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { MaxTokens } from '../../globals/constants'
import { logError } from '../../util/browser'
import {
    ContextEntry,
    getDefaultAuthorsNoteConfig,
    getDefaultLoreConfig,
    getDefaultMemoryConfig,
    TrimDirection,
} from '../ai/contextfield'
import { LoreEntry } from '../ai/loreentry'
import { BannedSequenceGroup } from './bannedsequences'
import { TokenData, TokenDataFormat } from './logitbias'
import { Lorebook } from './lorebook'
import { extractPlaceholders, Scenario } from './scenario'
import { DataOrigin, Story } from './story'
import { StoryContainer } from './storycontainer'
import { TextGenerationSettings } from './storysettings'

export enum ImportDataType {
    naiAlphaStory = 'naiAlphaStory',
    naiStory = 'naiStory',
    naiScenario = 'naiScenario',
    naiLorebook = 'naiLorebook',
    aidAdventureExport = 'aidExport',
    aidScenarioExport = 'aidScenario',
    aidWorldInfoExport = 'aidWorldInfo',
    koboldAISave = 'koboldAISave',
    storySettings = 'storySettings',
    holoStory = 'holoStory',
    holoStoryV8 = 'holoStoryV8',
    naiPreset = 'naiPreset',
    naiModule = 'naiModule',
    badWordsV0 = 'badWordsV1',
    badWordsV1 = 'badWordsV2',
    logitBiasV0 = 'phraseBiasV1',
    logitBiasV1 = 'phraseBiasV2',
    naiTheme = 'naiTheme',

    plainText = 'plainText',

    unknown = 'unknown',
}

export const allFileTypes = getFileTypesForJsonTypes(Object.keys(ImportDataType) as ImportDataType[])

export function getFileTypesForJsonTypes(types: ImportDataType[]) {
    const fileTypes = new Set()
    for (const type of types) {
        switch (type) {
            case ImportDataType.naiStory:
                fileTypes.add('.story')
                break
            case ImportDataType.naiScenario:
                fileTypes.add('.scenario')
                break
            case ImportDataType.naiLorebook:
                fileTypes.add('.lorebook')
                fileTypes.add('image/png')
                break
            case ImportDataType.storySettings:
                fileTypes.add('.gensettings')
                fileTypes.add('.generationset')
                break
            case ImportDataType.naiPreset:
                fileTypes.add('.preset')
                break
            case ImportDataType.naiModule:
                fileTypes.add('.module')
                break
            case ImportDataType.badWordsV0:
            case ImportDataType.badWordsV1:
                fileTypes.add('.badwords')
                break
            case ImportDataType.logitBiasV0:
            case ImportDataType.logitBiasV1:
                fileTypes.add('.bias')
                break
            case ImportDataType.naiTheme:
                fileTypes.add('.naiTheme')
                break
            case ImportDataType.holoStory:
            case ImportDataType.holoStoryV8:
                fileTypes.add('.bias')
                break
            case ImportDataType.naiAlphaStory:
            case ImportDataType.aidAdventureExport:
            case ImportDataType.aidScenarioExport:
            case ImportDataType.aidWorldInfoExport:
            case ImportDataType.koboldAISave:
                fileTypes.add('.json')
                fileTypes.add('application/json')
                break
            case ImportDataType.plainText:
                fileTypes.add('.txt')
                fileTypes.add('text/plain')
                break
            default:
                break
        }
    }
    return [...fileTypes].join(', ')
}

export function detectImportDataType(json: string): ImportDataType {
    if (json.includes('"moduleVersion":')) {
        return ImportDataType.naiModule
    } else if (json.includes('"storyContainerVersion":')) {
        return ImportDataType.naiStory
    } else if (json.includes('"dataFragment":')) {
        return ImportDataType.naiAlphaStory
    } else if (json.includes('"scenarioVersion":')) {
        return ImportDataType.naiScenario
    } else if (json.includes('"lorebookVersion":')) {
        return ImportDataType.naiLorebook
    } else if (json.includes('"publicId":') && json.includes('"actions":')) {
        return ImportDataType.aidAdventureExport
    } else if (
        json.includes('"publicId":') &&
        json.includes('"isOwner":') &&
        json.includes('"gameCode":') &&
        !json.includes('"actions":')
    ) {
        return ImportDataType.aidScenarioExport
    } else if (json.includes('"keys":') && json.includes('"entry":')) {
        return ImportDataType.aidWorldInfoExport
    } else if (json.includes('"gamestarted":')) {
        return ImportDataType.koboldAISave
    } else if (json.includes('"presetVersion":')) {
        return ImportDataType.naiPreset
    } else if (json.includes('"tail_free_sampling":')) {
        return ImportDataType.storySettings
    } else if (json.includes('"bad_words_ids":')) {
        return ImportDataType.badWordsV0
    } else if (json.includes('"bannedSequenceGroups":')) {
        return ImportDataType.badWordsV1
    } else if (json.includes('"phraseBiasGroups":') && json.includes('"sequence":')) {
        return ImportDataType.logitBiasV1
    } else if (json.includes('"logit_bias_groups":')) {
        return ImportDataType.logitBiasV0
    } else if (json.includes('"version":') && json.includes('"forkedFrom":')) {
        return ImportDataType.holoStory
    } else if (json.includes('"version":') && json.includes('"genMeta":')) {
        return ImportDataType.holoStoryV8
    } else if (json.includes('"colors":') && json.includes('"fonts":')) {
        return ImportDataType.naiTheme
    }
    return ImportDataType.unknown
}

export function naiAlphaStoryToStory(json: string): StoryContainer {
    const container = new StoryContainer()
    container.content.story = new Story()
    const naiAlphaStory = JSON.parse(json)
    container.metadata.title = naiAlphaStory.title
    container.metadata.description = naiAlphaStory.content
    container.metadata.favorite = naiAlphaStory.favorite
    container.metadata.tags = naiAlphaStory.tags
    container.metadata.lastUpdatedAt = new Date(naiAlphaStory.lastUpdatedAt)
    container.metadata.createdAt = new Date(naiAlphaStory.createdAt)

    container.content.settings = naiAlphaStory.settings
    container.content.settings.parameters = {
        ...new TextGenerationSettings(),
        ...naiAlphaStory.settings.textGeneration,
    }

    container.content.story.datablocks = naiAlphaStory.story.datablocks
    container.content.story.fragments = naiAlphaStory.story.fragments
    container.content.story.currentBlock = naiAlphaStory.story.currentBlock
    container.content.story.text = naiAlphaStory.story.text
    container.content.context = naiAlphaStory.context
    for (const contextEntry of container.content.context) {
        if (Array.isArray(contextEntry.contextConfig.prefix)) {
            contextEntry.contextConfig.prefix = ''
        }
        if (Array.isArray(contextEntry.contextConfig.suffix)) {
            contextEntry.contextConfig.suffix = '\n'
        }
        if (contextEntry.contextConfig.tokenBudget < MaxTokens) {
            contextEntry.contextConfig.tokenBudget = MaxTokens
        }
        if (contextEntry.contextConfig.reservedTokens === 100) {
            contextEntry.contextConfig.reservedTokens = MaxTokens
        }
        if (contextEntry.contextConfig.budgetPriority === 1) {
            contextEntry.contextConfig.budgetPriority = 800
        }
        if (contextEntry.contextConfig.budgetPriority === -1) {
            contextEntry.contextConfig.budgetPriority = -400
        }
        if (contextEntry.contextConfig.trimDirection === TrimDirection.TrimTop) {
            contextEntry.contextConfig.reservedTokens = 1024
        }
    }
    return container
}

export function aidAdventureExportToStory(
    aidAdventure: any,
    preserveAngledBracket: boolean = false
): StoryContainer {
    const container = new StoryContainer()
    container.content.story = new Story()
    try {
        container.metadata.title = aidAdventure.title ?? ''
        container.metadata.description = aidAdventure.description ?? ''
        container.metadata.tags = aidAdventure.tags ?? []
        container.content.context[0].text = aidAdventure.memory ?? ''
        container.content.context[1].text = aidAdventure.authorsNote ?? ''
        if (Array.isArray(aidAdventure.actions)) {
            for (const [index, action] of aidAdventure.actions.entries()) {
                let origin: DataOrigin
                let text: string = action.text
                switch (action.type) {
                    case 'continue':
                        origin = DataOrigin.ai
                        break
                    case 'story':
                        origin = DataOrigin.user
                        break
                    case 'do':
                        origin = DataOrigin.user
                        if (
                            !preserveAngledBracket &&
                            text.charAt(0) === '\n' &&
                            text.charAt(1) === '>' &&
                            text.charAt(2) === ' '
                        ) {
                            text = text.slice(0, 1) + text.slice(3)
                        }
                        break
                    case 'say':
                        origin = DataOrigin.user
                        if (
                            !preserveAngledBracket &&
                            text.charAt(0) === '\n' &&
                            text.charAt(1) === '>' &&
                            text.charAt(2) === ' '
                        ) {
                            text = text.slice(0, 1) + text.slice(3)
                        }
                        break
                    default:
                        origin = DataOrigin.user
                        break
                }
                if (index === 0) {
                    if (text.charAt(0) === '\n') {
                        text = text.slice(1)
                    }
                    origin = DataOrigin.prompt
                }
                container.content.story.append(origin, text)
            }
        }
        if (Array.isArray(aidAdventure.worldInfo)) {
            for (const worldInfo of aidAdventure.worldInfo) {
                const keys = worldInfo.keys.split(',')
                const text = worldInfo.entry
                const entry = new LoreEntry(getDefaultLoreConfig())
                for (const key of keys) {
                    if (!entry.keys.includes(key.trim())) {
                        entry.keys.push(key.trim())
                    }
                }
                entry.displayName = keys[0] ?? 'New Lorebook Entry'
                entry.text = text
                container.content.lorebook.entries.push(entry)
            }
        }
    } catch (error) {
        logError(error)
        throw error
    }
    return container
}

export function aidScenarioExportToScenario(aidScenario: any): Scenario {
    const scenario = new Scenario()
    try {
        scenario.title = aidScenario.title ?? ''
        scenario.description = aidScenario.description ?? ''
        scenario.tags = aidScenario.tags ?? []
        scenario.context.push(new ContextEntry(getDefaultMemoryConfig()))
        scenario.context[0].text = aidScenario.memory ?? ''
        scenario.context.push(new ContextEntry(getDefaultAuthorsNoteConfig()))
        scenario.context[1].text = aidScenario.authorsNote ?? ''
        scenario.prompt = aidScenario.prompt ?? ''
        scenario.author = aidScenario.user?.username + ' [AID Import]' ?? ''
        scenario.prompt = extractPlaceholders(scenario.prompt, scenario.placeholders)
        if (Array.isArray(aidScenario.worldInfo)) {
            for (const worldInfo of aidScenario.worldInfo) {
                const keys = worldInfo.keys.split(',')
                const text = worldInfo.entry
                const entry = new LoreEntry(getDefaultLoreConfig())
                for (const key of keys) {
                    if (!entry.keys.includes(key.trim())) {
                        entry.keys.push(key.trim())
                    }
                }
                entry.displayName = keys[0] ?? 'New Lorebook Entry'
                entry.text = text
                scenario.lorebook.entries.push(entry)
            }
        }
    } catch (error) {
        logError(error)
        throw error
    }
    return scenario
}

export function aidWorldInfoToLorebook(aidWorldInfo: any): Lorebook {
    const lorebook = new Lorebook()
    try {
        if (Array.isArray(aidWorldInfo)) {
            for (const worldInfo of aidWorldInfo) {
                const keys = worldInfo.keys.split(',')
                const text = worldInfo.entry
                const entry = new LoreEntry(getDefaultLoreConfig())
                for (const key of keys) {
                    if (!entry.keys.includes(key.trim())) {
                        entry.keys.push(key.trim())
                    }
                }
                entry.displayName = keys[0] ?? 'New Lorebook Entry'
                entry.text = text
                lorebook.entries.push(entry)
            }
        }
    } catch (error) {
        logError(error)
        throw error
    }
    return lorebook
}

export function koboldAISaveToStory(koboldAISave: any, name: string): StoryContainer {
    const container = new StoryContainer()
    container.content.story = new Story()
    try {
        container.metadata.title = name
        container.metadata.description = ''
        container.content.context[0].text = koboldAISave.memory ?? ''
        container.content.context[1].text = koboldAISave.authorsnote ?? ''
        container.content.story.append(DataOrigin.prompt, koboldAISave.prompt ?? '')
        if (Array.isArray(koboldAISave.actions)) {
            for (const action of koboldAISave.actions) {
                const text: string = action
                container.content.story.append(DataOrigin.ai, text)
            }
        }
        if (Array.isArray(koboldAISave.worldinfo)) {
            for (const worldinfo of koboldAISave.worldinfo) {
                const keys = worldinfo.key?.split(',') ?? []
                const text = worldinfo.content
                const entry = new LoreEntry(getDefaultLoreConfig())
                entry.keys = keys
                entry.displayName = keys[0] ?? 'New Lorebook Entry'
                entry.text = text
                container.content.lorebook.entries.push(entry)
            }
        }
    } catch (error) {
        logError(error)
        throw error
    }
    return container
}

export function holoStoryToStory(holoStory: any, name: string): StoryContainer {
    const container = new StoryContainer()
    container.content.story = new Story()
    try {
        if (holoStory.version > 11) {
            throw 'Unsupported file version'
        }
        container.metadata.title = name

        if (holoStory.version >= 8) {
            const content = document.createElement('html')
            content.innerHTML = holoStory.content
            const elements = content.querySelectorAll('p, h1, h2')
            for (const [i, element] of elements.entries()) {
                container.content.story.append(
                    DataOrigin.unknown,
                    `${i === 0 ? '' : '\n'}${element.textContent ?? ''}`
                )
            }
        } else {
            if (Array.isArray(holoStory.content))
                for (const [i, content] of holoStory.content.entries()) {
                    if (i === 0 && content.type === 'title') {
                        if (Array.isArray(content.children))
                            container.metadata.title = content.children
                                .map((c: { type: string; text: string }) => c.text)
                                .join('')
                    } else if (content.type === 'paragraph') {
                        // eslint-disable-next-line unicorn/no-lonely-if
                        if (Array.isArray(content.children))
                            container.content.story.append(
                                DataOrigin.unknown,
                                content.children.map((c: { type: string; text: string }) => c.text).join('') +
                                    (i === holoStory.content.length - 1 ? '' : '\n')
                            )
                    }
                }
        }
        container.content.context[0].text = holoStory.memory ?? ''
        if (holoStory.version >= 4) {
            container.content.context[1].text = holoStory.authorsNote ?? ''
        }
        container.content.settings.parameters.bad_words_ids = []
        if (holoStory.version >= 11) {
            if (Array.isArray(holoStory.genMeta?.generationSettings?.badWords)) {
                const words = []
                for (const word of holoStory.genMeta.generationSettings.badWords) {
                    words.push(new TokenData(word.value, TokenDataFormat.InterpretedString))
                }
                container.content.bannedSequenceGroups = [new BannedSequenceGroup(words)]
            }
        } else {
            if (Array.isArray(holoStory.bannedWords)) {
                const words = []
                for (const word of holoStory.bannedWords) {
                    words.push(new TokenData(word, TokenDataFormat.InterpretedString))
                }
                container.content.bannedSequenceGroups = [new BannedSequenceGroup(words)]
            }
        }
        let worldInfoArr = []
        if (holoStory.version >= 9) {
            worldInfoArr = holoStory.worldInfo.items
        } else if (Array.isArray(holoStory.worldInfo)) {
            worldInfoArr = holoStory.worldInfo
        }
        for (const worldInfo of worldInfoArr) {
            let keys
            // eslint-disable-next-line unicorn/prefer-ternary
            if (holoStory.version === 2) {
                keys = worldInfo.key?.split(';') ?? []
            } else {
                keys = worldInfo.keys ?? []
            }
            const text = worldInfo.value
            const entry = new LoreEntry(getDefaultLoreConfig())
            entry.keys = keys.map((key: string) => key.trim())
            entry.displayName = worldInfo.name ? worldInfo.name : keys[0] ?? 'New Lorebook Entry'
            entry.text = text
            if (holoStory.version >= 8) {
                entry.enabled = worldInfo.enabled ?? true
            }
            if (holoStory.version >= 9) {
                entry.forceActivation = worldInfo.force ?? false
            }
            container.content.lorebook.entries.push(entry)
        }
        if (holoStory.version >= 9) {
            container.metadata.description = holoStory.description ?? ''
            container.metadata.tags = holoStory.tags ?? []
        }
    } catch (error) {
        logError(error)
        throw error
    }
    return container
}

export function isPng(buffer: ArrayBuffer) {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const readBytes = new Uint8Array(buffer.slice(0, 8))
    for (const [i, byte] of pngSignature.entries()) {
        if (readBytes[i] !== byte) {
            return false
        }
    }
    return true
}

export async function textFromPng(buffer: ArrayBuffer) {
    const readBytes = new Uint8Array(buffer)
    let index = 8
    const dec = new TextDecoder()
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const length = uint8ToNumberBigEndian(readBytes.slice(index, index + 4))
        index += 4
        const type = dec.decode(readBytes.slice(index, index + 4))
        index += 4
        if (type === 'tEXt') {
            const textBytes = readBytes.slice(index, index + length)
            const nullIndex = textBytes.indexOf(0x00)
            const keyword = textBytes.slice(0, nullIndex)
            const text = textBytes.slice(nullIndex + 1)
            if (dec.decode(keyword) === 'naidata') {
                const decoded = Buffer.from(dec.decode(text), 'base64').toString()
                return decoded
            }
        }
        if (index >= readBytes.length) {
            return
        }
        index += length
        index += 4
    }
}

export async function addTextToPng(buffer: ArrayBuffer, text: string) {
    const readBytes = new Uint8Array(buffer)
    let index = 8
    const dec = new TextDecoder()
    const enc = new TextEncoder()
    const base64data = Buffer.from(enc.encode(text)).toString('base64')
    const data = Uint8Array.from([
        ...enc.encode('tEXt'),
        ...enc.encode('naidata'),
        0x00,
        ...enc.encode(base64data),
    ])
    const dataLength = numberToUint8BigEndian(data.length - 4)
    const crc = numberToUint8BigEndian(Crc32(data, 0, data.length, 0))
    let insertIndex = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const length = uint8ToNumberBigEndian(readBytes.slice(index, index + 4))
        index += 4
        const type = dec.decode(readBytes.slice(index, index + 4))
        index += 4
        if (type === 'IHDR') {
            insertIndex = index + length + 4
        }
        if (type === 'tEXt') {
            const textBytes = readBytes.slice(index, index + length)
            const nullIndex = textBytes.indexOf(0x00)
            const keyword = textBytes.slice(0, nullIndex)
            if (dec.decode(keyword) === 'naidata') {
                return Uint8Array.from([
                    ...readBytes.slice(0, index - 8),
                    ...dataLength,
                    ...data,
                    ...crc,
                    ...readBytes.slice(index + length + 4),
                ])
            }
        }
        if (index >= readBytes.length) {
            return Uint8Array.from([
                ...readBytes.slice(0, insertIndex),
                ...dataLength,
                ...data,
                ...crc,
                ...readBytes.slice(insertIndex),
            ])
        }
        index += length
        index += 4
    }
}

function uint8ToNumberBigEndian(bytes: Uint8Array) {
    const array = bytes.slice(0, 4)
    let count = 0
    // assuming the array has at least four elements
    for (let i = array.length - 4; i <= array.length - 1; i++) {
        count = count << 8
        count += array[i]
    }
    return count
}

function numberToUint8BigEndian(data: number) {
    const bytes = new Uint8Array(4)
    const array = bytes.slice(0, 4)
    // assuming the array has at least four elements
    for (let i = array.length - 4; i <= array.length - 1; i++) {
        bytes[i] = data & 0x000000ff
        data = data >> 8
    }
    return bytes.reverse()
}

let crcTable: number[] | undefined
function Crc32(stream: Uint8Array, offset: number, length: number, crc: number) {
    let c
    if (crcTable === undefined) {
        crcTable = Array.from({ length: 256 })
        for (let n = 0; n <= 255; n++) {
            c = n
            for (let k = 0; k <= 7; k++) {
                c = (c & 1) == 1 ? 0xedb88320 ^ ((c >> 1) & 0x7fffffff) : (c >> 1) & 0x7fffffff
            }
            crcTable[n] = c
        }
    }
    c = crc ^ 0xffffffff
    const endOffset = offset + length
    for (let i = offset; i < endOffset; i++) {
        c = crcTable[(c ^ Number(stream[i])) & 255] ^ ((c >> 8) & 0xffffff)
    }
    return c ^ 0xffffffff
}
