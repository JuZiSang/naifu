import { Dark } from '../../styles/themes/dark'
import { Theme } from '../../styles/themes/theme'
import { TTSv2Voices } from '../../util/tts'
import { DefaultModel, TextGenerationModel } from '../request/model'

export enum TTSType {
    Off,
    Local,
    Streamed,
}

export enum TTSModel {
    v1 = 'v1',
    v2 = 'v2',
}

export const DEFAULT_TTS_MODEL = TTSModel.v2

export class UserSettings {
    siteTheme?: Theme
    fontScale?: number
    outputFontScale?: number
    lineSpacing?: number
    paragraphSpacing?: number
    paragraphIndent?: number
    editorHighlighting?: boolean
    editorSpellcheck?: boolean
    showInputBox?: boolean
    force1024Tokens?: boolean
    remoteDefault?: boolean
    trimTrailingSpaces?: boolean
    model?: number | null // Deprecated in favor of defaultModel
    seenWelcomeScreen?: boolean
    buttonScale?: number
    gestureControl?: boolean
    trimResponsesDefault?: boolean
    trimResponsesAdventureDefault?: boolean
    lastUpdateViewed?: number
    contextViewerColors?: boolean
    skipUpdateNotes?: boolean
    streamResponses?: boolean
    streamDelay?: number
    editorLoreKeys?: boolean
    contextMenuSwap?: boolean
    continueGenerationToSentenceEnd?: boolean
    prependPreamble?: boolean
    alwaysOverwriteConflicts?: boolean
    useTTS?: boolean | null // Deprecated in favor of ttsType
    ttsType?: TTSType
    ttsModel?: TTSModel
    ttsSeed?: string
    sid?: number
    ttsVolume?: number
    ttsRate?: number
    ttsRateStreamed?: number
    ttsPitch?: number
    ttsV2Seed?: string
    ttsV2CommentSeed?: string
    speakOutputs?: boolean
    tutorialSeen?: boolean
    showStoryTitle?: boolean
    sortShelvesOnTop?: boolean
    sortFavoritesOnTop?: boolean
    penName?: string
    defaultBias?: boolean
    speakInputs?: boolean
    defaultPreset?: string
    defaultModule?: string
    useDefaultPresetForScenario?: boolean
    useDefaultModuleForScenario?: boolean
    enableLogprobs?: boolean
    forceModelUpdate?: number
    settingsVersion?: number
    defaultModel?: TextGenerationModel
    loreGenModel?: TextGenerationModel
    loreGenPreset?: string
    legacyLoreGen?: boolean
    april2022?: boolean
    storageDecision?: number
    commentEnabled?: number
    commentChance?: number
    commentAvatar?: number
    commentStreamDelay?: number
    speakComments?: boolean
    bidirectionalInline?: boolean
    showTips?: boolean
    commentAutoClear?: boolean
    savedTtsSeeds?: Array<{
        name: string
        seed: string
        model: TTSModel
        id: string
    }>
    useEditorV2?: boolean
    stableLicenseAgree?: boolean
    hideImageStartupModal?: boolean
    subscriptionPurchaseAttempt?: number
}

export function getUserSetting<S extends keyof UserSettings>(
    settings: UserSettings,
    setting: S
): Exclude<UserSettings[S], undefined> {
    return (
        typeof settings[setting] === 'undefined' ? UserSettingsDefaults[setting] : settings[setting]
    ) as Exclude<UserSettings[S], undefined>
}
export const UserSettingsDefaults: Record<keyof UserSettings, unknown> = {
    siteTheme: Dark,
    fontScale: 16,
    outputFontScale: 18,
    lineSpacing: 1.8,
    paragraphSpacing: 0.5,
    paragraphIndent: 10,
    editorHighlighting: true,
    editorSpellcheck: true,
    showInputBox: false,
    force1024Tokens: false,
    remoteDefault: true,
    trimTrailingSpaces: true,
    model: null,
    seenWelcomeScreen: false,
    buttonScale: 1,
    gestureControl: true,
    trimResponsesDefault: true,
    trimResponsesAdventureDefault: true,
    lastUpdateViewed: 0,
    contextViewerColors: true,
    skipUpdateNotes: false,
    streamResponses: true,
    streamDelay: 0,
    editorLoreKeys: false,
    contextMenuSwap: false,
    continueGenerationToSentenceEnd: true,
    prependPreamble: true,
    alwaysOverwriteConflicts: false,
    useTTS: null,
    ttsType: TTSType.Off,
    ttsModel: DEFAULT_TTS_MODEL,
    ttsSeed: '',
    sid: 0,
    ttsVolume: 1,
    ttsRate: 1,
    ttsRateStreamed: 1,
    ttsPitch: 1,
    ttsV2Seed: TTSv2Voices[1].seed,
    ttsV2CommentSeed: TTSv2Voices[0].seed,
    speakOutputs: false,
    tutorialSeen: false,
    showStoryTitle: true,
    sortShelvesOnTop: true,
    sortFavoritesOnTop: false,
    penName: '',
    defaultBias: true,
    speakInputs: false,
    defaultPreset: '',
    defaultModule: '',
    useDefaultPresetForScenario: false,
    useDefaultModuleForScenario: false,
    enableLogprobs: false,
    forceModelUpdate: 1,
    settingsVersion: 2,
    defaultModel: DefaultModel,
    loreGenModel: DefaultModel,
    loreGenPreset: '',
    legacyLoreGen: false,
    april2022: false,
    storageDecision: 0,
    commentEnabled: 1,
    commentChance: 0.05,
    commentAvatar: 0,
    commentStreamDelay: 0,
    speakComments: false,
    bidirectionalInline: true,
    showTips: true,
    commentAutoClear: true,
    savedTtsSeeds: new Array<{
        name: string
        seed: string
        model: TTSModel
        id: string
    }>(),
    useEditorV2: false,
    stableLicenseAgree: false,
    hideImageStartupModal: false,
    subscriptionPurchaseAttempt: 0,
}
