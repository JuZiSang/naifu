import { deserialize } from '../../util/serialization'
import { normalizeModel, TextGenerationModel } from '../request/model'
import {
    ContextPresets,
    LogitWarper,
    StoryPreset,
    StorySettings,
    TextGenerationSettings,
} from './storysettings'

const DefaultSigurdPresets: Array<StoryPreset> = [
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        remoteId: '',
        name: 'Storywriter',
        id: 'default-trueoptimalnucleus',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.72,
            max_length: 40,
            min_length: 1,
            top_k: 0,
            top_p: 0.725,
            tail_free_sampling: 1,
            repetition_penalty: 2.75,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.18,
            bad_words_ids: [],
        }),
        description: 'Optimized settings for relevant output.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        remoteId: '',
        name: 'Coherent Creativity',
        id: 'default-coherentcreativity',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.51,
            max_length: 40,
            min_length: 1,
            top_k: 0,
            top_p: 1,
            tail_free_sampling: 0.992,
            repetition_penalty: 3.875,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
        }),
        description: 'A good balance between coherence, creativity, and quality of prose.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        name: 'Luna Moth',
        remoteId: '',
        id: 'default-moth-luna',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 2,
            max_length: 40,
            min_length: 1,
            top_k: 85,
            top_p: 0.235,
            tail_free_sampling: 1,
            repetition_penalty: 2.975,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            bad_words_ids: [],
        }),
        description: 'A great degree of creativity without losing coherency.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        name: 'Sphinx Moth',
        remoteId: '',
        id: 'default-moth-sphinx',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 2.5,
            max_length: 40,
            min_length: 1,
            top_k: 30,
            top_p: 0.175,
            tail_free_sampling: 1,
            repetition_penalty: 3,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            bad_words_ids: [],
        }),
        description: 'Maximum randomness while still being plot relevant. Like Sphinx riddles!',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        name: 'Emperor Moth',
        remoteId: '',
        id: 'default-moth-emperor',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.25,
            max_length: 40,
            min_length: 1,
            top_k: 0,
            top_p: 0.235,
            tail_free_sampling: 1,
            repetition_penalty: 2.75,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            bad_words_ids: [],
        }),
        description: 'Medium randomness with a decent bit of creative writing.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        name: 'Best Guess',
        remoteId: '',
        id: 'default-bestguess',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.8,
            max_length: 40,
            min_length: 1,
            top_k: 110,
            top_p: 0.9,
            tail_free_sampling: 1,
            repetition_penalty: 3.1,
            repetition_penalty_range: 512,
            repetition_penalty_slope: 3.33,
            bad_words_ids: [],
        }),
        contextPresets: deserialize(ContextPresets, {
            contextDefaults: [
                {
                    text: '',
                    contextConfig: {
                        prefix: '[',
                        suffix: ']\n',
                        tokenBudget: 2048,
                        reservedTokens: 2048,
                        budgetPriority: -100,
                        trimDirection: 'doNotTrim',
                        insertionType: 'newline',
                        maximumTrimType: 'sentence',
                        insertionPosition: -12,
                    },
                },
                {
                    text: '',
                    contextConfig: {
                        prefix: '[',
                        suffix: ']\n',
                        tokenBudget: 2048,
                        reservedTokens: 2048,
                        budgetPriority: -800,
                        trimDirection: 'doNotTrim',
                        insertionType: 'newline',
                        maximumTrimType: 'sentence',
                        insertionPosition: -4,
                    },
                },
            ],
            ephemeralDefaults: [
                {
                    text: '',
                    contextConfig: {
                        prefix: '',
                        suffix: '\n',
                        tokenBudget: 2048,
                        reservedTokens: 2048,
                        budgetPriority: -100,
                        trimDirection: 'doNotTrim',
                        insertionType: 'newline',
                        maximumTrimType: 'newline',
                        insertionPosition: -2,
                    },
                    startingStep: 1,
                    delay: 0,
                    duration: 1,
                    repeat: false,
                    reverse: false,
                },
            ],
            loreDefaults: [
                {
                    text: '',
                    contextConfig: {
                        prefix: '[',
                        suffix: ']\n',
                        tokenBudget: 2048,
                        reservedTokens: 2048,
                        budgetPriority: -200,
                        trimDirection: 'trimBottom',
                        insertionType: 'newline',
                        maximumTrimType: 'sentence',
                        insertionPosition: -10,
                    },
                    lastUpdatedAt: '2021-07-19T01:16:17.425Z',
                    displayName: 'New Lorebook Entry',
                    keys: [],
                    searchRange: 1000,
                    enabled: true,
                    forceActivation: false,
                    keyRelative: false,
                    nonStoryActivatable: false,
                },
            ],
            storyDefault: {
                prefix: '',
                suffix: '',
                tokenBudget: 2048,
                reservedTokens: 512,
                budgetPriority: 0,
                trimDirection: 'trimTop',
                insertionType: 'newline',
                maximumTrimType: 'sentence',
                insertionPosition: -1,
            },
        }),
        description: 'A subtle change with alternative context settings.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        name: 'Pleasing Results',
        remoteId: '',
        id: 'default-pleasingresults',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.44,
            max_length: 40,
            min_length: 1,
            top_k: 0,
            top_p: 1,
            tail_free_sampling: 0.9,
            repetition_penalty: 3.35,
            repetition_penalty_range: 1024,
            repetition_penalty_slope: 6.75,
            bad_words_ids: [],
        }),
        contextPresets: deserialize(ContextPresets, {
            contextDefaults: [
                {
                    text: '',
                    contextConfig: {
                        prefix: '',
                        suffix: '\n',
                        tokenBudget: 2048,
                        reservedTokens: 206,
                        budgetPriority: -200,
                        trimDirection: 'trimBottom',
                        insertionType: 'newline',
                        maximumTrimType: 'sentence',
                        insertionPosition: -11,
                    },
                },
                {
                    text: '',
                    contextConfig: {
                        prefix: '',
                        suffix: '\n',
                        tokenBudget: 2048,
                        reservedTokens: 2048,
                        budgetPriority: -400,
                        trimDirection: 'trimBottom',
                        insertionType: 'newline',
                        maximumTrimType: 'sentence',
                        insertionPosition: -4,
                    },
                },
            ],
            ephemeralDefaults: [
                {
                    text: '',
                    contextConfig: {
                        prefix: '',
                        suffix: '\n',
                        tokenBudget: 2048,
                        reservedTokens: 2048,
                        budgetPriority: -10000,
                        trimDirection: 'doNotTrim',
                        insertionType: 'newline',
                        maximumTrimType: 'newline',
                        insertionPosition: -2,
                    },
                    startingStep: 1,
                    delay: 0,
                    duration: 1,
                    repeat: false,
                    reverse: false,
                },
            ],
            loreDefaults: [
                {
                    text: '',
                    contextConfig: {
                        prefix: '',
                        suffix: '\n',
                        tokenBudget: 2048,
                        reservedTokens: 0,
                        budgetPriority: 400,
                        trimDirection: 'trimBottom',
                        insertionType: 'newline',
                        maximumTrimType: 'sentence',
                        insertionPosition: -1,
                    },
                    lastUpdatedAt: '2021-07-19T00:36:55.977Z',
                    displayName: 'New Lorebook Entry',
                    keys: [],
                    searchRange: 1000,
                    enabled: true,
                    forceActivation: false,
                    keyRelative: false,
                    nonStoryActivatable: false,
                },
            ],
            storyDefault: {
                prefix: '',
                suffix: '',
                tokenBudget: 2048,
                reservedTokens: 512,
                budgetPriority: 0,
                trimDirection: 'trimTop',
                insertionType: 'newline',
                maximumTrimType: 'sentence',
                insertionPosition: -1,
            },
        }),
        description: 'Expectable output with alternative context settings.',
    }),
]

const DefaultCalliopePresets: Array<StoryPreset> = [
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        remoteId: '',
        name: 'Storywriter (Calliope)',
        id: 'defaultcalliope-trueoptimalnucleus',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.72,
            top_k: 0,
            top_p: 0.725,
            tail_free_sampling: 1,
            repetition_penalty: 2.75,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.18,
            bad_words_ids: [],
        }),
        description: 'Optimized settings for relevant output.',
    }),
]

const DefaultSnekPresets: Array<StoryPreset> = [
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        remoteId: '',
        name: 'Storywriter (Snek)',
        id: 'defaultsnek-trueoptimalnucleus',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.72,
            top_k: 0,
            top_p: 0.725,
            tail_free_sampling: 1,
            repetition_penalty: 2.75,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.18,
            bad_words_ids: [],
        }),
        description: 'Optimized settings for relevant output.',
    }),
]

const DefaultGenjiPresets: Array<StoryPreset> = [
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 2,
        remoteId: '',
        name: 'Genji Default',
        id: 'defaultgenji-genji',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.86,
            top_k: 0,
            top_p: 1,
            top_a: 1,
            typical_p: 1,
            tail_free_sampling: 0.927,
            repetition_penalty: 2.9,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 3.33,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
        }),
        description: 'Default Settings',
    }),
]

const DefaultEuterpev2Presets: Array<StoryPreset> = [
    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Genesis',
        id: 'default-genesis',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.63,
            top_k: 0,
            top_p: 0.975,
            tail_free_sampling: 0.975,
            repetition_penalty: 2.975,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.09,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Stable and logical, but with scattered creativity.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Basic Coherence',
        id: 'default-basic-coherence',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.585,
            top_k: 0,
            top_p: 1,
            tail_free_sampling: 0.87,
            repetition_penalty: 3.05,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.33,
        }),
        description: 'Keeps things on track.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Ouroboros',
        id: 'default-ouroboros',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.07,
            top_k: 264,
            top_p: 1,
            tail_free_sampling: 0.925,
            repetition_penalty: 2.165,
            repetition_penalty_range: 404,
            repetition_penalty_slope: 0.84,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Versatile, conforms well to poems, lists, chat, etc.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Ace of Spades',
        id: 'default-ace-of-spades',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.15,
            max_length: 30,
            top_k: 0,
            top_p: 0.95,
            tail_free_sampling: 0.8,
            repetition_penalty: 2.75,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 7.02,
            order: [
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Expressive, while still staying focused.',
    }),

    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteId: '',
        name: 'Moonlit Chronicler',
        id: 'default-moonlit-chronicler',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.25,
            top_k: 300,
            top_p: 1,
            top_a: 0.782,
            typical_p: 0.95,
            tail_free_sampling: 0.802,
            repetition_penalty: 2.075,
            repetition_penalty_range: 512,
            repetition_penalty_slope: 0.36,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Tells a tale with confidence, but variety where it matters.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteId: '',
        name: 'Fandango',
        id: 'default-fandango',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.86,
            top_k: 20,
            top_p: 0.95,
            tail_free_sampling: 1,
            repetition_penalty: 2.25,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.09,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'A rhythmic dance of prose, whoever takes the lead.',
    }),

    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'All-Nighter',
        id: 'default-all-nighter',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.33,
            top_k: 13,
            top_p: 1,
            tail_free_sampling: 0.836,
            repetition_penalty: 2.366,
            repetition_penalty_range: 400,
            repetition_penalty_slope: 0.33,
            repetition_penalty_frequency: 0.01,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Creative diction with room for embellishments.',
    }),

    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Low Rider',
        id: 'default-low-rider-2',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.94,
            top_k: 12,
            top_p: 1,
            tail_free_sampling: 0.94,
            repetition_penalty: 2.66,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.18,
            repetition_penalty_frequency: 0.013,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Reliable, aimed at story development.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteId: '',
        name: 'Morpho',
        id: 'default-morpho',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.6889,
            max_length: 25,
            top_k: 0,
            top_p: 1,
            tail_free_sampling: 1,
            repetition_penalty: 1,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            repetition_penalty_frequency: 0.1,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'tfs',
                    enabled: false,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Let the AI generate without constraints.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteId: '',
        name: 'Pro Writer',
        id: 'default-prowriter20',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.348,
            top_k: 64,
            top_p: 0.909,
            top_a: 1,
            typical_p: 1,
            tail_free_sampling: 0.688,
            repetition_penalty: 4.967,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.09,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description:
            'Optimal settings for readability, based on AI-powered mass statistical analysis of Euterpe output.',
    }),
]

const KrakePresets: Array<StoryPreset> = [
    Object.assign(new StoryPreset('', TextGenerationModel.krakev1), {
        presetVersion: 3,
        remoteid: '',
        name: 'Astraea',
        id: 'default-astreacreative',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.9,
            top_k: 22,
            top_p: 0.85,
            top_a: 1,
            typical_p: 0.9,
            tail_free_sampling: 0.92,
            repetition_penalty: 1.024,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.09,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
            ],
        }),
        description: 'Follows your style with precision.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev1), {
        presetVersion: 3,
        remoteid: '',
        name: 'Blackjack',
        id: 'default-blackjack',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.3,
            top_k: 0,
            top_p: 0.98,
            top_a: 0.98,
            typical_p: 1,
            tail_free_sampling: 0.95,
            repetition_penalty: 1.005,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 4,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'typical_p',
                    enabled: false,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
            ],
        }),
        description: 'Balanced probability with the chance for less obvious outcomes.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev1), {
        presetVersion: 3,
        remoteid: '',
        name: 'Adder',
        id: 'default-adder04',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.06,
            max_length: 17,
            top_k: 0,
            top_p: 0.85,
            top_a: 0.086,
            typical_p: 0.986,
            tail_free_sampling: 0.961,
            repetition_penalty: 1.016,
            repetition_penalty_range: 720,
            repetition_penalty_slope: 0.77,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_a',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
            ],
        }),
        description: 'For logic and narrative progression with the right amount of spice.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev1), {
        presetVersion: 3,
        name: '20BC',
        id: 'default-20bc',
        remoteId: '',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.55,
            top_k: 0,
            top_p: 1,
            top_a: 1,
            typical_p: 1,
            tail_free_sampling: 0.872,
            repetition_penalty: 1.03,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 3.33,
            bad_words_ids: [],
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Keeps things on track.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev1), {
        presetVersion: 3,
        remoteid: '',
        name: 'Ptah',
        id: 'default-ptah',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.98,
            top_k: 150,
            top_p: 0.825,
            top_a: 1,
            typical_p: 0.95,
            tail_free_sampling: 0.84,
            repetition_penalty: 1.032,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.09,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
            ],
        }),
        description: 'Gives you the tools to build your worlds.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev1), {
        presetVersion: 3,
        remoteid: '',
        name: 'Iris',
        id: 'default-iris',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 2.5,
            top_k: 0,
            top_p: 1,
            top_a: 1,
            typical_p: 0.799,
            tail_free_sampling: 0.9,
            repetition_penalty: 1,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
            ],
        }),
        description: 'A wide array of ideas from beyond to shake up your writing.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev1), {
        presetVersion: 3,
        remoteid: '',
        name: 'Calypso',
        id: 'default-calypso',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1,
            top_k: 20,
            top_p: 1,
            top_a: 0.2,
            typical_p: 1,
            tail_free_sampling: 1,
            repetition_penalty: 1.04,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.09,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
            ],
        }),
        description: 'Creatively elaborates upon an existing scene.',
    }),
]

const Krakev2Presets: Array<StoryPreset> = [
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Blue Lighter',
        id: 'default-blue-lighter',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.33,
            top_k: 81,
            top_p: 0.88,
            top_a: 0.085,
            typical_p: 0.965,
            tail_free_sampling: 0.937,
            repetition_penalty: 1.05,
            repetition_penalty_range: 560,
            repetition_penalty_slope: 0,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_k',
                    enabled: false,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
            ],
        }),
        description: 'Easy to steer, imaginative, and fast-paced.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Redjack',
        id: 'default-redjack',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.1,
            top_k: 0,
            top_p: 0.96,
            top_a: 0.98,
            typical_p: 1,
            tail_free_sampling: 0.92,
            repetition_penalty: 1.0075,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 4,
            repetition_penalty_frequency: 0.025,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'typical_p',
                    enabled: false,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
            ],
        }),
        description: "Focuses on staying on track, only rarely deviating from what's already written.",
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Calypso',
        id: 'default-calypso',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.1,
            top_k: 10,
            top_p: 0.95,
            top_a: 0.15,
            typical_p: 0.95,
            tail_free_sampling: 0.95,
            repetition_penalty: 1.075,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0.09,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
            ],
        }),
        description:
            'Weave an enrapturing endless tale, custom fit for 2nd person perspective but highly flexible for other uses.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Blue Adder',
        id: 'default-blue-adder',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1.01,
            top_k: 0,
            top_p: 0.7,
            top_a: 0.06,
            typical_p: 0.996,
            tail_free_sampling: 0.991,
            repetition_penalty: 1.02325,
            repetition_penalty_range: 496,
            repetition_penalty_slope: 0.72,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
            ],
        }),
        description: 'Jumps from one idea to the next, logical but unpredictable.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Reverie',
        id: 'default-reverie',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.925,
            top_k: 85,
            top_p: 0.985,
            top_a: 0.12,
            typical_p: 0.85,
            tail_free_sampling: 0.925,
            repetition_penalty: 1.0225,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
            ],
        }),
        description: 'Narrative consistency with a focus on paying attention to memory and module content.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: '20BC+',
        id: 'default-20bcplus',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.58,
            max_length: 75,
            min_length: 1,
            top_k: 20,
            top_p: 1,
            top_a: 0.05,
            typical_p: 0.985,
            tail_free_sampling: 0.879,
            repetition_penalty: 1.055,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 3.33,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Keeps things on track.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Calibrated',
        id: 'default-calibrated',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.34,
            top_k: 0,
            top_p: 1,
            top_a: 1,
            typical_p: 0.975,
            tail_free_sampling: 1,
            repetition_penalty: 1.036,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 3.33,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'tfs',
                    enabled: false,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
            ],
        }),
        description: 'Adjusted for highly consistent output.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Iris',
        id: 'default-iris',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 2.5,
            top_k: 0,
            top_p: 1,
            top_a: 1,
            typical_p: 0.9566,
            tail_free_sampling: 0.97,
            repetition_penalty: 1,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
            ],
        }),
        description: 'Imaginative and original, a kaleidoscope of unpredictability.',
    }),
    Object.assign(new StoryPreset('', TextGenerationModel.krakev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Krait',
        id: 'default-krait',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.9,
            top_k: 1000,
            top_p: 0.992,
            top_a: 0.072,
            typical_p: 0.98,
            tail_free_sampling: 0.997,
            repetition_penalty: 1.0236,
            repetition_penalty_range: 610,
            repetition_penalty_slope: 0.85,
            repetition_penalty_frequency: 0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'top_k',
                    enabled: true,
                },
                {
                    id: 'top_a',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'tfs',
                    enabled: true,
                },
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
            ],
        }),
        description: 'Controlled chaos, for random generation and chat style.',
    }),
]

const colorModelPresets = [
    Object.assign(new StoryPreset('', TextGenerationModel.blue), {
        presetVersion: 3,
        remoteid: '',
        name: '⬜️',
        id: 'default-na',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 1,
            top_k: 0,
            top_p: 1,
            tail_free_sampling: 0.87,
            repetition_penalty: 1,
            repetition_penalty_slope: 0,
            repetition_penalty_frequency: 0.0,
            repetition_penalty_presence: 0,
        }),
        description: '',
    }),
]

export function getModelPresets(model: TextGenerationModel): StoryPreset[] {
    switch (normalizeModel(model)) {
        case TextGenerationModel.j6bv4:
            return DefaultSigurdPresets
        case TextGenerationModel.neo2b:
            return DefaultCalliopePresets
        case TextGenerationModel.genjijp6bv2:
            return DefaultGenjiPresets
        case TextGenerationModel.genjipython6b:
            return DefaultSnekPresets
        case TextGenerationModel.euterpev2:
            return DefaultEuterpev2Presets
        case TextGenerationModel.krakev1:
            return KrakePresets
        case TextGenerationModel.krakev2:
            return Krakev2Presets
        case TextGenerationModel.blue:
        case TextGenerationModel.red:
        case TextGenerationModel.green:
        case TextGenerationModel.purple:
            return colorModelPresets
        default:
            return DefaultSigurdPresets
    }
}

const SigurdLoreGenPresets = [
    Object.assign(new StoryPreset('', TextGenerationModel.j6bv4), {
        presetVersion: 3,
        remoteid: '',
        name: 'Sigurd Lore Generation',
        id: 'default-sigurdloregen',
        parameters: deserialize(TextGenerationSettings, {
            temperature: 0.34,
            top_k: 1,
            top_p: 1,
            top_a: 1,
            typical_p: 0.8,
            tail_free_sampling: 1,
            repetition_penalty: 2.725,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            repetition_penalty_frequency: 0.0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'tfs',
                    enabled: false,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
            ],
        }),
        description: 'The default Lore Generation preset for Sigurd.',
    }),
]

const EuterpeLoreGenPresets = [
    Object.assign(new StoryPreset('', TextGenerationModel.euterpev2), {
        presetVersion: 3,
        remoteid: '',
        name: 'Euterpe Lore Generation',
        id: 'default-euterpeloregen',
        parameters: deserialize(TextGenerationSettings, {
            textGenerationSettingsVersion: 3,
            temperature: 0.34,
            top_k: 1,
            top_p: 1,
            top_a: 1,
            typical_p: 0.8,
            tail_free_sampling: 1,
            repetition_penalty: 2.725,
            repetition_penalty_range: 2048,
            repetition_penalty_slope: 0,
            repetition_penalty_frequency: 0.0,
            repetition_penalty_presence: 0,
            order: [
                {
                    id: 'typical_p',
                    enabled: true,
                },
                {
                    id: 'temperature',
                    enabled: true,
                },
                {
                    id: 'top_p',
                    enabled: false,
                },
                {
                    id: 'tfs',
                    enabled: false,
                },
                {
                    id: 'top_a',
                    enabled: false,
                },
                {
                    id: 'top_k',
                    enabled: false,
                },
            ],
        }),
        description: 'The default Lore Generation preset for Euterpe.',
    }),
]

export function getModelLoreGenPresets(model: TextGenerationModel): StoryPreset[] {
    switch (normalizeModel(model)) {
        case TextGenerationModel.j6bv4:
            return SigurdLoreGenPresets
        case TextGenerationModel.neo2b:
            return []
        case TextGenerationModel.genjijp6bv2:
            return []
        case TextGenerationModel.genjipython6b:
            return []
        case TextGenerationModel.euterpev2:
            return EuterpeLoreGenPresets
        case TextGenerationModel.krakev1:
            return []
        case TextGenerationModel.krakev2:
            return []
        default:
            return []
    }
}

const defaultOrder = [
    {
        id: 'temperature',
        enabled: true,
    },
    {
        id: 'top_k',
        enabled: true,
    },
    {
        id: 'top_p',
        enabled: true,
    },
    {
        id: 'tfs',
        enabled: true,
    },
    {
        id: 'top_a',
        enabled: false,
    },
    {
        id: 'typical_p',
        enabled: false,
    },
]
export function presetOrderIsDefault(order?: Array<{ id: string; enabled: boolean }>): boolean {
    return !order || order.length === 0 || JSON.stringify(order) === JSON.stringify(defaultOrder)
}

export const getTitleGenSettings = (): StorySettings => {
    const settings = new StorySettings()
    settings.parameters.temperature = 1
    settings.parameters.repetition_penalty = 1
    settings.parameters.top_p = 0.95
    settings.parameters.max_length = 40
    settings.parameters.order = [
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
    return settings
}

export const getCommentGenSettings = (): StorySettings => {
    const settings = new StorySettings()
    settings.model = TextGenerationModel.commentBot
    settings.parameters.temperature = 1
    settings.parameters.repetition_penalty = 1
    settings.parameters.top_p = 1
    settings.parameters.tail_free_sampling = 0.95
    settings.parameters.max_length = 80
    settings.parameters.order = [
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
    return settings
}

export const getInlineGenSettings = (): StorySettings => {
    const settings = new StorySettings()
    settings.model = TextGenerationModel.infill
    settings.parameters.temperature = 0.8
    settings.parameters.repetition_penalty = 2.125
    settings.parameters.top_p = 1
    settings.parameters.tail_free_sampling = 0.859
    settings.parameters.max_length = 100
    settings.parameters.order = [
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
    return settings
}
