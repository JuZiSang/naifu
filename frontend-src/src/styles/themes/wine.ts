import { Theme } from './theme'

export const Wine: Theme = {
    name: 'Wine',
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
        bg0: '#2E1622',
        bg1: '#351D29',
        bg2: '#38202C',
        bg3: '#3E2230',
        textHeadings: '#ABE471',
        textMain: '#C6D1AE',
        textHeadingsOptions: ['#ABE471', '#E4DF71', '#B74848', '#96C3C6'],
        textMainOptions: ['#C6D1AE'],
        textDisabled: '#C6D1AEA0',
        textPlaceholder: '#C6D1AE77',
        warning: '#D31E5F',
        textHighlight: 'rgba(211, 30, 95, 0.4)',
        textPrompt: '#ABE471',
        textUser: '#FFD2B9',
        textEdit: '#BF8BB0',
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
