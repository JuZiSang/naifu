import { keyMatches } from '../../../data/ai/context'
import { normalizeModel, TextGenerationModel } from '../../../data/request/model'
import { AdditionalRequestData } from '../../../data/request/request'
import { BannedSequenceGroup } from '../../../data/story/bannedsequences'
import { EndOfSamplingSequence } from '../../../data/story/eossequences'
import { TokenData, TokenDataFormat } from '../../../data/story/logitbias'
import { StoryContent } from '../../../data/story/storycontainer'
import {
    NoModule,
    StoryPreset,
    StorySettings,
    TextGenerationSettings,
} from '../../../data/story/storysettings'
import { EncoderType, getModelEncoderType } from '../../../tokenizer/encoder'
import { WorkerInterface } from '../../../tokenizer/interface'
import { getRandomGeneratorExamples } from '../../../util/lorebook'
import { modelsCompatible, prefixIsDefault, prefixModel } from '../../../util/models'
import { isAdventureModeStory } from '../../../util/util'
import { loreGeneratorSeparator } from './exampleconstants'

export async function buildLoreGenContext(
    text: string,
    stub: string,
    limit: number,
    data: {
        keysInput: string
        storyContent: StoryContent
        useMemory: boolean
        useAuthorsNote: boolean
        useStory: boolean
        selectedEntryID: string
        group: string
        model: TextGenerationModel
    },

    notEarlyGeneration: boolean
): Promise<{ tokens: number[]; charactersCut: number }> {
    const encoderType = getModelEncoderType(data.model)

    const matches = keyMatches(text, data.storyContent.lorebook.entries, true, true)
    const otherMatches = keyMatches(data.keysInput, data.storyContent.lorebook.entries, true, true)
    const combinedMatches = []
    for (const match of matches.values()) {
        const otherMatch = [...otherMatches.values()].find((m) => m.entry.id === match.entry.id)
        if (!otherMatch) continue
        combinedMatches.push(match.index > otherMatch.index ? match : otherMatch)
    }

    let lorestring = combinedMatches
        .filter((m) => {
            if (m.index === Number.POSITIVE_INFINITY || m.index < 0) return false
            return m.entry.id !== data.selectedEntryID
        })
        .map((m) => {
            return m.entry.text.trim()
        })
        .join('\n***\n')
    if (lorestring.length > 0) {
        lorestring += '\n***\n'
    }
    const memoryString = data.useMemory ? data.storyContent.context[0].text.trim() + '\n' : ''
    const anString = data.useAuthorsNote ? data.storyContent.context[1].text.trim() + '\n' : ''
    const storyString = data.useStory ? data.storyContent.getStoryText().slice(-2500) + '\n' : ''
    const storyStringTrimmed = storyString.split('\n').slice(1).join('\n')

    let generatingText =
        text === '' && stub === ''
            ? `[ ${data.group.toLocaleLowerCase()}:`
            : `[ ${data.group.toLocaleLowerCase()}: ${text} ]\n`
    if (notEarlyGeneration) {
        generatingText = `[ ${text} ]\n`
    }
    let tokens: number[] = []
    let input = ''
    let linesToCut = 0
    let baseInput = `${memoryString}***\n${lorestring}${storyStringTrimmed}${anString}***\n${generatingText}`
    if (notEarlyGeneration) {
        baseInput = `${memoryString}***\n${lorestring}${storyStringTrimmed}${anString}***\n${generatingText}`
    }
    if (data.model === TextGenerationModel.krakev2) {
        baseInput = `<|endoftext|>${baseInput}`
    }

    do {
        input = baseInput.split('\n').slice(linesToCut).join('\n') + stub
        tokens = await new WorkerInterface().encode(input, encoderType)
        linesToCut++
    } while (tokens.length > limit)
    return {
        tokens,
        charactersCut: baseInput
            .split('\n')
            .slice(0, linesToCut - 1)
            .join('\n').length,
    }
}

export async function prepareLoreGenSettings(
    storyContent: StoryContent,
    notEarlyGeneration: boolean,
    model: TextGenerationModel,
    preset: StoryPreset
): Promise<{
    settings: StorySettings
    additional?: AdditionalRequestData
    paramOverride?: any
}> {
    const settings = new StorySettings()
    settings.parameters = JSON.parse(JSON.stringify(preset.parameters)) as TextGenerationSettings
    settings.banBrackets = notEarlyGeneration
    settings.parameters.max_length = 70
    settings.prefix = notEarlyGeneration ? NoModule : getModelModuleString(model)

    const additional: AdditionalRequestData = {}
    // TODO: Uncomment when eos sequences are not broken with modules
    additional.eosSequences = [
        new EndOfSamplingSequence(new TokenData('\n***', TokenDataFormat.RawString)),
        new EndOfSamplingSequence(new TokenData('\n[', TokenDataFormat.RawString)),
    ]

    additional.bannedTokens = []
    if (!notEarlyGeneration) {
        additional.bannedTokens.push(
            new BannedSequenceGroup([new TokenData('***', TokenDataFormat.RawString)])
        )
    }
    if (storyContent.bannedSequenceGroups)
        additional.bannedTokens.push(...(storyContent.bannedSequenceGroups ?? []))

    const paramOverride: any = {}
    settings.model = model

    return { settings, additional, paramOverride }
}

export async function buildLegacyLoreGenContext(
    text: string,
    stub: string,
    limit: number,
    data: {
        keysInput: string
        storyContent: StoryContent
        useMemory: boolean
        useAuthorsNote: boolean
        useStory: boolean
        selectedEntryID: string
        group: string
        model: TextGenerationModel
    },
    notEarlyGeneration: boolean
): Promise<{ tokens: number[]; charactersCut: number; generatingText: string; exampleText: string }> {
    const encoderType = getModelEncoderType(data.model)
    const matches = keyMatches(text, data.storyContent.lorebook.entries, true, true)
    const otherMatches = keyMatches(data.keysInput, data.storyContent.lorebook.entries, true, true)
    const combinedMatches = []
    for (const match of matches.values()) {
        const otherMatch = [...otherMatches.values()].find((m) => m.entry.id === match.entry.id)
        if (!otherMatch) continue
        combinedMatches.push(match.index > otherMatch.index ? match : otherMatch)
    }

    let lorestring = combinedMatches
        .filter((m) => {
            if (m.index === Number.POSITIVE_INFINITY || m.index < 0) return false
            return m.entry.id !== data.selectedEntryID
        })
        .map((m) => {
            return m.entry.text.trim()
        })
        .join('\n***\n')
    if (lorestring.length > 0) {
        lorestring += '\n***\n'
    }
    const memoryString = data.useMemory ? data.storyContent.context[0].text.trim() + '\n' : ''
    const anString = data.useAuthorsNote ? data.storyContent.context[1].text.trim() + '\n' : ''
    const storyString = data.useStory ? data.storyContent.getStoryText().slice(-2500) + '\n' : ''

    const genName =
        text.toLowerCase().startsWith('a ') || text.toLowerCase().startsWith('an ') || text.startsWith('the ')

    let exampleText = getRandomGeneratorExamples(data.group, genName) + loreGeneratorSeparator
    let generatingText = text === '' && stub === '' ? `[` : `[ ${text} ]\n`
    if (notEarlyGeneration) {
        exampleText = ''
        generatingText = text === '' ? '' : `[ ${text} ]\n`
    }

    let tokens: number[] = []
    let input = ''
    let linesToCut = 0
    const baseInput = `${memoryString}***\n${lorestring}${storyString}${anString}***\n${exampleText}${generatingText}`
    do {
        input = baseInput.split('\n').slice(linesToCut).join('\n') + stub
        tokens = await new WorkerInterface().encode(input, encoderType)
        linesToCut++
    } while (tokens.length > limit)
    return {
        tokens,
        charactersCut: baseInput
            .split('\n')
            .slice(0, linesToCut - 1)
            .join('\n').length,
        generatingText,
        exampleText,
    }
}

export async function prepareLegacyLoreGenSettings(
    storyContent: StoryContent,
    notEarlyGeneration: boolean,
    generatingText: string,
    exampleText: string,
    model: TextGenerationModel,
    preset: StoryPreset
): Promise<{
    settings: StorySettings
    additional?: AdditionalRequestData
    paramOverride?: any
}> {
    const encoderType = getModelEncoderType(model)

    const settings = new StorySettings()
    settings.parameters = JSON.parse(JSON.stringify(preset.parameters)) as TextGenerationSettings
    settings.banBrackets = notEarlyGeneration
    settings.parameters.max_length = 70
    if (
        storyContent.settings.prefix &&
        (prefixIsDefault(storyContent.settings.prefix) ||
            modelsCompatible(model, prefixModel(storyContent.settings.prefix)))
    ) {
        settings.prefix = storyContent.settings.prefix
    }
    if (isAdventureModeStory(settings)) settings.prefix = NoModule

    const additional: AdditionalRequestData = {}
    additional.eosSequences = [
        new EndOfSamplingSequence(new TokenData('\n***', TokenDataFormat.RawString)),
        new EndOfSamplingSequence(new TokenData('\n[', TokenDataFormat.RawString)),
    ]
    additional.bannedTokens = []
    if (!notEarlyGeneration) {
        additional.bannedTokens.push(
            new BannedSequenceGroup([new TokenData('***', TokenDataFormat.RawString)])
        )
    }
    if (storyContent.bannedSequenceGroups)
        additional.bannedTokens.push(...(storyContent.bannedSequenceGroups ?? []))

    const paramOverride: any = {}
    const commonTokens = getTokenizerCommonTokens(encoderType)
    const biasValues = getModelBiasStrengths(model)
    const inputTokens = await new WorkerInterface().encode(generatingText.slice(3), encoderType)
    if (!notEarlyGeneration) {
        const encoded = await new WorkerInterface().encode(exampleText, encoderType)
        paramOverride.logit_bias = encoded.map((t) => {
            if (commonTokens.has(t)) return [t, biasValues.common]
            if (inputTokens.includes(t)) return [t, biasValues.input]
            return [t, biasValues.default]
        })
    }
    settings.model = model

    return { settings, additional, paramOverride }
}

function getTokenizerCommonTokens(encoderType: EncoderType): Set<number> {
    switch (encoderType) {
        case EncoderType.GPT2:
            return new Set([13, 11, 290])
        case EncoderType.Pile:
        case EncoderType.PileNAI:
            return new Set([15, 13, 285])
        default:
            return new Set()
    }
}

function getModelBiasStrengths(model: TextGenerationModel): {
    common: number
    input: number
    default: number
} {
    switch (normalizeModel(model)) {
        case normalizeModel(TextGenerationModel.j6bv4):
            return { common: -0.6, input: -0.4, default: -0.8 }
        case normalizeModel(TextGenerationModel.euterpev2):
            return { common: -0.6, input: -0.4, default: -0.8 }
        case normalizeModel(TextGenerationModel.krakev1):
            return { common: -0.04, input: -0.02, default: -0.05 }
        default:
            return { common: 0, input: 0, default: 0 }
    }
}

const LoreGenModule = 'utility_lorebookgenerator'

function getModelModuleString(model: TextGenerationModel): string {
    switch (normalizeModel(model)) {
        case normalizeModel(TextGenerationModel.j6bv4):
            return LoreGenModule
        case normalizeModel(TextGenerationModel.euterpev2):
            return LoreGenModule
        case normalizeModel(TextGenerationModel.krakev1):
            return LoreGenModule
        case normalizeModel(TextGenerationModel.krakev2):
            return LoreGenModule
        default:
            return NoModule
    }
}
