import { Theme } from './theme'

export const Matrix: Theme = {
    name: 'Matrix',
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
        bg1: '#090909',
        bg2: '#090909',
        bg3: '#141714',
        textHeadings: '#5EFF50',
        textMain: '#FFFFFF',
        textHeadingsOptions: ['#5EFF50', '#FF9900', '#FF5050', '#FFF850'],
        textMainOptions: ['#FFFFFF'],
        textDisabled: '#FFFFFFA0',
        textPlaceholder: '#FFFFFF77',
        warning: '#FF134C',
        textHighlight: 'rgba(255, 19, 76, 0.4)',
        textPrompt: '#5EFF50',
        textUser: '#FFB1F7',
        textEdit: '#ffea2d',
        textAI: '#D0FFCF',
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
