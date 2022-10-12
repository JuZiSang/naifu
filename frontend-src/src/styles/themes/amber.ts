import { Theme } from './theme'

export const Amber: Theme = {
    name: 'Amber',
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
        bg0: '#1F0100',
        bg1: '#33150B',
        bg2: '#3D1F15',
        bg3: '#4E2A1E',
        textHeadings: '#FFCE70',
        textMain: '#F7F7F7',
        textHeadingsOptions: ['#FFCE70', '#FF5B5B', '#D3FF9A', '#7FBCC0'],
        textMainOptions: ['#F7F7F7'],
        textDisabled: '#F7F7F7A0',
        textPlaceholder: '#F7F7F777',
        warning: '#FF5631',
        textHighlight: 'rgba(255, 86, 49, 0.4)',
        textPrompt: '#FFCE70',
        textUser: '#DB6E6E',
        textEdit: '#f69e6c',
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
