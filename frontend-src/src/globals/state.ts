import { atom, selectorFamily, atomFamily, selector, DefaultValue } from 'recoil'
import { StoryId } from '../data/story/storycontainer'
import { User } from '../data/user/user'
import { Dark } from '../styles/themes/dark'
import { Theme } from '../styles/themes/theme'
import { ContextReport } from '../data/ai/context'
import { AIModule, StoryPreset } from '../data/story/storysettings'
import { UpdateNote } from '../data/updates/updatenote'
import { DefaultInputModes } from '../data/story/defaultinputmodes'
import { LogProbs } from '../data/request/remoterequest'
import { EncoderType } from '../tokenizer/encoder'
import { StoryMode } from '../data/story/story'
import { DefaultModel, TextGenerationModel } from '../data/request/model'
import { PlatformImageData } from '../compatibility/platformtypes'
import { GlobalUserContext } from './globals'

class LastResponseData {
    tokens: number[] = new Array<number>()
    logprobs?: LogProbs[]
    tokenizer: EncoderType = EncoderType.GPT2
}

export const Session = atom({
    key: 'session',
    default: new User('', ''),
})

export const SessionValue = selectorFamily({
    key: 'sessionvalue',
    get:
        (field: keyof User) =>
        ({ get }) => {
            const session = get(Session)
            return session[field]
        },
})

export const LastContextReport = atom({
    key: 'lastContextReport',
    default: new ContextReport(),
    dangerouslyAllowMutability: true,
})

export const CurrentContext = atom({
    key: 'currentContext',
    default: new ContextReport(),
    dangerouslyAllowMutability: true,
})

export const LastResponse = atom({
    key: 'lastResponse',
    default: new LastResponseData(),
})

export const Stories = atom({
    key: 'stories',
    default: new Array<StoryId>(),
})

export const StoryShelves = atom({
    key: 'shelves',
    default: new Array<StoryId>(),
})

export const SelectedShelf = atom({
    key: 'selectedShelf',
    default: '',
})

export class StoryStateValue {
    id: StoryId
    update?: number
    loaded?: boolean
    selected?: boolean
    error?: string

    constructor(id?: StoryId, update?: number, loaded?: boolean, selected?: boolean, error?: string) {
        this.id = id ?? ''
        this.update = update
        this.loaded = loaded
        this.selected = selected
        this.error = error
    }
}

export const StoryStates = atomFamily<StoryStateValue, StoryId>({
    key: 'storyStates',
    default: new StoryStateValue(''),
})

const SelectedStoryState = atom({
    key: 'selectedStoryValue',
    default: new StoryStateValue(''),
})

export const StoryUpdate = selectorFamily<StoryStateValue, StoryId>({
    key: 'storyUpdate',
    get:
        (id: StoryId) =>
        ({ get }) => {
            return get(StoryStates(id))
        },
    set:
        (id: StoryId) =>
        ({ get, set }, newState) => {
            // TODO: check the correctness of this, see https://recoiljs.org/blog/2021/07/30/0.4.0-release/
            if (newState instanceof DefaultValue) {
                set(StoryStates(id), newState)
                return
            }

            const oldState = get(StoryStates(newState.id))
            const newValue = new StoryStateValue(
                newState.id ?? oldState.id ?? '',
                (newState.update ?? 0) == (oldState.update ?? 0)
                    ? (newState.update ?? 0) + 1
                    : (newState.update ?? 0) + (oldState.update ?? 0),
                newState.loaded ?? oldState.loaded,
                newState.selected ?? oldState.selected,
                newState.error ?? oldState.error
            )
            set(StoryStates(''), newValue)
            set(StoryStates(newValue.id), newValue)

            if (newValue.selected) {
                const prevSelected = get(SelectedStoryState)
                set(SelectedStoryState, newValue)

                if (prevSelected.id !== newValue.id) {
                    const prevNew = new StoryStateValue(
                        prevSelected.id,
                        prevSelected.update,
                        false,
                        false,
                        ''
                    )
                    set(StoryStates(prevNew.id), prevNew)
                }
            }
        },
})

export const SelectedStory = selector<StoryStateValue>({
    key: 'selectedStory',
    get: ({ get }) => get(SelectedStoryState),
    set: ({ set, get }, selected) => {
        // TODO: check the correctness of this, see https://recoiljs.org/blog/2021/07/30/0.4.0-release/
        if (selected instanceof DefaultValue) {
            set(SelectedStoryState, selected)
        } else if (selected) {
            const prevSelected = get(SelectedStoryState)

            if (
                prevSelected.id === selected.id &&
                prevSelected.loaded === selected.loaded &&
                prevSelected.error === selected.error
            ) {
                return
            }

            set(
                StoryUpdate(selected.id),
                (oldState) =>
                    new StoryStateValue(
                        selected.id,
                        selected.update ?? oldState.update,
                        selected.loaded ?? oldState.loaded,
                        true,
                        selected.error
                    )
            )
        }
    },
})

export const SelectedStoryId = selector<StoryId>({
    key: 'selectedStoryId',
    get: ({ get }) => get(SelectedStoryState).id,
})
export const SelectedStoryLoaded = selector<boolean>({
    key: 'selectedStoryLoaded',
    get: ({ get }) => {
        return get(SelectedStoryState).loaded || false
    },
})
export const SelectedStoryModified = selector<boolean>({
    key: 'selectedStoryModified',
    get: ({ get }) => {
        const selectedStoryId = get(SelectedStoryState).id
        const story = GlobalUserContext.storyContentCache.get(selectedStoryId)
        const meta = GlobalUserContext.stories.get(selectedStoryId)
        return story?.settingsDirty || meta?.isModified || !!story?.getStoryText()
    },
})
export const SelectedStoryMode = selector<StoryMode>({
    key: 'selectedStoryMode',
    get: ({ get }) =>
        GlobalUserContext.storyContentCache.get(get(SelectedStoryState).id)?.settings.prefixMode ??
        StoryMode.normal,
})
export const SelectedStoryModel = selector<TextGenerationModel>({
    key: 'selectedStoryModel',
    get: ({ get }) =>
        GlobalUserContext.storyContentCache.get(get(SelectedStoryState).id)?.settings.model ?? DefaultModel,
})
export const SelectedStoryModule = selector<string>({
    key: 'selectedStoryModule',
    get: ({ get }) =>
        GlobalUserContext.storyContentCache.get(get(SelectedStoryState).id)?.settings.prefix ?? '',
})
export const SelectedStoryError = selector<string>({
    key: 'selectedStoryError',
    get: ({ get }) => get(SelectedStoryState).error ?? '',
})

export const GenerationRequestActive = atom({
    key: 'generationRequestActive',
    default: false,
})

export const GenerationRequestCancelled = atom({
    key: 'generationRequestCancelled',
    default: false,
})

export const GenerationRequestError = atom({
    key: 'generationRequestError',
    default: '',
})

export const SiteTheme = atom<Theme>({
    key: 'siteTheme',
    default: Dark,
})

export const ModalsOpen = atom({
    key: 'modalOpen',
    default: 0,
})

export const SplashModalOpen = atom<boolean | undefined>({
    key: 'splashModalOpen',
    default: undefined,
})

export const SettingsModalOpen = atom({
    key: 'settingsModalOpen',
    default: -1,
})

export const SaveStatus = atom({
    key: 'saveStatus',
    default: '',
})

export const SubscriptionDialogOpen = atom({
    key: 'subscriptionDialogOpen',
    default: { open: false, blocked: false },
})

export const LorebookOpen = atom({
    key: 'lorebookOpen',
    default: false,
})

export const SelectedLorebookEntry = atom({
    key: 'seleectedlorebookentry',
    default: '',
})

export const LorebookGenerateClipboard = atom({
    key: 'lorebookgenerateclipboard',
    default: { text: '', group: '' },
})

export const LorebookGenerateKeysInput = atom({
    key: 'lorebookgeneratekeysinput',
    default: '',
})

export const TokenProbOpen = atom({
    key: 'tokenProbOpen',
    default: false,
})

export const UserPresets = atom({
    key: 'presets',
    default: new Array<StoryPreset>(),
})

export const CustomModules = atom({
    key: 'modules',
    default: new Array<AIModule>(),
})

export const UpdateNotesVisible = atom({
    key: 'updatenotesvisible',
    default: false,
})
export const UpdateNotesUnread = atom({
    key: 'updatenotesunread',
    default: false,
})

export const UpdateNotes = atom({
    key: 'updatenotes',
    default: new Array<UpdateNote>(),
})

export const PrefixTrainingOpen = atom({
    key: 'prefixtrainingopen',
    default: false,
})

export const InputModes = atom({
    key: 'inputmodes',
    default: DefaultInputModes,
    dangerouslyAllowMutability: true,
})

export const SelectedInputMode = atom({
    key: 'selectedinputmode',
    default: DefaultInputModes[0],
    dangerouslyAllowMutability: true,
})

export const ContextViewerPage = atom({
    key: 'contextviewer',
    default: -1,
})

export const TokenizerOpen = atom({
    key: 'tokenizeropen',
    default: false,
})

export const TokenizerText = atom({
    key: 'tokenizertext',
    default: '',
})

export const StorySearch = atom({
    key: 'storysearch',
    default: '',
})
export const StorySort = atom({
    key: 'storysort',
    default: {
        reverse: false,
        by: {
            label: 'Most Recent',
            value: 'recent',
        },
    },
})

export const ScenarioSelected = atom({
    key: 'scenarioSelected',
    default: 0,
})

export const LorebookSearch = atom({
    key: 'loresearch',
    default: '',
})
export const LorebookSort = atom({
    key: 'loresort',
    default: {
        reverse: false,
        by: {
            label: 'Alphabetical',
            value: 'alphabetical',
        },
    },
})

interface UserPromptModalChoice {
    label: string
    text: JSX.Element
    hint?: string
    options: Array<{ text: string | JSX.Element; onClick: () => void; color?: string }>
}
export const UserPromptModal = atom<null | UserPromptModalChoice>({
    key: 'userpromptmodal',
    default: null,
})

export const TutorialState = atom({
    key: 'tutorial',
    default: {
        state: -1,
        next: () => {
            //
        },
        prev: () => {
            //
        },
    },
})

export const MenuBarOpen = atom({
    key: 'menubaropen',
    default: false,
})

export const InfoBarOpen = atom({
    key: 'infobaropen',
    default: false,
})

export const ShowTutorial = atom({
    key: 'showtutorial',
    default: false,
})

export const RemeteSaveFailed = atom({
    key: 'remoteSaveFailed',
    default: '',
})

export const AppUpdateAvailable = atom({
    key: 'appUpdateAvailable',
    default: false,
})

export const ThemePreview = atom({
    key: 'themePreview',
    default: Dark,
})

export const TrialUsageRemaining = atom({
    key: 'trialRemainingActions',
    default: 0,
})

export const TrialUsedModal = atom({
    key: 'trialUsed',
    default: false,
})

export const IPLimitModal = atom({
    key: 'ipLimitModal',
    default: false,
})

export const LorebookGenerateOpen = atom({
    key: 'lorebookGenerateOpen',
    default: false,
})

export const LorebookGeneratedExpanded = atom({
    key: 'lorebookGenerateExpanded',
    default: false,
})

export const InfobarSelectedTab = atom({
    key: 'infobarSelectedTab',
    default: 0,
})

export interface LorebookTabData {
    entry: string
    category: string
    pinnedEntry: string
    pinnedCategory: string
}

export enum LorebookEntryTabs {
    Entry = 'tab-entry',
    Context = 'tab-context',
    Bias = 'tab-bias',
    None = '',
}

export enum LorebookCategoryTabs {
    Defaults = 'tab-category-defaults',
    Subcontext = 'tab-category-subcontext',
    Bias = 'tab-category-bias',
    None = '',
}

export const LorebookTabs = atom({
    key: 'lorebookTabs',
    default: {
        entry: LorebookEntryTabs.Entry,
        category: LorebookCategoryTabs.Defaults,
        pinnedEntry: LorebookEntryTabs.None,
        pinnedCategory: LorebookCategoryTabs.None,
    },
})

export const GiftKeyOpen = atom({
    key: 'giftKeyOpen',
    default: false,
})

export const ScreenshotModalState = atom({
    key: 'screenshotState',
    default: {
        open: false,
        start: 0,
        end: 0,
    },
})

export const DebugSettings = atom({
    key: 'debugSettings',
    default: false,
})

export const TTSState = atom({
    key: 'ttsState',
    default: {
        paused: false,
        stopped: true,
        commentSpeaking: false,
    },
})

export const CommentState = atom({
    key: 'commentState',
    default: {
        text: '',
        generating: false,
        streaming: false,
        hidden: true,
        image: null as null | { id: any; img: PlatformImageData; alt: string },
    },
})

export const TipState = atom({
    key: 'tipState',
    default: {
        tip: -1,
        easterEggTip: -1,
    },
})

export const CheckEditor = atom({
    key: 'checkEditor',
    default: 0,
})
