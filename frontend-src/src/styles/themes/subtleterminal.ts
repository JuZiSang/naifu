import { Theme } from './theme'

export const SubtleTerminal: Theme = {
    name: 'Subtle Terminal',
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
        bg0: '#1E2129',
        bg1: '#252931',
        bg2: '#282C34',
        bg3: '#333842',
        textHeadings: '#57B260',
        textMain: '#F7F7F7',
        textHeadingsOptions: ['#57B260', '#5199AF', '#C56565', '#8B6BBF'],
        textMainOptions: ['#F7F7F7'],
        textDisabled: '#F7F7F7A0',
        textPlaceholder: '#F7F7F777',
        warning: '#FFA5A5',
        textHighlight: 'rgba(255, 165, 165, 0.4)',
        textPrompt: '#57B260',
        textUser: '#A6DFFF',
        textEdit: '#fff8be',
        textAI: '#F7F7F7',
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
