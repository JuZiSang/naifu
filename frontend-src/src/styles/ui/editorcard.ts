import styled from 'styled-components'
import { LargeModal } from '../components/modal'
import { SubtleButton } from './button'
import { Icon } from './icons'

export const EditorCard = styled.div<{ small?: boolean }>`
    display: flex;
    flex-direction: column;
    margin: 15px;
    margin-top: 0;
    font-size: 0.875rem;
    @media (max-width: ${(props) => props.theme.breakpoints.mobile}) {
        margin-right: 15px;
    }

    ${LargeModal} {
        height: 100%;
    }

    &:not(:first-child) {
        margin-top: 20px;
    }
`

export const EditorCardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    margin: 0 0 2px 0;
`
export const EditorCardDescription = styled.div`
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    margin: 0 0 8px 0;
    opacity: 0.6;
`

export const EditorCardTitle = styled.div<{ small?: boolean }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: ${(props) => (props.small ? '0.875rem' : '1rem')};
    font-weight: 600;
    font-family: ${(props) => (props.small ? props.theme.fonts.main : props.theme.fonts.headings)};
    label {
        font-size: 1rem;
    }
`

export const EditorCardHint = styled.div<{ onClick?: any }>`
    cursor: ${(props) => (props.onClick ? 'pointer' : 'normal')};
    font-size: 0.875rem;
    opacity: ${(props) => (props.onClick ? 0.8 : 0.5)};
    font-weight: normal;
    display: flex;
    :hover {
        opacity: ${(props) => (props.onClick ? 1 : 0.5)};
    }
    ${Icon} {
        width: 14px;
        margin: auto 6px;
    }
`

export const EditorCardButtonHint = styled(SubtleButton)<{ onClick?: any }>`
    cursor: ${(props) => (props.onClick ? 'pointer' : 'normal')};
    font-size: 0.875rem;
    opacity: ${(props) => (props.onClick ? 0.8 : 0.5)};
    font-weight: normal;
    display: flex;
    :hover {
        opacity: ${(props) => (props.onClick ? 1 : 0.5)};
    }
    ${Icon} {
        width: 14px;
        margin: auto 6px;
    }
`

export const EditorCardHints = styled.div<{ onClick?: any }>`
    display: flex;
    flex-direction: row;
    gap: 10px;
    > div:hover {
        opacity: 1;
    }
`

export const MainSettingHeading = styled.div<{ simple?: boolean }>`
    display: flex;
    font-family: ${(props) => (props.simple ? props.theme.fonts.default : props.theme.fonts.headings)};
    font-size: ${(props) => (props.simple ? '0.875rem' : '1rem')};
    font-weight: 600;
`

export const MainSettingInfo = styled.div`
    display: flex;
    opacity: 0.7;
    font-size: 0.875rem;
    margin: 0;
    margin-bottom: 5px;
`

export const MainSettingValue = styled.div<{ focused: boolean; simple?: boolean }>`
    display: flex;
    justify-content: space-between;
    font-size: ${(props) => (props.simple ? '0.875rem' : '1.1rem')};
    input {
        font-weight: bold;
    }
    > :nth-child(1) {
        display: flex;
        flex-direction: row;
        > :nth-child(2) {
            font-size: ${(props) => (props.simple ? '0.875rem' : '1.1rem')};
            margin-right: 2px;
            padding: 0px;
            padding-left: 2px;
            min-width: 1rem;
            max-width: 4rem;
            border-radius: 2px;
            background-color: transparent;
            &:focus {
                background-color: ${(props) => props.theme.colors.bg0};
            }
            color: ${(props) =>
                props.focused ? props.theme.colors.textHeadings : props.theme.colors.textMain};
        }
    }
    margin-bottom: 5px;
    align-items: baseline;
`

export const MinorSettingText = styled.div<{ focused: boolean }>`
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    font-weight: 600;
    position: relative;
    > :nth-child(1) {
        display: flex;
        align-items: flex-end;
        > :nth-child(2) {
            font-size: 0.875rem;
            margin-left: 3px;
            margin-right: 2px;
            padding: 0px;
            padding-left: 2px;
            min-width: 1rem;
            max-width: 4rem;
            font-weight: bold;
            border-radius: 1px;
            background-color: transparent;
            &:focus {
                background-color: ${(props) => props.theme.colors.bg0};
            }
            color: ${(props) =>
                props.focused ? props.theme.colors.textHeadings : props.theme.colors.textMain};
        }
        > :nth-child(3) {
            opacity: 0.9;
        }
    }
    > :nth-child(2) {
        font-weight: normal;
    }
    margin-bottom: 8px;
    align-items: baseline;
`

export const ZeroMark = styled.div`
    left: calc(50% - 0.5px);
    bottom: -3px;
    position: absolute;
    background-color: ${(props) => props.theme.colors.textMain};
    opacity: 0.3;
    width: 2px;
    height: 60%;
`
