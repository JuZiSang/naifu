import { css } from 'styled-components'

export const FullSize = css`
    height: 100%;
    margin: 0;
    padding: 0;
    width: 100%;
`

export const Sidebar = css`
    background: ${(props) => props.theme.colors.bg1};
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    max-width: 390px;
    min-width: 350px;
    position: relative;
    height: 100%;

    touch-action: pan-y;
    * {
        touch-action: pan-y;
    }
    transition: transform 0.25s ease-in-out;

    @media (max-width: 350px) {
        min-width: 100vw;
    }

    user-select: none;
    width: 20vw;
    z-index: 200;
`

export const Toggler = css`
    align-items: center;
    display: flex;
    position: absolute;
    user-select: none;
    z-index: 100;
    cursor: pointer;
    padding: 10px;
    background-color: ${(props) => props.theme.colors.bg1};
    .menu {
        font-size: 1.3rem;
        margin-bottom: -6px;
    }
`

export const ScreenReader = css`
    position: absolute !important; /* Outside the DOM flow */
    height: 1px;
    top: 0;
    left: 0;
    width: 1px; /* Nearly collapsed */
    overflow: hidden;
    clip: rect(1px 1px 1px 1px); /* IE 7+ only support clip without commas */
    clip: rect(1px, 1px, 1px, 1px); /* All other browsers */
`
