import { Theme } from './theme'

export const Monkey: Theme = {
    name: 'Monkey',
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
        bg0: '#007FDA',
        bg1: '#0093EE',
        bg2: '#009DF8',
        bg3: '#20ADFF',
        textHeadings: '#FFFB32',
        textMain: '#FFFFFF',
        textHeadingsOptions: ['#FFFB32', '#57F287', '#180F7E', '#ACF5FF'],
        textMainOptions: ['#FFFFFF'],
        textDisabled: '#FFFFFFA0',
        textPlaceholder: '#FFFFFF77',
        warning: '#A00000',
        textHighlight: 'rgba(160, 0, 0, 0.4)',
        textPrompt: '#d7fff7',
        textUser: '#FFFFFF',
        textEdit: '#57F287',
        textAI: '#FFE300',
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
