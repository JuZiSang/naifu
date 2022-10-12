import styled from 'styled-components'

export const FlexRow = styled.div<{ grow?: boolean }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    ${(props) => (props.grow ?? true) && 'flex: 1 1 auto;'};
    ${(props) => (props.grow ?? true) && 'width: 100%;'};
    ${(props) => !(props.grow ?? true) && 'flex: 0 0 auto;'};
`

export const FlexCol = styled.div<{ wide?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: ${(props) => (props.wide ? 'unset' : 'flex-start')};
    justify-content: space-between;
    flex: 1 1 auto;
    width: 100%;
`

export const FlexColSpacer = styled.div<{ min: number; max: number }>`
    flex: 1 1 ${(props) => props.max}px;
    min-height: ${(props) => props.min}px;
    max-height: ${(props) => props.max}px;
`

export const FlexSpaceFull = styled.div`
    flex: 1 1 0;
`
