import { Theme } from './theme'

export const Slate: Theme = {
    name: 'Slate',
    fonts: {
        default: `"Atkinson Hyperlegible", -apple-system, BlinkMacSystemFont, "Segoe UI", \
            "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`,
        code: `"Source Code Pro", Menlo, Monaco, Consolas, "Courier New", monospace`,
        field: `"Atkinson Hyperlegible", -apple-system, BlinkMacSystemFont, "Segoe UI", \
            "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`,
        headings: `"Kanit"`,
        selectedHeadings: `Kanit`,
        selectedDefault: `Atkinson Hyperlegible`,
    },
    colors: {
        bg0: '#000000',
        bg1: '#02030B',
        bg2: '#02030B',
        bg3: '#1E2231',
        textHeadings: '#71FFC3',
        textMain: '#9B9EB8',
        textHeadingsOptions: ['#F5F3C2', '#EC56A7', '#75CF67', '#9773FF'],
        textMainOptions: ['#FFFFFF', '#E7FFE9', '#FFF9C8', '#A5C9FF'],
        textDisabled: 'rgba(155,158,184,0.56)',
        textPlaceholder: 'rgba(155,158,184,0.38)',
        warning: '#ff3838',
        textHighlight: 'rgba(128, 129, 255, 0.4)',
        textPrompt: '#71FFC3',
        textUser: '#9B9EB8',
        textEdit: '#7d84c3',
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
