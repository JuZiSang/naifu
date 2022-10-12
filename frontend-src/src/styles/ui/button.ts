import styled from 'styled-components'
import { darken, mix } from '../../util/colour'
import { Icon } from './icons'

export const Button = styled.button.attrs((props: { additionalClasses?: string }) => {
    return {
        className: `${props.additionalClasses ?? ''} button`,
    }
})<{
    color?: string
    centered?: boolean
    additionalClasses?: string
}>`
    background-color: ${(props) => props.color ?? props.theme.colors.bg1};
    border: 1px solid transparent;
    color: ${(props) => props.theme.colors.textMain};
    cursor: pointer;
    padding: 10px;
    transition: background ${(props) => props.theme.transitions.interactive};
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    justify-content: ${(props) => (props.centered ? 'center' : 'space-between')};
    align-items: center;
    outline: 1px solid transparent;
    user-select: none;
    font-weight: 600;

    gap: 5px;

    > ${Icon} {
        height: 12px;
    }

    &:hover,
    &:focus {
        background: ${(props) =>
            props.color === 'transparent'
                ? props.theme.colors.bg0
                : props.color
                ? darken(0.3, props.color)
                : props.theme.colors.bg0};
    }
    &:disabled {
        opacity: 0.5;
    }
`

export const SubtleButton = styled.button<{ disabled?: boolean }>`
    background: none;
    opacity: ${(props) => (props.disabled ? '0.5' : 1)};
    border: none;
    cursor: pointer;
    padding: 0px;
    text-align: left;
    &:active {
        outline: 1px solid rgba(255, 255, 255, 0.2);
    }
`

export const ButtonLink = styled.a`
    background-color: ${(props) => props.theme.colors.bg1};
    border: 1px solid transparent;
    color: ${(props) => props.theme.colors.textMain};
    cursor: pointer;
    padding: 10px;
    transition: background ${(props) => props.theme.transitions.interactive};
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 5px;
    font-weight: 600;

    > ${Icon} {
        height: 12px;
    }

    &:hover {
        background: ${(props) => props.theme.colors.bg0};
    }
    &:focus {
        border: 1px solid rgba(255, 255, 255, 0.1);
        outline: 0;
    }
    &:active {
        border: 1px solid rgba(255, 255, 255, 0.2);
        outline: 0;
    }
`

export const DarkColorButton = styled(Button)`
    background-color: ${(props) => props.theme.colors.bg0};
    &:hover {
        background: ${(props) => props.theme.colors.bg3};
    }
`

export const LightColorButton = styled(Button)<{ bordered?: boolean }>`
    background-color: ${(props) => props.theme.colors.bg3};
    &:hover,
    &:focus {
        background: ${(props) => mix(0.97, props.theme.colors.bg3, props.theme.colors.textMain)};
    }
    border: ${(props) => (props.bordered ? `1px solid ${props.theme.colors.textMain}` : 'none')};
`

export const LightColorButtonLink = styled(ButtonLink)<{ bordered?: boolean }>`
    background-color: ${(props) => props.theme.colors.bg3};
    &:hover,
    &:focus {
        background: ${(props) => mix(0.97, props.theme.colors.bg3, props.theme.colors.textMain)};
    }
    border: ${(props) => (props.bordered ? `1px solid ${props.theme.colors.textMain}` : 'none')};
`

export const InvertedButton = styled(Button)`
    justify-content: center;
    background-color: ${(props) => props.theme.colors.textHeadings};
    color: ${(props) => props.theme.colors.bg0};
    font-weight: 600;
    &:hover,
    &:focus {
        background: ${(props) => props.theme.colors.textMain};
    }
    &:disabled {
        color: ${(props) => props.theme.colors.bg1};
    }
    ${Icon} {
        background-color: ${(props) => props.theme.colors.bg0};
    }
`

export const BorderedButton = styled(Button)`
    border: 1px solid ${(props) => props.theme.colors.bg2};
`
