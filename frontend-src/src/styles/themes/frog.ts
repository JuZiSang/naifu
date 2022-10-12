import { Theme } from './theme'

export const Frog: Theme = {
    name: 'Frog',
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
        bg0: '#A4C37E',
        bg1: '#B4D986',
        bg2: '#F6EEAF',
        bg3: '#E8E0A5',
        textHeadings: '#633376',
        textMain: '#100F20',
        textHeadingsOptions: ['#633376', '#78849A', '#00B111', '#B23E3E'],
        textMainOptions: ['#100F20'],
        textDisabled: '#100F20A0',
        textPlaceholder: '#100F2077',
        warning: '#E82929',
        textHighlight: 'rgba(232, 41, 41, 0.4)',
        textPrompt: '#633376',
        textUser: '#0A7800',
        textEdit: '#6867b0',
        textAI: '#100F20',
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
