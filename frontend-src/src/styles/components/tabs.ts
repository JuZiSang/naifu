import styled from 'styled-components'
import { transparentize } from '../../util/colour'
import { Icon } from '../ui/icons'

export const Tabs = styled.div`
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
`

export const TabHeaderList = styled.div`
    display: flex;
    flex: 0;
    flex-direction: row;
    justify-content: space-evenly;
    min-height: 65px;
    margin: 2px;
`

export const TabHeader = styled.div<{ selected: boolean }>`
    background: ${(props) => (props.selected ? props.theme.colors.bg2 : props.theme.colors.bg0)};
    color: ${(props) =>
        props.selected ? props.theme.colors.textHeadings : transparentize(0.33, props.theme.colors.textMain)};
    cursor: pointer;
    display: flex;
    font-weight: 600;
    flex: 1 1 auto;
    font-size: 1rem;
    justify-content: center;
    letter-spacing: 0.5px;
    margin: 13px 0px;
    margin-left: 0;
    padding: 19px 13px;
    align-items: center;
    outline: 2px solid ${(props) => props.theme.colors.bg0};
    :focus {
        outline: 2px solid ${(props) => props.theme.colors.bg0} !important;
        background: ${(props) => props.theme.colors.bg1};
    }
    &:hover,
    &:active {
        background: ${(props) => props.theme.colors.bg1};
        color: ${(props) => props.theme.colors.textMain};
        ${Icon} {
            background-color: ${(props) => props.theme.colors.textMain};
        }
    }
    ${Icon} {
        background-color: ${(props) =>
            props.selected
                ? props.theme.colors.textHeadings
                : transparentize(0.33, props.theme.colors.textMain)};
    }
`

export const TabContent = styled.div`
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: auto;
`

export const Tab = styled.div<{ visible: boolean }>`
    flex: 1;
    overflow: auto;
    display: ${(props) => (props.visible ? 'block' : 'none')};
`
