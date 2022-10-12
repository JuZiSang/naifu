import styled from 'styled-components'

import ArrowRight from '../../assets/images/directional_arrow_right.svg'
import ArrowLeft from '../../assets/images/directional_arrow_left.svg'
import ArrowDown from '../../assets/images/directional_arrow_down.svg'
import ArrowUp from '../../assets/images/directional_arrow_up.svg'
import Arrow2 from '../../assets/images/arrow2.svg'

import Thumb from '../../assets/images/thumb.svg'
import ThumbEmpty from '../../assets/images/thumbempty.svg'

import PenTip from '../../assets/images/pen-tip-light.svg'
import Hamburger from '../../assets/images/hamburger_menu.svg'
import Logout from '../../assets/images/logout.svg'
import CrossRounded from '../../assets/images/cross-rounded.svg'
import Cross from '../../assets/images/cross.svg'
import Settings from '../../assets/images/settings.svg'
import Reload from '../../assets/images/reload.svg'
import Send from '../../assets/images/send.svg'
import ColorDrop from '../../assets/images/color_drop.svg'
import Check from '../../assets/images/check.svg'
import Circle from '../../assets/images/circle.svg'
import Plus from '../../assets/images/plus.svg'
import Minus from '../../assets/images/minus.svg'
import Book from '../../assets/images/book.svg'
import Folder from '../../assets/images/folder.svg'
import Save from '../../assets/images/save.svg'
import Export from '../../assets/images/export.svg'
import Import from '../../assets/images/import.svg'
import Edit from '../../assets/images/edit.svg'
import File from '../../assets/images/file.svg'
import Module from '../../assets/images/module.svg'
import Search from '../../assets/images/magglass.svg'
import Delete from '../../assets/images/trash.svg'
import FunnelEmpty from '../../assets/images/funnelEmpty.svg'
import FunnelFilled from '../../assets/images/funnelFilled.svg'
import Link from '../../assets/images/link.svg'
import Stats from '../../assets/images/stats.svg'
import Sliders from '../../assets/images/sliders.svg'
import Home from '../../assets/images/home.svg'

import HeartEnabled from '../../assets/images/heart_enabled.svg'
import HeartDisabled from '../../assets/images/heart_disabled.svg'

import Opus from '../../assets/images/opus.svg'
import Scroll from '../../assets/images/scroll.svg'
import Tablet from '../../assets/images/tablet.svg'

import Party from '../../assets/images/party.svg'
import CrossMid from '../../assets/images/mid_cross.svg'

import Copy from '../../assets/images/copy.svg'
import CopyAlt from '../../assets/images/copyalt.svg'

import OldNai from '../../assets/images/novelnai.png'
import Aa from '../../assets/images/Aa.svg'
import DotDotDot from '../../assets/images/dotdotdot.svg'

import Reset from '../../assets/images/reset.svg'
import Beaker from '../../assets/images/beaker.svg'

import Bat from '../../assets/images/bat.svg'
import Place1 from '../../assets/images/place1.svg'
import Place2 from '../../assets/images/place2.svg'
import Place3 from '../../assets/images/place3.svg'
import PlaceS from '../../assets/images/placeS.svg'
import BigLight from '../../assets/images/big_lightbulb.svg'

import Play from '../../assets/images/play.svg'
import Text from '../../assets/images/text.svg'
import Swords from '../../assets/images/swords.svg'
import Signal from '../../assets/images/signal.svg'
import PenWriting from '../../assets/images/penwriting.svg'
import Ink from '../../assets/images/ink.svg'

import RunningMan from '../../assets/images/walking.svg'
import SpeechBubble from '../../assets/images/speech-bubble.svg'
import BookOpen from '../../assets/images/book-open.svg'
import World from '../../assets/images/world.svg'
import BackSend from '../../assets/images/backsend.svg'
import Mind from '../../assets/images/mind.svg'
import ExclamationPoint from '../../assets/images/exclamation_point.svg'
import SmallCross from '../../assets/images/small_cross.svg'

import Dock from '../../assets/images/dock.svg'
import Undock from '../../assets/images/undock.svg'
import ImageDown from '../../assets/images/image_down.svg'
import BoxCheck from '../../assets/images/box-check.svg'
import SmallArrow from '../../assets/images/small_arrow.svg'
import DotReset from '../../assets/images/dot-reset.svg'
import Clipboard from '../../assets/images/clipboard.svg'
import History from '../../assets/images/history.svg'
import Sparkles from '../../assets/images/sparkles.svg'
import Undo from '../../assets/images/undo.svg'
import Redo from '../../assets/images/redo.svg'
import Eraser from '../../assets/images/eraser.svg'
import Pen from '../../assets/images/pen.svg'
import Select from '../../assets/images/select.svg'
import Dropper from '../../assets/images/dropper.svg'
import Variations from '../../assets/images/variations.svg'
import EmptySparkles from '../../assets/images/empty_sparkles.svg'
import Anla from '../../assets/images/anla.svg'
import Easel from '../../assets/images/easel.svg'
import LeftSparkle from '../../assets/images/left_sparkles.svg'
import RightSparkle from '../../assets/images/right_sparkles.svg'

export const Icon = styled.div<{ highlight?: boolean }>`
    width: 20px;
    height: 20px;
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
    cursor: pointer;
    mask-repeat: no-repeat;
    mask-size: contain;
    mask-position: center;
    background-color: ${(props) =>
        props.highlight ? props.theme.colors.textHeadings : props.theme.colors.textMain};

    color-adjust: exact;
    @media (forced-colors: active) {
        forced-color-adjust: none;
    }
`

export const OldNaiIcon = styled(Icon)`
    background-image: url(${OldNai.src});
    height: 16px;
    width: 16px;
    margin-right: 8px;
    cursor: auto;
`

export const PenTipIcon = styled(Icon)`
    mask-image: url(${PenTip.src});
    height: 16px;
    width: 16px;
    margin-right: 8px;
    cursor: auto;
`

export const AaIcon = styled(Icon)`
    mask-image: url(${Aa.src});
    height: 20px;
    margin-right: 10px;
    cursor: auto;
`

export const DotDotDotIcon = styled(Icon)`
    mask-image: url(${DotDotDot.src});
    height: 20px;
    margin-right: 10px;
    cursor: auto;
`

export const ArrowRightIcon = styled(Icon)`
    mask-image: url(${ArrowRight.src});
    height: 15px;
    width: 10px;
`
export const ArrowLeftIcon = styled(Icon)`
    mask-image: url(${ArrowLeft.src});
    height: 15px;
    width: 10px;
`
export const ArrowDownIcon = styled(Icon)`
    mask-image: url(${ArrowDown.src});
    height: 15px;
    width: 16px;
`
export const ArrowUpIcon = styled(Icon)`
    mask-image: url(${ArrowUp.src});
    height: 15px;
    width: 16px;
`
export const Arrow2Icon = styled(Icon)`
    mask-image: url(${Arrow2.src});
    height: 20px;
    width: 16px;
`

export const ThumbIcon = styled(Icon)`
    mask-image: url(${Thumb.src});
    height: 16px;
    width: 16px;
`
export const ThumbEmptyIcon = styled(Icon)`
    mask-image: url(${ThumbEmpty.src});
    height: 16px;
    width: 16px;
`

export const LogoutIcon = styled(Icon)`
    mask-image: url(${Logout.src});
`
export const ColorDropIcon = styled(Icon)`
    mask-image: url(${ColorDrop.src});
    width: 10px;
    background-color: #ffffff;
`

export const CheckIcon = styled(Icon)`
    mask-image: url(${Check.src});
    width: 9px;
    background-color: #ffffff;
`
export const SmallCrossIcon = styled(Icon)`
    mask-image: url(${SmallCross.src});
    width: 9px;
    background-color: #ffffff;
`
export const CircleIcon = styled(Icon)`
    mask-image: url(${Circle.src});
    width: 15px;
    background-color: #000000;
`

export const BiggerCircleIcon = styled(Icon)`
    mask-image: url(${Circle.src});
    width: 18px;
    background-color: #000000;
`

export const SettingsIcon = styled(Icon)`
    mask-image: url(${Settings.src});
    height: 16px;
`

export const HamburgerIcon = styled(Icon)<{ active: boolean }>`
    cursor: pointer;
    mask-image: ${(props) => (props.active ? `url(${CrossRounded.src})` : `url(${Hamburger.src})`)};
    transition: background-image 0.15s;
`
export const BeakerIcon = styled(Icon)<{ active: boolean }>`
    cursor: pointer;
    mask-image: ${(props) => (props.active ? `url(${CrossRounded.src})` : `url(${Beaker.src})`)};
    transition: background-image 0.15s;
`

export const FlaskIcon = styled(Icon)`
    cursor: pointer;
    mask-image: url(${Beaker.src});
    transition: background-image 0.15s;
`

export const CrossIcon = styled(Icon)`
    mask-image: url(${Cross.src});
`

export const ReloadIcon = styled(Icon)`
    mask-image: url(${Reload.src});
`

export const ResetIcon = styled(Icon)`
    mask-image: url(${Reset.src});
`

export const SendIcon = styled(Icon)`
    mask-image: url(${Send.src});
`

export const BackSendIcon = styled(Icon)`
    mask-image: url(${BackSend.src});
`

export const PlusIcon = styled(Icon)`
    mask-image: url(${Plus.src});
`

export const MinusIcon = styled(Icon)`
    mask-image: url(${Minus.src});
`

export const DeleteIcon = styled(Icon)`
    mask-image: url(${Delete.src});
`
export const FunnelEmptyIcon = styled(Icon)`
    mask-image: url(${FunnelEmpty.src});
`
export const FunnelFilledIcon = styled(Icon)`
    mask-image: url(${FunnelFilled.src});
`
export const LinkIcon = styled(Icon)`
    mask-image: url(${Link.src});
`
export const StatsIcon = styled(Icon)`
    mask-image: url(${Stats.src});
`
export const SlidersIcon = styled(Icon)`
    mask-image: url(${Sliders.src});
`
export const HomeIcon = styled(Icon)`
    mask-image: url(${Home.src});
`

export const HeartEnabledIcon = styled(Icon)`
    mask-image: url(${HeartEnabled.src});
`
export const HeartDisabledIcon = styled(Icon)`
    mask-image: url(${HeartDisabled.src});
`

export const BookIcon = styled(Icon)`
    mask-image: url(${Book.src});
`
export const FolderIcon = styled(Icon)`
    mask-image: url(${Folder.src});
`

export const OpusIcon = styled(Icon)`
    mask-image: url(${Opus.src});
`
export const ScrollIcon = styled(Icon)`
    mask-image: url(${Scroll.src});
`
export const TabletIcon = styled(Icon)`
    mask-image: url(${Tablet.src});
`

export const PartyIcon = styled(Icon)`
    mask-image: url(${Party.src});
`

export const CopyIcon = styled(Icon)`
    mask-image: url(${Copy.src});
`
export const CopyAltIcon = styled(Icon)`
    mask-image: url(${CopyAlt.src});
`
export const CrossMidIcon = styled(Icon)`
    mask-image: url(${CrossMid.src});
    height: 12px;
    width: 12px;
`

export const SaveIcon = styled(Icon)`
    mask-image: url(${Save.src});
    height: 12px;
    width: 12px;
`
export const ExportIcon = styled(Icon)`
    mask-image: url(${Export.src});
    height: 12px;
    width: 12px;
`
export const ImportIcon = styled(Icon)`
    mask-image: url(${Import.src});
    height: 12px;
    width: 12px;
`

export const EditIcon = styled(Icon)`
    mask-image: url(${Edit.src});
`

export const FileIcon = styled(Icon)`
    mask-image: url(${File.src});
`

export const ModuleIcon = styled(Icon)`
    mask-image: url(${Module.src});
`

export const SearchIcon = styled(Icon)`
    mask-image: url(${Search.src});
`

export const BigLightIcon = styled(Icon)`
    mask-image: url(${BigLight.src});
`

export const UpDownArrow = styled(Icon)<{ up: boolean }>`
    mask-image: url(${(props) => (props.up ? ArrowUp.src : ArrowDown.src)});
    background: ${(props) => props.theme.colors.textHeadings};
    cursor: pointer;
    mask-repeat: no-repeat;
    mask-size: 0.9rem 0.9em;
    mask-position: center;
    margin-left: 0.2rem;
`

export const BatIcon = styled(Icon)`
    mask-image: url(${Bat.src});
`
export const Place1Icon = styled(Icon)`
    mask-image: url(${Place1.src});
`
export const Place2Icon = styled(Icon)`
    mask-image: url(${Place2.src});
`
export const Place3Icon = styled(Icon)`
    mask-image: url(${Place3.src});
`
export const PlaceSIcon = styled(Icon)`
    mask-image: url(${PlaceS.src});
`

export const PlayIcon = styled(Icon)`
    mask-image: url(${Play.src});
`
export const TextIcon = styled(Icon)`
    mask-image: url(${Text.src});
`
export const SwordsIcon = styled(Icon)`
    mask-image: url(${Swords.src});
`
export const SignalIcon = styled(Icon)`
    mask-image: url(${Signal.src});
`
export const PenWritingIcon = styled(Icon)`
    mask-image: url(${PenWriting.src});
`
export const InkIcon = styled(Icon)`
    mask-image: url(${Ink.src});
`
export const RunningManIcon = styled(Icon)`
    mask-image: url(${RunningMan.src});
`
export const SpeechBubbleIcon = styled(Icon)`
    mask-image: url(${SpeechBubble.src});
`
export const BookOpenIcon = styled(Icon)`
    mask-image: url(${BookOpen.src});
`
export const WorldIcon = styled(Icon)`
    mask-image: url(${World.src});
`
export const MindIcon = styled(Icon)`
    mask-image: url(${Mind.src});
`

export const ExclamationPointIcon = styled(Icon)`
    mask-image: url(${ExclamationPoint.src});
`
export const DockIcon = styled(Icon)`
    mask-image: url(${Dock.src});
`
export const UndockIcon = styled(Icon)`
    mask-image: url(${Undock.src});
`
export const ImageDownIcon = styled(Icon)`
    mask-image: url(${ImageDown.src});
`

export const BoxCheckIcon = styled(Icon)`
    mask-image: url(${BoxCheck.src});
`

export const NAILogoMarkIcon = styled(Icon)``

export const CrownIcon = styled(Icon)``

export const ForwardArrowIcon = styled(Icon)`
    mask-image: url(${SmallArrow.src});
    transform: rotate(90deg) scaleY(-1);
`

export const DotResetIcon = styled(Icon)`
    mask-image: url(${DotReset.src});
`

export const ClipboardIcon = styled(Icon)`
    mask-image: url(${Clipboard.src});
`

export const HistoryIcon = styled(Icon)`
    mask-image: url(${History.src});
`

export const SparklesIcon = styled(Icon)`
    mask-image: url(${Sparkles.src});
`

export const UndoIcon = styled(Icon)`
    mask-image: url(${Undo.src});
`

export const RedoIcon = styled(Icon)`
    mask-image: url(${Redo.src});
`

export const EraserIcon = styled(Icon)`
    mask-image: url(${Eraser.src});
`

export const PenIcon = styled(Icon)`
    mask-image: url(${Pen.src});
`

export const SelectIcon = styled(Icon)`
    mask-image: url(${Select.src});
`

export const DropperIcon = styled(Icon)`
    mask-image: url(${Dropper.src});
`

export const VariationsIcon = styled(Icon)`
    mask-image: url(${Variations.src});
`

export const EmptySparklesIcon = styled(Icon)`
    mask-image: url(${EmptySparkles.src});
`

export const AnlaIcon = styled(Icon)`
    mask-image: url(${Anla.src});
`

export const EaselIcon = styled(Icon)`
    mask-image: url(${Easel.src});
`

export const LeftSparkleIcon = styled(Icon)`
    mask-image: url(${LeftSparkle.src});

    @media (max-width: 700px) {
        display: none;
    }
`
export const RightSparkleIcon = styled(Icon)`
    mask-image: url(${RightSparkle.src});
    @media (max-width: 700px) {
        display: none;
    }
`
