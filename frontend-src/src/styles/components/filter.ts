import styled from 'styled-components'

export const FilterDisplay = styled.div`
    background: ${(props) => props.theme.colors.bg1};
    min-height: 59px;
    padding-bottom: 10px;
    padding-right: 10px;
    font-size: 0.8rem;
    > :first-child {
        padding: 10px 15px 0px 15px;
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        font-weight: 600;
    }
`

export const FilterEntry = styled.div`
    display: flex;
    height: 100%;
    flex-direction: column;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    input {
        background: ${(props) => props.theme.colors.bg0};
    }
`

export const FilterContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    height: fit-content;

    div {
        background: ${(props) => props.theme.colors.bg3};
        cursor: pointer;
        font-family: ${(props) => props.theme.fonts.code};
        height: fit-content;
        margin: 10px 0 0 10px;
        padding: 6px 10px;
    }
`
export const Bracket = styled.span`
    color: ${(props) => props.theme.colors.textMain};
    opacity: 0.4;
    margin: 0 !important;
    padding: 0 !important;
`

export const Token = styled.span<{ displayMode: number }>`
    color: ${(props) => {
        switch (props.displayMode) {
            case 0:
                return props.theme.colors.textMain
            case 1:
                return props.theme.colors.warning
            case 2:
                return props.theme.colors.textHeadings
            default:
                return props.theme.colors.textMain
        }
    }};
    font-family: ${(props) => props.theme.fonts.code};
    margin: 0px !important;
    padding: 0px !important;
`

export const FilterEditor = styled.div`
    background: ${(props) => props.theme.colors.bg0};
    height: fit-content;
    display: flex;
`

export const TokenCounter = styled.span<{ size: number }>`
    height: fit-content;
    padding: 0 0.2em;
    margin-left: 0.2em;
    word-break: normal;
    background: #0f0f0f;
    font-family: ${(props) => props.theme.fonts.code};
    font-size: 1em;
    opacity: ${(props) => (props.size === 0 ? '0' : '1')};
    color: ${(props) => {
        switch (props.size) {
            case 0:
                return '#FFFFFF'
            case 1:
                return '#00FF00'
            case 2:
                return '#7FFF00'
            case 3:
                return '#FFFF00'
            case 4:
                return '#FF7F00'
            default:
                return '#FF0000'
        }
    }};
`
