import styled from 'styled-components'
import { transparentize } from '../../util/colour'
import MagGlas from '../../assets/images/magglass.svg'
import Trash from '../../assets/images/trash.svg'
import { Icon } from '../ui/icons'
import { LightColorButton, SubtleButton } from '../ui/button'
import { Sidebar } from '../mixins'
import ArrowDown from '../../assets/images/directional_arrow_down.svg'
import ArrowUp from '../../assets/images/directional_arrow_up.svg'
import Plus from '../../assets/images/plus.svg'

import LightOn from '../../assets/images/light_on.svg'
import LightOff from '../../assets/images/light_off.svg'

import Copy from '../../assets/images/copy.svg'
import { LargeClose } from './modal'

export const LOREBOOK_MOBILE_BREAKPOINT = '800px'

export const SearchContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`

export const SearchContainerInner = styled.div`
    display: flex;
    flex-direction: row;
`

export const LoreSidebarEntryStyle = styled.div`
    background: ${(props) => props.theme.colors.bg3};
    font-size: 0.875rem;
`

export const LoreSidebarHeading = styled.div`
    display: flex;
    padding: 15px 15px 0 15px;
    justify-content: space-between;
    font-size: 1rem;
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textHeadings};
`

export const LoreSidebarMain = styled.div<{ active: boolean }>`
    padding: ${(props) => (props.active ? '0 5px 5px 5px' : '0 15px 15px 15px')};
    > textarea {
        background: ${(props) => props.theme.colors.bg1};
    }

    > div {
        white-space: pre-wrap;
        overflow: hidden;
        text-overflow: ellipsis;
        // Should be replaced with line-clamp when/if it becomes availiable
        // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
    }
`

export const StyledLorebookModal = styled.div`
    display: flex;
    flex-direction: row;
    height: 100%;
    width: 100%;
    background: ${(props) => props.theme.colors.bg2};
    color: ${(props) => props.theme.colors.textMain};
`

export const LorebookSearch = styled.div`
    display: flex;
    position: relative;
    flex: 1 1 auto;
    input {
        padding-left: 15px;
    }
    > div {
        width: 140px;
    }
    &::after {
        color: ${(props) => props.theme.colors.textMain};
        background: ${(props) => props.theme.colors.textMain};
        mask-image: url(${MagGlas.src});
        mask-repeat: none;
        mask-size: contain;
        content: '';
        width: 16px;
        height: 16px;
        font-size: 1.2rem;
        margin-right: 10px;
        pointer-events: none;
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
    }
`

export const LorebookListEntryCategory = styled.div<{ opaque: boolean }>`
    display: flex;
    flex-direction: column;
    border-top: 2px solid ${(props) => props.theme.colors.bg3};
    :last-child {
        border-bottom: 2px solid ${(props) => props.theme.colors.bg3};
    }
    opacity: ${(props) => (props.opaque ? ' 0.5' : '1')};
`

export const ListEntryDelete = styled(LightColorButton)<{ isConfirmDelete: boolean }>`
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
    flex-direction: row;
    user-select: none;
    box-sizing: border-box;
    > div {
        line-height: 1.1rem;
    }
    ${(props) =>
        !props.isConfirmDelete ? `` : `transition: background ${props.theme.transitions.interactive};`}
    ${(props) => (!props.isConfirmDelete ? `` : `transition: width ${props.theme.transitions.interactive};`)}
    width: ${(props) => (!props.isConfirmDelete ? `calc(1.2rem + 24px)` : `calc(6ch + 24px)`)};

    ${(props) => (!props.isConfirmDelete ? `` : `background: ${props.theme.colors.warning} !important;`)}

    ${(props) => (!props.isConfirmDelete ? `` : `color: ${props.theme.colors.bg0} !important;`)}
`

export const ListEntryDeleteIcon = styled(Icon)`
    opacity: 0.9;
    align-self: center;
    height: 1.5rem;
    width: 1.5rem;
    mask-size: 1rem 1rem;

    mask-image: url(${Trash.src});
    background: ${(props) => props.theme.colors.textMain};
`

export const ListEntryCopyIcon = styled(Icon)`
    border: transparent;
    opacity: 0.9;
    align-self: center;
    height: 1.5rem;
    width: 1.5rem;
    mask-size: 1rem 1rem;

    mask-image: url(${Copy.src});
    background: ${(props) => props.theme.colors.textMain};
`

export const LorebookEditor = styled.div<{ pinned: boolean }>`
    box-sizing: border-box;
    width: calc(100vw - 320px);
    max-width: ${(props) => (props.pinned ? '1324px' : '816px')};
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    min-height: 300px;
    transition: opacity 0.05s ease-in-out;
    padding: 0 30px 0px 30px;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        padding: 0 20px;
        width: calc(100vw);
    }
`

export const DisplayInput = styled.input`
    flex: 1 1 0;
    padding: 7px 10px 5px 15px;
    background: ${(props) => props.theme.colors.bg2} !important;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    border-radius: 1px;
    margin-right: 20px;
    &:focus {
        background: ${(props) => props.theme.colors.bg1} !important;
    }

    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        width: 100%;
    }
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textHeadings};

    font-size: 1.125rem;
    font-weight: 600;
`

export const LorebookEditorKeys = styled.div`
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
`

export const LorebookKeyContainer = styled.div`
    border: 1px solid ${(props) => props.theme.colors.bg3};
`
export const KeyPill = styled.div`
    font-size: 1rem;
    position: relative;
    display: flex;
    flex-direction: row;
    margin: 0px;
    cursor: pointer;
    user-select: none;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        font-size: 0.875rem;
    }
`
export const KeyPillText = styled(SubtleButton)<{ selected: boolean; error?: boolean }>`
    border-left: 2px solid ${(props) => (props.selected ? props.theme.colors.textMain : 'transparent')};
    background: ${(props) => (props.error ? props.theme.colors.warning : props.theme.colors.bg3)};

    padding: 6px 10px 6px 10px;
    &:hover {
        background: ${(props) => props.theme.colors.bg1};
    }
`

export const PillDelete = styled(SubtleButton)`
    right: 0px;
    top: 0px;
    position: absolute;
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 100%;
    padding: 5px !important;
    background: ${(props) => transparentize(0.47, props.theme.colors.bg3)};

    &:hover {
        background: ${(props) => props.theme.colors.bg0};
    }
`

export const LorebookEditorKeyDisplay = styled.div`
    padding: 15px 20px 15px 20px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    > ${KeyPill} {
        margin-right: 5px;
        margin-bottom: 5px;
    }
    flex: 0 0 auto;
`

export const KeyFiller = styled.div`
    height: 92px;
    width: 100%;
    font-size: 1rem;
    font-weight: 600;
    display: flex;
    justify-content: center;
    align-items: center;
`

export const KeyDisplayContainer = styled.div`
    min-height: 92px;
`

export const TokenCount = styled(SubtleButton)`
    position: absolute;
    bottom: 0px;
    right: 6px;
    opacity: 0.8;
    font-size: 0.9rem;
    cursor: pointer;
`

export const LorebookLeft = styled.div`
    ${Sidebar}
    width: 320px;
    max-width: 100vw;
    min-width: 240px;
    display: flex;
    height: 100%;
    flex: 0 0 auto;
    flex-direction: column;
    position: relative;
    overflow-x: visible;
    background: ${(props) => props.theme.colors.bg1};
    border-right: 1px solid ${(props) => props.theme.colors.bg3};
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        min-width: 300px;
    }
`

export const LorebookRight = styled.div`
    width: 100%;
    display: flex;
`

export const EditAreaTop = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    margin-top: 26px;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        margin-top: 10px;
    }
    > div {
    }
`
export const MobileTop = styled.div`
    width: 100%;

    display: none;
    > ${Icon} {
        height: 1.3rem;
        width: 1.3rem;
    }

    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        padding: 15px 0px;
        align-items: center;
        > div {
            margin-top: auto;
            margin-bottom: auto;
        }
    }
`
export const RegularTop = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-right: 50px;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        padding-right: 0;
    }
`

export const EditAreaBottom = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;

    overflow: auto;
`

export const CloseButton = styled(LargeClose)`
    position: absolute;
    right: 30px;
    top: 35px;

    > div {
        width: 2rem;
        height: 2rem;
    }
    flex: 0 0 auto;

    z-index: 4;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        right: 20px;
        top: 25px;
    }
`

export const EditAreaContents = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    flex: 0 1 auto;
    position: relative;
`

export const EditAreaTabs = styled.div`
    font-size: 0.87rem;
    flex: 0 0 auto;
    display: flex;
    overflow-x: scroll;
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    transform: rotateX(180deg);
    -ms-transform: rotateX(180deg); /* IE 9 */
    -webkit-transform: rotateX(180deg); /* Safari and Chrome */
`

export const EditAreaTab = styled(SubtleButton)<{ selected: boolean }>`
    text-align: center;
    height: 40px;
    padding: ${(props) => (props.selected ? '22px 20px' : '20px 20px')};

    font-size: 0.875rem;
    background-color: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.bg1)};
    color: ${(props) =>
        props.selected ? props.theme.colors.textMain : transparentize(0.5, props.theme.colors.textMain)};
    transform: rotateX(180deg);
    -ms-transform: rotateX(180deg); /* IE 9 */
    -webkit-transform: rotateX(180deg); /* Safari and Chrome */

    line-height: 0;
    flex: 0 0 auto;
    transition: background-color ${(props) => props.theme.transitions.interactive},
        padding ${(props) => props.theme.transitions.interactive};
    &:hover {
        background-color: ${(props) => props.theme.colors.bg3};
        padding: 22px 20px;
    }
`

export const FakeAreaTab = styled.div`
    font-size: 0.875rem;
    text-align: center;
    padding: 22px 20px;
    font-size: 0.875;
    background-color: ${(props) => props.theme.colors.bg3};
    color: ${(props) => props.theme.colors.textMain};
    transform: rotateX(180deg);
    -ms-transform: rotateX(180deg); /* IE 9 */
    -webkit-transform: rotateX(180deg); /* Safari and Chrome */

    line-height: 0;
    flex: 0 0 auto;
`

export const DockText = styled(SubtleButton)`
    padding: 0px 20px;
    display: flex;
    align-items: center;
    > div {
        margin-right: 8px;
    }
    font-size: 0.875rem;
    transform: rotateX(180deg);
    -ms-transform: rotateX(180deg); /* IE 9 */
    -webkit-transform: rotateX(180deg); /* Safari and Chrome */
    &:hover {
        color: ${(props) => props.theme.colors.textHeadings};
        > div {
            background-color: ${(props) => props.theme.colors.textHeadings};
        }
    }
`

export const EditAreaTabContent = styled.div`
    overflow-y: auto;
    height: 100%;
    flex: 1 1 auto;
    padding: 20px 0;
    max-width: 756px;
    width: 100%;
`
export const EditAreaPinnedTabContent = styled.div`
    overflow-y: auto;
    height: 100%;
    flex: 1 1 auto;
    padding: 20px 0 20px 20px;
    max-width: 756px;
    width: 100%;
    border-left: 1px solid ${(props) => props.theme.colors.bg3};
`

export const GenerateArea = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
`

export const GenerateError = styled.span`
    color: ${(props) => props.theme.colors.warning};
    font-size: 0.8rem;
`

export const Label = styled.div`
    font-size: 1rem;
    font-weight: 600;
    font-family: ${(props) => props.theme.fonts.headings} !important;
`
export const MinorLabel = styled.div`
    font-size: 0.875rem;
    font-weight: 600;
    padding-bottom: 10px;
`

export const Description = styled.div`
    font-size: 0.875rem;
    font-weight: 600;
    opacity: 0.7;
`
export const AltLabel = styled.span`
    color: ${(props) => props.theme.colors.textHeadings} !important;
    font-size: 0.875rem;
    font-weight: 600;
`

export const SidebarToggle = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-top: 5px;
    padding-bottom: 5px;
    > :last-child {
        margin-left: 3px;
        height: 0.9rem;
        width: 0.9rem;
    }
`

export const SidebarOverlay = styled.div`
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: ${(props) => props.theme.colors.bg0};
    opacity: 0.7;
    z-index: 10;
`

export const CategoryArrow = styled(Icon)<{ up: boolean }>`
    mask-image: url(${(props) => (props.up ? ArrowUp.src : ArrowDown.src)});
    cursor: pointer;
    mask-repeat: no-repeat;
    mask-size: 1.1rem 1.1em;
    mask-position: center;
    height: 1.5rem;
    width: 2rem;
`

export const CategoryPlus = styled(Icon)`
    mask-image: url(${Plus.src});
    cursor: pointer;
    mask-repeat: no-repeat;
    mask-size: 0.9rem 0.9em;
    mask-position: center;
    height: 1.5rem;
    width: 2rem;
`

export const CategorySettingsCheckbox = styled.div`
    padding: 10px 0;
    width: 100%;
`

export const GenerateToggle = styled(SubtleButton)<{ toggled: boolean }>`
    font-weight: bold;
    font-size: 0.875rem;
    margin-left: 10px;
    display: flex;
    flex-direction: row;
    align-items: center;

    color: ${(props) => (props.toggled ? props.theme.colors.textHeadings : props.theme.colors.textMain)};
    > div {
        background-color: ${(props) =>
            props.toggled ? props.theme.colors.textHeadings : props.theme.colors.textMain};
        &:nth-child(1) {
            margin-right: 5px;
        }

        &:nth-child(2) {
            width: 12px;
            margin-left: 5px;
        }
    }
`

export const LightOnIcon = styled(Icon)`
    mask-image: url(${LightOn.src});
    height: 1rem;
    background: ${(props) => props.theme.colors.textHeadings};
`

export const LightOffIcon = styled(Icon)`
    mask-image: url(${LightOff.src});
    height: 1rem;
    background: ${(props) => props.theme.colors.textMain};
`

export const GenerateContextLabel = styled(SubtleButton)`
    font-size: 0.8rem;

    color: ${(props) => transparentize(0.5, props.theme.colors.textMain)};
    display: flex;
    flex-direction: row;
    align-items: center;
    > ${Icon} {
        margin-left: 4px;
        width: 0.7rem;
        background-color: ${(props) => transparentize(0.5, props.theme.colors.textMain)};
    }
`
export const AddContextContainer = styled.div`
    flex: 0 0 auto;
    display: flex;
    width: 100%;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 4px;
    > * {
        margin-top: 5px;
        flex: 0 0 auto;
        margin-right: 10px;
    }
    > :last-child {
        flex: 1 1 0;
        display: flex;
        align-items: center;
        min-width: 250px;
        input {
            padding: 6px 10px 6px 10px;
        }
    }
`
export const HistoryItems = styled.div`
    font-size: 0.875rem;

    overflow-y: auto;
    max-height: 100%;
    height: 500px;
    > button:nth-child(2n-1) {
        background: ${(props) => props.theme.colors.bg1};
        :hover {
            background: ${(props) => transparentize(0.4, props.theme.colors.bg1)};
        }
    }
    > button:nth-child(2n) {
        background: ${(props) => props.theme.colors.bg3};
        :hover {
            background: ${(props) => transparentize(0.4, props.theme.colors.bg3)};
        }
    }
`

export const HistoryTitle = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    padding-left: 10px;
    padding-top: 5px;
`
export const HistoryBody = styled.div`
    padding: 5px 10px 10px 10px;
    white-space: pre-wrap;
    cursor: pointer;
    > span:first-child {
        color: ${(props) => transparentize(0.4, props.theme.colors.textMain)};
    }
`

export const LoreBiasDisplay = styled.div`
    > div {
        padding: 0;
    }
`
