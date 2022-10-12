import React from 'react'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { AppUpdateAvailable } from '../globals/state'
import { transparentize } from '../util/colour'

export const Pulser = styled.div<{ size?: number }>`
    @keyframes pulse {
        0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 ${(props) => transparentize(0.3, props.theme.colors.textUser)};
        }

        70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px ${(props) => transparentize(1, props.theme.colors.textUser)};
        }

        100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 ${(props) => transparentize(1, props.theme.colors.textUser)};
        }
    }

    display: inline-block;

    background: ${(props) => props.theme.colors.textUser};
    border-radius: 50%;
    margin: 10px;
    height: ${(props) => props.size ?? 20}px;
    width: ${(props) => props.size ?? 20}px;

    box-shadow: 0 0 0 0 ${(props) => props.theme.colors.textUser};
    transform: scale(1);
    animation: pulse 2s infinite;
`

const StyledUpdatePulser = styled(Pulser)`
    position: absolute;
    width: 10px;
    height: 10px;
    pointer-events: none;
`

export function UpdatePulser(props: { style: React.CSSProperties }): JSX.Element {
    const updateAvailable = useRecoilValue(AppUpdateAvailable)
    return updateAvailable ? <StyledUpdatePulser style={props.style} /> : <></>
}
