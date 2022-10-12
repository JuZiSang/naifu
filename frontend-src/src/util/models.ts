import { PlatformImageData as StaticImageData } from '../compatibility/platformtypes'
import { modelSupportsUserModules } from '../data/ai/model'
import { DefaultModel, normalizeModel, TextGenerationModel } from '../data/request/model'
import { PrefixOptions } from '../data/story/defaultprefixes'
import { StoryContainer } from '../data/story/storycontainer'
import { DefaultPrefixOption, NoModule } from '../data/story/storysettings'
import { Environment } from '../globals/constants'
import Blue from '../assets/images/blue.webp'
export interface ModelData {
    label: string
    description: string
    img: StaticImageData
    bust: StaticImageData
    str: TextGenerationModel
    opusOnly?: boolean
    loreGen?: boolean
    hidden?: boolean
}

const MODELS = [
    {
        label: 'Blue',
        description: '',
        img: Blue,
        bust: Blue,
        str: TextGenerationModel.blue,
        loreGen: false,
        staging: true,
        opusOnly: false,
        hidden: true,
    },
]

export function getAvailiableModels(opus: boolean, hidden?: boolean): ModelData[] {
    const filtered = MODELS.filter((model) => !model.opusOnly || opus)
        .filter((model) => Environment !== 'production' || !model.staging)
        .filter((model) => !model.hidden || hidden)
    return filtered
}

export function getLoregenModels(opus: boolean, allowKrake: boolean): ModelData[] {
    return getAvailiableModels(opus).filter(
        (m) => m.loreGen && (allowKrake || m.str !== TextGenerationModel.krakev1)
    )
}
export function getModuleTrainingModels(opus: boolean): ModelData[] {
    return getAvailiableModels(opus).filter((m) => modelSupportsUserModules(m.str))
}

export function modelsCompatible(
    modelA: TextGenerationModel | undefined,
    modelB: TextGenerationModel | undefined
): boolean {
    if (!modelA || !modelB) return false
    return normalizeModel(modelA) === normalizeModel(modelB)
}

const colorModels = new Set([
    TextGenerationModel.blue,
    TextGenerationModel.red,
    TextGenerationModel.green,
    TextGenerationModel.purple,
])

export function modelsHaveSamePresets(
    modelA: TextGenerationModel | undefined,
    modelB: TextGenerationModel | undefined
): boolean {
    if (modelA && modelB && colorModels.has(modelA) && colorModels.has(modelB)) {
        return true
    }
    return modelsCompatible(modelA, modelB)
}

export function modelName(model: TextGenerationModel): string {
    const normModel = normalizeModel(model)
    return MODELS.find((m) => m.str === normModel)?.label ?? 'Unknown'
}

export function prefixModel(id: string): TextGenerationModel {
    return id.split(':')[0] as TextGenerationModel
}

export function prefixIsDefault(id: string): boolean {
    return !id.includes(':') && PrefixOptions.has(id)
}

export function isStoryCompatibleWithPreferredModel(
    preferred: TextGenerationModel,
    story: StoryContainer
): boolean {
    return (
        !!preferred &&
        // if no prefix used
        (!story.content.settings.prefix ||
            // or if default prefix is used
            prefixIsDefault(story.content.settings.prefix) ||
            // or if models are compatible
            modelsCompatible(prefixModel(story.content.settings.prefix ?? DefaultPrefixOption), preferred))
    )
}

export enum PreambleConditions {
    True,
    False,
    OnSettingEnabled,
    OnLowContext,
    OnEmptyContext,
    OnModule,
    OnAdventure,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const nand = (a: boolean, b: boolean) => !(a && b)
const and = (a: boolean, b: boolean) => a && b
const or = (a: boolean, b: boolean) => a || b
const xor = (a: boolean, b: boolean) => a !== b

type ConditionOperator = (a: boolean, b: boolean) => boolean

type PreambleOperation = (preamble: string, tokens?: number[]) => [string, undefined | number[]]

// NOTE: newTokens is only used for cases where an impossible token sequence is used as the preamble.
// Preambles of this type should be avoided. and genji should possibly be changed to used a different
// preamble so this logic can be removed.
const set = (newText: string, newTokens?: number[]): PreambleOperation => {
    return () => [newText, newTokens]
}

const add = (newText: string, start?: boolean): PreambleOperation => {
    return (preamble: string) => [start ? newText + preamble : preamble + newText, undefined]
}

interface PreambleRule {
    condition: PreambleConditions[]
    conditionOperators: ConditionOperator[]
    operation: PreambleOperation
    halt?: boolean
}

const ConditionShortcut = {
    adventureCondition: {
        condition: [PreambleConditions.OnAdventure, PreambleConditions.OnEmptyContext],
        conditionOperators: [and],
        operation: set('You look around.\n'),
        halt: true,
    },
    settingAndLowOrEmpty: (operation: PreambleOperation) => {
        return {
            condition: [
                PreambleConditions.OnEmptyContext,
                PreambleConditions.OnSettingEnabled,
                PreambleConditions.OnLowContext,
            ],
            conditionOperators: [and, or],
            operation,
        }
    },
}

const FallbackPreambleDefinition: PreambleRule[] = [
    {
        condition: [PreambleConditions.OnEmptyContext],
        conditionOperators: [],
        operation: set('<|endoftext|>'),
    },
]

const preambleDefinitions: Map<TextGenerationModel, PreambleRule[]> = new Map([
    [
        normalizeModel(TextGenerationModel.euterpev2),
        [
            ConditionShortcut.adventureCondition,
            ConditionShortcut.settingAndLowOrEmpty(set('***\n')),
            {
                condition: [PreambleConditions.OnModule, PreambleConditions.True],
                conditionOperators: [xor],
                operation: add('\n', true),
            },
        ],
    ],
    [
        normalizeModel(TextGenerationModel.krakev2),
        [ConditionShortcut.adventureCondition, ConditionShortcut.settingAndLowOrEmpty(set('<|endoftext|>'))],
    ],
    [
        normalizeModel(TextGenerationModel.j6bv4),
        [ConditionShortcut.adventureCondition, ConditionShortcut.settingAndLowOrEmpty(set('⁂\n'))],
    ],
    [normalizeModel(TextGenerationModel.neo2b), [ConditionShortcut.settingAndLowOrEmpty(set('⁂\n'))]],
    [
        normalizeModel(TextGenerationModel.genjijp6bv2),
        [
            {
                condition: [PreambleConditions.OnEmptyContext],
                conditionOperators: [],
                operation: set(']\n\n', [60, 198, 198]),
            },
        ],
    ],
])

export function calcPreamble(
    model: TextGenerationModel = DefaultModel,
    preambleSettingEnabled: boolean,
    emptyContext: boolean,
    fullContent: boolean,
    module: string | undefined
): { str: string; exactTokens?: number[] } {
    let definition = preambleDefinitions.get(normalizeModel(model))
    if (!definition) {
        definition = FallbackPreambleDefinition
    }

    let preambleString = ''
    let preambleTokens: undefined | number[]

    for (const rule of definition) {
        const conditionsStack = rule.condition.map((c) => {
            switch (c) {
                case PreambleConditions.True:
                    return true
                case PreambleConditions.False:
                    return false
                case PreambleConditions.OnSettingEnabled:
                    return preambleSettingEnabled
                case PreambleConditions.OnLowContext:
                    return !fullContent
                case PreambleConditions.OnEmptyContext:
                    return emptyContext
                case PreambleConditions.OnModule:
                    return (module ?? NoModule) !== NoModule
                case PreambleConditions.OnAdventure:
                    return module === 'theme_textadventure'
            }
        })
        const operators = rule.conditionOperators
        // of condition stack length isn't +1 of operator stack length configuration is invalid, throw error
        if (conditionsStack.length - 1 !== operators.length) {
            throw new Error(`Invalid preamble rule configuration`)
        }

        // evaluate condition stack as postfix notation
        for (const operator of operators) {
            const a = conditionsStack.pop()
            const b = conditionsStack.pop()
            if (a === undefined || b === undefined) {
                throw new Error(`Invalid preamble rule configuration`)
            }
            conditionsStack.push(operator(a, b))
        }
        if (conditionsStack.pop()) {
            const [newPreamble, newTokens] = rule.operation(preambleString, preambleTokens)

            preambleString = newPreamble
            preambleTokens = newTokens
            if (rule.halt) {
                break
            }
        }
    }
    return { str: preambleString, exactTokens: preambleTokens }
}
