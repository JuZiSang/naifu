import { Theme } from './theme'

export const CounterMilitant: Theme = {
    name: 'Counter Militant',
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
        bg0: '#21312A',
        bg1: '#2B3B34',
        bg2: '#2F3F38',
        bg3: '#30463D',
        textHeadings: '#B49E69',
        textMain: '#C3E5C2',
        textHeadingsOptions: ['#B49E69', '#69B0B4', '#BBB052', '#9F8F9F'],
        textMainOptions: ['#C3E5C2'],
        textDisabled: '#C3E5C2A0',
        textPlaceholder: '#C3E5C277',
        warning: '#BD3D3D',
        textHighlight: 'rgba(189, 61, 61, 0.4)',
        textPrompt: '#B49E69',
        textUser: '#A3FFBC',
        textEdit: '#c3e5c2',
        textAI: '#C3E5C2',
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
