import { Theme } from './theme'

export const WinterLight: Theme = {
    name: 'Merry & Write',
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
            background: url(/videos/winter_light.webp);
            height: 100%;
            width: 100%;
            position: absolute;
            background-size: 1280px 720px;
            left: 0;
            top: 0;
            opacity: 0.56;
            filter: blur(3px);
            animation: shiftoverr 100s;
            animation-iteration-count: infinite;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
        }
        #__next::before{
            content: "";
            background: url(/videos/winter_light.webp);
            height: 100%;
            width: 100%;
            position: absolute;
            left: 0;
            top: 0;
            opacity: 0.95;
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
        body {
            background: #D3D0DB !important;
        }
    `,
    preview: '/videos/winter_light_small.webp',
}
