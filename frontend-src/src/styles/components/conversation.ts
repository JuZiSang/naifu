import styled from 'styled-components'
import { StoryMode } from '../../data/story/story'
import { Gradient } from '../animations'

export const ConversationContainer = styled.div`
    flex: 1;
    max-height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
`

export const ConversationMain = styled.div<{
    mode: StoryMode
    showRetryHighlight: boolean
    showUndoHighlight: boolean
}>`
    border: 1px solid
        ${(props) => (props.mode === StoryMode.adventure ? 'transparent' : props.theme.colors.bg3)};
    display: block;
    flex: 10;
    overflow: hidden;
    position: relative;
    height: 100%;
    min-height: 200px;
    flex-direction: column-reverse;
    ${(props) =>
        props.mode !== StoryMode.adventure
            ? `:focus-within  {
             background: ${props.theme.colors.bg1};
        }`
            : ''}
    ${(props) =>
        props.showRetryHighlight
            ? `
        .retryDeletionText {
            background-color: ${props.theme.colors.textHighlight};
        }`
            : ''}

    ${(props) =>
        props.showUndoHighlight
            ? `
            .undoDeletionText {
                background-color: ${props.theme.colors.textHighlight};
            }`
            : ''}
`

export const LoadingBar = styled.div<{ visible: boolean }>`
    height: 1px;
    position: relative;

    &::after {
        content: '';
        height: 1px;
        position: absolute;
        top: 0;
        width: 100%;
        background-image: linear-gradient(
            90deg,
            ${(props) => props.theme.colors.textHeadings} 0%,
            ${(props) => props.theme.colors.bg2} 40%,
            ${(props) => props.theme.colors.bg3} 60%,
            ${(props) => props.theme.colors.textHeadings} 100%
        );
        background-size: 200%;
        background-repeat: repeat-x;
        animation: ${Gradient} 2s linear infinite;
        opacity: ${(props) => (props.visible ? '1' : '0')};
        transition: opacity 0.2s ease-in-out;
    }
`
