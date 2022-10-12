import styled from 'styled-components'
import { transparentize } from '../../../util/colour'

export const Label = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    padding-right: 10px;
    font-weight: 600;
    padding-bottom: 8px;
`

export const BiggerLabel = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-size: 1.1rem;
    padding-right: 10px;
    font-weight: 600;
`

export const Title = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.375rem;
    padding-right: 10px;
    font-weight: 600;
    @media (max-width: 800px) {
        font-size: 1.125rem;
    }
`

export const ImportStoryStyle = styled.div`
    background-color: ${(props) => props.theme.colors.bg2};
    color: ${(props) => props.theme.colors.textMain};
    font-size: 0.875rem;
    height: 100%;
    max-width: min(min(max(700px, 65vw), 800px), 100vw);
    min-width: min(600px, 100vw);
    height: 650px;
    display: flex;
    overflow-y: auto;
    flex-direction: column;
    button {
        font-size: 1rem;
    }
    @media (max-width: 800px) {
        height: var(--app-height, 100%);
        font-size: 1rem;
    }
`

export const PlaceholderInput = styled.input`
    padding: 10px;
    background-color: ${(props) => props.theme.colors.bg1};
`

export const Row = styled.div`
    padding-left: 30px;
    padding-right: 10px;
    display: flex;
    flex-direction: row;
    align-items: top;
    justify-content: space-between;
    > div:not(:last-child) {
        margin-right: 30px;
    }
    width: 100%;
`

export const InnerRow = styled.div`
    width: 100%;
    overflow-x: auto;
`

export const Centered = styled.div`
    display: flex;
    > :not(:last-child) {
        margin-right: 10px;
    }

    justify-content: center;
    align-items: center;
`

export const StoryText = styled.div`
    white-space: pre-wrap;
    overflow-y: auto;
    line-height: 1.375rem;
`

export const Expand = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    cursor: pointer;
    > :not(:last-child) {
        margin-right: 10px;
    }
    user-select: none;
    opacity: 0.7;
`

export const TagContainer = styled.div`
    display: flex;
    flex-direction: row;
    width: max-content;
    > span {
        margin-right: 10px;
    }
    span {
        background-color: ${(props) => props.theme.colors.bg3};
        padding: 6px 15px 6px 15px;
        color: ${(props) => transparentize(0.3, props.theme.colors.textMain)};
        font-weight: 600;
    }
`

export const PlaceholderLabel = styled.div`
    font-weight: 600;
    padding-bottom: 8px;
`

export const ImportContainer = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    max-width: 100%;
    div {
        margin: 0px;
    }
    > :not(:last-child) {
        margin-right: 10px;
    }
    > div {
        margin-bottom: 10px;
    }
    button {
        padding-left: 25px;
        padding-right: 25px;
        min-width: 150px;
        display: flex;
        justify-content: center;
    }
`

export const InfoText = styled.div`
    margin-bottom: 10px;
`

export const StoryInfo = styled.div`
    display: flex;
    margin-bottom: 5px;
    margin-top: 5px;
    vertical-align: middle;
`

export const LeftAlignedRow = styled.div`
    display: flex;
    flex-direction: row;
    padding-left: 30px;
`

export const Description = styled.div<{ clamp?: boolean }>`
    white-space: pre-wrap;
    width: 100%;
    line-height: 1.375rem;
    overflow: hidden;
    text-overflow: ellipsis;
    // Should be replaced with line-clamp when/if it becomes availiable
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
    display: -webkit-box;
    ${(props) => (props.clamp ? '-webkit-line-clamp: 5;' : '')}
    -webkit-box-orient: vertical;
`

export const Buttons = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    > :not(:last-child) {
        margin-right: 30px;
    }

    button {
        background-color: ${(props) => props.theme.colors.bg1};
        border: 0;
        color: ${(props) => props.theme.colors.textMain};
        cursor: pointer;
        padding: 10px;
        transition: background ${(props) => props.theme.transitions.interactive};

        &:hover {
            background: ${(props) => props.theme.colors.bg0};
        }
    }
`
export const Placeholders = styled.div`
    display: grid;
    grid-template-columns: 33% 33% 33%;
    > div {
        margin-right: 20px;
        margin-bottom: 10px;
    }
    width: 100%;
`

export const PlaceholderContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
`

export const StoryList = styled.div`
    display: grid;
    grid-template-columns: auto;
    width: 100%;
    padding: 20px 0;
    > div {
        padding: 20px 20px;
    }

    > div:nth-child(2n-1) {
        background: ${(props) => props.theme.colors.bg1};
    }
`

export const ScrollContainer = styled.div`
    overflow-y: auto;
    > :nth-child(1) {
        margin-bottom: 20px;
    }
    > :nth-child(2) {
        margin-bottom: 20px;
    }
    > :nth-child(4) {
        margin-top: 20px;
    }
`

export const Spacer = styled.div`
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    position: sticky;
    width: 100%;
    top: 0;
`

export const TitleRow = styled(Row)`
    padding-top: 30px;
`

export const ButtonRow = styled(Row)`
    padding: 20px 30px;
    margin-top: auto;
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    flex-wrap: wrap;
    gap: 10px;
`
