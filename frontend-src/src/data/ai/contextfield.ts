import { createModelSchema, object, primitive, deserialize, optional } from 'serializr'
import { MaxTokens } from '../../globals/constants'

export enum SeparationType {
    Token = 'token',
    Sentence = 'sentence',
    NewLine = 'newline',
}

export enum TrimDirection {
    TrimTop = 'trimTop',
    TrimBottom = 'trimBottom',
    DoNotTrim = 'doNotTrim',
}

export class ContextFieldConfig {
    prefix: string = ''
    suffix: string = '\n'
    tokenBudget: number = 2048
    reservedTokens: number = 0
    budgetPriority: number = 400
    trimDirection: TrimDirection = TrimDirection.TrimBottom
    insertionType: SeparationType = SeparationType.NewLine
    maximumTrimType: SeparationType = SeparationType.Sentence
    insertionPosition: number = -1
    allowInnerInsertion?: boolean
    allowInsertionInside?: boolean
    static deserialize(config: string): ContextFieldConfig {
        return deserialize(ContextFieldConfig, JSON.parse(config))
    }
}

createModelSchema(ContextFieldConfig, {
    prefix: primitive(),
    suffix: primitive(),
    tokenBudget: primitive(),
    reservedTokens: primitive(),
    budgetPriority: primitive(),
    trimDirection: primitive(),
    insertionType: primitive(),
    maximumTrimType: primitive(),
    insertionPosition: primitive(),
    allowInnerInsertion: optional(primitive()),
    allowInsertionInside: optional(primitive()),
})

export class ContextEntry {
    text: string = ''
    contextConfig: ContextFieldConfig = getDefaultMemoryConfig()
    constructor(contextConfig: ContextFieldConfig, text = '') {
        this.contextConfig = contextConfig
        this.text = text
    }
    static deserialize(entry: string): ContextEntry {
        return deserialize(ContextEntry, JSON.parse(entry) as ContextEntry)
    }
}

createModelSchema(ContextEntry, {
    text: primitive(),
    contextConfig: object(ContextFieldConfig),
})

export const getDefaultStoryConfig = (): ContextFieldConfig => {
    const config = new ContextFieldConfig()
    config.prefix = ''
    config.suffix = ''
    config.tokenBudget = MaxTokens
    config.reservedTokens = 512
    config.budgetPriority = 0
    config.trimDirection = TrimDirection.TrimTop
    config.insertionType = SeparationType.NewLine
    config.maximumTrimType = SeparationType.Sentence
    config.insertionPosition = -1
    config.allowInsertionInside = true
    return config
}

export const getDefaultMemoryConfig = (): ContextFieldConfig => {
    const config = new ContextFieldConfig()
    config.prefix = ''
    config.suffix = '\n'
    config.tokenBudget = MaxTokens
    config.reservedTokens = 0
    config.budgetPriority = 800
    config.trimDirection = TrimDirection.TrimBottom
    config.insertionType = SeparationType.NewLine
    config.maximumTrimType = SeparationType.Sentence
    config.insertionPosition = 0
    return config
}

export const getDefaultAuthorsNoteConfig = (): ContextFieldConfig => {
    const config = new ContextFieldConfig()
    config.prefix = ''
    config.suffix = '\n'
    config.tokenBudget = MaxTokens
    config.reservedTokens = MaxTokens
    config.budgetPriority = -400
    config.trimDirection = TrimDirection.TrimBottom
    config.insertionType = SeparationType.NewLine
    config.maximumTrimType = SeparationType.Sentence
    config.insertionPosition = -4
    return config
}

export const getDefaultLoreConfig = (): ContextFieldConfig => {
    const config = new ContextFieldConfig()
    config.prefix = ''
    config.suffix = '\n'
    config.tokenBudget = MaxTokens
    config.reservedTokens = 0
    config.budgetPriority = 400
    config.trimDirection = TrimDirection.TrimBottom
    config.insertionType = SeparationType.NewLine
    config.maximumTrimType = SeparationType.Sentence
    config.insertionPosition = -1
    return config
}

export const getDefaultEphemeralConfig = (): ContextFieldConfig => {
    const config = new ContextFieldConfig()
    config.prefix = ''
    config.suffix = '\n'
    config.tokenBudget = MaxTokens
    config.reservedTokens = MaxTokens
    config.budgetPriority = -10000
    config.trimDirection = TrimDirection.DoNotTrim
    config.insertionType = SeparationType.NewLine
    config.maximumTrimType = SeparationType.NewLine
    config.insertionPosition = -2
    return config
}
