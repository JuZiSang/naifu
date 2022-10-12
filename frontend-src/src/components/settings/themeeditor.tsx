import { useState, useRef, useCallback, useEffect } from 'react'
import { useRecoilState } from 'recoil'
import styled from 'styled-components'
import { HexColorPicker, HexColorInput, RgbaStringColorPicker } from 'react-colorful'
import TextareaAutosize from 'react-textarea-autosize'
import WebFont from '../../data/webfontloader'
import { minifyCss, prettifyCss } from '../../util/util'
import { transparentize } from '../../util/colour'

import { ThemePreview } from '../../globals/state'
import {
    backupFonts,
    googleFonts,
    headingsFontOptions,
    mainFontOptions,
    Theme,
} from '../../styles/themes/theme'
import {
    ColorDropIcon,
    CheckIcon,
    CircleIcon,
    BiggerCircleIcon,
    ArrowDownIcon,
    ArrowUpIcon,
} from '../../styles/ui/icons'

import { useClickOutside } from '../../hooks/useClickOutside'
import { FlexColSpacer } from '../../styles/ui/layout'
import { SubtleButton } from '../../styles/ui/button'

const editorBreakpoint = '800px'
let fontsLoaded = false

function pickTextColorBasedOnBgColorAdvanced(bgColor: string, lightColor: string, darkColor: string) {
    const color = bgColor.charAt(0) === '#' ? bgColor.slice(1, 7) : bgColor
    const r = Number.parseInt(color.slice(0, 2), 16) // hexToR
    const g = Number.parseInt(color.slice(2, 4), 16) // hexToG
    const b = Number.parseInt(color.slice(4, 6), 16) // hexToB
    const uicolors = [r / 255, g / 255, b / 255]
    const c = uicolors.map((col) => {
        if (col <= 0.03928) {
            return col / 12.92
        }
        return Math.pow((col + 0.055) / 1.055, 2.4)
    })
    const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    return L > 0.179 ? darkColor : lightColor
}

const ThemeEditorStyle = styled.div.attrs((props: { bg0: string; bg1: string; bg2: string; bg3: string }) => {
    return {
        style: {
            background: `linear-gradient(90deg, ${props.bg0} 56px, rgba(0, 0, 0, 0) 56px),
            linear-gradient(90deg, ${props.bg1} 112px, rgba(0, 0, 0, 0) 112px),
            linear-gradient(90deg, ${props.bg3} 156px, rgba(0, 0, 0, 0) 156px),
            linear-gradient(90deg, ${props.bg2} 100%, rgba(0, 0, 0, 0) 100%)`,
        },
    }
})<{ bg0: string; bg1: string; bg2: string; bg3: string }>`
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-weight: 400;
    border: 1px solid #000000;
    > div {
        @media (max-width: ${editorBreakpoint}) {
            flex-direction: column;
        }
        width: 100%;
        display: flex;
        flex-direction: row;
    }
`
const EditorExampleHeader = styled.div`
    font-weight: 600;
    font-size: 1.6rem;
    margin: 30px 15px 0px 30px;
`

interface EditorExampleParagraphProps {
    textColor: string
    mainFont: string
}

const EditorExampleParagraph = styled.div.attrs((props: EditorExampleParagraphProps) => {
    return {
        style: {
            color: props.textColor,
            fontFamily: props.mainFont,
        },
    }
})<EditorExampleParagraphProps>`
    font-size: 1rem;
    margin: 0px 15px 10px 30px;
`
const EditorExampleOuput = styled.div.attrs((props: { bgColor: string }) => ({
    style: {
        backgroundColor: props.bgColor,
    },
}))<{ bgColor: string }>`
    font-size: 1rem;
    margin: 25px;
    width: max-content;
    min-width: 240px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    > div {
        display: flex;
        justify-content: space-between;

        > div:first-child {
            margin-right: 10px;
        }
        > div:first-child {
            display: block;
        }
    }
    > div:not(:first-child) {
        margin-top: 4px;
    }
`

const Header = styled.div.attrs((props: { font: string; color: string }) => {
    return {
        style: {
            fontFamily: props.font,
            color: props.color,
        },
    }
})<{ font: string; color: string }>`
    margin-top: 15px;
    font-size: 1rem;
    font-weight: 600;
`
const Paragraph = styled.div.attrs((props: { font: string; color: string }) => {
    return {
        style: {
            fontFamily: props.font,
            color: props.color,
        },
    }
})<{ font: string; color: string }>`
    font-size: 0.875rem;
`

const EditorSwatchContainer = styled.div<{ columns: number }>`
    width: 100%;
    display: grid;
    flex-direction: row;
    grid-template-columns: repeat(${(props) => props.columns}, auto);
    grid-gap: 10px;
`

const EditorSeperator = styled.div.attrs((props: { color: string }) => {
    return {
        style: {
            backgroundColor: props.color,
        },
    }
})<{ color: string }>`
    @media (max-width: ${editorBreakpoint}) {
        display: none;
    }
    height: 440px;
    width: 2px;
    flex-shrink: 0;
    align-self: center;
    margin: 0px 25px 0px 25px;
`

const EditorSwatch = styled.div.attrs((props: { color: string }) => {
    return {
        style: {
            backgroundColor: props.color,
        },
    }
})<{ color: string }>`
    position: relative;
    display: flex;
    justify-content: space-around;
    align-items: center;
    cursor: pointer;
    width: 100%;
    height: 24px;
    margin-top: 8px;
    border-radius: 2px;
`
const OutputSwatch = styled(EditorSwatch)`
    width: 36px;
    margin: 0;
`

const BackgroundSwatch = styled(EditorSwatch)`
    border: 1px solid #000000;
`

const EditorExample = styled.div`
    width: 100%;
    flex: 4;
`
const EditorColors = styled.div`
    width: 100%;
    flex: 6;
    margin-right: 25px;
    > div {
        margin-top: 18px;
    }
    &:last-child {
        margin-bottom: 40px;
    }
    @media (max-width: ${editorBreakpoint}) {
        padding: 5px;
    }
`

export const StackedIcons = styled.div`
    position: relative;
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: 100%;
    width: 100%;
    > div {
        position: absolute;
    }
`

const DynamicDropIconStyle = styled(ColorDropIcon).attrs((props: { color: string }) => ({
    style: {
        backgroundColor: props.color,
    },
}))<{ color: string }>``

const PopupColorPickerRight = styled.div`
    position: absolute;
    top: -50px;
    right: -210px;
    z-index: 1;
    @media (max-width: ${editorBreakpoint}) {
        top: -100px;
        right: 0px;
    }
`

const PopupColorPickerLeft = styled.div`
    position: absolute;
    top: -50px;
    left: -210px;
    z-index: 1;
    @media (max-width: ${editorBreakpoint}) {
        top: unset;
        left: unset;
        right: 40px;
    }
`

const StyledHexColorPicker = styled(HexColorPicker)`
    width: 50px;
    .react-colorful__saturation {
        border-radius: 5px 5px 0 0;
    }
    .react-colorful__last-control {
        border-radius: 0;
    }
`

const StyledRgbaColorPicker = styled(RgbaStringColorPicker)`
    width: 50px;
    .react-colorful__saturation {
        border-radius: 5px 5px 0 0;
    }
    .react-colorful__last-control {
        border-radius: 0;
    }
`
const StyledHexInputColor = styled(HexColorInput)`
    border-radius: 0 0 5px 5px;
`

const FontContainer = styled.div`
    margin: 25px;
    width: max-content;
    min-width: 240px;
    user-select: none;
`

const FontSelectStyle = styled.div.attrs((props: { bgColor: string }) => {
    return {
        style: {
            backgroundColor: props.bgColor,
        },
    }
})<{ bgColor: string }>`
    margin-top: 10px;
    position: relative;
    box-sizing: border-box;
    display: flex;
    padding: 10px;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;

    span {
        left: 0%;
        top: 100%;
        width: 100%;
        max-height: 180px;
        overflow-y: scroll;
        position: absolute;
        z-index: 100;
        background-color: ${(props) => props.bgColor};
    }
`

const HoverableStyle = styled.div.attrs((props: { bgColor: string; transition: string }) => {
    return {
        style: {
            backgroundColor: props.bgColor,
            transition: 'background ' + props.transition,
        },
    }
})<{ bgColor: string; transition: string }>`
    z-index: 302;
    position: relative;
    div {
        padding: 10px;
    }
`

function Hoverable(props: {
    primaryColor: string
    secondaryColor: string
    children: JSX.Element
    transition: string
}): JSX.Element {
    const [itemHovered, setItemHovered] = useState(false)

    return (
        <HoverableStyle
            onMouseEnter={() => setItemHovered(true)}
            onMouseLeave={() => setItemHovered(false)}
            bgColor={itemHovered ? props.primaryColor : props.secondaryColor}
            transition={props.transition}
        >
            {props.children}
        </HoverableStyle>
    )
}

function FontSelect(props: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    fonts: string[]
    font: string
    setFont: (font: string) => void
    transition: string
}): JSX.Element {
    const [selectOpen, setSelectOpen] = useState(false)
    const dropdown = useRef<any>(null)
    useClickOutside(dropdown, () => {
        setSelectOpen(false)
    })

    useEffect(() => {
        if (!fontsLoaded && selectOpen) {
            fontsLoaded = true
            WebFont.load({
                google: {
                    families: googleFonts.map((f) => f + ':400,600,700'),
                },
            })
        }
    }, [selectOpen])

    return (
        <FontSelectStyle
            ref={dropdown}
            bgColor={props.primaryColor}
            onClick={() => setSelectOpen(!selectOpen)}
        >
            <div style={{ fontFamily: `"${props.font}"`, color: props.textColor }}>{props.font}</div>{' '}
            <ArrowDownIcon />
            {selectOpen ? (
                <span>
                    {props.fonts.map((font: string, index: number) => {
                        return (
                            <Hoverable
                                key={index}
                                primaryColor={props.primaryColor}
                                secondaryColor={props.secondaryColor}
                                transition={props.transition}
                            >
                                <SubtleButton
                                    onClick={() => {
                                        props.setFont(font)
                                    }}
                                    style={{ fontFamily: `"${font}"`, color: props.textColor }}
                                >
                                    {props.fonts[index]}
                                </SubtleButton>
                            </Hoverable>
                        )
                    })}
                </span>
            ) : (
                <></>
            )}
        </FontSelectStyle>
    )
}

function FontColorSelector(props: {
    colors: string[]
    currentColor: string
    onColorSelected: (color: string) => void
    text: string
    headerFont: string
    headerColor: string
}): JSX.Element {
    const checkedIndex = props.colors.indexOf(props.currentColor)
    return (
        <div>
            <Header font={props.headerFont} color={props.headerColor}>
                {props.text}
            </Header>
            <EditorSwatchContainer columns={5}>
                {props.colors.map((color: string, index: number) => {
                    return index === checkedIndex ? (
                        <EditorSwatch key={index} onClick={() => props.onColorSelected(color)} color={color}>
                            <StackedIcons>
                                <CircleIcon />
                                <CheckIcon />
                            </StackedIcons>
                        </EditorSwatch>
                    ) : (
                        <EditorSwatch
                            key={index}
                            onClick={() => props.onColorSelected(color)}
                            color={color}
                        ></EditorSwatch>
                    )
                })}
                {checkedIndex === -1 ? (
                    <CustomizerSwatch
                        checked={checkedIndex === -1}
                        onColorSelected={props.onColorSelected}
                        initialColor={props.currentColor}
                        color={props.currentColor}
                        type={0}
                    />
                ) : (
                    <CustomizerSwatch
                        checked={checkedIndex === -1}
                        onColorSelected={props.onColorSelected}
                        initialColor={props.currentColor}
                        color={'#FFFFFF'}
                        type={0}
                    />
                )}
            </EditorSwatchContainer>
        </div>
    )
}

function BackgroundColorSelector(props: {
    color: string
    currentColor: string
    onColorSelected: (color: string) => void
    text: string
    headerFont: string
    headerColor: string
}): JSX.Element {
    const checked = props.currentColor === props.color
    return (
        <div>
            <Header font={props.headerFont} color={props.headerColor}>
                {props.text}
            </Header>
            <EditorSwatchContainer columns={2}>
                {checked ? (
                    <BackgroundSwatch onClick={() => props.onColorSelected(props.color)} color={props.color}>
                        <StackedIcons>
                            <CircleIcon />
                            <CheckIcon />
                        </StackedIcons>
                    </BackgroundSwatch>
                ) : (
                    <BackgroundSwatch
                        onClick={() => props.onColorSelected(props.color)}
                        color={props.color}
                    ></BackgroundSwatch>
                )}
                <CustomizerSwatch
                    onColorSelected={props.onColorSelected}
                    color={checked ? '#FFFFFF' : props.currentColor}
                    initialColor={props.currentColor}
                    type={2}
                    checked={!checked}
                />
            </EditorSwatchContainer>
        </div>
    )
}

function DynamicDropIcon(props: { color: string }): JSX.Element {
    const newColor = pickTextColorBasedOnBgColorAdvanced(props.color, '#FFFFFF', '#000000')
    return <DynamicDropIconStyle color={newColor}></DynamicDropIconStyle>
}

function CustomizerSwatch(props: {
    alpha?: boolean
    checked?: boolean
    type: number
    color: string
    initialColor?: string
    onColorSelected: (color: string) => void
}): JSX.Element {
    const popover = useRef<any>(null)
    const [isOpen, toggle] = useState(false)
    const close = useCallback(() => {
        toggle(false)
    }, [])
    useClickOutside(popover, close)
    const [color, setColor] = useState(props.initialColor ?? props.color)
    const changeColor = (color: string) => {
        setColor(color)
        props.onColorSelected(color)
    }
    const displayColor = props.color
    switch (props.type) {
        case 0:
            return (
                <EditorSwatch color={displayColor} onClick={() => toggle(true)}>
                    <>
                        {props.checked ? (
                            <StackedIcons>
                                <StackedIcons>
                                    <BiggerCircleIcon />
                                    <ColorDropIcon />
                                </StackedIcons>
                            </StackedIcons>
                        ) : (
                            <StackedIcons>
                                <DynamicDropIcon color={displayColor} />
                            </StackedIcons>
                        )}
                        {isOpen && (
                            <PopupColorPickerLeft ref={popover}>
                                <StyledHexColorPicker color={color} onChange={changeColor} />
                                <StyledHexInputColor color={color} onChange={changeColor} />
                            </PopupColorPickerLeft>
                        )}
                    </>
                </EditorSwatch>
            )
        case 1:
            return (
                <>
                    <OutputSwatch onClick={() => toggle(true)} color={color}>
                        <DynamicDropIcon color={color} />
                        {isOpen && (
                            <PopupColorPickerRight ref={popover}>
                                {props.alpha ? (
                                    <>
                                        <StyledRgbaColorPicker
                                            color={color}
                                            onChange={changeColor}
                                        ></StyledRgbaColorPicker>
                                    </>
                                ) : (
                                    <>
                                        <StyledHexColorPicker color={color} onChange={changeColor} />
                                        <StyledHexInputColor color={color} onChange={changeColor} />
                                    </>
                                )}
                            </PopupColorPickerRight>
                        )}
                    </OutputSwatch>
                </>
            )
        case 2:
            return (
                <BackgroundSwatch color={displayColor} onClick={() => toggle(true)}>
                    <>
                        {props.checked ? (
                            <StackedIcons>
                                <BiggerCircleIcon />
                                <ColorDropIcon />
                            </StackedIcons>
                        ) : (
                            <StackedIcons>
                                <DynamicDropIcon color={displayColor} />
                            </StackedIcons>
                        )}
                        {isOpen && (
                            <PopupColorPickerLeft ref={popover}>
                                <StyledHexColorPicker color={color} onChange={changeColor} />
                                <StyledHexInputColor color={color} onChange={changeColor} />
                            </PopupColorPickerLeft>
                        )}
                    </>
                </BackgroundSwatch>
            )
        default:
            return <></>
    }
}

export default function ThemeEditor(): JSX.Element {
    const [themePreview, setThemePreview] = useRecoilState(ThemePreview)

    const setHeaderColor = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, textHeadings: color } }
        setThemePreview(updatedTheme)
    }

    const setMainColor = (color: string) => {
        const updatedTheme = {
            ...themePreview,
            colors: {
                ...themePreview.colors,
                textMain: color,
                textPlaceholder: transparentize(0.62, color),
                textDisabled: transparentize(0.44, color),
            },
        }
        setThemePreview(updatedTheme)
    }

    const setWarningColor = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, warning: color } }
        setThemePreview(updatedTheme)
    }

    const setBg0Color = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, bg0: color } }
        setThemePreview(updatedTheme)
    }

    const setBg1Color = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, bg1: color } }
        setThemePreview(updatedTheme)
    }

    const setBg2Color = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, bg2: color } }
        setThemePreview(updatedTheme)
    }

    const setBg3Color = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, bg3: color } }
        setThemePreview(updatedTheme)
    }

    const setPromptColor = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, textPrompt: color } }
        setThemePreview(updatedTheme)
    }

    const setAIColor = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, textAI: color } }
        setThemePreview(updatedTheme)
    }

    const setEditColor = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, textEdit: color } }
        setThemePreview(updatedTheme)
    }

    const setUserColor = (color: string) => {
        const updatedTheme = { ...themePreview, colors: { ...themePreview.colors, textUser: color } }
        setThemePreview(updatedTheme)
    }

    const setHighlightColor = (color: string) => {
        const updatedTheme = {
            ...themePreview,
            colors: { ...themePreview.colors, textHighlight: color },
        }
        setThemePreview(updatedTheme)
    }

    const setHeaderFont = (font: string) => {
        const updatedTheme = {
            ...themePreview,
            fonts: { ...themePreview.fonts, selectedHeadings: font, headings: `"${font}"` },
        }
        setThemePreview(updatedTheme)
    }

    const setDefaultFont = (font: string) => {
        const updatedTheme = {
            ...themePreview,
            fonts: {
                ...themePreview.fonts,
                selectedDefault: font,
                default: `"${font}"${backupFonts}`,
                field: `"${font}"${backupFonts}`,
            },
        }
        setThemePreview(updatedTheme)
    }

    const [globalCss, setGlobalCss] = useState('')
    useEffect(() => {
        setGlobalCss(prettifyCss(themePreview.global))
    }, [themePreview])
    const [cssEditorExpanded, setCssEditorExpanded] = useState(false)

    return (
        <ThemeEditorStyle
            bg0={themePreview.colors.bg0}
            bg1={themePreview.colors.bg1}
            bg2={themePreview.colors.bg2}
            bg3={themePreview.colors.bg3}
            className="theme-editor"
        >
            <div>
                <EditorExample>
                    <EditorExampleHeader
                        style={{
                            fontFamily: themePreview.fonts.headings,
                            color: themePreview.colors.textHeadings,
                        }}
                    >
                        {themePreview.name}
                    </EditorExampleHeader>
                    <EditorExampleParagraph
                        textColor={themePreview.colors.textMain}
                        mainFont={themePreview.fonts.default}
                        theme={themePreview}
                    >
                        This is paragraph text. Nice!
                    </EditorExampleParagraph>
                    <EditorExampleOuput bgColor={themePreview.colors.bg1}>
                        <div>
                            <div
                                style={{
                                    color: themePreview.colors.textPrompt,
                                    fontFamily: themePreview.fonts.field,
                                }}
                            >
                                This is a prompt.
                            </div>
                            <CustomizerSwatch
                                onColorSelected={setPromptColor}
                                color={themePreview.colors.textPrompt}
                                type={1}
                            />
                        </div>
                        <div>
                            <div
                                style={{
                                    color: themePreview.colors.textAI,
                                    fontFamily: themePreview.fonts.field,
                                }}
                            >
                                This is AI text.
                            </div>
                            <CustomizerSwatch
                                onColorSelected={setAIColor}
                                color={themePreview.colors.textAI}
                                type={1}
                            />
                        </div>
                        <div>
                            <div
                                style={{
                                    color: themePreview.colors.textEdit,
                                    fontFamily: themePreview.fonts.field,
                                }}
                            >
                                This is edited text.
                            </div>
                            <CustomizerSwatch
                                onColorSelected={setEditColor}
                                color={themePreview.colors.textEdit}
                                type={1}
                            />
                        </div>
                        <div>
                            <div
                                style={{
                                    color: themePreview.colors.textUser,
                                    fontFamily: themePreview.fonts.field,
                                }}
                            >
                                This is new user text.
                            </div>
                            <CustomizerSwatch
                                onColorSelected={setUserColor}
                                color={themePreview.colors.textUser}
                                type={1}
                            />
                        </div>
                        <div>
                            <div
                                style={{
                                    background: themePreview.colors.textHighlight,
                                    color: themePreview.colors.textMain,
                                    fontFamily: themePreview.fonts.field,
                                }}
                            >
                                This is highlighted text.
                            </div>
                            <CustomizerSwatch
                                alpha={true}
                                onColorSelected={setHighlightColor}
                                color={themePreview.colors.textHighlight}
                                type={1}
                            />
                        </div>
                    </EditorExampleOuput>
                    <FontContainer>
                        <Header font={themePreview.fonts.default} color={themePreview.colors.textMain}>
                            Header Font
                        </Header>
                        <FontSelect
                            fonts={headingsFontOptions}
                            textColor={themePreview.colors.textMain}
                            primaryColor={themePreview.colors.bg0}
                            secondaryColor={themePreview.colors.bg1}
                            font={themePreview.fonts.selectedHeadings}
                            setFont={setHeaderFont}
                            transition={themePreview.transitions.interactive}
                        />
                        <Header font={themePreview.fonts.default} color={themePreview.colors.textMain}>
                            Paragraph Font
                        </Header>
                        <FontSelect
                            fonts={mainFontOptions}
                            textColor={themePreview.colors.textMain}
                            primaryColor={themePreview.colors.bg0}
                            secondaryColor={themePreview.colors.bg1}
                            font={themePreview.fonts.selectedDefault}
                            setFont={setDefaultFont}
                            transition={themePreview.transitions.interactive}
                        />
                    </FontContainer>
                </EditorExample>
                <EditorSeperator color={themePreview.colors.bg3} />
                <EditorColors>
                    <FontColorSelector
                        headerFont={themePreview.fonts.default}
                        headerColor={themePreview.colors.textMain}
                        onColorSelected={setHeaderColor}
                        colors={themePreview.colors.textHeadingsOptions}
                        currentColor={themePreview.colors.textHeadings}
                        text={'Header'}
                    />
                    <FontColorSelector
                        headerFont={themePreview.fonts.default}
                        headerColor={themePreview.colors.textMain}
                        onColorSelected={setMainColor}
                        colors={themePreview.colors.textMainOptions}
                        currentColor={themePreview.colors.textMain}
                        text={'Paragraph'}
                    />
                    <BackgroundColorSelector
                        headerFont={themePreview.fonts.default}
                        headerColor={themePreview.colors.textMain}
                        onColorSelected={setWarningColor}
                        color={themePreview.colors.warning}
                        currentColor={themePreview.colors.warning}
                        text={'Warning/Error'}
                    />
                    <BackgroundColorSelector
                        headerFont={themePreview.fonts.default}
                        headerColor={themePreview.colors.textMain}
                        onColorSelected={setBg3Color}
                        color={themePreview.colors.bg3}
                        currentColor={themePreview.colors.bg3}
                        text={'Foreground'}
                    />
                    <BackgroundColorSelector
                        headerFont={themePreview.fonts.default}
                        headerColor={themePreview.colors.textMain}
                        onColorSelected={setBg2Color}
                        color={themePreview.colors.bg2}
                        currentColor={themePreview.colors.bg2}
                        text={'Background'}
                    />
                    <BackgroundColorSelector
                        headerFont={themePreview.fonts.default}
                        headerColor={themePreview.colors.textMain}
                        onColorSelected={setBg1Color}
                        color={themePreview.colors.bg1}
                        currentColor={themePreview.colors.bg1}
                        text={'Dark Background'}
                    />
                    <BackgroundColorSelector
                        headerFont={themePreview.fonts.default}
                        headerColor={themePreview.colors.textMain}
                        onColorSelected={setBg0Color}
                        color={themePreview.colors.bg0}
                        currentColor={themePreview.colors.bg0}
                        text={'Input Background'}
                    />
                </EditorColors>
            </div>
            <div>
                <EditorContainer>
                    <div>
                        <Header font={themePreview.fonts.default} color={themePreview.colors.textMain}>
                            <CSSButton onClick={() => setCssEditorExpanded((v) => !v)}>
                                <span>Custom CSS</span>
                                {cssEditorExpanded ? (
                                    <CSSUpIcon themePreview={themePreview} />
                                ) : (
                                    <CSSDownIcon themePreview={themePreview} />
                                )}
                            </CSSButton>
                        </Header>
                    </div>
                    {cssEditorExpanded ? (
                        <>
                            <Paragraph font={themePreview.fonts.default} color={themePreview.colors.warning}>
                                Custom CSS is experimental and some changes could cause the UI to become
                                unusable. Future updates could change the default styles and make custom CSS
                                set here not function as intended. Alt + Shift + P can be used to reset your
                                theme to the default theme.
                            </Paragraph>
                            <FlexColSpacer min={10} max={10} />
                            <CssEditor
                                themePreview={themePreview}
                                onBlur={() =>
                                    setThemePreview((v) => {
                                        return { ...v, global: minifyCss(globalCss, false) }
                                    })
                                }
                                onChange={(e) => setGlobalCss(e.target.value)}
                                minRows={5}
                                maxRows={24}
                                value={globalCss}
                            />
                        </>
                    ) : (
                        <></>
                    )}
                </EditorContainer>
            </div>
        </ThemeEditorStyle>
    )
}

export const CssEditor = styled(TextareaAutosize)<{ themePreview?: Theme }>`
    padding: 10px;
    font-family: ${(props) => props.themePreview?.fonts?.code ?? props.theme.fonts.code};
    border: 1px solid ${(props) => props.themePreview?.colors?.bg3 ?? props.theme.colors.bg3};
    color: ${(props) => props.themePreview?.colors?.textMain ?? props.theme.colors.textMain};
    background: ${(props) => props.themePreview?.colors?.bg1 ?? props.theme.colors.bg1};
    &:focus {
        background: ${(props) => props.themePreview?.colors?.bg0 ?? props.theme.colors.bg0};
    }
`

const EditorContainer = styled.div`
    width: 100%;
    margin: 20px 30px;
    display: flex;
    flex-direction: column;
`
const CSSButton = styled(SubtleButton)`
    display: flex;
    align-items: center;
    > * {
        margin-right: 10px;
    }
`

const CSSDownIcon = styled(ArrowDownIcon)<{ themePreview: Theme }>`
    background-color: ${(props) => props.themePreview.colors.textMain};
`

const CSSUpIcon = styled(ArrowUpIcon)<{ themePreview: Theme }>`
    background-color: ${(props) => props.themePreview.colors.textMain};
`
