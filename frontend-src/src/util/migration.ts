import {
    getDefaultAuthorsNoteConfig,
    getDefaultLoreConfig,
    getDefaultMemoryConfig,
    getDefaultStoryConfig,
} from '../data/ai/contextfield'
import { LoreEntry } from '../data/ai/loreentry'
import { TextGenerationModel } from '../data/request/model'
import { BannedSequenceGroup } from '../data/story/bannedsequences'
import { EndOfSamplingSequence } from '../data/story/eossequences'
import { LogitBiasGroup, TokenData, TokenDataFormat } from '../data/story/logitbias'
import { Lorebook, LorebookCategory } from '../data/story/lorebook'
import { Scenario, ScenarioGroup } from '../data/story/scenario'
import { DataOrigin } from '../data/story/story'
import { StoryContainer, StoryContent, StoryMetadata } from '../data/story/storycontainer'
import { LogitWarper, StoryPreset, StorySettings, TextGenerationSettings } from '../data/story/storysettings'
import { EncoderType } from '../tokenizer/encoder'
import { getGlobalEncoder } from '../tokenizer/interface'
import { getSequenceVariants } from './getSequenceVariants'
import { tokenArrToString } from './tokens'

export function migrateStoryContainer(container: StoryContainer): void {
    migrateStoryContent(container.content)
}

export function migrateStoryContent(content: StoryContent): void {
    if (content.storyContentVersion === 1) {
        content.story?.reconstructStory()
        content.storyContentVersion = 2
    }

    if (content.didGenerate === undefined && (content.story?.fragments.length ?? 0) > 2) {
        content.didGenerate = true
    }

    if (content.storyContentVersion < 4) {
        content.storyContentVersion = 4
        for (const datablock of content.story?.datablocks ?? []) {
            if (datablock.endIndex < datablock.startIndex) {
                datablock.endIndex = datablock.startIndex
            }

            // Fix stories affected by a bug where flattened datablocks had the wrong start+end index
            if (datablock.origin === DataOrigin.flattened) {
                datablock.startIndex = 0
                datablock.endIndex = 0
            }
        }
    }

    if (content.storyContentVersion < 5) {
        const params = content.settings.parameters
        // Migrate Phrase Bias
        const phraseBias = params?.logit_bias_groups
            ? JSON.parse(JSON.stringify(params?.logit_bias_groups))
            : undefined
        migrateLogitBiasGroups(phraseBias ?? [], 0)
        content.phraseBiasGroups = phraseBias

        // Migrate EoS Token
        if (params.eos_token_id) {
            content.eosSequences = []
            content.eosSequences.push(
                new EndOfSamplingSequence(
                    new TokenData(params.eos_token_id.toString(), TokenDataFormat.GPT2Tokens)
                )
            )
        }

        // Migrate Banned Tokens
        content.bannedSequenceGroups = [badWordArrayToBannedSequences(params.bad_words_ids ?? [])]

        // Update version number
        content.storyContentVersion = 5
    }

    // TODO: handle document migration

    if (content.scenarioPreset) migratePreset(content.scenarioPreset)
    migrateStorySettings(content.settings)
    migrateLorebook(content.lorebook)
}

export function migrateStorySettings(settings: StorySettings): void {
    migrateTextGenerationSettings(settings.parameters)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function migrateStoryMetadata(metadata: StoryMetadata): void {
    //
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function migrateLorebook(lorebook: Lorebook): void {
    if (lorebook.lorebookVersion < 3) {
        lorebook.lorebookVersion = 3
    }

    if (lorebook.lorebookVersion < 4) {
        for (const entry of lorebook.entries) {
            migrateLorebookEntry(entry, lorebook.lorebookVersion)
        }
        for (const category of lorebook.categories) {
            migrateLorebookCategory(category, lorebook.lorebookVersion)
        }
        lorebook.lorebookVersion = 4
    }
}

export function migrateLorebookEntry(entry: LoreEntry, version: number): void {
    if (version < 4) {
        migrateLogitBiasGroups(entry.loreBiasGroups, 0)
    }
}

export function migrateLorebookCategory(category: LorebookCategory, version: number): void {
    if (version < 4) {
        migrateLogitBiasGroups(category.categoryBiasGroups, 0)
    }
}

export function migratePreset(preset: StoryPreset): void {
    if (preset.presetVersion < 2) {
        let hasDefaultContextSettings = true
        hasDefaultContextSettings =
            hasDefaultContextSettings &&
            JSON.stringify(preset.contextPresets?.contextDefaults[0]) ===
                JSON.stringify(getDefaultMemoryConfig())
        hasDefaultContextSettings =
            hasDefaultContextSettings &&
            JSON.stringify(preset.contextPresets?.contextDefaults[1]) ===
                JSON.stringify(getDefaultAuthorsNoteConfig())
        hasDefaultContextSettings =
            hasDefaultContextSettings &&
            JSON.stringify(preset.contextPresets?.storyDefault) === JSON.stringify(getDefaultStoryConfig())
        hasDefaultContextSettings =
            hasDefaultContextSettings &&
            JSON.stringify(preset.contextPresets?.loreDefaults[0].contextConfig) ===
                JSON.stringify(getDefaultLoreConfig())
        hasDefaultContextSettings =
            hasDefaultContextSettings && preset.contextPresets?.loreDefaults[0].forceActivation === false
        hasDefaultContextSettings =
            hasDefaultContextSettings && preset.contextPresets?.loreDefaults[0].searchRange === 1000
        hasDefaultContextSettings =
            hasDefaultContextSettings && preset.contextPresets?.loreDefaults[0].keyRelative === false
        hasDefaultContextSettings =
            hasDefaultContextSettings && preset.contextPresets?.loreDefaults[0].nonStoryActivatable === false
        if (hasDefaultContextSettings) {
            preset.contextPresets = undefined
        }
        preset.presetVersion === 2
    }

    if (preset.presetVersion < 3) {
        preset.model = TextGenerationModel.j6bv4
    }

    preset.parameters.logit_bias_groups = undefined
    preset.parameters.eos_token_id = undefined
    preset.parameters.bad_words_ids = undefined

    migrateTextGenerationSettings(preset.parameters)
}

export function migrateScenario(scenario: Scenario): void {
    if (scenario.context[0].contextConfig === undefined) {
        scenario.context[0].contextConfig = getDefaultMemoryConfig()
    }
    if (scenario.context[1].contextConfig === undefined) {
        scenario.context[1].contextConfig = getDefaultAuthorsNoteConfig()
    }

    if (scenario.scenarioVersion < 2) {
        const params = scenario.settings.parameters
        // Migrate Phrase Bias
        const phraseBias = params?.logit_bias_groups
            ? JSON.parse(JSON.stringify(params.logit_bias_groups))
            : undefined
        migrateLogitBiasGroups(phraseBias ?? [], 0)
        scenario.phraseBiasGroups = phraseBias

        // Migrate EoS Token
        if (params.eos_token_id) {
            scenario.eosSequences = []
            scenario.eosSequences.push(
                new EndOfSamplingSequence(
                    new TokenData(params.eos_token_id.toString(), TokenDataFormat.GPT2Tokens)
                )
            )
        }

        // Migrate Banned Tokens
        scenario.bannedSequenceGroups = [badWordArrayToBannedSequences(params.bad_words_ids ?? [])]

        // Update version number
        scenario.scenarioVersion = 2
    }

    migrateStorySettings(scenario.settings)
    migrateLorebook(scenario.lorebook)
}

export function migrateScenarioGroup(scenarioGroup: ScenarioGroup): void {
    for (const scenario of scenarioGroup.scenarios) {
        migrateScenario(scenario)
    }
}

export function migrateTextGenerationSettings(settings: TextGenerationSettings): void {
    if (!settings.textGenerationSettingsVersion) {
        settings.textGenerationSettingsVersion = 1
    }
    if (settings.textGenerationSettingsVersion <= 1) {
        for (const o of settings.order) {
            if (settings.top_k === 0 && o.id === LogitWarper.TopK) {
                o.enabled = false
            }
            if (settings.top_p === 1 && o.id === LogitWarper.TopP) {
                o.enabled = false
            }
            if (settings.tail_free_sampling === 1 && o.id === LogitWarper.TFS) {
                o.enabled = false
            }
        }
        settings.textGenerationSettingsVersion = 2
    }
    if (settings.textGenerationSettingsVersion <= 2) {
        if (settings.order.length === 4) {
            settings.order.push(
                {
                    id: LogitWarper.TopA,
                    enabled: false,
                },
                {
                    id: LogitWarper.TypicalP,
                    enabled: false,
                }
            )
        }
        settings.textGenerationSettingsVersion = 3
    }
}

export function migrateLogitBiasGroups(groups: LogitBiasGroup[], version: number): void {
    if (version < 1) {
        for (const bias of groups ?? []) {
            // Migrate renamed variables
            bias.ensureSequenceFinish = bias.ensure_sequence_finish ?? false
            bias.generateOnce = bias.generate_once ?? true

            // Migrate to new TokenData formats
            for (const phrase of bias.phrases) {
                if (
                    phrase.type === TokenDataFormat.InterpretedString ||
                    phrase.type === TokenDataFormat.RawString
                ) {
                    phrase.sequence = getGlobalEncoder(EncoderType.GPT2).decode(phrase.sequences?.[0] ?? [])
                    if (phrase.type === TokenDataFormat.InterpretedString)
                        phrase.sequence = phrase.sequence.trimStart()
                } else if (phrase.type === TokenDataFormat.GPT2Tokens) {
                    phrase.sequence = tokenArrToString(phrase.sequences?.[0] ?? [])
                }
                phrase.sequences = undefined
            }
        }
    }
    //
}

//each filter entry has a display name and ID.
//This allows for special chars to be registered.
export class FilterEntry {
    filter: string[] = []
    filterIDs: number[] = []
    displayMode: number[] = [] //0 is normal, 1 is ID, 2 is word (with variants)
    constructor(filter: string[], filterIDs: number[], displayMode: number[]) {
        this.filter = filter
        this.filterIDs = filterIDs
        this.displayMode = displayMode
    }
}

export function badWordArrayToBannedSequences(badWords: number[][]): BannedSequenceGroup {
    //------------------------
    // Logic in this section taken from now defunct refreshBadWords function
    const workArray = [...badWords]
    const filter_entries: FilterEntry[] = []
    const variant_entries: FilterEntry[] = []

    while (workArray.length > 0) {
        const idEntry = workArray[0]
        const tokenStrings: string[] = []
        const tokenIDs: number[] = []
        const displayMode: number[] = []

        //check if variants exist
        const entryText = getGlobalEncoder(EncoderType.GPT2).decode(idEntry)
        const root = entryText.trim().toLowerCase()

        if (root.length > 0) {
            //check if subsequent elements are variants
            const variants = getSequenceVariants(root)
            if (
                workArray.length >= variants.length &&
                variants.every(
                    (variant, i) =>
                        workArray[i].length === variant.length &&
                        variant.every((elem, j) => elem === workArray[i][j])
                )
            ) {
                //remove all other variants
                workArray.splice(0, variants.length)
                //add entry manually
                const variantText = getGlobalEncoder(EncoderType.GPT2).decode(variants[0])
                variant_entries.push(new FilterEntry([variantText], variants[0], [2]))
                continue
            }
        }

        //find token ids and strings
        for (const [i, tokenID] of idEntry.entries()) {
            let tokenText = getGlobalEncoder(EncoderType.GPT2).decode([tokenID])
            const newTokenID = getGlobalEncoder(EncoderType.GPT2).encode(tokenText)

            //mismatch if cannot be displayed
            if (newTokenID[0] !== tokenID) {
                tokenText = tokenID.toString()
                displayMode[i] = 1
            } else {
                displayMode[i] = 0
            }
            tokenStrings.push(tokenText)
            tokenIDs.push(tokenID)
        }

        workArray.splice(0, 1)
        filter_entries.push(new FilterEntry(tokenStrings, tokenIDs, displayMode))
    }
    const entries = [...variant_entries, ...filter_entries]
    //-------------------

    const group: BannedSequenceGroup = new BannedSequenceGroup()
    for (const entry of entries) {
        let type = TokenDataFormat.InterpretedString
        for (const t of entry.displayMode) {
            if (t === 1) {
                type = TokenDataFormat.GPT2Tokens
                break
            } else if (t === 0) {
                type = TokenDataFormat.RawString
            }
        }
        switch (type) {
            case TokenDataFormat.GPT2Tokens:
                group.sequences.push(new TokenData(tokenArrToString(entry.filterIDs), type))
                break
            case TokenDataFormat.RawString:
            case TokenDataFormat.InterpretedString:
                group.sequences.push(new TokenData(entry.filter.join('').replace(/\\n/g, '\n'), type))
                break
            default:
                break
        }
    }
    return group
}

/*
--Version History--
StoryContent
    1: Initial version
    2: Changed fragment storage structure
    3: Skipped
    4: Fix usage of start and end index

Lorebook
    1: Initial version
    2: Add additional settings
    3: Add categories, entries now have unique ids
    4: Overhaul of phrase bias structure

StoryPreset
    1: Initial version
    2: Removed context settings from presets.
       Retained them for presets where they were different from default as a legacy feature.

TextGenerationSettings
    undefined: Initial version
    1: Overhaul of phrase bias, banned token, and eos structure
    2: Added order
    3: Added top_a and typical_p (both included in order)

Scenario
    1: Initial version

StoryMetadata
    1: Initial version

StoryConainer
    1: Initial version


*/
