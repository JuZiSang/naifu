import { Theme } from './theme'

export const Vibrowave: Theme = {
    name: 'Vibrowave',
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
        bg0: '#00001E',
        bg1: '#09032C',
        bg2: '#0D0637',
        bg3: '#191145',
        textHeadings: '#CC308D',
        textMain: '#FFFDD2',
        textHeadingsOptions: ['#CC308D', '#30CCCC', '#E4BA25', '#FF0000'],
        textMainOptions: ['#FFFDD2'],
        textDisabled: '#FFFDD2A0',
        textPlaceholder: '#FFFDD277',
        warning: '#FF5C46',
        textHighlight: 'rgba(255, 92, 70, 0.4)',
        textPrompt: '#CC308D',
        textUser: '#FF4A4A',
        textEdit: '#b336ff',
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
