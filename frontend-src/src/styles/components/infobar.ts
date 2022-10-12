import styled from 'styled-components'
import { WarningButtonStyle } from '../../components/deletebutton'
import { mix } from '../../util/colour'
import { Sidebar, Toggler as TogglerMixin } from '../mixins'
import { Button, SubtleButton } from '../ui/button'
import { SettingsIcon } from '../ui/icons'
import { TabHeaderList } from './tabs'

export const Infobar = styled.div<{ visible: boolean }>`
    ${Sidebar}

    ${TabHeaderList} {
        margin-left: 50px;
        margin-right: 20px;
    }

    border-left: 1px solid ${(props) => props.theme.colors.bg3};
`

export const Toggler = styled.div<{ visible: boolean }>`
    ${TogglerMixin}
    display: ${(props) => (props.visible ? 'flex' : 'none')};
    right: 0;
    padding-right: 20px;
    top: 18px;
    align-items: center;
    > * {
        cursor: pointer;
    }
`
export const TogglerSettingsIcon = styled(SettingsIcon)`
    margin-left: 10px;
`

export const ArrowRight = styled.div`
    top: 14px;
    position: absolute;
    cursor: pointer;
    padding: 14px;
    padding-left: 24px;
`

export const DeleteModalContent = styled.div`
    box-sizing: border-box;
    width: 440px;
    max-width: 100vw;
    padding: 25px 30px 10px 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: ${(props) => props.theme.colors.bg1};
    overflow: auto;
    div {
        mask-position: top;
        mask-size: auto;
    }
    > div {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: transparent;
    }
`

export const DeleteButton = styled(Button)<{ deleteButtonType: WarningButtonStyle | undefined }>`
    width: 100%;
    text-align: center;
    font-weight: 700;
    color: ${(props) => {
        switch (props.deleteButtonType) {
            case WarningButtonStyle.Danger:
                return props.theme.colors.bg1
            case WarningButtonStyle.Light:
                return props.theme.colors.textMain
            case WarningButtonStyle.Dark:
                return props.theme.colors.textMain
            default:
                return props.theme.colors.bg1
        }
    }};
    background: ${(props) => {
        switch (props.deleteButtonType) {
            case WarningButtonStyle.Danger:
                return props.theme.colors.warning
            case WarningButtonStyle.Light:
                return props.theme.colors.bg3
            case WarningButtonStyle.Dark:
                return props.theme.colors.bg1
            default:
                return props.theme.colors.textHeadings
        }
    }};
    flex: 0 0 auto;
    &:hover,
    &:focus {
        background: ${(props) => {
            switch (props.deleteButtonType) {
                case WarningButtonStyle.Light:
                    return mix(0.97, props.theme.colors.bg3, props.theme.colors.textMain)
                case WarningButtonStyle.Dark:
                    return props.theme.colors.bg0
                case WarningButtonStyle.Danger:
                    return mix(0.8, props.theme.colors.warning, props.theme.colors.textMain)
                default:
                    return mix(0.8, props.theme.colors.textHeadings, props.theme.colors.textMain)
            }
        }};
    }
    display: flex;
    align-items: center;
    justify-content: center;
`

export const DeleteInfo = styled.div`
    font-size: 1rem;
    max-width: 500px;
    min-height: 102px;
    flex: 1;

    flex: 0 0 auto;
    padding-bottom: 10px;
`
export const ResetButtonCard = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    font-size: 0.8rem;
    gap: 10px;

    ${Button} {
        background-color: ${(props) => props.theme.colors.bg0};
        &:hover {
            background: ${(props) => props.theme.colors.bg3};
        }
    }
`

export const AdvancedSettingsToggle = styled(SubtleButton)`
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    color: ${(props) => props.theme.colors.textHeadings};
`

export const Header = styled.div`
    font-size: 0.9rem;
    color: ${(props) => props.theme.colors.textHeadings};
`
