import styled, { css } from 'styled-components'
import { MdCloudDone, MdCloudUpload } from 'react-icons/md'
import { Sidebar, Toggler as TogglerMixin } from '../mixins'
import HeartEnabled from '../../assets/images/heart_enabled.svg'
import HeartDisabled from '../../assets/images/heart_disabled.svg'

import { Button, ButtonLink, SubtleButton } from '../ui/button'
import { Icon } from '../ui/icons'
import { Dark } from '../themes/dark'
import { mix, transparentize } from '../../util/colour'

export const Menubar = styled.div<{ visible: boolean }>`
    ${Sidebar}

    border-right: 1px solid ${(props) => props.theme.colors.bg3};
`

export const Toggler = styled.div<{ visible: boolean }>`
    ${TogglerMixin}
    display: ${(props) => (props.visible ? 'flex' : 'none')};
    flex-direction: row-reverse;
    display: flex;
    top: 18px;
    align-items: center;
    left: 0;
    padding-left: 20px;
    > * {
        cursor: pointer;
    }
`

export const Header = styled.div`
    align-items: center;
    background: ${(props) => props.theme.colors.bg1};
    display: flex;
    flex: 0;
    flex-direction: row;
    height: auto;
    min-height: 65px;
    padding: 20px;
    padding-right: 0px;
    ${Icon} {
        width: 16px;
        height: 16px;
        transition: transform ${(props) => props.theme.transitions.iteractive};
    }
    > div {
        &:hover {
            ${Icon} {
                transform: scale(1.1);
            }
        }
    }
`

export const HeaderTitle = styled.h1`
    flex-grow: 0;
    font-family: ${Dark.fonts.headings};
    color: ${(props) => props.theme.colors.textMain};
    font-size: 1.2rem;
    margin: 0 0 -6px;
    word-break: normal;
    text-overflow: ellipsis;
    max-width: 150px;
    overflow: hidden;
`
export const HeaderSubTitle = styled.h1`
    flex-grow: 1;
    font-family: ${Dark.fonts.headings};
    color: ${(props) => props.theme.colors.textMain};
    font-size: 1.5rem;
    margin: 0 0 -8px 8px;
    font-size: 1rem;
    opacity: 0.3;
    word-break: normal;
    text-overflow: ellipsis;
    max-width: 55px;
    overflow: hidden;
`

export const HeaderMenu = styled.div`
    cursor: pointer;
    font-size: 1.3rem;
    margin-bottom: -6px;
`

export const SubMenuContainer = styled.div<{ visible: boolean }>`
    width: 100%;
    position: absolute;
    top: 65px;
    z-index: 203;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
    overflow-y: auto;
    height: ${(props) => (props.visible ? '100%' : '0%')};
    transition: height 0.15s ease-in-out;
`
export const SubMenuOverlay = styled.div`
    background-color: ${(props) => props.theme.colors.bg0};
    opacity: 0.7;
    height: 100%;
    width: 100%;
    flex: 0 1 0;
`
export const SubMenu = styled.div`
    background-color: ${(props) => props.theme.colors.bg1};
    padding: 20px 0;
    flex: 1 0 auto;
`
export const SubMenuButton = styled(Button)`
    && {
        position: relative;
        display: flex;
        flex-direction: column;
        background-color: ${(props) => props.theme.colors.bg3};
        justify-content: space-between;
        margin: 0px 20px 10px 20px;
        padding: 14px 20px 14px 20px;
        width: calc(100% - 40px);
        font-size: 1.2rem;
        align-items: center;
        min-height: 50px;
        &:hover {
            background: ${(props) => props.theme.colors.bg0};
        }
        &:focus {
            border: 1px solid rgba(255, 255, 255, 0.1);
            outline: 0;
        }
    }
    > div {
        display: flex;
        flex-direction: row;
        width: 100%;
        align-items: center;
        > :first-child {
            margin-right: 10px;
            > :first-child {
                height: 16px;
            }
        }
    }
`

export const SubMenuLink = styled(ButtonLink)`
    && {
        position: relative;
        display: flex;
        flex-direction: column;
        background-color: ${(props) => props.theme.colors.bg3};
        justify-content: space-between;
        margin: 0px 20px 10px 20px;
        padding: 14px 20px 14px 20px;
        width: calc(100% - 40px);
        font-size: 1.2rem;
        align-items: center;
        min-height: 50px;
        &:hover {
            background: ${(props) => props.theme.colors.bg0};
        }
        &:focus {
            border: 1px solid rgba(255, 255, 255, 0.1);
            outline: 0;
        }
    }
    > div {
        display: flex;
        flex-direction: row;
        width: 100%;
        align-items: center;
        > :first-child {
            margin-right: 10px;
            > :first-child {
                height: 16px;
            }
        }
    }
`

export const SubMenuInfo = styled.div`
    opacity: 0.1;
    margin: 0 20px -6px 20px;
    padding: 0 5px 0 5px;
    user-select: text;
`

export const ScenarioContainer = styled.div`
    height: 100%;
`

export const Search = styled.div<{ visible: boolean }>`
    position: relative;
    display: ${(props) => (props.visible ? 'block' : 'none')};
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    input {
        background: ${(props) => props.theme.colors.bg0};
        border: 0;
        caret-color: ${(props) => props.theme.colors.textMain};
        color: ${(props) => props.theme.colors.textMain};
        padding: 12px 20px 13px;
        width: 100%;
    }
`

export const StoryListWrapper = styled.div<{ showScrollTop: boolean; showScrollBottom: boolean }>`
    flex: 0 1 100%;
    touch-action: pan-y;
    position: relative;
    overflow: hidden;
    &::before {
        content: '';
        transition: opacity 0.1s ease-in-out;
        opacity: ${(props) => (props.showScrollTop ? 1 : 0)};
        height: 20px;
        pointer-events: none;
        top: 0;
        position: absolute;
        width: 100%;
        left: 0;
        background: linear-gradient(180deg, ${(props) => props.theme.colors.bg0}, transparent);
        z-index: 10;
    }
    &::after {
        content: '';
        transition: opacity 0.1s ease-in-out;
        opacity: ${(props) => (props.showScrollBottom ? 1 : 0)};
        height: 20px;
        pointer-events: none;
        bottom: 0;
        position: absolute;
        width: 100%;
        left: 0;
        background: linear-gradient(0deg, ${(props) => props.theme.colors.bg0}, transparent);
        z-index: 10;
    }
`
export const StoryList = styled.div`
    overflow-y: auto;
    touch-action: pan-y;
    position: relative;
    height: 100%;
`

export const StoryTitle = styled.div`
    color: ${(props) => props.theme.colors.textMain};
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.1rem;
    opacity: 0.7;
    padding-right: 35px;
    display: flex;
    flex-direction: row;
    gap: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    // Should be replaced with line-clamp when/if it becomes availiable
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
`

export const StoryContent = styled.div`
    font-size: 0.875rem;
    margin: 5px 0;
    opacity: 0.7;
    font-weight: 400;
    transition: opacity ${(props) => props.theme.transitions.interactive};
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.375rem;
    // Should be replaced with line-clamp when/if it becomes availiable
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
`

export const StoryMetadataInfo = styled.div`
    font-size: 0.875rem;
    font-weight: 400;
    margin-top: 0.5rem;
    opacity: 0.35;
    display: flex;
    flex-direction: row;
    align-items: center;
`

export const StoryFavorite = styled(Icon)<{ favorite: boolean }>`
    position: absolute;
    right: 20px;
    top: 20px;
    transition: transform ${(props) => props.theme.transitions.iteractive};
    background-color: ${(props) => props.theme.colors.textHeadings};

    mask-image: url(${(props) => (props.favorite ? HeartEnabled.src : HeartDisabled.src)});
    width: 20px;
    height: 20px;
    &:hover {
        transform: scale(1.1);
    }
`

export const StoryRemoteDone = styled(MdCloudDone)`
    position: absolute;
    right: 20px;
    opacity: 0.2;
    bottom: 20px;
    width: 20px;
    height: 20px;
`
export const StoryRemoteUpload = styled(MdCloudUpload)`
    position: absolute;
    right: 20px;
    opacity: 0.2;
    bottom: 20px;
    width: 20px;
    height: 20px;
`

export const StoryTags = styled.div`
    margin-top: 15px;
    display: flex;
    flex-wrap: wrap;
    > * {
        background: ${(props) => props.theme.colors.bg0};
        padding: 10px;
        font-size: 0.8rem;
        margin-bottom: 5px;
        &:not(:last-child) {
            margin-right: 10px;
        }
    }
`

export const Story = styled.div<{ selected: boolean }>`
    cursor: pointer;
    padding: 20px 20px 15px;
    position: relative;

    transition: ${(props) => props.theme.transitions.interactive};

    background: ${(props) => (props.selected ? props.theme.colors.bg2 : 'transparent')};

    ${(props) =>
        !props.selected
            ? `    &:hover,
    &:focus {
        background: ${mix(0.5, props.theme.colors.bg2, props.theme.colors.bg1)};
        ${StoryTitle} {
            opacity: 1;
        }
    }
`
            : ''};

    ${(props) =>
        props.selected &&
        css`
            ${StoryTitle} {
                color: ${(props) => props.theme.colors.textHeadings};
                opacity: 1;
            }
            ${StoryContent} {
                opacity: 1;
                font-weight: 600;
            }
        `}

    &:hover {
        ${StoryContent} {
            opacity: 1;
        }
    }
`

export const Create = styled.div`
    width: 100%;
`

export const CreateButton = styled(SubtleButton)`
    width: 100%;
`

export const CreateButtonInner = styled.div<{ dark?: boolean; faint?: boolean }>`
    align-items: center;
    background: ${(props) => (props.dark ? props.theme.colors.bg1 : props.theme.colors.bg2)};
    color: ${(props) => (props.faint ? props.theme.colors.textMain : props.theme.colors.textHeadings)};
    border: 2px solid ${(props) => transparentize(0.0, props.theme.colors.bg2)};
    cursor: pointer;
    display: flex;
    flex-direction: row;
    font-family: ${(props) => props.theme.fonts.main};
    font-size: 1.1rem;
    padding: 5px 5px;
    width: 100%;
    justify-content: center;
    align-items: center;
    :hover,
    :focus {
        background: ${(props) => (props.dark ? props.theme.colors.bg2 : props.theme.colors.bg3)};
        border: 2px solid transparent;
    }
`

export const CreateButtonIcon = styled.div<{ faint?: boolean }>`
    padding: 8px;
    padding-left: 0;
    > * {
        width: 12px;
        height: 12px;
        background-color: ${(props) =>
            props.faint ? props.theme.colors.textMain : props.theme.colors.textHeadings};
    }
`

export const CreateButtonText = styled.div`
    font-weight: 600;
    font-size: 1rem;
`
