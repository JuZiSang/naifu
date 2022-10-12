import { createModelSchema, date, list, object, primitive, serialize, optional, custom } from 'serializr'
import { v4 as uuid } from 'uuid'
import { Packr, Unpackr } from 'msgpackr'
import {
    getDefaultAuthorsNoteConfig,
    ContextEntry,
    ContextFieldConfig,
    getDefaultMemoryConfig,
    getDefaultStoryConfig,
    getDefaultEphemeralConfig,
    getDefaultLoreConfig,
} from '../ai/contextfield'
import { EphemeralEntry } from '../ai/ephemeralcontext'
import { LoreEntry } from '../ai/loreentry'
import { StoryStateValue } from '../../globals/state'
import { migrateStoryContainer, migrateStoryContent, migrateStoryMetadata } from '../../util/migration'
import { deserialize } from '../../util/serialization'
import { Document } from '../document/document'
import { logDebug, logError } from '../../util/browser'
import { StoryPreset, StorySettings } from './storysettings'
import { Story } from './story'
import { Lorebook } from './lorebook'
import { LogitBiasGroup } from './logitbias'
import { BannedSequenceGroup } from './bannedsequences'
import { EndOfSamplingSequence } from './eossequences'

export type StoryId = string

export class ContextDefaults {
    ephemeralDefaults: EphemeralEntry[]
    loreDefaults: LoreEntry[]
    constructor() {
        this.ephemeralDefaults = [new EphemeralEntry(getDefaultEphemeralConfig())]
        this.loreDefaults = [new LoreEntry(getDefaultLoreConfig())]
    }
    serialize(pretty: boolean = false): string {
        return JSON.stringify(serialize(ContextDefaults, this), undefined, pretty ? '  ' : undefined)
    }
    static deserialize(contextDefaults: string): ContextDefaults {
        return deserialize(ContextDefaults, JSON.parse(contextDefaults))
    }
}

createModelSchema(ContextDefaults, {
    ephemeralDefaults: list(object(EphemeralEntry)),
    loreDefaults: list(object(LoreEntry)),
})

export class StoryContent {
    storyContentVersion: number = 5
    settings: StorySettings = new StorySettings()
    story?: Story = undefined
    document?: Document = undefined
    context: ContextEntry[] = []
    lorebook: Lorebook = new Lorebook()
    storyContextConfig: ContextFieldConfig = getDefaultStoryConfig()
    ephemeralContext: EphemeralEntry[] = []
    contextDefaults: ContextDefaults = new ContextDefaults()
    scenarioPreset?: StoryPreset
    settingsDirty: boolean = false
    didGenerate?: boolean
    changeIndex: number = 1
    phraseBiasGroups?: LogitBiasGroup[] = [new LogitBiasGroup()]
    bannedSequenceGroups?: BannedSequenceGroup[] = [new BannedSequenceGroup()]
    eosSequences?: EndOfSamplingSequence[]

    constructor() {
        this.context.push(
            new ContextEntry(getDefaultMemoryConfig()),
            new ContextEntry(getDefaultAuthorsNoteConfig())
        )
    }

    getStoryText(): string {
        if (this.document) return this.document.getText()
        if (this.story) return this.story.getText()
        return ''
    }
    getStoryStep(): number {
        if (this.document) return this.document.getStep()
        if (this.story) return this.story.step
        return 0
    }

    serialize(pretty: boolean = false): string {
        logDebug('serializing StoryContent', this)
        return JSON.stringify(serialize(StoryContent, this), undefined, pretty ? '  ' : undefined)
    }
    static deserialize(story: string): StoryContent {
        logDebug('deserializing StoryContent', story)
        const parsedJson = JSON.parse(story)
        const deserialized = deserialize(StoryContent, parsedJson)
        // Correct version for text generation settings that previously lacked a version number
        deserialized.settings.parameters.textGenerationSettingsVersion =
            parsedJson.settings?.parameters?.textGenerationSettingsVersion

        migrateStoryContent(deserialized)

        return deserialized
    }
}

const serializeDocument = (document?: Document) => {
    if (!document) return
    const packr = new Packr({
        bundleStrings: true,
        moreTypes: true,
        structuredClone: false,
    })
    return packr.pack(document).toString('base64')
}
const deserializeDocument = (json?: string) => {
    if (!json) return
    const unpackr = new Unpackr({
        bundleStrings: true,
        moreTypes: true,
        structuredClone: false,
    })
    try {
        return unpackr.unpack(Buffer.from(json, 'base64'))
    } catch (error) {
        logError(error, true, 'failed deserializing document')
        throw error
    }
}
createModelSchema(StoryContent, {
    storyContentVersion: primitive(),
    settings: object(StorySettings),
    story: optional(object(Story)),
    document: optional(custom(serializeDocument, deserializeDocument)),
    context: list(object(ContextEntry)),
    lorebook: object(Lorebook),
    storyContextConfig: object(ContextFieldConfig),
    ephemeralContext: list(object(EphemeralEntry)),
    contextDefaults: object(ContextDefaults),
    scenarioPreset: optional(object(StoryPreset)),
    settingsDirty: primitive(),
    didGenerate: optional(primitive()),
    phraseBiasGroups: optional(list(object(LogitBiasGroup))),
    bannedSequenceGroups: optional(list(object(BannedSequenceGroup))),
    eosSequences: optional(list(object(EndOfSamplingSequence))),
})

export class StoryChildContent {
    type: 'shelf' | 'story' = 'story'
    id: StoryId = ''
}
createModelSchema(StoryChildContent, {
    type: primitive(),
    id: primitive(),
})

export class StoryMetadata {
    storyMetadataVersion: number = 1
    id: StoryId = uuid()
    remoteId?: StoryId
    remoteStoryId?: StoryId
    remote: boolean = false
    title: string = 'New Story'
    description: string = ''
    textPreview: string = ''
    favorite: boolean = false
    tags: string[] = []
    createdAt: Date = new Date()
    lastUpdatedAt: Date = new Date()
    lastSavedAt: Date = new Date(0)
    isModified: boolean = false
    changeIndex: number = 1
    eventId?: string
    hasDocument?: boolean

    children?: Array<StoryChildContent>

    save(modified: boolean = true): StoryStateValue {
        this.isModified = modified || this.isModified
        this.lastUpdatedAt = new Date()
        return new StoryStateValue(this.id, 1)
    }

    serialize(pretty: boolean = false): string {
        return JSON.stringify(serialize(StoryMetadata, this), undefined, pretty ? '  ' : undefined)
    }
    static deserialize(story: string): StoryMetadata {
        const deserialized = deserialize(StoryMetadata, JSON.parse(story))
        migrateStoryMetadata(deserialized)
        return deserialized
    }
}

createModelSchema(StoryMetadata, {
    storyMetadataVersion: primitive(),
    id: primitive(),
    remoteId: primitive(),
    remoteStoryId: primitive(),
    title: primitive(),
    description: primitive(),
    textPreview: primitive(),
    favorite: primitive(),
    tags: list(primitive()),
    createdAt: date(),
    lastUpdatedAt: date(),
    isModified: primitive(),
    eventId: optional(primitive()),
    hasDocument: optional(primitive()),
    children: optional(list(object(StoryChildContent))),
})

export class StoryContainer {
    storyContainerVersion: number = 1
    metadata: StoryMetadata = new StoryMetadata()
    content: StoryContent = new StoryContent()

    serialize(pretty: boolean = false): string {
        return JSON.stringify(serialize(StoryContainer, this), undefined, pretty ? '  ' : undefined)
    }
    static deserialize(story: string): StoryContainer {
        const parsedJson = JSON.parse(story)
        const deserialized = deserialize(StoryContainer, JSON.parse(story))

        // Correct version for text generation settings that previously lacked a version number
        deserialized.content.settings.parameters.textGenerationSettingsVersion =
            parsedJson.content?.settings?.parameters?.textGenerationSettingsVersion

        migrateStoryContainer(deserialized)
        return deserialized
    }

    static bundle(metadata?: StoryMetadata, content?: StoryContent): StoryContainer {
        const container = new StoryContainer()
        container.metadata = metadata ?? container.metadata
        container.content = content ?? container.content
        return container
    }
}

createModelSchema(StoryContainer, {
    storyContainerVersion: primitive(),
    metadata: object(StoryMetadata),
    content: object(StoryContent),
})
