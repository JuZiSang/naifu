import { Theme } from './theme'

export const Sand: Theme = {
    name: 'Sand',
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
        bg0: '#DFCDA4',
        bg1: '#EBDAB4',
        bg2: '#FBF0C9',
        bg3: '#FFF4CB',
        textHeadings: '#AB0613',
        textMain: '#3C3836',
        textHeadingsOptions: ['#AB0613', '#10838A', '#876C0E', '#386831'],
        textMainOptions: ['#3C3836'],
        textDisabled: '#3C3836A0',
        textPlaceholder: '#3C383677',
        warning: '#FF0000',
        textHighlight: 'rgba(255, 0, 0, 0.4)',
        textPrompt: '#8f3c20',
        textUser: '#39588a',
        textEdit: '#98044e',
        textAI: '#2e2e2e',
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
