import { Bubblegum } from './bubblegum'
import { Dark } from './dark'
import { Light } from './light'
import { Matrix } from './matrix'
import { Sand } from './sand'
import { SubtleTerminal } from './subtleterminal'
import { Sagiri } from './sagiri'
import { Monkey } from './monkey'
import { Wine } from './wine'
import { Ink } from './ink'
import { Vibrowave } from './vibrowave'
import { PurpleNoir } from './purplenoir'
import { GruvbixDark as GruvboxDark } from './gruvboxdark'
import { Frog } from './frog'
import { CounterMilitant } from './countermilitant'
import { Amber } from './amber'
import { DarkOld } from './darkold'
import { Slate } from './slate'
import { MidnightDoll } from './midnightdoll'

export const backupFonts = `, -apple-system, BlinkMacSystemFont, "Segoe UI", \
"Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`
export const mainFontOptions = [
    `Source Sans Pro`,
    `Montserrat`,
    `EB Garamond`,
    `Exo`,
    `Comic Sans MS`,
    `Consolas`,
    `Times New Roman`,
    `Atkinson Hyperlegible`,
]
export const headingsFontOptions = [
    `Eczar`,
    `Kanit`,
    `Josefin Sans`,
    `Playfair Display`,
    `Atkinson Hyperlegible`,
]

export const googleFonts = [
    `Montserrat`,
    `EB Garamond`,
    `Exo`,
    `Atkinson Hyperlegible`,
    `Kanit`,
    `Josefin Sans`,
    `Playfair Display`,
]

interface ThemeColors {
    bg0: string
    bg1: string
    bg2: string
    bg3: string
    textHeadings: string
    textMain: string
    textHeadingsOptions: string[]
    textMainOptions: string[]
    textDisabled: string
    textPlaceholder: string
    warning: string
    textHighlight: string
    textPrompt: string
    textUser: string
    textEdit: string
    textAI: string
    textHighProb?: string
    textLowProb?: string
    textMidProb?: string
}

export interface Theme {
    name: string
    fonts: {
        default: string
        code: string
        field: string
        headings: string
        selectedDefault: string
        selectedHeadings: string
    }
    colors: ThemeColors
    breakpoints: {
        mobile: string
        desktop: string
    }
    transitions: {
        interactive: string
    }
    global: string
    preview?: string
}

export const AvailableThemes = new Map([
    //['Novel Season', WinterDark],
    //['Merry & Write', WinterLight],
    ['NovelAI Dark', Dark],
    ['NovelAI Light', Light],
    ['Slate', Slate],
    ['Midnight Doll', MidnightDoll],
    ['Subtle Terminal', SubtleTerminal],
    ['Bubblegum', Bubblegum],
    ['Matrix', Matrix],
    ['Purple Noir', PurpleNoir],
    ['Sagiri', Sagiri],
    ['Monkey', Monkey],
    ['Ink', Ink],
    ['Wine', Wine],
    ['Vibrowave', Vibrowave],
    ['Sand', Sand],
    ['Gruvbox Dark', GruvboxDark],
    ['Counter Militant', CounterMilitant],
    ['Amber', Amber],
    ['Frog', Frog],
    ['NovelAI Dark (Legacy)', DarkOld],
])

const simpleColorComparisons: (keyof ThemeColors)[] = [
    'bg0',
    'bg1',
    'bg2',
    'bg3',
    'textDisabled',
    'warning',
    'textHighlight',
    'textPrompt',
    'textUser',
    'textEdit',
    'textAI',
]

export function themeEquivalent(a: Theme, b: Theme): boolean {
    // compare css
    if (a.global !== b.global) {
        return false
    }

    // compare colors, options are allowed
    if (!b.colors.textHeadingsOptions.includes(a.colors.textHeadings)) {
        return false
    }
    if (!b.colors.textMainOptions.includes(a.colors.textMain)) {
        return false
    }
    for (const val of simpleColorComparisons) {
        if (a.colors[val] !== b.colors[val]) {
            return false
        }
    }

    // compare transitions
    if (a.transitions.interactive !== b.transitions.interactive) {
        return false
    }

    // compare breakpoints
    if (a.breakpoints.mobile !== b.breakpoints.mobile) {
        return false
    }
    if (a.breakpoints.desktop !== b.breakpoints.desktop) {
        return false
    }
    return true
}

export { Dark as DEFAULT_THEME } from './dark'
