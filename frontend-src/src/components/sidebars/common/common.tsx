import styled from 'styled-components'
import { transparentize } from '../../../util/colour'

export const SidebarElementsContainer = styled.div<{ overflowY?: string }>`
    overflow-x: hidden;
    overflow-y: ${(props) => (props.overflowY ? props.overflowY : 'auto')};
    display: flex;
    flex-direction: column;
    min-height: 100%;
    position: relative;
    justify-content: flex-start;
    align-items: stretch;
    > * {
        flex: 0 0 auto;
    }
    padding-top: 15px;
`

export const SidebarPlaceholder = styled.div`
    flex: 1 1 100%;
    display: flex;
    justify-content: center;
    align-items: center;
`

export const PresetContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`

export const Line = styled.div`
    height: 2px;
    background: ${(props) => transparentize(0.95, props.theme.colors.textMain)};
    width: calc(100%+2rem);
    margin: 10px 0 25px 0;
`
export const LineShort = styled.div`
    height: 2px;
    background: ${(props) => transparentize(0.95, props.theme.colors.textMain)};
    width: calc(100%-2rem);
    margin: 1rem 1rem;
`
export const Spacer = styled.div`
    height: 1rem;
`
