import styled from 'styled-components'
import { SubtleButton } from '../ui/button'
import { FlexRow } from '../ui/layout'

export const LogprobsTableHeader = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
`

export const LogprobsTable = styled.div`
    font-family: ${(props) => props.theme.fonts.code};
    display: grid;
    flex: 0 0 auto;
    grid-template-columns: 18ch 7ch 7ch;
    grid-auto-rows: min-content;
    white-space: pre;
    span:nth-child(6n),
    span:nth-child(6n-1),
    span:nth-child(6n-2) {
        background: ${(props) => props.theme.colors.bg1};
    }
    span:nth-child(3n) {
        padding-right: 3px;
    }
    span:nth-child(3n + 1) {
        padding-left: 3px;
    }

    font-size: 0.875rem;
    max-width: 90vw;
    overflow-x: auto;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    background: ${(props) => props.theme.colors.bg3};
`

export const LogprobsTableItem = styled.span.attrs<{ col?: string }>((props) => ({
    style: { color: props.col ?? props.theme.colors.textMain },
}))<{ col?: string; selected?: boolean }>`
    font-family: ${(props) => props.theme.fonts.code};
    ${(props) => (props.selected ? `border-left: 2px solid ${props.theme.colors.textHeadings}` : '')};
`

export const LogprobsTableNumberItem = styled(LogprobsTableItem)`
    text-align: right;
`

export const LogprobsContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin-left: 20px;
    @media (max-width: 800px) {
        margin: 0px;
    }
`

export const LogprobsTabs = styled.div`
    display: flex;
    flex-direction: row;
`

export const LogprobsTab = styled(SubtleButton)<{ selected: boolean }>`
    background: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.bg1)};
    padding: 5px 10px;
`

export const IdToggleButton = styled(SubtleButton)<{ selected: boolean }>`
    background: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.bg1)};
    padding: 2px;
    border: 2px solid ${(props) => props.theme.colors.bg3};
    border-bottom: 0;
    margin-left: auto;
    > div {
        margin-right: 0px;
        cursor: pointer;
    }
`

export const LogProbsRow = styled(FlexRow)`
    align-items: baseline;
    @media (max-width: 800px) {
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 10px;
    }
`
