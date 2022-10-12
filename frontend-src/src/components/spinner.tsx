import { CSSProperties } from 'react'
import styled, { css } from 'styled-components'
import { Rotate } from '../styles/animations'

export const StyledSpinner = styled.div<{ visible: boolean; invert?: boolean }>`
    aspect-ratio: 1/1;
    margin: 6px;
    position: relative;
    > * {
        opacity: ${(props) => (props.visible ? 0.75 : 0)};
    }
    ${(props) =>
        props.invert
            ? css`
                  filter: invert(100%);
              `
            : ''}
`
const InnerSpinner = css`
    animation: ${Rotate} 0.8s infinite cubic-bezier(0.46, 0.26, 0.68, 0.81) both;
    border: 4px solid;
    border-radius: 50%;
    border-color: ${(props) => props.theme.colors.textMain};
    border-bottom-color: transparent;
    border-left-color: transparent;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    position: absolute;
    transform: translateZ(0);
`

const DoubleBounceA = styled.div`
    ${InnerSpinner}
`

const DoubleBounceB = styled.div`
    ${InnerSpinner}
    animation: ${Rotate} 0.7s infinite cubic-bezier(0.46, 0.26, 0.68, 0.81) both;
    border-top-color: ${(props) => props.theme.colors.textHeadings};
    border-right-color: ${(props) => props.theme.colors.textHeadings};
    border-width: 3px;
    animation-delay: 0.2s;
    width: calc(100% - 4px);
    height: calc(100% - 4px);
    top: 2px;
    left: 2px;
    opacity: 0.6;
`

export default function Spinner(props: {
    visible: boolean
    style?: CSSProperties
    className?: string
    invert?: boolean
}): JSX.Element {
    return (
        <StyledSpinner
            visible={props.visible}
            style={props.style}
            className={props.className}
            invert={props.invert}
        >
            <DoubleBounceA />
            <DoubleBounceB />
        </StyledSpinner>
    )
}
