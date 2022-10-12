import { Theme } from './theme'

export const PurpleNoir: Theme = {
    name: 'Purple Noir',
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
        bg0: '#24172E',
        bg1: '#271A31',
        bg2: '#2C1F36',
        bg3: '#30223B',
        textHeadings: '#CFDC34',
        textMain: '#FFFFFF',
        textHeadingsOptions: ['#CFDC34', '#9EFFA2', '#BF6CBC', '#7EBDC6'],
        textMainOptions: ['#FFFFFF'],
        textDisabled: '#FFFFFFA0',
        textPlaceholder: '#FFFFFF77',
        warning: '#FF9878',
        textHighlight: 'rgba(255, 152, 120, 0.4)',
        textPrompt: '#F4FE81',
        textUser: '#B4D6B3',
        textEdit: '#b083bb',
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
