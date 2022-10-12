import styled from 'styled-components'
import { BiggerLabel } from './importstory'

export const ImportScenarioStyle = styled.div`
    display: flex;
    flex-direction: column;
    font-size: 1rem;
    height: 100%;
    width: 100%;
    margin: auto;
    gap: 30px;
    align-items: center;
`
export const LorebookComparisonName = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-size: 1.1rem;
    width: 100% !important;
    font-family: ${(props) => props.theme.fonts.headings};
`

export const LorebookComparison = styled.div`
    margin: auto;
    display: flex;
    align-items: center;
    flex-direction: column;
    text-align: center;
    font-size: 0.8rem;
    width: 100%;
    > div {
        display: flex;
        justify-content: space-around;
        gap: 20px;
        width: 100%;
        > div {
            flex: 1 1 100%;
        }
    }
    > div:nth-child(2) {
        opacity: 0.8;
        font-size: 0.65rem;
    }
`

export const LorebookScrollContainer = styled.div`
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 25px;
    margin-bottom: 10px;
    > div:nth-child(2n-1) {
        background: ${(props) => props.theme.colors.bg1};
    }
    > div {
        padding: 20px;
    }
`

export const ComparisonLabel = styled(BiggerLabel)`
    width: 100%;

    padding-bottom: 8px;
    text-align: center;
`
export const WarningText = styled.div`
    text-align: center;
    color: ${(props) => props.theme.colors.warning};
`
export const InfoText = styled.div`
    text-align: center;
    color: ${(props) => props.theme.colors.textUser};
    border: 1px solid ${(props) => props.theme.colors.textUser};
    padding: 8px;
    border-radius: 3px;
`
export const InfoText2 = styled.div`
    text-align: left;
    color: ${(props) => props.theme.colors.textMain};
    border: 1px solid ${(props) => props.theme.colors.textMain};
    padding: 8px;
    border-radius: 3px;
`
