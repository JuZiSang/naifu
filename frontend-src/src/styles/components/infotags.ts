import styled from 'styled-components'

export const TagEntry = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid ${(props) => props.theme.colors.bg3};
`

export const TagDisplay = styled.div`
    flex: 1 1 0;
    background: ${(props) => props.theme.colors.bg2};
    min-height: 140px;
    padding-bottom: 10px;
    padding-right: 10px;
    font-size: 0.8rem;
    overflow-y: auto;
    > :first-child {
        padding: 10px 15px 0px 15px;
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        > :last-child {
            opacity: 0.7;
        }
    }
`

export const TagContainer = styled.div`
    flex: 0 0 0;
    display: flex;
    flex-wrap: wrap;
    height: fit-content;

    button {
        background: ${(props) => props.theme.colors.bg3};
        cursor: pointer;
        height: fit-content;
        margin: 10px 0 0 10px;
        padding: 8px 10px 7px 10px;
        font-weight: 600;
        font-size: 0.75rem;
    }
`
