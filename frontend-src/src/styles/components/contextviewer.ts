import styled from 'styled-components'
import { transparentize } from '../../util/colour'

export const ContextDisplay = styled.pre`
    font-family: ${(props) => props.theme.fonts.code};
    user-select: text;
    white-space: pre-wrap;
    padding: 15px;
    border: solid 1px ${(props) => props.theme.colors.bg3};
    position: relative;
    font-size: 0.875rem;
`

export const ShownContext = styled.span`
    user-select: text;
    position: absolute;
    white-space: pre-wrap;
    top: 0;
    left: 0;
    padding: 15px;
    font-size: 0.875rem;
`

export const InvisibleContext = styled.span`
    user-select: none;
    white-space: pre-wrap;
    font-size: 0.875rem;
    visibility: hidden;
`

export const StyledContext = styled.span<{ color: string; selected: boolean }>`
    color: ${(props) => props.color};
    background: ${(props) => (props.selected ? props.theme.colors.textHighlight : 'none')};
    cursor: pointer;
`

export const AdvancedContextSettingsHeading = styled.div`
    font-family: ${(props) => props.theme.fonts.default};
    color: ${(props) => props.theme.colors.textHeadings};
    padding-top: 20px;
    font-size: 1.1rem;
`

export const AdvancedContextSettings = styled.div`
    display: grid;
    grid-template-rows: auto auto auto;
    text-align: center;
    max-width: min(600px, 100vw);
    margin: auto;
`

export const ReportTable = styled.table`
    width: 100%;
`

export const TableHeader = styled.th`
    font-family: ${(props) => props.theme.fonts.default};
    color: ${(props) => props.theme.colors.textHeadings};
    border-bottom: 2px ${(props) => props.theme.colors.bg0} solid;
`

export const TableRow = styled.tr<{
    selected: boolean
    background: boolean
    textColor: string
    stageSelected: boolean
}>`
    ${(props) => (props.background ? 'background: ' + props.theme.colors.bg1 : '')};
    ${(props) => (props.selected ? 'background: ' + props.theme.colors.textHighlight : '')};

    > td:nth-child(3) {
        height: 100%;
        color: ${(props) =>
            props.textColor !== '' ? props.textColor : transparentize(0.3, props.theme.colors.textMain)};
        align-items: center;
        > :first-child {
            margin-left: 5px;
            display: inline;
        }
        > :not(:first-child) {
            box-sizing: border-box;
            margin-left: 5px;
            width: max-content;
            display: inline;
        }
    }
    font-family: ${(props) => props.theme.fonts.default};
    cursor: pointer;

    button {
        border: none;
        background: transparent;
        width: 100%;
        padding: 3px 5px 3px 0;
        color: ${(props) =>
            props.stageSelected ? props.theme.colors.textHeadings : props.theme.colors.textMain};
        cursor: default;
        &:not([disabled]) {
            cursor: pointer;
        }
        &:not([disabled]):hover {
            background: ${(props) => props.theme.colors.bg3};
        }
    }
`

export const ShowNonActivated = styled.div`
    display: flex;
    align-items: center;
    margin: 10px;
    max-width: 30ch;
    div {
        margin: 0px;
    }
`
export const OverrideTokenToggle = styled.div`
    display: flex;
    flex-direction: row;
    > div > div {
        margin: 0 5px;
        flex: 0 0 auto;
    }
    > :not(:last-child) {
        margin-right: 5px;
    }
    flex-wrap: wrap;
    padding: 15px 0;
    label > div > :first-child {
        display: none;
    }
    div {
        display: flex;
    }
    label {
        gap: 0px;
    }
`
export const StageControls = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    l > div {
        display: flex;
        flex-direction: column;
    }
    button {
        margin-right: 10px;
    }
    margin-bottom: 5px;
`
