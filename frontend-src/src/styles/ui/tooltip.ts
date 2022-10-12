import styled from 'styled-components'
import { motion } from 'framer-motion'

export const MotionTooltipContainer = styled(motion.div)`
    display: inline-block;
    line-height: 0;
`

export const TooltipContainer = styled.div<{ inheritHeight?: boolean }>`
    display: inline-block;
    line-height: ${(props) => (props.inheritHeight ? 'inherit' : 0)};
`

export const TooltipMain = styled.div<{ visible: boolean; maxWidth?: string }>`
    opacity: ${(props) => (props.visible ? '1' : '0')};
    font-size: 0.9rem;
    font-weight: normal;
    transition: opacity 0.2s ease-in-out;
    z-index: 1000;
    padding: 8px 8px 9px 8px;
    width: auto;
    font-weight: normal;
    max-width: ${(props) => (props.maxWidth ? props.maxWidth : '300px')};
    color: ${(props) => props.theme.colors.textMain};
    background-color: ${(props) => props.theme.colors.bg3};
    font-family: ${(props) => props.theme.fonts.default};
    text-align: center;
    pointer-events: none;
    > div:last-child {
        position: absolute;
        width: 10px;
        height: 10px;
    }
    > p {
        margin: 5px;
    }

    /**
 * The arrow element lives *inside* the popper
 * so we need to offset it by its size to position
 * it outside the popper element.
 */
    &[data-popper-placement='bottom'] > div {
        top: -5px;
    }
    &[data-popper-placement='left'] > div {
        right: -5px;
    }
    &[data-popper-placement='top'] > div {
        bottom: -5px;
    }
    &[data-popper-placement='right'] > div {
        left: -5px;
    }

    > div:last-child::before {
        position: absolute;
        width: 10px;
        height: 10px;
        margin-left: -4.5px;
        background-color: ${(props) => props.theme.colors.bg3};
        content: '';
        -webkit-transform: rotate(45deg);
        -ms-transform: rotate(45deg);
        transform: rotate(45deg);
    }
`
