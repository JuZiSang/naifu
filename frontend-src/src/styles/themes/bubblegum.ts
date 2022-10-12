import { Theme } from './theme'

export const Bubblegum: Theme = {
    name: 'Bubblegum',
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
        bg0: '#DCA7D7',
        bg1: '#F5C4F1',
        bg2: '#F6D3F3',
        bg3: '#FFE0FC',
        textHeadings: '#5D69DE',
        textMain: '#511466',
        textHeadingsOptions: ['#5D69DE', '#C21A57', '#2EB099', '#D356FF'],
        textMainOptions: ['#511466'],
        textDisabled: '#511466A0',
        textPlaceholder: '#51146677',
        warning: '#EB0F78',
        textHighlight: 'rgba(235, 15, 120, 0.4)',
        textPrompt: '#5D69DE',
        textUser: '#E72CC9',
        textEdit: '#b54071',
        textAI: '#511466',
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
