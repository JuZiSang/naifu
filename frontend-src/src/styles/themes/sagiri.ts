import { Theme } from './theme'

export const Sagiri: Theme = {
    name: 'Sagiri',
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
        bg0: '#E7C7D5',
        bg1: '#F1DBE5',
        bg2: '#F9F2F5',
        bg3: '#F2EBF1',
        textHeadings: '#6B916C',
        textMain: '#CD5582',
        textHeadingsOptions: ['#6B916C', '#855611', '#A099CA', '#8C0000'],
        textMainOptions: ['#CD5582'],
        textDisabled: '#CD5582A0',
        textPlaceholder: '#CD558277',
        warning: '#FF005C',
        textHighlight: 'rgba(255, 0, 92, 0.4)',
        textPrompt: '#6B916C',
        textUser: '#519DB4',
        textEdit: '#c793d3',
        textAI: '#CD5582',
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
