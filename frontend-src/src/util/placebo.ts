import { useEffect, useRef } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { normalizeModel, TextGenerationModel } from '../data/request/model'
import { LogitBiasGroup, TokenData, TokenDataFormat } from '../data/story/logitbias'
import { getUserSetting } from '../data/user/settings'
import { Session, SiteTheme } from '../globals/state'
import { DEFAULT_THEME } from '../styles/themes/theme'
import { adjustHue, complement, invert } from './colour'

export enum ThemePlacebo {
    ShiftText = 'shiftText',
    ShiftHeader = 'shiftHeader',
    ShiftBG0 = 'shiftBG0',
    ShiftBG1 = 'shiftBG1',
    ShiftBG2 = 'shiftBG2',
    ShiftBG3 = 'shiftBG3',
    ShiftWarning = 'shiftWarning',
    ShiftAI = 'shiftAI',
    ShiftEdit = 'shiftEdit',
    ShiftInput = 'shiftInput',
    ShiftPrompt = 'shiftPrompt',
    ShiftHighlight = 'shiftHighlight',
    ComicSans = 'comicSans',
    InvertColors = 'invertColors',
    ComplementColors = 'complementColors',
}

const weightedThemePlacebo = [
    { item: ThemePlacebo.ShiftText, weight: 30 },
    { item: ThemePlacebo.ShiftHeader, weight: 30 },
    { item: ThemePlacebo.ShiftBG0, weight: 20 },
    { item: ThemePlacebo.ShiftBG1, weight: 20 },
    { item: ThemePlacebo.ShiftBG2, weight: 20 },
    { item: ThemePlacebo.ShiftBG3, weight: 20 },
    { item: ThemePlacebo.ShiftWarning, weight: 30 },
    { item: ThemePlacebo.ShiftAI, weight: 30 },
    { item: ThemePlacebo.ShiftEdit, weight: 30 },
    { item: ThemePlacebo.ShiftInput, weight: 30 },
    { item: ThemePlacebo.ShiftPrompt, weight: 30 },
    { item: ThemePlacebo.ShiftHighlight, weight: 30 },
    { item: ThemePlacebo.ComicSans, weight: 1 },
    { item: ThemePlacebo.InvertColors, weight: 1 },
    { item: ThemePlacebo.ComplementColors, weight: 1 },
]

export function usePlaceboTheme(): void {
    const session = useRecoilValue(Session)
    const setSiteTheme = useSetRecoilState(SiteTheme)
    const timeoutRef = useRef<NodeJS.Timeout>()
    useEffect(() => {
        const activateThemePlacebo = () => {
            const placebo: ThemePlacebo = getWeightedChoice(weightedThemePlacebo)
            switch (placebo) {
                case ThemePlacebo.ShiftText:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            textMain: adjustHue(getRandomInt(20, -20), v.colors.textMain),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftHeader:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            textHeadings: adjustHue(getRandomInt(20, -20), v.colors.textHeadings),
                        },
                    }))

                    break
                case ThemePlacebo.ShiftBG0:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            bg0: adjustHue(getRandomInt(20, -20), v.colors.bg0),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftBG1:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            bg1: adjustHue(getRandomInt(20, -20), v.colors.bg1),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftBG2:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            bg2: adjustHue(getRandomInt(20, -20), v.colors.bg2),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftBG3:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            bg3: adjustHue(getRandomInt(20, -20), v.colors.bg3),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftWarning:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            warning: adjustHue(getRandomInt(20, -20), v.colors.warning),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftAI:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            textAI: adjustHue(getRandomInt(20, -20), v.colors.textAI),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftEdit:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            textEdit: adjustHue(getRandomInt(20, -20), v.colors.textEdit),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftInput:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            textUser: adjustHue(getRandomInt(20, -20), v.colors.textUser),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftPrompt:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            textPrompt: adjustHue(getRandomInt(20, -20), v.colors.textPrompt),
                        },
                    }))
                    break
                case ThemePlacebo.ShiftHighlight:
                    setSiteTheme((v) => ({
                        ...v,
                        colors: {
                            ...v.colors,
                            textHighlight: adjustHue(getRandomInt(20, -20), v.colors.textHighlight),
                        },
                    }))
                    break
                case ThemePlacebo.ComicSans:
                    setSiteTheme((v) => ({
                        ...v,
                        fonts: {
                            ...v.fonts,
                            default: 'Comic Sans MS,' + v.fonts.default,
                            headings: 'Comic Sans MS,' + v.fonts.headings,
                            field: 'Comic Sans MS,' + v.fonts.field,
                        },
                    }))
                    break
                case ThemePlacebo.ComplementColors:
                    setSiteTheme((v) => {
                        const colors = v.colors
                        const swappedColors: any = {}
                        for (const [key, value] of Object.entries(colors)) {
                            if (typeof value === 'string') swappedColors[key] = complement(value)
                        }
                        return { ...v, colors: { ...swappedColors } }
                    })

                    break
                case ThemePlacebo.InvertColors:
                    setSiteTheme((v) => {
                        const colors = v.colors
                        const swappedColors: any = {}
                        for (const [key, value] of Object.entries(colors)) {
                            if (typeof value === 'string') swappedColors[key] = invert(value)
                        }
                        return { ...v, colors: { ...swappedColors } }
                    })

                    break
            }
            timeoutRef.current = setTimeout(activateThemePlacebo, 600000)
        }
        if (!getUserSetting(session.settings, 'april2022')) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            setSiteTheme(getUserSetting(session.settings, 'siteTheme'))
            return
        }
        if (isNonsenseAllowed()) {
            timeoutRef.current = setTimeout(activateThemePlacebo, 600000)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getUserSetting(session.settings, 'april2022'), setSiteTheme])
}

export enum GenerationPlacebo {
    BiasRandom = 'biasRandom',
    Dinkus = 'dinkus',
    RandomModule = 'randomModule',
    AdjustSettings = 'adjustSettings',
    InsertOtherLoadedStory = 'insertOtherLoadedStory',
    InsertOtherUnloadedStory = 'insertOtherUnloadedStory',
    LoadedStoryLorebookEntry = 'loadedStoryLorebookEntry',
    FalseError = 'falseError',
    Nothing = 'nothing',
}

const weightedGenerationPayloads = [
    // Bias up random phrases
    { item: GenerationPlacebo.BiasRandom, weight: 1 },

    // Add invisible dinkus to context
    { item: GenerationPlacebo.Dinkus, weight: 1 },

    // User a random module for the generation
    { item: GenerationPlacebo.RandomModule, weight: 3 },

    // Randomly adjust all settings for the generation
    { item: GenerationPlacebo.AdjustSettings, weight: 2 },

    // Insert random text from another story in the cache into context
    { item: GenerationPlacebo.InsertOtherLoadedStory, weight: 3 },

    // As above but loads a new story into the cache. Will not load if number of stories in cache > 5
    { item: GenerationPlacebo.InsertOtherUnloadedStory, weight: 1 },

    // Chooses a random lorebook entry in a random other loaded story and inserts it into context
    { item: GenerationPlacebo.LoadedStoryLorebookEntry, weight: 2 },

    // Generates an error message instead of an output
    { item: GenerationPlacebo.FalseError, weight: 2 },

    // Does nothing
    { item: GenerationPlacebo.Nothing, weight: 15 },
]

export function chooseGenerationPlacebo(): GenerationPlacebo[] {
    const choices = []
    let chosen
    do {
        chosen = getWeightedChoice(weightedGenerationPayloads)
        choices.push(chosen)
    } while (Math.random() < 0.2)
    return choices
}

export function getRandomInt(max: number, min: number = 0): number {
    return Math.floor(Math.random() * (max - min)) + min
}

export function randomArrayElement<T>(arr: T[]): T {
    return arr[getRandomInt(arr.length, 0)]
}

function getWeightedChoice<T>(choices: { item: T; weight: number }[]) {
    let totalWeight = 0
    for (const c of choices) {
        totalWeight += c.weight
    }
    const chosen = getRandomInt(totalWeight, 1)
    let counter = 0
    for (const c of choices) {
        counter += c.weight
        if (chosen <= counter) return c.item
    }
    throw 'something broke'
}

const biasPhrases = [
    new TokenData(' Suddenly', TokenDataFormat.RawString),
    new TokenData('Suddenly', TokenDataFormat.RawString),
    new TokenData(' suddenly', TokenDataFormat.RawString),
    new TokenData('a sharp pain', TokenDataFormat.RawString),
    new TokenData('Priapus', TokenDataFormat.RawString),
    new TokenData(' Priapus', TokenDataFormat.RawString),
    new TokenData('***', TokenDataFormat.RawString),
    new TokenData(' smirt', TokenDataFormat.RawString),
    new TokenData(' Sans', TokenDataFormat.RawString),
    new TokenData('Sans', TokenDataFormat.RawString),
    new TokenData(' sans', TokenDataFormat.RawString),
]
export function getRandomPlaceboBias(model: TextGenerationModel): LogitBiasGroup {
    let bias = 1
    if (normalizeModel(model) === TextGenerationModel.krakev1) bias = 0.13
    const group = new LogitBiasGroup([randomArrayElement(biasPhrases)], bias)
    return group
}

export const adjustableParams = [
    'temperature',
    'top_k',
    'top_p',
    'top_a',
    'typical_p',
    'tail_free_sampling',
    'repetition_penalty',
    'repetition_penalty_range',
    'repetition_penalty_frequency',
    'repetition_penalty_presence',
]

function clamp(val: number, min: number, max: number) {
    return Math.min(max, Math.max(min, val))
}

export function adjustSetting(param: string, val: number): number {
    const direction = Math.random() <= 0.5 ? -1 : 1
    let newVal = val
    switch (param) {
        case 'temperature':
            newVal = clamp(val + direction * (getRandomInt(50) / 100), 0.1, 4)
            break
        case 'top_k':
            newVal = Math.floor(clamp(val + direction * getRandomInt(50), 1, 1000))
            break
        case 'top_p':
            newVal = clamp(val + direction * (getRandomInt(10) / 100), 0, 1)
            break
        case 'top_a':
            newVal = clamp(val + direction * (getRandomInt(10) / 100), 0, 1)
            break
        case 'typical_p':
            newVal = clamp(val + direction * (getRandomInt(10) / 100), 0, 1)
            break
        case 'tail_free_sampling':
            newVal = clamp(val + direction * (getRandomInt(10) / 100), 0, 1)
            break
        case 'repetition_penalty':
            newVal = clamp(val + direction * (getRandomInt(10) / 100), 1, 8)
            break
        case 'repetition_penalty_range':
            newVal = Math.floor(clamp(val + direction * getRandomInt(50), 1, 2048))
            break
        case 'repetition_penalty_frequency':
            newVal = clamp(val + direction * (getRandomInt(25) / 1000), 0, 2)
            break
        case 'repetition_penalty_presence':
            newVal = clamp(val + direction * (getRandomInt(25) / 100), 0, 2)
            break
    }
    return newVal
}

export function isNonsenseAllowed(): boolean {
    //Sun Apr 02 2022 00:00:00 local time
    const noNonsenseDate = new Date('2022-04-02T00:00:00')
    const date = new Date()
    // check if it's before april 3rd
    return date < noNonsenseDate || (window as any).placeboEnabled === 1
}
