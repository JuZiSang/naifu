import styled from 'styled-components'

import PenTip from '../../assets/images/pen-tip-light.svg'
import Cross from '../../assets/images/cross.svg'
import { SubtleButton } from '../ui/button'

export const Overlay = styled.div<{ pointer: boolean }>`
    background-color: ${(props) => props.theme.colors.bg0};
    height: 100%;
    left: 0;
    opacity: 0.7;
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 301;
    ${(props) => (props.pointer ? 'cursor: pointer;' : '')}
`

export const Modal = styled.div`
    font-size: 1rem;
    align-items: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    left: 0;
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 302;
    height: var(--app-height, 100%);
`

export const Content = styled.div`
    background-color: ${(props) => props.theme.colors.bg2};
    color: ${(props) => props.theme.colors.textMain};
    border-radius: 0 0 2px 2px;
    overflow-y: auto;
    padding: 26px 30px 30px;
    width: 100%;
    height: 100%;
    z-index: 305;
    display: flex;
    flex-direction: column;
    position: relative;
`

export const ModalWindow = styled.div`
    z-index: 305;
    overflow-y: hidden;
    display: flex;
    flex-direction: column;
    max-height: 1000px;
    max-width: 1000px;
    min-width: 350px;
    min-height: min(304px, calc(var(--app-height, 100%) - 200px));
    max-height: min(1000px, calc(var(--app-height, 100%) - 50px));
    @media (max-width: ${(props) => props.theme.breakpoints.mobile}) {
        max-height: 100%;
    }

    height: 100%;
    width: 100%;
`

export const CompactModalWindow = styled.div`
    z-index: 305;
    display: flex;
    overflow-y: hidden;
    flex-direction: column;
    background-color: ${(props) => props.theme.colors.bg2};
    color: ${(props) => props.theme.colors.textMain};
    padding: 30px;

    min-height: 248px;
    max-height: min(var(--app-height, 100%), 800px);
    max-width: 1000px;
    min-width: 330px;
`

export const CompactIcons = styled.div`
    width: 100%;
    display: flex;
    svg {
        color: ${(props) => props.theme.colors.textHeadings};
        mask-repeat: no-repeat;
        mask-size: contain;
        width: 30px;
        height: 30px;
        margin-bottom: 5px;
    }
`
export const CompactIcon = styled.div<{ icon?: string | undefined }>`
    background-color: ${(props) => props.theme.colors.textHeadings};
    mask-image: url(${(props) => props.icon ?? PenTip.src});
    mask-repeat: no-repeat;
    mask-size: contain;
    width: 40px;
    height: 30px;
    margin-bottom: 5px;
`

export const CompactHeader = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.5rem;
    font-weight: 600px;
`

export const CompactBody = styled.div`
    color: ${(props) => props.theme.colors.textDisabled};
    max-height: 100%;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    /* for Firefox */
    min-height: 0;
    overflow: auto;
`

export const CompactModal = styled.div`
    height: 100%;
    display: grid;
    //grid-template-rows: max-content max-content 90%;
    display: flex;
    flex-direction: column;
    position: relative;
    /* for Firefox */
    min-height: 0;
    max-height: var(--app-height, 100%);
`

export const CompactClose = styled(SubtleButton)`
    align-self: auto;
    background-color: ${(props) => props.theme.colors.textMain};
    mask-image: url(${Cross.src});
    mask-repeat: no-repeat;
    mask-size: contain;
    cursor: pointer;
    height: 16px;
    z-index: 310;
    margin-bottom: 3px;
    margin-left: auto;
    position: absolute;
    right: 0;
    width: 16px;

    color-adjust: exact;
    @media (forced-colors: active) {
        forced-color-adjust: none;
    }
`

export const Header = styled.div`
    background-color: ${(props) => props.theme.colors.bg1};
    border-radius: 2px 2px 0 0;
    display: flex;
    flex-direction: row;
    height: fix-content;
    max-width: 1000px;
    padding: 28px 30px 20px;
    width: 100%;
    z-index: 305;
    color: ${(props) => props.theme.colors.textMain};
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;

    svg {
        color: ${(props) => props.theme.colors.textMain};
        mask-repeat: no-repeat;
        mask-size: contain;
        width: 30px;
        height: 30px;
        margin-bottom: 5px;
    }
`

export const HeaderIcon = styled.div<{ icon?: string | undefined }>`
    background-color: ${(props) => props.theme.colors.textMain};
    mask-image: url(${(props) => props.icon ?? PenTip.src});
    mask-repeat: no-repeat;
    mask-size: contain;
    width: 25px;
    height: 100%;
`

export const HeaderContainer = styled.div`
    display: flex;
    flex-direction: column;
`

export const HeaderContainerLabel = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.5em;
`

export const HeaderContainerAboveLabel = styled.div`
    opacity: 0.7;
`

export const HeaderClose = styled(SubtleButton)`
    align-self: auto;
    background-color: ${(props) => props.theme.colors.textMain};
    mask-image: url(${Cross.src});
    mask-repeat: no-repeat;
    mask-size: contain;
    cursor: pointer;
    height: 16px;
    margin-bottom: 3px;
    margin-left: auto;
    width: 16px;

    color-adjust: exact;
    @media (forced-colors: active) {
        forced-color-adjust: none;
    }
`

export const LargeModal = styled.div<{ fill?: boolean }>`
    z-index: 305;
    overflow: hidden;
    min-width: 320px;
    width: ${(props) => (props.fill ? '100%' : 'auto')};
    height: ${(props) => (props.fill ? '100%' : 'auto')};
    max-width: max(1160px, 65%);
    max-height: max(650px, 75%);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    > * {
        max-width: 100%;
        overflow: auto;
    }
    @media (max-width: 800px) {
        position: fixed;
        max-height: var(--app-height, 100%);
        max-width: 100vw;
        height: var(--app-height, 100%);
        width: 100vw;
        top: 0;
        left: 0;
    }
`

export const LargeClose = styled(SubtleButton)`
    > div {
        align-self: auto;
        background-color: ${(props) => props.theme.colors.textMain};
        mask-image: url(${Cross.src});
        mask-repeat: no-repeat;
        mask-position: center;
        mask-size: 1rem 1rem;
        cursor: pointer;
        height: 11px;
        width: 11px;
        overflow-x: hidden;
    }

    color-adjust: exact;
    @media (forced-colors: active) {
        forced-color-adjust: none;
    }
`
