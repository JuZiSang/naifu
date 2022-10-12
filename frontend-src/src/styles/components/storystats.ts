import styled from 'styled-components'

export const StoryStatsSidebar = styled.div`
    display: flex;
    flex-direction: column;
`

export const StatsContainer = styled.div`
    display: flex;
    @media (min-width: 600px) {
        width: 600px;
    }
    height: 500px;
    flex-direction: column;
    overflow-y: hidden;
    flex: 0 0 auto;
`

export const StatsGrid = styled.div`
    margin: 10px;
    display: flex;
    flex-direction: column;

    > div {
        display: flex;
        flex-direction: row;

        @media (max-width: 600px) {
            flex-direction: column;
        }
    }
    overflow-y: auto;
`

export const Section = styled.div`
    h4 {
        margin: 0;
    }
    margin: 10px;
    display: flex;
    flex-direction: column;
    flex: 1 1 50%;
`

export const ButtonRow = styled.div`
    display: flex;
    width: 100%;
    flex-direction: row;
    > button {
        width: auto;
        flex: 0 1 auto;
    }
    > :not(:last-child) {
        margin-right: 5px;
    }
`
