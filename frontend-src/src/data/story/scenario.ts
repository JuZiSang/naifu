import { createModelSchema, list, object, primitive, serialize, optional } from 'serializr'
import { copyStoryToPreset } from '../../util/presets'
import { ContextEntry, ContextFieldConfig, getDefaultStoryConfig } from '../ai/contextfield'
import { EphemeralEntry } from '../ai/ephemeralcontext'
import { isRegexKey } from '../ai/loreentry'
import { GlobalUserContext } from '../../globals/globals'
import { logError } from '../../util/browser'
import { migrateScenario, migrateScenarioGroup } from '../../util/migration'
import { deserialize } from '../../util/serialization'
import { DefaultModel } from '../../data/request/model'
import { Document } from '../document/document'
import { DataOrigin as DocumentDataOrigin } from '../../components/editor/glue'
import { Lorebook } from './lorebook'
import { DataOrigin, Story } from './story'
import { ContextDefaults, StoryContainer } from './storycontainer'
import { AIModule, StoryPreset, StorySettings } from './storysettings'
import { LogitBiasGroup } from './logitbias'
import { BannedSequenceGroup } from './bannedsequences'
import { EndOfSamplingSequence } from './eossequences'

export class Scenario {
    scenarioVersion: number = 2
    title: string = ''
    description: string = ''
    prompt: string = ''
    tags: string[] = []
    placeholders: Placeholder[] = []
    context: ContextEntry[] = []
    ephemeralContext: EphemeralEntry[] = []
    settings: StorySettings = new StorySettings()
    lorebook: Lorebook = new Lorebook()
    author: string = ''
    storyContextConfig: ContextFieldConfig = getDefaultStoryConfig()
    contextDefaults: ContextDefaults = new ContextDefaults()
    phraseBiasGroups?: LogitBiasGroup[] = [new LogitBiasGroup()]
    bannedSequenceGroups?: BannedSequenceGroup[] = [new BannedSequenceGroup()]
    eosSequences?: EndOfSamplingSequence[]

    serialize(pretty: boolean = false): string {
        return JSON.stringify(serialize(Scenario, this), undefined, pretty ? '  ' : undefined)
    }

    static deserialize(story: string): Scenario {
        const parsedJson = JSON.parse(story)
        const deserialized = deserialize(Scenario, JSON.parse(story))

        let setDefaultModel = false
        if (!parsedJson.settings) setDefaultModel = true

        // Correct version for text generation settings that previously lacked a version number
        deserialized.settings.parameters.textGenerationSettingsVersion =
            parsedJson.settings?.parameters?.textGenerationSettingsVersion

        if (setDefaultModel) deserialized.settings.model = DefaultModel

        migrateScenario(deserialized)
        return deserialized
    }
}

export class Placeholder {
    key: string = ''
    description?: string
    defaultValue?: string
    order?: number
    longDescription?: string
}

createModelSchema(Scenario, {
    scenarioVersion: primitive(),
    title: primitive(),
    description: primitive(),
    prompt: primitive(),
    tags: list(primitive()),
    context: list(object(ContextEntry)),
    ephemeralContext: list(object(EphemeralEntry)),
    placeholders: list(object(Placeholder)),
    settings: object(StorySettings),
    lorebook: object(Lorebook),
    author: primitive(),
    storyContextConfig: object(ContextFieldConfig),
    contextDefaults: object(ContextDefaults),
    phraseBiasGroups: optional(list(object(LogitBiasGroup))),
    bannedSequenceGroups: optional(list(object(BannedSequenceGroup))),
    eosSequences: optional(list(object(EndOfSamplingSequence))),
})

createModelSchema(Placeholder, {
    key: primitive(),
    description: primitive(),
    defaultValue: primitive(),
    order: primitive(),
    longDescription: primitive(),
})

export class ScenarioGroup {
    name: string = ''
    scenarios: Scenario[] = []
    names: string[] = []
    id?: string

    static deserialize(parsedJson: any): ScenarioGroup {
        const deserialized = deserialize(ScenarioGroup, parsedJson)

        for (const [i, scenario] of deserialized.scenarios.entries()) {
            // Correct version for text generation settings that previously lacked a version number
            scenario.settings.parameters.textGenerationSettingsVersion =
                parsedJson.scenarios[i].settings?.parameters?.textGenerationSettingsVersion
        }

        migrateScenarioGroup(deserialized)
        return deserialized
    }
}

createModelSchema(ScenarioGroup, {
    name: primitive(),
    scenarios: list(object(Scenario)),
    names: list(primitive()),
    id: optional(primitive()),
})

// Converts a story to a scenario. The current text is used as the prompt
// Title, description, tags, settings, and context are copied.
// The story text is scanned for placeholders, which are extracted and recorded
export function storyToScenario(storyContainer: StoryContainer, aiModule?: AIModule): Scenario {
    const placeholders: Placeholder[] = []

    const promptText = storyContainer.content.getStoryText()
    const scenario = new Scenario()
    scenario.title = storyContainer.metadata.title
    scenario.description = storyContainer.metadata.description
    scenario.prompt = promptText
    scenario.tags = [...storyContainer.metadata.tags]
    scenario.placeholders = placeholders
    scenario.settings = JSON.parse(JSON.stringify(storyContainer.content.settings))
    scenario.context = JSON.parse(JSON.stringify(storyContainer.content.context))
    scenario.ephemeralContext = JSON.parse(JSON.stringify(storyContainer.content.ephemeralContext))
    scenario.storyContextConfig = JSON.parse(JSON.stringify(storyContainer.content.storyContextConfig))
    scenario.contextDefaults = ContextDefaults.deserialize(storyContainer.content.contextDefaults.serialize())
    scenario.lorebook = Lorebook.nonMigrateDeserialize(storyContainer.content.lorebook.serialize())
    if (storyContainer.content.phraseBiasGroups) {
        scenario.phraseBiasGroups = JSON.parse(JSON.stringify(storyContainer.content.phraseBiasGroups))
    }
    if (storyContainer.content.bannedSequenceGroups) {
        scenario.bannedSequenceGroups = JSON.parse(
            JSON.stringify(storyContainer.content.bannedSequenceGroups)
        )
    }
    if (storyContainer.content.eosSequences) {
        scenario.eosSequences = JSON.parse(JSON.stringify(storyContainer.content.eosSequences))
    }
    scenario.settings.aiModule = aiModule

    extractScenarioPlaceholders(scenario)

    return scenario
}

// Given the current `selectedStort`, convert and return it as a `Scenario`.
export function storyAsScenario(selectedStory: string, customModules: AIModule[]): Scenario | undefined {
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory)

    if (!currentStoryContent || !currentStoryMetadata) {
        return
    }
    const container = StoryContainer.bundle(currentStoryMetadata, currentStoryContent)
    let aiModule: AIModule | undefined
    if (currentStoryContent.settings.prefix && currentStoryContent.settings.prefix.includes(':')) {
        aiModule = customModules.find((e: AIModule) => e.id === currentStoryContent.settings.prefix)
        // WB: This has been commented out as I'm not sure why we're trying to set a read-only value
        //     here.
        // if (aiModule) aiModule.remoteId = ''
    }

    if (!aiModule && currentStoryContent.settings.prefix === currentStoryContent.settings?.aiModule?.id) {
        aiModule = currentStoryContent.settings.aiModule
    }
    return storyToScenario(container, aiModule)
}

export interface ReplacementSet {
    key: string
    replacement: string
    description?: string | undefined
    longDescription?: string | undefined
}

export function extractScenarioPlaceholders(scenario: Scenario): void {
    scenario.placeholders = []
    scenario.prompt = extractPlaceholderHeader(scenario.prompt, scenario.placeholders)
    scenario.prompt = extractPlaceholders(scenario.prompt, scenario.placeholders)

    for (const contextEntry of scenario.context) {
        contextEntry.text = extractPlaceholders(contextEntry.text, scenario.placeholders)
    }

    for (const ephemeralEntry of scenario.ephemeralContext) {
        ephemeralEntry.text = extractPlaceholders(ephemeralEntry.text, scenario.placeholders)
    }

    for (const loreEntry of scenario.lorebook.entries) {
        loreEntry.text = extractPlaceholders(loreEntry.text, scenario.placeholders)
        loreEntry.displayName = extractPlaceholders(loreEntry.displayName, scenario.placeholders)
        for (let index = 0; index < loreEntry.keys.length; index++) {
            const key = loreEntry.keys[index]
            if (!key) continue

            const result = isRegexKey(loreEntry.keys[index])
            if (!result.isRegex) {
                loreEntry.keys[index] = extractPlaceholders(key, scenario.placeholders)
            } else if (result.isRegex && result.placeholders) {
                loreEntry.keys[index] = extractPlaceholders(key, scenario.placeholders)
            }
        }
    }
}

// Turns a scenario into a story. If not provided with a list of subsitutes default values
// are used. If no default is present the key is replaced with itself.
export function scenarioToStory(
    scenario: Scenario,
    replacements?: ReplacementSet[],
    useEditorV2?: boolean,
    settings?: StorySettings
): StoryContainer {
    const story = new StoryContainer()
    let substitutes = replacements
    if (!substitutes) {
        substitutes = scenario.placeholders.map((p) => {
            return { key: p.key, replacement: p.defaultValue ?? '${' + p.key + '}' }
        })
    }
    try {
        story.metadata.description = scenario.description
        story.metadata.title = scenario.title
        story.metadata.tags = [...scenario.tags]
        story.content.settings = settings ? settings : JSON.parse(JSON.stringify(scenario.settings))
        story.content.context = JSON.parse(JSON.stringify(scenario.context))
        story.content.ephemeralContext = JSON.parse(JSON.stringify(scenario.ephemeralContext))
        story.content.lorebook = Lorebook.nonMigrateDeserialize(scenario.lorebook.serialize())
        story.content.contextDefaults = ContextDefaults.deserialize(scenario.contextDefaults.serialize())
        story.content.storyContextConfig = JSON.parse(JSON.stringify(scenario.storyContextConfig))
        if (scenario.phraseBiasGroups) {
            story.content.phraseBiasGroups = JSON.parse(JSON.stringify(scenario.phraseBiasGroups))
        }
        if (scenario.bannedSequenceGroups) {
            story.content.bannedSequenceGroups = JSON.parse(JSON.stringify(scenario.bannedSequenceGroups))
        }
        if (scenario.eosSequences) {
            story.content.eosSequences = JSON.parse(JSON.stringify(scenario.eosSequences))
        }

        const promptText = replacePlaceholders(scenario.prompt, substitutes)
        if (useEditorV2) {
            story.content.document = new Document()
            story.content.document.appendText(promptText, new Map([[1, [DocumentDataOrigin.prompt]]]))
            story.metadata.hasDocument = true
        } else {
            story.content.story = new Story()
            story.content.story.append(DataOrigin.prompt, promptText)
        }

        const preset = new StoryPreset('Scenario Default', story.content.settings.model, 'scenario-default')
        preset.description = scenario.author ? `${scenario.author}'s choice.` : "Scenario Author's choice."
        copyStoryToPreset(story.content, preset)
        story.content.scenarioPreset = preset
        story.content.settings.preset = preset.id

        for (const contextEntry of story.content.context) {
            contextEntry.text = replacePlaceholders(contextEntry.text, substitutes)
        }

        for (const ephemeralEntry of story.content.ephemeralContext) {
            ephemeralEntry.text = replacePlaceholders(ephemeralEntry.text, substitutes)
        }

        for (const loreEntry of story.content.lorebook.entries) {
            loreEntry.text = replacePlaceholders(loreEntry.text, substitutes)
            loreEntry.displayName = replacePlaceholders(loreEntry.displayName, substitutes)
            for (let index = 0; index < loreEntry.keys.length; index++) {
                const result = isRegexKey(loreEntry.keys[index])
                if (!result.isRegex) {
                    loreEntry.keys[index] = replacePlaceholders(loreEntry.keys[index], substitutes)
                } else if (result.isRegex && result.placeholders) {
                    loreEntry.keys[index] = replacePlaceholders(loreEntry.keys[index], substitutes).slice(1)
                }
            }
        }
    } catch (error) {
        logError(error)
    }

    return story
}

export function scenarioToStoryPreservePlaceholders(
    scenario: Scenario,
    placeholders: Placeholder[],
    useEditorV2?: boolean,
    settings?: StorySettings
): StoryContainer {
    const story = new StoryContainer()
    let substitutes = placeholders
    if (!substitutes) {
        substitutes = scenario.placeholders.map((p) => {
            return { key: p.key, replacement: p.defaultValue ?? '${' + p.key + '}' }
        })
    }
    try {
        story.metadata.description = scenario.description
        story.metadata.title = scenario.title
        story.metadata.tags = [...scenario.tags]
        story.content.settings = settings ? settings : JSON.parse(JSON.stringify(scenario.settings))
        story.content.context = JSON.parse(JSON.stringify(scenario.context))
        story.content.ephemeralContext = JSON.parse(JSON.stringify(scenario.ephemeralContext))
        story.content.lorebook = Lorebook.nonMigrateDeserialize(scenario.lorebook.serialize())
        story.content.contextDefaults = ContextDefaults.deserialize(scenario.contextDefaults.serialize())
        story.content.storyContextConfig = JSON.parse(JSON.stringify(scenario.storyContextConfig))
        if (scenario.phraseBiasGroups) {
            story.content.phraseBiasGroups = JSON.parse(JSON.stringify(scenario.phraseBiasGroups))
        }
        if (scenario.bannedSequenceGroups) {
            story.content.bannedSequenceGroups = JSON.parse(JSON.stringify(scenario.bannedSequenceGroups))
        }
        if (scenario.eosSequences) {
            story.content.eosSequences = JSON.parse(JSON.stringify(scenario.eosSequences))
        }

        let promptText = ''
        if (placeholders.length > 0) {
            promptText += '%{\n'
            for (const placeholder of placeholders.sort((a, b) => {
                const aNum = a.order ?? Number.POSITIVE_INFINITY
                const bNum = a.order ?? Number.POSITIVE_INFINITY
                if (aNum !== bNum) {
                    return aNum - bNum
                }
                return a.key.localeCompare(b.key)
            })) {
                promptText += `${placeholder.order ? `${placeholder.order}#` : ''}${placeholder.key}${
                    placeholder.defaultValue ? `[${placeholder.defaultValue}]` : ''
                }${placeholder.description ? `:${placeholder.description}` : ''}${
                    placeholder.longDescription ? `:${placeholder.longDescription}` : ''
                }\n`
            }
            promptText += '}\n'
        }
        promptText += scenario.prompt

        if (useEditorV2) {
            story.content.document = new Document()
            story.content.document.appendText(promptText, new Map([[1, [DocumentDataOrigin.prompt]]]))
            story.metadata.hasDocument = true
        } else {
            story.content.story = new Story()
            story.content.story.append(DataOrigin.prompt, promptText)
        }

        const preset = new StoryPreset('Scenario Default', story.content.settings.model, 'scenario-default')
        preset.description = scenario.author ? `${scenario.author}'s choice.` : "Scenario Author's choice."
        copyStoryToPreset(story.content, preset)
        story.content.scenarioPreset = preset
        story.content.settings.preset = preset.id
    } catch (error) {
        logError(error)
    }

    return story
}

export function replacePlaceholders(text: string, replacements: ReplacementSet[]): string {
    const extractedPlaceholders = text.matchAll(/\${([^:[\]{|}]+)}/g)
    let newText = text
    let characterDifference = 0

    for (const match of extractedPlaceholders) {
        if (match.index === undefined) continue
        const index = replacements.findIndex((p) => p.key === match[1])
        if (index >= 0) {
            newText =
                newText.slice(0, match.index - characterDifference) +
                replacements[index].replacement +
                newText.slice(match.index - characterDifference + match[0].length)
            characterDifference += match[0].length - replacements[index].replacement.length
        }
    }
    return newText
}

export function extractPlaceholders(text: string, placeholders: Placeholder[]): string {
    let newText = text
    // Matches strings in the format ${Key[DefaultValue]:Text Description}
    // Only 'Key' is required, 'DefaultValue' and 'Text Description' are optional
    const extractedPlaceholders = newText.matchAll(
        /\${(\d+#)?([^:@[\]^{|}]+)\[?([^:@[\]^{|}]+)?]?:?([^:@[\]^{|}]+)?:?([^:@[\]^{|}]+)?}/g
    )
    let characterDifference = 0

    for (const match of extractedPlaceholders) {
        const key = match[2] ?? ''
        const order = match[1]
        let nOrder: number | undefined = Number.parseInt(order)
        nOrder = Number.isNaN(nOrder) ? undefined : nOrder
        const defaultValue = match[3]
        const description = match[4]
        const longDescription = match[5]?.replace(/\\n/g, '\n')
        if ((defaultValue !== undefined || description !== undefined) && match.index !== undefined) {
            // Leave only the key in the prompt text as the default and text description are not needed
            newText =
                newText.slice(0, match.index - characterDifference) +
                `\${${key}}` +
                newText.slice(match.index - characterDifference + match[0].length)
            characterDifference += match[0].length - (key.length + 3)
        }
        const index = placeholders.findIndex((p) => p.key === key)
        if (index >= 0) {
            if (placeholders[index].description === undefined) {
                placeholders[index].description = description
            }
            if (placeholders[index].defaultValue === undefined) {
                placeholders[index].defaultValue = defaultValue
            }
            if (placeholders[index].order === undefined) {
                placeholders[index].order = nOrder
            }
            if (placeholders[index].longDescription === undefined) {
                placeholders[index].longDescription = longDescription
            }
        } else {
            placeholders.push({
                key: key,
                order: nOrder,
                description: description,
                defaultValue: defaultValue,
                longDescription: longDescription,
            })
        }
    }
    return newText
}

function extractPlaceholderHeader(text: string, placeholders: Placeholder[]) {
    let newText = text
    const headerPlaceholder = newText.match(/^%{.+?}\n?/s)
    if (headerPlaceholder !== null) {
        const keys = headerPlaceholder[0]
            .slice(2, -1)
            .split('\n')
            .filter((s) => s !== '')
            .map((s) => s.trim())

        for (const key of keys) {
            const match = key.match(
                /(\d+#)?([^:@[\]^{|}]+)\[?([^:@[\]^{|}]+)?]?:?([^:@[\]^{|}]+)?:?([^:@[\]^{|}]+)?/
            )
            if (match) {
                const key = match[2]
                const order = match[1]
                let nOrder: number | undefined = Number.parseInt(order)
                nOrder = Number.isNaN(nOrder) ? undefined : nOrder
                const defaultValue = match[3]
                const description = match[4]
                const longDescription = match[5]?.replace(/\\n/g, '\n')
                const index = placeholders.findIndex((p) => p.key === key)
                if (index >= 0) {
                    if (!placeholders[index].description) {
                        placeholders[index].description = description
                    }
                    if (!placeholders[index].defaultValue) {
                        placeholders[index].defaultValue = defaultValue
                    }
                    if (placeholders[index].order === undefined) {
                        placeholders[index].order = nOrder
                    }
                    if (!placeholders[index].longDescription) {
                        placeholders[index].longDescription = longDescription
                    }
                } else {
                    placeholders.push({
                        key: key,
                        order: nOrder,
                        description: description,
                        defaultValue: defaultValue,
                        longDescription: longDescription,
                    })
                }
            }
        }
        newText = newText.slice(headerPlaceholder[0].length)
    }
    return newText
}
