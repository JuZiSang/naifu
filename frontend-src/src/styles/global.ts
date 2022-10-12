import { createGlobalStyle } from 'styled-components'
import { transparentize } from '../util/colour'
import { ConversationControls } from './components/conversationcontrols'

import { Dark } from './themes/dark'

export const CustomGlobalStyle = createGlobalStyle<{ global: string }>`
    ${(props) => props.global ?? ''}
`

export const GlobalStyle = createGlobalStyle<{
    theme: typeof Dark
    fontSize: number
    outputFontSize: number
    paragraphIndent: number
    lineSpacing: number
    paragraphSpacing: number
    editorHighlighting: boolean
    buttonScale: number
    focusBorder: boolean
}>`
    html {
        font-size: ${(props) => `${props.fontSize.toFixed(1)}px`};
        line-height: 1.5;
    }
    body {
        font-family: ${(props) => `${props.theme.fonts.default}`};
        color: ${(props) => props.theme.colors.textMain};
        --loader-color: ${(props) => props.theme.colors.textHeadings};
    }

    * {
        scrollbar-width: thin;
        color: inherit;
    }

    input::placeholder,
    textarea::placeholder {
        opacity: 1;
        color: ${(props) => props.theme.colors.textPlaceholder};
    }

    code {
        font-family: ${(props) => props.theme.fonts.code};
        font-size: 0.9rem;
    }

    div {
        word-break: break-word;
    }

    a {
        color: ${(props) => props.theme.colors.textMain};
        text-decoration: none;
        font-weight: 600;

        &:hover {
            color: ${(props) => props.theme.colors.textHeadings};
            text-decoration: none;
        }
    }

    strong {
        font-weight: 600;
    }

    input,
    textarea {
        background: ${(props) => props.theme.colors.bg0};
        border: 0;
        color: ${(props) => props.theme.colors.textMain};
        font-family: ${(props) => props.theme.fonts.field};
        font-size: 0.875rem;
        padding: 10px 0 10px 10px;
        resize: none;
        width: 100%;
        touch-action: pan-y;

    }
    button{
        font: inherit;
        font-weight: 600;
    }
    h1, h2, h3, h4, h5, h6 {
        margin: 0 0 0.5rem;
    }
    p {
        margin: 0 0 1rem;
    }


    input, [role="button"], textarea, button {
        &:focus{
            outline-color: ${(props) => props.theme.colors.textMain};
        }

        &:active{
            outline-width: 0 !important;
        }

        ${(props) =>
            props.focusBorder
                ? `
                `
                : `
                &:focus{
                    outline-width: 0;
                }

                `}

    }

    label {
        font-size: 0.875rem;
    }

    button:disabled {
        color: ${(props) => props.theme.colors.textDisabled};
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        color: ${(props) => props.theme.colors.textHeadings};
        font-family: ${(props) => props.theme.fonts.headings};
        font-weight: 600;
        letter-spacing: 0.5px;
    }

    ::-webkit-scrollbar-track {
        background: none;
    }

    ::-webkit-scrollbar {
        height: 14px;
        width: 14px;
    }

    ::-webkit-scrollbar-thumb {
        background-clip: padding-box;
        background-color: ${(props) => props.theme.colors.bg3};
        border: 5px solid transparent;
        border-radius: 15px;
    }

    ::-webkit-scrollbar-corner{
        display:none;
    }

    button[disabled] { pointer-events: none; }

    ::-webkit-scrollbar-button {
        display: none;
        height: 0;
        width: 0;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    input[type='number'] {
        -moz-appearance: textfield;
    }

    .multi-line {
        color: black;
    }
    .select {
        box-shadow: 0 0 1px 0 ${(props) => transparentize(0.4, props.theme.colors.textMain)};;
    }

    .ProseMirror {
        touch-action: pan-y;
        background: transparent;
        border: 0;
        color: rgba(230, 230, 230, 0.863);
        padding: 10px 0 10px 10px;
        resize: none;
        width: 100%;
        min-height: 100%;
        // fix for stuttering scrollbar with LanguageTool / Grammarly
        height: min-content;
        flex: 1;
        word-break: break-word;
        overflow: visible;
        position: relative;
        text-rendering: optimizeSpeed;

        font-family: ${(props) => props.theme.fonts.field};
        font-size: ${(props) => `${props.outputFontSize.toFixed(1)}px`};
        line-height: ${(props) => `${props.lineSpacing.toFixed(2)}em`};;
        color: ${(props) => props.theme.colors.textMain};
        transition: background-color ${(props) => props.theme.transitions.interactive};

        p {
            margin: 0;
        }
        & > p {
            color: ${(props) =>
                props.editorHighlighting ? props.theme.colors.textPrompt : props.theme.colors.textMain};
        }

        p.empty-node::before {
            float: left;
            color: #aaa;
            pointer-events: none;
            height: 0;
            font-style: italic;
        }
        p.empty-node:first-child::before {
            content: 'Enter your prompt here…';
            color: ${(props) => props.theme.colors.textPlaceholder};
            font-style: normal;
        }
        p:not(.empty-node) {
            text-indent: ${(props) => props.paragraphIndent}px;
            padding-bottom:  ${(props) => props.paragraphSpacing}em;
        }

        .highlight {
            border-radius: 3px;
            background-color: ${(props) => props.theme.colors.textHighlight};
        }
        .link {
            cursor: pointer;
            border-bottom: 2px solid ${(props) => transparentize(0.5, props.theme.colors.textHeadings)};
        }
        .lorekey {
            font-weight: 700;
            border-radius: 3px;
            :hover {
                background: ${(props) => props.theme.colors.textHighlight};
            }
        }

        .aiText {
            color: ${(props) =>
                props.editorHighlighting ? props.theme.colors.textAI : props.theme.colors.textMain};
        }
        .userText {
            color: ${(props) =>
                props.editorHighlighting ? props.theme.colors.textUser : props.theme.colors.textMain};
        }
        .editText {
            color: ${(props) =>
                props.editorHighlighting ? props.theme.colors.textEdit : props.theme.colors.textMain};
        }
        .promptText {
            color: ${(props) =>
                props.editorHighlighting ? props.theme.colors.textPrompt : props.theme.colors.textMain};
        }

        .bold {
            font-weight: 700;
        }
        .italic {
            font-style: italic;
        }
        .underline {
            text-decoration: underline;
        }
        .strikethrough {
            text-decoration: line-through;
        }

    }
    .ProseMirror-focused {
        outline: none !important;
    }

    .grecaptcha-badge {
        visibility: hidden;
    }

    .conversation-controls {
        font-size: ${(props) => props.buttonScale}rem;
    }


    .svg-color-bg0.svg-fill{
        fill: ${(props) => props.theme.colors.bg0};
    }
    .svg-color-textHeadings.svg-fill{
        fill: ${(props) => props.theme.colors.textHeadings};
    }
    .svg-color-textMain.svg-fill{
        fill: ${(props) => props.theme.colors.textMain};
    }
    .svg-color-bg3.svg-fill{
        fill: ${(props) => props.theme.colors.bg3};
    }
    .svg-color-bg0.svg-stroke{
        stroke: ${(props) => props.theme.colors.bg0};
    }
    .svg-color-textHeadings.svg-stroke{
        stroke: ${(props) => props.theme.colors.textHeadings};
    }
    .svg-color-textMain.svg-stroke{
        stroke: ${(props) => props.theme.colors.textMain};
    }
    .svg-color-bg3.svg-stroke{
        stroke: ${(props) => props.theme.colors.bg3};
    }

    .comment-box {
        font-size: ${(props) => props.outputFontSize.toFixed(1)}px;
    }
`
