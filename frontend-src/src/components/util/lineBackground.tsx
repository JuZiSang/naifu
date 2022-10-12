import { CSSProperties } from 'react'
import styled from 'styled-components'

export function LineBackground(props: {
    children: JSX.Element | JSX.Element[]
    background: string
    backgroundStyle?: CSSProperties
}): JSX.Element {
    return (
        <Overlay>
            <Background style={props.backgroundStyle} background={props.background} />
            {props.children}
        </Overlay>
    )
}

const Overlay = styled.div`
    width: 100%;
    height: 100%;
    background-color: ${(props) => props.theme.colors.bg2};
    > * {
        position: relative;
    }
`

const Background = styled.div<{ background: string }>`
    position: absolute !important;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    mask-repeat: no-repeat;
    mask-size: cover;
    background-color: ${(props) => props.theme.colors.bg3};
    mask-image: url(${(props) => props.background});
    mask-position: center;
`
