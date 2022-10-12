import { Theme } from './theme'

export const Ink: Theme = {
    name: 'Ink',
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
        bg0: '#E5E1D3',
        bg1: '#F0EDE3',
        bg2: '#f5f2e8',
        bg3: '#FBF8EE',
        textHeadings: '#0A1465',
        textMain: '#30304B',
        textHeadingsOptions: ['#0A1465', '#680971', '#650B0B', '#22691C'],
        textMainOptions: ['#30304B'],
        textDisabled: '#30304BA0',
        textPlaceholder: '#30304B77',
        warning: '#FF7354',
        textHighlight: 'rgba(255, 115, 84, 0.4)',
        textPrompt: '#71562e',
        textUser: '#047065',
        textEdit: '#8c0202',
        textAI: '#382e55',
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
