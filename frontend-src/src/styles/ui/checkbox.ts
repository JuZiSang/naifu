import styled from 'styled-components'

import SmallCross from '../../assets/images/small_cross.svg'
import Check from '../../assets/images/check.svg'
import { transparentize } from '../../util/colour'
import { Icon } from './icons'

export const Checkbox = styled.label<{ disabled?: boolean; alternate?: boolean }>`
    align-items: center;
    cursor: pointer;
    font-weight: 600;
    width: 100%;
    > div:first-child {
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        font-size: ${(props) => (props.alternate ? '0.875rem' : '1rem')};
        font-family: ${(props) =>
            props.alternate ? props.theme.fonts.textMain : props.theme.fonts.headings};
        margin-bottom: ${(props) => (props.alternate ? '6px' : '0px')};
    }
    justify-content: flex-start;
    align-content: center;
    gap: 10px;
    opacity: ${(props) => (props.disabled ? '0.5' : '1')};
    > span {
        flex-grow: 1;
        margin-left: 10px;
    }
`
export const CheckBoxBorder = styled.div<{ focused: boolean }>`
    border: 2px solid ${(props) => (props.focused ? props.theme.colors.bg0 : 'transparent')};
`

export const CheckboxOuterVisual = styled.div<{ checked: boolean }>`
    margin-bottom: 0;
    background: ${(props) => (props.checked ? props.theme.colors.textHeadings : props.theme.colors.bg0)};
    height: 20px;
    width: 47px;
    position: relative;
    &:focus-within,
    &:focus {
        outline: 2px solid ${(props) => props.theme.colors.bg0};
    }
`
export const CheckboxInnerVisual = styled.div<{ checked: boolean }>`
    background: ${(props) => (props.checked ? props.theme.colors.bg0 : props.theme.colors.bg3)};
    height: ${(props) => (props.checked ? '16px' : '16px')};
    width: ${(props) => (props.checked ? '26px' : '26px')};
    top: ${(props) => (props.checked ? '2px' : '2px')};
    position: absolute;
    ${(props) => (props.checked ? 'right: 2px' : 'left: 2px')};
`

export const CheckboxInnerText = styled(Icon)<{ checked: boolean }>`
    && {
        position: absolute;
        background-color: ${(props) =>
            props.checked
                ? props.theme.colors.textHeadings
                : transparentize(0.5, props.theme.colors.textMain)};
        height: 8px;
        width: 8px;
        ${(props) => (!props.checked ? 'top: 6px;' : 'top: 6px;')};

        ${(props) => (!props.checked ? 'left: 11px' : 'right: 11px')};
        mask-image: ${(props) => (props.checked ? `url(${Check.src})` : `url(${SmallCross.src})`)};
    }
`

export const CheckBoxText = styled.div<{ value: boolean }>`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    align-items: baseline;
    > span {
        display: flex;
        align-items: center;
        grid-column-start: 1;
        grid-row-start: 1;
        opacity: 0.7;
        font-size: 0.875rem;
        display: block;
        &[aria-hidden='true'] {
            opacity: 0;
        }
    }
`

export const CheckBoxTextStyle = styled.span`
    display: flex;
    align-items: center;
    grid-column-start: 1;
    grid-row-start: 1;
    opacity: 0.7;
    font-size: 0.875rem;
    font-weight: 500;
`

export const SmallCheckOuter = styled.div<{ checked: boolean }>`
    height: 16px;
    width: 16px;
    position: relative;
    background: ${(props) => (props.checked ? props.theme.colors.textHeadings : props.theme.colors.bg3)};
`

export const SmallCheckInner = styled.div<{ checked: boolean }>`
    height: 14px;
    width: 14px;
    top: 1px;
    left: 1px;
    position: absolute;

    background: ${(props) =>
        props.checked ? transparentize(0.01, props.theme.colors.textHeadings) : props.theme.colors.bg0};
`

export const SmallCheckInnerText = styled.div<{ checked: boolean }>`
    width: 9px;
    height: 9px;
    position: absolute;
    top: ${(props) => (props.checked ? '5px' : '4px')};
    left: 4px;
    background-color: ${(props) =>
        props.checked ? props.theme.colors.bg0 : transparentize(0.5, props.theme.colors.textMain)};
    mask-image: ${(props) => props.checked && `url(${Check.src})`};
    mask-repeat: no-repeat;
`

export const SmallCheckbox = styled.label<{ disabled?: boolean; selected?: boolean }>`
    align-items: center;
    cursor: pointer;
    flex-direction: row;
    justify-content: flex-start;
    display: flex;
    align-content: center;
    opacity: ${(props) => (props.disabled ? '0.5' : '1')};
    > span {
        flex-grow: 1;
        margin-left: 10px;
    }
    user-select: none;
    &:hover {
        ${SmallCheckOuter} {
            background-color: ${(props) =>
                !props.selected && transparentize(0.5, props.theme.colors.textMain)};
        }
    }
`

export const SmallCheckboxNoLabel = styled.div<{ disabled?: boolean }>`
    align-items: center;
    cursor: pointer;
    flex-direction: row;
    justify-content: flex-start;
    display: flex;
    align-content: center;
    opacity: ${(props) => (props.disabled ? '0.5' : '1')};
    > span {
        flex-grow: 1;
        margin-left: 10px;
    }
    user-select: none;
`

export const AlternateCheckboxContainer = styled.label<{ disabled?: boolean; checked?: boolean }>`
    cursor: pointer;
    user-select: none;
    padding: 6px 15px;
    font-size: 0.875rem;
    font-weight: 700;
    opacity: ${(props) => (props.disabled ? '0.5' : '1')};
    background-color: ${(props) =>
        props.checked ? props.theme.colors.textHeadings : props.theme.colors.bg1};
    color: ${(props) =>
        props.checked ? props.theme.colors.bg1 : transparentize(0.5, props.theme.colors.textMain)};
    > div > ${Icon} {
        margin-right: 5px;
        width: 0.7rem;
        height: 0.7rem;
        background-color: ${(props) =>
            props.checked ? props.theme.colors.bg1 : transparentize(0.5, props.theme.colors.textMain)};
    }
    flex: 0 0 auto;
`

export const AltCheckboxText = styled.div<{ value: boolean }>`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    align-items: baseline;
    > div {
        display: flex;
        align-items: center;
        grid-column-start: 1;
        grid-row-start: 1;

        &[aria-hidden='true'] {
            opacity: 0;
        }
    }
`
