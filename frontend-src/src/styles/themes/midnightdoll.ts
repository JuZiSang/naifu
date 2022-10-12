import { Theme } from './theme'

export const MidnightDoll: Theme = {
    name: 'Midnight Doll',
    fonts: {
        default: `"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", \
            "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`,
        code: `"Source Code Pro", Menlo, Monaco, Consolas, "Courier New", monospace`,
        field: `"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", \
            "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`,
        headings: `"Eczar"`,
        selectedHeadings: `Eczar`,
        selectedDefault: `Source Sans Pro`,
    },
    colors: {
        bg0: '#000000',
        bg1: '#010101',
        bg2: '#020202',
        bg3: '#131313',
        textHeadings: '#ff51c5',
        textMain: '#fafafa',
        textHeadingsOptions: ['#ff30be', '#EC56A7', '#ffffff', '#9773FF'],
        textMainOptions: ['#FFFFFF', '#E7FFE9', '#e1c8ff', '#ffcef1'],
        textDisabled: 'rgba(250,250,250,0.56)',
        textPlaceholder: 'rgba(250,250,250,0.38)',
        warning: '#ff00a4',
        textHighlight: 'rgba(94, 94, 94, 0.4)',
        textPrompt: '#a7a7a7',
        textUser: '#ffffff',
        textEdit: '#ffa3e5',
        textAI: '#ff51c5',
    },
    breakpoints: {
        mobile: '1200px',
        desktop: '1600px',
    },
    transitions: {
        interactive: '0.08s ease-in-out',
    },
    global: '',
}
