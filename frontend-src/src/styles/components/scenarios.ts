import styled from 'styled-components'
import { darken, lighten, transparentize } from '../../util/colour'
import { SubtleButton } from '../ui/button'

export const ScenarioHeader = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    margin-top: 30px;
`

export const Heading = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.3em;
`

export const ViewAll = styled(SubtleButton)`
    position: relative;
    cursor: pointer;
    margin-left: auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    gap: 10px;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    flex: 1 1 0;
    background-color: ${(props) => props.theme.colors.bg1};
    font-weight: 600;
    > div > div {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    div > :first-child {
        font-family: ${(props) => props.theme.fonts.headings};
        color: ${(props) => props.theme.colors.textHeadings};
        font-size: 1.125rem;
    }
    div > :last-child {
        font-size: 0.875rem;
        opacity: 0.7;
    }
    width: 100%;
    padding: 28px;

    transition: background-color ${(props) => props.theme.transitions.interactive};
    &:hover,
    &:focus {
        background-color: ${(props) => lighten(0.01, props.theme.colors.bg1)};
    }
    &:active {
        background-color: ${(props) => darken(0.01, props.theme.colors.bg1)};
    }

    @media (max-width: 600px) {
        div > :first-child {
            font-size: 1rem;
        }
    }
`

export const Import = styled.div`
    cursor: pointer;
    margin-left: 20px;
    opacity: 0.7;
`

export const Scenarios = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    gap: 20px;
    font-size: 0.875rem;
    margin-bottom: 20px;
    margin-top: 10px;
    > div {
        width: calc(50% - 10px);
    }

    @media (max-width: 600px) {
        flex-direction: column;
        > div {
            width: 100%;
        }
    }
`

export const ScenarioBlock = styled.div.attrs((props) => ({
    className: `${props.className ?? ''} scenario-card`,
}))`
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions.interactive};
    line-height: 1rem;
    border: 1px solid ${(props) => props.theme.colors.bg3};

    display: flex;
    flex-direction: column;

    background-color: ${(props) => props.theme.colors.bg2};
    &:hover {
        background-color: ${(props) => lighten(0.02, props.theme.colors.bg2)};
    }
    &:active {
        background-color: ${(props) => darken(0.01, props.theme.colors.bg2)};
    }
`

export const ScenarioBlockTop = styled.div`
    padding: 20px 20px 13px 20px;
    overflow: hidden;
    flex: 0 0 auto;
    background: ${(props) => props.theme.colors.bg1};
    height: max-content;
`

export const ScenarioBlockAdditional = styled.div`
    cursor: default;
    padding: 5px 20px 5px 20px;
    flex: 0;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    background: ${(props) => props.theme.colors.bg1};
`
export const ScenarioBlockAdditionalVote = styled(SubtleButton)`
    position: relative;
    padding: 10px 0;
    align-self: flex-start;
    color: ${(props) => props.theme.colors.textHeadings};
    opacity: 0.8;
    display: flex;
    flex-direction: row;
    align-items: center;
    & > div {
        background-color: ${(props) => props.theme.colors.textHeadings};
    }
    gap: 5px;
    &:hover,
    &:focus {
        opacity: 1;
    }
`

export const ScenarioBlockBottom = styled.div`
    padding: 15px 20px 5px 20px;
    flex: 1;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
`
export const TitleRow = styled.div`
    display: flex;
    justify-content: space-between;
    position: relative;
    max-width: 100%;
    overflow: visible;
    flex-wrap: wrap-reverse;
    align-items: center;
`

export const Title = styled.div`
    color: ${(props) => props.theme.colors.textMain};
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.125rem;
    font-weight: 600;
    flex: 1 0 50%;
    overflow: visible;
    text-overflow: ellipsis;
    > span {
        margin-right: 3px;
    }
    > div > div {
        background-color: ${(props) => props.theme.colors.textHeadings};
    }
`
export const PerspectiveDisplay = styled.div<{ tag?: boolean }>`
    color: ${(props) =>
        props.tag ? transparentize(0.3, props.theme.colors.textMain) : props.theme.colors.bg1};
    background: ${(props) => (props.tag ? props.theme.colors.bg2 : props.theme.colors.textMain)};
    font-family: ${(props) => props.theme.fonts.default};
    font-size: 0.875rem;
    font-weight: 600;
    flex: 0 1 auto;
    max-width: 50%;
    min-width: 30%;
    min-width: fit-content;
    border-radius: 3px;
    padding: 3px 10px 3px 10px;
    word-break: break-all;
    height: min-content;
    width: min-content;
    margin-right: 10px;
`

export const Author = styled.div`
    color: ${(props) => props.theme.colors.textMain};
    font-family: ${(props) => props.theme.fonts.default};
    font-size: 1rem;
    font-weight: 600;
    opacity: 0.5;
    overflow: hidden;
    text-overflow: ellipsis;

    margin-bottom: 13px;
`

export const Description = styled.div`
    font-size: 1rem;
    line-height: 1.675rem;
    overflow: hidden;
    text-overflow: ellipsis;
    // Should be replaced with line-clamp when/if it becomes availiable
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
`

export const BrowserScenarios = styled.div`
    padding: 30px;
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    gap: 20px;
    > div {
        width: calc(50% - 10px);
    }
    @media (max-width: ${(props) => props.theme.breakpoints.mobile}) {
        > div {
            width: 100%;
        }
    }
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    overflow-y: auto;
    flex: 1 1 100vh;
`

export const ScenarioTagDisplay = styled.div`
    padding: 10px 0 0 0;
    width: 100%;
    display: flex;
    gap: 5px;
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    margin-top: 10px;
    overflow-x: scroll;
    > div {
        padding: 6px 10px;
        white-space: nowrap;
        background: ${(props) => props.theme.colors.bg3};
    }
`

export const HeightPlaceholder = styled.div``
export const ScenarioWrapper = styled.div`
    transition: opacity 0.32s ease-in-out;
    overflow-y: auto;
`
