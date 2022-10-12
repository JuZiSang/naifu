import { Theme } from './theme'

export const GruvbixDark: Theme = {
    name: 'Gruvbox Dark',
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
        bg0: '#1C1C1C',
        bg1: '#232323',
        bg2: '#282828',
        bg3: '#3C3836',
        textHeadings: '#B8BA37',
        textMain: '#EBDAB2',
        textHeadingsOptions: ['#B8BA37', '#F84B3C', '#C264D1', '#00BF63'],
        textMainOptions: ['#EBDAB2'],
        textDisabled: '#EBDAB2A0',
        textPlaceholder: '#EBDAB277',
        warning: '#D61F1F',
        textHighlight: 'rgba(214, 31, 31, 0.4)',
        textPrompt: '#B8BA37',
        textUser: '#F84B3C',
        textEdit: '#7dca93',
        textAI: '#FFFFFF',
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
