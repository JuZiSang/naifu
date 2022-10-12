import { Theme } from './theme'

export const WinterDark: Theme = {
    name: 'Novel Season',
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
        bg0: '#101224',
        bg1: '#1A1C2E',
        bg2: '#212335',
        bg3: '#2B2D3F',
        textHeadings: '#F5F3C2',
        textMain: '#FFFFFF',
        textHeadingsOptions: ['#F5F3C2', '#EC56A7', '#75CF67', '#9773FF'],
        textMainOptions: ['#FFFFFF', '#E7FFE9', '#FFF9C8', '#A5C9FF'],
        textDisabled: '#FFFFFFA0',
        textPlaceholder: '#FFFFFF77',
        warning: '#FF7878',
        textHighlight: 'rgba(255, 120, 120, 0.4)',
        textPrompt: '#F5F3C2',
        textUser: '#9CDCFF',
        textEdit: '#F4C7FF',
        textAI: '#FFFFFF',
    },
    breakpoints: {
        mobile: '1200px',
        desktop: '1600px',
    },
    transitions: {
        interactive: '0.08s ease-in-out',
    },
    global: `
        @keyframes shiftoverr {
            from { background-position: left 0px top 0px; }
            to { background-position: left 1280px top 720px; }
        }
        @keyframes shiftoverl {
            from { background-position: 0px 0px; }
            to { background-position: 2560px 1440px; }
        }
        #app{
            background: transparent;
        }
        #app::before{
            content: "";
            background: url(/videos/winter_dark.webp);
            height: 100%;
            width: 100%;
            position: absolute;
            background-size: 1280px 720px;
            left: 0;
            top: 0;
            opacity: 0.26;
            filter: blur(3px);
            animation: shiftoverr 100s;
            animation-iteration-count: infinite;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
        }
        #__next::before{
            content: "";
            background: url(/videos/winter_dark.webp);
            height: 100%;
            width: 100%;
            position: absolute;
            left: 0;
            top: 0;
            opacity: 0.15;
            filter: blur(6px);
            background-repeat: repeat;
            background-position: 32% 65%;
            background-size: 2560px 1440px;
            transform: scaleX(-1);
            animation: shiftoverl 120s;
            animation-iteration-count: infinite;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
        }
        .conversation {
            background: transparent !important;
        }
    `,
    preview: '/videos/winter_dark_small.webp',
}
