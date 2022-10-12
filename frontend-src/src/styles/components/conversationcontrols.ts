import styled, { css } from 'styled-components'
import { Shake } from '../animations'
import { Button } from '../ui/button'
import { Icon } from '../ui/icons'
import ArrowDown from '../../assets/images/directional_arrow_down.svg'
import ArrowUp from '../../assets/images/directional_arrow_up.svg'
import Reload from '../../assets/images/reload.svg'
import { StoryMode } from '../../data/story/story'

export const ConversationInputContainer = styled.div<{ mode: StoryMode; inputModeIcon: string }>`
    position: relative;
    ${(props) =>
        props.mode === StoryMode.adventure
            ? css`
                  border: 1px solid ${props.theme.colors.bg3};
                  padding-left: 50px;
                  &:before {
                      content: '';
                      background: ${props.theme.colors.bg1};
                      width: 50px;
                      height: 100%;
                      position: absolute;
                      left: 0;
                      border-right: 1px solid ${(props) => props.theme.colors.bg3};
                  }
                  &:after {
                      content: '';
                      background-position: center;
                      background-size: contain;
                      background-repeat: no-repeat;
                      mask-repeat: no-repeat;
                      mask-size: contain;
                      mask-position: center;
                      background-color: ${(props) => props.theme.colors.textMain};
                      mask-image: url(${props.inputModeIcon});
                      width: 20px;
                      height: 20px;
                      position: absolute;
                      left: 15px;
                      top: 15px;
                      opacity: 0.9;
                  }
              `
            : css``}
`

export const ConversationInput = styled.textarea`
    background: ${(props) => props.theme.colors.bg1};
    flex: 0;
    min-height: 80px;
    min-height: 80px;
    resize: none;
    font-size: 1rem;
`

export const ConversationStoryControls = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    background: ${(props) => props.theme.colors.bg1};
    font-size: 0.8rem;
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    padding: 5px;
    & > *:not(:last-child) {
        margin-right: 10px;
    }
`

export const ConversationControlsContainer = styled.div<{ visible: boolean }>`
    pointer-events: ${(props) => (props.visible ? 'normal' : 'none')};
`

export const ConversationControlsContent = styled.div<{ visible: boolean; reversed: boolean }>`
    margin-top: 15px;

    opacity: ${(props) => (props.visible ? 1 : 0)};
    position: relative;
    transition: opacity 0.32s ease-in-out, margin-bottom 0.32s ease-in-out;

    display: flex;
    flex-direction: ${(props) => (props.reversed ? 'column-reverse' : 'column')};
    ${(props) =>
        props.reversed
            ? css`
                  & > :not(:first-child) {
                      margin-bottom: 0.5rem;
                  }
              `
            : css`
                  & > :not(:last-child) {
                      margin-bottom: 0.5rem;
                  }
              `};
`

export const ConversationControls = styled.div`
    display: flex;
    flex-direction: row;
    user-select: none;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    @media (max-width: ${(props) => props.theme.breakpoints.mobile}) {
        margin-bottom: 0px;
    }
`

export const ConversationControlsGroup = styled.div`
    display: flex;
    flex-direction: row;
    user-select: none;
    gap: 8px;
    align-items: flex-end;
    flex-wrap: wrap;
`

export const UndoMenuArrow = styled(Icon)<{ up: boolean }>`
    margin-top: -0.1em;
    mask-image: url(${(props) => (props.up ? ArrowUp.src : ArrowDown.src)});
    width: 0.5em;
`

export const RequestErrorInfo = styled.div<{ visible: boolean }>`
    align-items: center;
    color: ${(props) => props.theme.colors.warning};
    display: flex;
    font-size: 1rem;
    flex: 1;
    &:not(:empty) {
        @media (max-width: ${(props) => props.theme.breakpoints.mobile}) {
            margin-bottom: 0.5rem;
        }
    }
    &:empty {
        margin-bottom: 0;
        margin-top: 0;
    }

    ${(props) =>
        props.visible
            ? null
            : css`
                  animation: ${Shake} 0.3s forwards;
              `}
`

export const RedoContainer = styled.div`
    width: fit-content;
    flex-shrink: 0;
    display: flex;
    gap: 1px;
`

export const RedoOption = styled(Button)<{ preferred?: boolean }>`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 15px;
    width: 100%;
    font-size: 1em;
    line-height: 1.5em;
    background: ${(props) => (props.preferred ? props.theme.colors.bg1 : props.theme.colors.bg1)};
    position: relative;
    padding-right: 25px;
    &::after {
        content: '';
        position: absolute;
        right: 0;
        mask-image: url(${Reload.src});
        mask-repeat: no-repeat;
        mask-size: contain;
        mask-position: center;
        background-color: ${(props) => props.theme.colors.textHeadings};
        height: 16px;
        width: 16px;
        margin-right: 5px;
        display: ${(props) => (props.preferred ? 'block' : 'none')};
        opacity: 0.3;
    }
    > div {
        margin: 0;
        overflow: hidden;
        padding: 0;
        align-items: center;
        display: flex;
        flex-direction: row;
        text-align: start;
        div:first-child {
            width: 10px;
            margin-right: 10px;
            background-color: ${(props) => props.theme.colors.textHeadings};
            flex-shrink: 0;
        }
        div:last-child {
            text-overflow: ellipsis;

            //white-space: nowrap;
            // Should be replaced with line-clamp when/if it becomes availiable
            // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
        }

        &:nth-child(2n) {
            margin-left: 10px;
        }
    }
`
export const RedoScrollWrapper = styled.div`
    background-color: ${(props) => props.theme.colors.bg1};
    max-height: 40vh;
    overflow-y: auto;
    bottom: 100%;
    display: flex;
    flex-direction: column-reverse;
    left: 0;
    position: absolute;
    width: 100%;
    box-shadow: 0 0 3px 0 ${(props) => props.theme.colors.bg3};
    z-index: 1;
`

export const RedoMenu = styled.div`
    background-color: ${(props) => props.theme.colors.bg1};
    display: flex;
    flex-direction: column;
    width: 100%;
`

export const ControlText = styled.span<{ icon?: string; show?: boolean }>`
    @media (max-width: 800px) {
        display: ${(props) => (props.show ? 'block' : 'none')};
    }
    @media (max-width: 500px) {
        display: none;
    }
`

export const ControlIcon = styled.div<{ swap: boolean; icon?: string }>`
    display: ${(props) => (!props.swap ? 'block' : 'none')};
    @media (max-width: 800px) {
        display: block;
    }

    background-color: ${(props) => props.theme.colors.textMain};
    mask-image: url(${(props) => props.icon ?? ''});
    mask-repeat: no-repeat;
    mask-size: contain;
    -webkit-mask-position: center center;
    mask-position: center center;
    width: 1em;
    margin-top: 0;
    height: 1em;

    color-adjust: exact;
    @media (forced-colors: active) {
        forced-color-adjust: none;
    }
`

export const ControlButton = styled(Button)<{ highlight?: boolean; icon?: boolean }>`
    padding: ${(props) => (!props.icon ? '0.9em 0.9em' : '0.9em 1em')};
    @media (max-width: 35000px) {
        padding: 0.7em 0.9em;
    }
    gap: 8px;
    line-height: 1em;
    margin-bottom: 0.2em;
    font-size: 0.875em;
    font-weight: 600;
    height: 2.5rem;
    display: flex;
    position: relative;
    color: ${(props) => (props.highlight ? props.theme.colors.textHeadings : props.theme.colors.textMain)};
    ${(props) => (props.highlight ? `border: 1px solid ${props.theme.colors.textHeadings};` : '')};

    &:disabled > ${ControlIcon} {
        background-color: ${(props) => props.theme.colors.textDisabled};
    }
    > ${ControlIcon} {
        background-color: ${(props) =>
            props.highlight ? props.theme.colors.textHeadings : props.theme.colors.textMain};
    }
`
export const ThinControlButton = styled(Button)<{ displayToggle: boolean }>`
    line-height: 1em;
    margin-bottom: 0.2em;
    font-size: 0.875em;
    font-weight: 600;
    height: 2.5rem;
    padding: 0 1em;
    top: 0;
    position: relative;
    > div {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        > div {
            height: 6px;
        }
        > span {
            line-height: normal;
            min-width: 0.5em;
        }
    }

    //display: ${(props) => (props.displayToggle ? 'block' : 'flex')};
    line-height: 0px;
    justify-content: start;
    flex-direction: column;
    display: flex;
`
