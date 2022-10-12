import styled from 'styled-components'
import { motion } from 'framer-motion'
import { SubtleButton } from '../../styles/ui/button'
import { transparentize } from '../../util/colour'
import { ProseMirror } from '../editor/prosemirror'

export const ContextMenu = styled.div<{ hintHeight: number }>`
    position: absolute;
    background: ${(props) => props.theme.colors.bg2};
    border: 1px solid ${(props) => props.theme.colors.bg3};
    min-width: 200px;
    z-index: 1000;
    font-size: 0.9rem;
    user-select: none;
    font-weight: 600;
    color: ${(props) => props.theme.colors.textMain};

    > div {
        position: relative;
        display: flex;
        flex-direction: column;

        padding-top: 7px;

        padding-bottom: calc(${(props) => props.hintHeight + 10}px);
    }
    button,
    div[role='button'] {
        text-align: start;
        list-style-type: none;
        margin: 0;
        padding: 7px 15px;
        width: 100%;
        display: flex;
        justify-content: space-between;
    }
    button:focus {
        outline: solid 1px ${(props) => props.theme.colors.bg0};
    }
    button:disabled {
        > :first-child {
            opacity: 0.5;
        }
        > div {
            opacity: 0.3;
        }
    }
    span:last-child {
        color: ${(props) => transparentize(0.5, props.theme.colors.textMain)};
    }

    button:hover {
        background: ${(props) => props.theme.colors.bg3};
    }
`

export const SideContextMenu = styled.div<{ swapSide: boolean }>`
    padding: 0 5px;
    position: absolute;
    width: max-content;
    min-width: 100%;
    > div {
        background: ${(props) => props.theme.colors.bg2};
        border: 1px solid ${(props) => props.theme.colors.bg3};

        padding-top: 7px;
    }
`

export const ExpandItem = styled(motion.div)<{ selected: boolean; greyed: boolean; keyboard: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    > :nth-child(2) {
        height: 0.8em;
    }

    opacity: ${(props) => (props.greyed ? '0.5' : '1')};
    cursor: ${(props) => (props.greyed ? 'unset' : 'pointer')};
    background: ${(props) => (!props.selected && !props.keyboard ? 'transparent' : props.theme.colors.bg3)};
`
export const Splitter = styled.span`
    width: calc(100% - 20px);
    margin: 7px 15px;
    height: 2px;
    border-bottom: 2px solid ${(props) => props.theme.colors.bg3};
`

export const ButtonItem = styled(SubtleButton)<{ keyboard: boolean }>`
    background: ${(props) => (!props.keyboard ? 'transparent' : props.theme.colors.bg3)};
`

export const SplitButtonIcon = styled.div`
    display: flex;
    > :nth-child(1) {
        flex: 1 1 0;
    }
    > :nth-child(2) {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
        width: auto;
    }
`

export const HintText = styled.span`
    color: ${(props) => transparentize(0.7, props.theme.colors.textMain)};
    margin: 5px 13px;
    font-size: 0.7rem;
    position: absolute;
    bottom: 0px;
`
