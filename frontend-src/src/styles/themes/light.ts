import { Theme } from './theme'

export const Light: Theme = {
    name: 'NovelAI Light',
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
        bg0: '#D3D0DB',
        bg1: '#E2E0E8',
        bg2: '#EEECF4',
        bg3: '#FAFBFF',
        textHeadings: '#855611',
        textMain: '#464058',
        textHeadingsOptions: ['#855611', '#509397', '#BB4FB0', '#138511'],
        textMainOptions: ['#464058'],
        textDisabled: '#464058A0',
        textPlaceholder: '#46405877',
        warning: '#FF7878',
        textHighlight: 'rgba(255, 120, 120, 0.4)',
        textPrompt: '#855611',
        textUser: '#7762B0',
        textEdit: '#4e8d5c',
        textAI: '#464058',
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
