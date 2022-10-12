import { createModelSchema, custom, list, object, optional, primitive, serialize } from 'serializr'
import { v4 as uuid } from 'uuid'
import { concatenateUint8 } from '../../util/util'
import {
    ContextEntry,
    ContextFieldConfig,
    getDefaultAuthorsNoteConfig,
    getDefaultEphemeralConfig,
    getDefaultLoreConfig,
    getDefaultMemoryConfig,
    getDefaultStoryConfig,
} from '../ai/contextfield'
import { EphemeralEntry } from '../ai/ephemeralcontext'
import { LoreEntry } from '../ai/loreentry'
import { migratePreset, migrateTextGenerationSettings } from '../../util/migration'
import { TextGenerationModel } from '../request/model'
import { deserialize } from '../../util/serialization'
import { isRN, PlatformImageData } from '../../compatibility/platformtypes'
import { LogitBiasGroup } from './logitbias'
import { StoryMode } from './story'

export function logitWarperName(lw: LogitWarper): string {
    switch (lw) {
        case LogitWarper.Temperature:
            return 'Temperature (Randomness)'
        case LogitWarper.TopK:
            return 'Top K Sampling'
        case LogitWarper.TopP:
            return 'Nucleus Sampling'
        case LogitWarper.TFS:
            return 'Tail Free Sampling'
        case LogitWarper.TopA:
            return 'Top A Sampling'
        case LogitWarper.TypicalP:
            return 'Typical Sampling'
    }
}

export function logitWarperNum(lw: LogitWarper): number {
    switch (lw) {
        case LogitWarper.Temperature:
            return 0
        case LogitWarper.TopK:
            return 1
        case LogitWarper.TopP:
            return 2
        case LogitWarper.TFS:
            return 3
        case LogitWarper.TopA:
            return 4
        case LogitWarper.TypicalP:
            return 5
    }
}

export enum LogitWarper {
    Temperature = 'temperature',
    TopK = 'top_k',
    TopP = 'top_p',
    TFS = 'tfs',
    TopA = 'top_a',
    TypicalP = 'typical_p',
}

export class OrderElement {
    id: LogitWarper
    enabled: boolean
    constructor(id: LogitWarper, enabled: boolean) {
        this.id = id
        this.enabled = enabled
    }
}

createModelSchema(OrderElement, {
    id: primitive(),
    enabled: primitive(),
})

export class TextGenerationSettings {
    textGenerationSettingsVersion?: number = 3
    temperature: number = 0.72
    max_length: number = 40
    min_length: number = 1
    top_k: number = 0
    top_p: number = 0.725
    top_a: number = 1
    typical_p: number = 1
    tail_free_sampling: number = 1
    repetition_penalty: number = 2.75
    repetition_penalty_range?: number = 2048
    repetition_penalty_slope?: number = 0.18
    eos_token_id?: number = undefined // Deprecated
    bad_words_ids?: number[][] = undefined // Deprecated
    logit_bias_groups?: LogitBiasGroup[] = undefined // Deprecated
    repetition_penalty_frequency?: number = 0
    repetition_penalty_presence?: number = 0
    order: OrderElement[] = [
        {
            id: LogitWarper.Temperature,
            enabled: true,
        },
        {
            id: LogitWarper.TopK,
            enabled: true,
        },
        {
            id: LogitWarper.TopP,
            enabled: true,
        },
        {
            id: LogitWarper.TFS,
            enabled: true,
        },
        {
            id: LogitWarper.TopA,
            enabled: false,
        },
        {
            id: LogitWarper.TypicalP,
            enabled: false,
        },
    ]
    serialize(pretty: boolean = false): string {
        return JSON.stringify(serialize(TextGenerationSettings, this), undefined, pretty ? '  ' : undefined)
    }
    static deserialize(story: string): TextGenerationSettings {
        const parsedJson = JSON.parse(story)
        const deserialized = deserialize(TextGenerationSettings, JSON.parse(story))
        // Correct version for text generation settings that previously lacked a version number
        deserialized.textGenerationSettingsVersion = parsedJson.textGenerationSettingsVersion
        migrateTextGenerationSettings(deserialized)
        return deserialized
    }
}
createModelSchema(TextGenerationSettings, {
    textGenerationSettingsVersion: optional(primitive()),
    temperature: primitive(),
    max_length: primitive(),
    min_length: primitive(),
    top_k: primitive(),
    top_p: primitive(),
    top_a: primitive(),
    typical_p: primitive(),
    tail_free_sampling: primitive(),
    repetition_penalty: primitive(),
    repetition_penalty_range: primitive(),
    repetition_penalty_slope: primitive(),
    eos_token_id: primitive(), // Deprecated
    bad_words_ids: optional(list(list(primitive()))), // Deprecated
    logit_bias_groups: optional(list(object(LogitBiasGroup))), // Deprecated
    repetition_penalty_frequency: primitive(),
    repetition_penalty_presence: primitive(),
    order: list(object(OrderElement)),
})

export type PresetId = string

export class ContextPresets {
    contextDefaults: ContextEntry[]
    ephemeralDefaults: EphemeralEntry[]
    loreDefaults: LoreEntry[]
    storyDefault: ContextFieldConfig
    constructor() {
        this.contextDefaults = [
            new ContextEntry(getDefaultMemoryConfig()),
            new ContextEntry(getDefaultAuthorsNoteConfig()),
        ]
        this.ephemeralDefaults = [new EphemeralEntry(getDefaultEphemeralConfig())]
        this.loreDefaults = [new LoreEntry(getDefaultLoreConfig())]
        this.storyDefault = getDefaultStoryConfig()
    }
}

createModelSchema(ContextPresets, {
    contextDefaults: list(object(ContextEntry)),
    ephemeralDefaults: list(object(EphemeralEntry)),
    loreDefaults: list(object(LoreEntry)),
    storyDefault: object(ContextFieldConfig),
})

export class StoryPreset {
    constructor(name: string, model: TextGenerationModel, id?: string) {
        this.name = name
        this.id = id !== undefined ? id : uuid()
        this.parameters = new TextGenerationSettings()
        this.model = model
    }
    presetVersion: number = 3
    name: string
    id: string
    remoteId: string = ''
    parameters: TextGenerationSettings
    description?: string
    contextPresets?: ContextPresets
    model: TextGenerationModel

    serialize(pretty: boolean = false): string {
        return JSON.stringify(serialize(StoryPreset, this), undefined, pretty ? '  ' : undefined)
    }

    static deserialize(preset: string): StoryPreset {
        const deserialized = deserialize(StoryPreset, JSON.parse(preset) as StoryPreset)
        migratePreset(deserialized)
        return deserialized
    }
}

createModelSchema(StoryPreset, {
    presetVersion: primitive(),
    name: primitive(),
    id: primitive(),
    remoteId: primitive(),
    parameters: object(TextGenerationSettings),
    description: optional(primitive()),
    contextPresets: optional(object(ContextPresets)),
    model: primitive(),
})

export type ModuleImage = PlatformImageData | string

function castModuleImage(image: ModuleImage | undefined): PlatformImageData | undefined {
    return image
        ? ((typeof image === 'string'
              ? isRN
                  ? { uri: image }
                  : { src: image as string, height: 0, width: 0 }
              : image) as PlatformImageData)
        : undefined
}

function unCastModuleImage(image: ModuleImage | undefined): string {
    return image ? (typeof image === 'string' ? image : isRN ? (image as any).uri : (image as any).src) : ''
}

export class AIModule {
    id: string = ''
    name: string = ''
    description: string = ''
    remoteId: string = ''
    mode?: StoryMode = StoryMode.normal
    image?: ModuleImage = undefined

    constructor(
        id: string,
        name: string,
        description: string,
        remoteId: string,
        mode?: StoryMode,
        image?: ModuleImage
    ) {
        this.id = id
        this.name = name
        this.description = description
        this.remoteId = remoteId
        this.mode = mode
        this.image = image
    }

    static async fromData(
        name: string,
        description: string,
        data: string,
        mode: StoryMode,
        image?: ModuleImage,
        model?: string
    ): Promise<AIModule> {

        return {
            id: `${model ?? TextGenerationModel.j6bv4}:$3:$5`,
            name,
            description,
            remoteId: '',
            mode,
            image: castModuleImage(image),
        }
    }
}

createModelSchema(AIModule, {
    id: primitive(),
    name: primitive(),
    description: primitive(),
    remoteId: primitive(),
    mode: optional(primitive()),
    image: custom(unCastModuleImage, castModuleImage),
})

export class StorySettings {
    parameters: TextGenerationSettings = new TextGenerationSettings()
    preset: string = ''
    trimResponses: boolean = true
    banBrackets: boolean = true
    prefix?: string = DefaultPrefixOption
    aiModule?: AIModule
    dynamicPenaltyRange?: boolean = false
    prefixMode?: StoryMode = 0 as StoryMode
    // StorySettings with an undefined model are always Sigurd
    model: TextGenerationModel = TextGenerationModel.j6bv4
}

createModelSchema(StorySettings, {
    parameters: object(TextGenerationSettings),
    preset: primitive(),
    trimResponses: primitive(),
    banBrackets: primitive(),
    prefix: optional(primitive()),
    aiModule: optional(object(AIModule)),
    dynamicPenaltyRange: optional(primitive()),
    prefixMode: optional(primitive()),
    model: primitive(),
})

export const DefaultPrefixOption =
    // eslint-disable-next-line max-len
    'vanilla'

export const NoModule =
    // eslint-disable-next-line max-len
    'vanilla'
