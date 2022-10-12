/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { ReactElement, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { MdHelpOutline } from 'react-icons/md'
import styled from 'styled-components'
import { useClickOutside } from '../../../hooks/useClickOutside'
import useRememberedValue from '../../../hooks/useRememberedValue'
import { SubtleButton } from '../../../styles/ui/button'
import {
    EditorCardHeader,
    EditorCardHint,
    EditorCardHints,
    EditorCardTitle,
    EditorCard as StyledEditorCard,
    MainSettingHeading,
    MainSettingInfo,
    MainSettingValue,
    MinorSettingText,
    EditorCardButtonHint,
    ZeroMark,
    EditorCardDescription,
} from '../../../styles/ui/editorcard'
import { ArrowDownIcon, ArrowUpIcon } from '../../../styles/ui/icons'
import { FlexRow } from '../../../styles/ui/layout'
import { ThickSlider, ThinSlider } from '../../../styles/ui/slider'
import Tooltip from '../../tooltip'

const EXCLUDE_REGEX = [
    /[^\d-.]+/g, // Non Decimal Number Characters
    /[^\d.]+/g, // Non Positive Decimal Number Characters
    /[^\d-]+/g, // Non Integer Characters
    /\D+/g, // Non Positive Integer Characters
]
const REGEX = [
    /(-)?(\d+)(\.\d*)?/g, // Decimal Numbers
    /(\d+)(\.\d*)?/g, // Positive Decimal Numbers
    /(-)?(\d+)/g, // Integers
    /(\d+)/g, // Positive Integers
]

const processNumericInput = (
    val: string,
    negativeAllowed: boolean,
    minVal: number | undefined,
    maxVal: number | undefined,
    setValue: (val: number) => void,
    setInputValue: (val: string) => void,
    step?: number,
    preventDecimal?: boolean
) => {
    const negative = negativeAllowed
    const decimal = !preventDecimal
    let regex = 0
    if (negative && decimal) {
        regex = 0
    } else if (negative && !decimal) {
        regex = 2
    } else if (!negative && !decimal) {
        regex = 3
    } else {
        regex = 1
    }

    let value = val.replace(EXCLUDE_REGEX[regex], '')
    const pattern = REGEX[regex]
    const matches = value.match(pattern)
    if (matches) {
        value = matches[0]
    }
    let num = Number.parseFloat(value)

    if (Number.isNaN(num)) {
        num = 0
    }
    if (step) {
        num -= num % step
    }

    num = Math.max(minVal ?? Number.NEGATIVE_INFINITY, Math.min(maxVal ?? Number.POSITIVE_INFINITY, num))
    if (value.endsWith('.') || value === '' || value === '-') {
        setInputValue(value)
    } else {
        setInputValue(value)
    }
    setValue(num)
}

export default function EditorCard(props: {
    title?: string
    hint?: string | JSX.Element
    children: ReactElement | ReactElement[]
    tooltip?: string
    description?: string | JSX.Element
    onHintClick?: () => void
    style?: React.CSSProperties
    small?: boolean
    className?: string
    labelFor?: string
    collapseKey?: string
}): JSX.Element {
    const [collapsed, setCollapsed] = useRememberedValue(props.collapseKey ?? '', false)
    return (
        <StyledEditorCard className={props.className} style={props.style} small={props.small}>
            {props.title ? (
                <EditorCardHeader data-tip={props.tooltip}>
                    <EditorCardTitle
                        small={props.small}
                        style={{
                            cursor: props.collapseKey ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                            if (props.collapseKey) {
                                setCollapsed(!collapsed)
                            }
                        }}
                    >
                        {props.labelFor ? <label htmlFor={props.labelFor}>{props.title}</label> : props.title}
                        {props.tooltip ? (
                            <Tooltip delay={1} tooltip={props.tooltip}>
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        ) : null}
                        {props.collapseKey && (
                            <div style={{ marginLeft: 5, opacity: 0.7 }}>
                                {collapsed ? <ArrowDownIcon /> : <ArrowUpIcon />}
                            </div>
                        )}
                    </EditorCardTitle>
                    {!collapsed && (
                        <>
                            {props.onHintClick ? (
                                <EditorCardHint onClick={props.onHintClick}>{props.hint}</EditorCardHint>
                            ) : (
                                <EditorCardHint>{props.hint}</EditorCardHint>
                            )}
                        </>
                    )}
                </EditorCardHeader>
            ) : (
                <></>
            )}
            {!collapsed && (
                <>
                    <EditorCardDescription>{props.description}</EditorCardDescription>
                    <div>{props.children}</div>
                </>
            )}
        </StyledEditorCard>
    )
}

export interface MultiActionHint {
    hint: string
    onHintClick: () => void
}

function round(num: number, digits: number = 2) {
    return Math.round((num + Number.EPSILON) * Math.pow(10, digits)) / Math.pow(10, digits)
}

export function MultiActionEditorCard(props: {
    title: string
    hints?: MultiActionHint[]
    children: ReactElement
    tooltip?: string
    description?: string | JSX.Element
    style?: React.CSSProperties
}): JSX.Element {
    return (
        <StyledEditorCard style={props.style}>
            <EditorCardHeader data-tip={props.tooltip}>
                <EditorCardTitle>
                    {props.title}
                    {props.tooltip ? (
                        <Tooltip delay={1} tooltip={props.tooltip}>
                            <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                        </Tooltip>
                    ) : null}
                </EditorCardTitle>
                <EditorCardHints>
                    {props.hints?.map((hint, i) => (
                        <EditorCardButtonHint key={i} onClick={hint.onHintClick}>
                            {hint.hint}
                        </EditorCardButtonHint>
                    ))}
                </EditorCardHints>
            </EditorCardHeader>
            <EditorCardDescription>{props.description}</EditorCardDescription>
            <div>{props.children}</div>
        </StyledEditorCard>
    )
}

export function MainSettingSliderCard(props: {
    title: string | JSX.Element
    hint?: string
    tooltip?: string
    onHintClick?: () => void
    value: number
    onChange: (e: number) => void
    min: string | number
    max: string | number
    step: string | number
    prefix?: (value: number) => string
    suffix?: (value: number) => string
    changeDelay?: number
    preventDecimal?: boolean
    forceStep?: boolean
    uncapMin?: boolean
    uncapMax?: boolean
    small?: boolean
    style?: React.CSSProperties
    simple?: boolean
}): JSX.Element {
    const maxVal = useMemo(
        () => (typeof props.max === 'number' ? props.max : Number.parseFloat(props.max)),
        [props.max]
    )
    const minVal = useMemo(
        () => (typeof props.min === 'number' ? props.min : Number.parseFloat(props.min)),
        [props.min]
    )
    const step = useMemo(
        () => (typeof props.step === 'number' ? props.step : Number.parseFloat(props.step)),
        [props.step]
    )

    const [focused, setFocused] = useState(false)
    const [value, setValue] = useState(props.value)
    const [inputValue, setInputValue] = useState((props.value ?? 0).toString())
    const inputRef = useRef<HTMLInputElement>(null)

    const changeTimeout = useRef(0)
    const changeValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        clearTimeout(changeTimeout.current)
        setValue(e.target.valueAsNumber)
        setInputValue(e.target.value)
        changeTimeout.current = setTimeout(() => {
            props.onChange(e.target.valueAsNumber)
        }, props.changeDelay ?? 250) as any as number
    }

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.width = inputValue.length + '.3ch'
        }
    }, [inputValue])

    useEffect(() => {
        clearTimeout(changeTimeout.current)
        setValue(props.value)
        setInputValue(props.value.toString())
    }, [props.value])

    return (
        <StyledEditorCard small={props.small} style={props.style}>
            <div
                style={{
                    display: props.simple ? 'flex' : 'unset',
                }}
            >
                <MainSettingHeading
                    simple={props.simple}
                    style={{
                        marginRight: props.simple ? '0.5ch' : 'unset',
                    }}
                >
                    {props.title}
                </MainSettingHeading>
                {props.tooltip ? <MainSettingInfo>{props.tooltip}</MainSettingInfo> : <></>}
                <MainSettingValue simple={props.simple} focused={focused}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <div onClick={() => inputRef.current?.focus()}>
                            {props.prefix ? props.prefix(value) : ''}
                        </div>
                        <input
                            ref={inputRef}
                            value={inputValue}
                            type="number"
                            onChange={(e) => {
                                processNumericInput(
                                    e.target.value,
                                    minVal < 0,
                                    props.uncapMin === true ? undefined : minVal,
                                    props.uncapMax === true ? undefined : maxVal,
                                    setValue,
                                    setInputValue,
                                    props.forceStep ? step : undefined,
                                    props.preventDecimal
                                )
                            }}
                            onBlur={() => {
                                setInputValue(value.toString())
                                props.onChange(value)
                            }}
                        />
                        <div onClick={() => inputRef.current?.focus()}>
                            {props.suffix ? props.suffix(value) : ''}
                        </div>
                    </div>
                    {props.onHintClick ? (
                        <EditorCardHint onClick={props.onHintClick}>{props.hint}</EditorCardHint>
                    ) : (
                        <EditorCardHint>{props.hint}</EditorCardHint>
                    )}
                </MainSettingValue>
            </div>
            <ThickSlider
                type="range"
                min={props.min}
                max={props.max}
                step={props.step}
                value={value}
                onChange={changeValue}
                onFocus={() => {
                    setFocused(true)
                }}
                onBlur={() => {
                    setFocused(false)
                }}
            ></ThickSlider>
        </StyledEditorCard>
    )
}

export function MinorSettingSliderCard(props: {
    title: string
    hint?: string
    tooltip?: string
    onHintClick?: () => void
    value?: number
    onChange: (e: number) => void
    min: string | number
    max: string | number
    step: string | number
    suffix?: (value: number) => string
    disabled?: boolean
    changeDelay?: number
    logarithmic?: boolean
    zeroMark?: boolean
    preventDecimal?: boolean
    forceStep?: boolean
    roundDigits?: number
    uncapMin?: boolean
    uncapMax?: boolean
    style?: React.CSSProperties
}): JSX.Element {
    const maxVal = useMemo(
        () => (typeof props.max === 'number' ? props.max : Number.parseFloat(props.max)),
        [props.max]
    )
    const minVal = useMemo(
        () => (typeof props.min === 'number' ? props.min : Number.parseFloat(props.min)),
        [props.min]
    )
    const step = useMemo(
        () => (typeof props.step === 'number' ? props.step : Number.parseFloat(props.step)),
        [props.step]
    )

    const logreverse = useCallback(
        (value: number) => {
            const negative = value < 0 ? -1 : 1

            // position will be between 0 and 100
            const minp = 1
            const maxp = 201

            // The result should be between min and max
            const min = 1
            const max = maxVal + 1

            const minv = Math.log(min)
            const maxv = Math.log(max)
            // calculate adjustment factor
            const scale = (maxv - minv) / (maxp - minp)
            const result = (Math.log(value * negative + 1) - minv) / scale + minp
            return (result - 1) * negative
        },
        [maxVal]
    )

    const logslider = useCallback(
        (position: number) => {
            const negative = position < 0 ? -1 : 1

            // position will be between 0 and 100
            const minp = 1
            const maxp = 201
            // The result should be between min and max
            const min = 1
            const max = maxVal + 1

            const minv = Math.log(min)
            const maxv = Math.log(max)
            // calculate adjustment factor
            const scale = (maxv - minv) / (maxp - minp)
            const result = Math.exp(minv + scale * (position * negative + 1 - minp))
            return (result - 1) * negative
        },
        [maxVal]
    )

    const transformToSlider = useCallback(
        (n: number) => {
            if (props.logarithmic) {
                return logreverse(n)
            }
            return n
        },
        [logreverse, props.logarithmic]
    )

    const transformFromSlider = useCallback(
        (n: number, roundValue: boolean = true) => {
            if (props.logarithmic) {
                if (roundValue) {
                    return round(logslider(n), props.roundDigits ?? 2)
                }
                return logslider(n)
            }
            return n
        },
        [logslider, props.logarithmic, props.roundDigits]
    )

    const [focused, setFocused] = useState(false)
    const [value, setValue] = useState(props.value || 0)
    const [inputValue, setInputValue] = useState((props.value ?? 0).toString())
    const changeTimeout = useRef(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const changeValue = (e: number) => {
        clearTimeout(changeTimeout.current)
        setValue(e)
        setInputValue(e.toString())
        changeTimeout.current = setTimeout(() => {
            props.onChange(e)
        }, props.changeDelay ?? 250) as any as number
    }

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.width = inputValue.length + '.3ch'
        }
    }, [inputValue])

    useEffect(() => {
        clearTimeout(changeTimeout.current)
        if (props.value !== undefined) {
            setValue(props.value)
            setInputValue(props.value.toString())
        }
    }, [logreverse, props.logarithmic, props.value])

    return (
        <StyledEditorCard style={props.style}>
            <div>
                <MinorSettingText focused={focused}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <span>{props.title + ': '} </span>
                        <input
                            ref={inputRef}
                            value={inputValue}
                            type="number"
                            disabled={props.disabled}
                            onChange={(e) => {
                                processNumericInput(
                                    e.target.value,
                                    minVal < 0,
                                    props.uncapMin === true ? undefined : minVal,
                                    props.uncapMax === true ? undefined : maxVal,
                                    setValue,
                                    setInputValue,
                                    props.forceStep ? step : undefined,
                                    props.preventDecimal
                                )
                            }}
                            onBlur={() => {
                                setInputValue(value.toString())
                                props.onChange(value)
                            }}
                        />
                        <span onClick={() => inputRef.current?.focus()}>
                            {props.suffix ? props.suffix(value ?? 0) : ''}
                        </span>
                        {props.tooltip ? (
                            <Tooltip delay={1} tooltip={props.tooltip}>
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        ) : null}
                    </div>
                    {props.zeroMark ? <ZeroMark></ZeroMark> : <></>}
                    {props.onHintClick ? (
                        <EditorCardHint onClick={props.onHintClick}>{props.hint}</EditorCardHint>
                    ) : (
                        <EditorCardHint>{props.hint}</EditorCardHint>
                    )}
                </MinorSettingText>
            </div>
            <ThinSlider
                type="range"
                min={props.logarithmic ? -200 : props.min}
                max={props.logarithmic ? 200 : props.max}
                step={props.logarithmic ? 1 : props.step}
                value={transformToSlider(value)}
                onChange={(e) => {
                    changeValue(transformFromSlider(e.target.valueAsNumber))
                }}
                onFocus={() => {
                    setFocused(true)
                }}
                onBlur={() => {
                    setFocused(false)
                }}
                disabled={!!props.disabled}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                        changeValue(round(Math.max(minVal, value - step), props.roundDigits))
                    }
                    if (e.key === 'ArrowRight') {
                        changeValue(round(Math.min(maxVal, value + step), props.roundDigits))
                    }
                    e.preventDefault()
                }}
            ></ThinSlider>
        </StyledEditorCard>
    )
}

export function SettingsCard(props: {
    title: string
    hint?: string
    children: ReactElement
    tooltip?: string
    onHintClick?: () => void
}): JSX.Element {
    return (
        <StyledEditorCard>
            <EditorCardHeader data-tip={props.tooltip}>
                <EditorCardTitle>
                    {props.title}
                    {props.tooltip ? (
                        <Tooltip delay={1} tooltip={props.tooltip}>
                            <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                        </Tooltip>
                    ) : null}
                </EditorCardTitle>
                {props.onHintClick ? (
                    <EditorCardHint onClick={props.onHintClick}>{props.hint}</EditorCardHint>
                ) : (
                    <EditorCardHint>{props.hint}</EditorCardHint>
                )}
            </EditorCardHeader>
            <div>{props.children}</div>
        </StyledEditorCard>
    )
}

const PrefixDetailHeader = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textHeadings};
    padding-bottom: 10px;
    font-weight: 600;
`

export function StepSlider(props: {
    value: number
    onChange: (e: number) => void
    steps: number
    min: string | number
    max: string | number
    step: string | number
    changeDelay?: number
    preventDecimal?: boolean
    forceStep?: boolean
    uncapMin?: boolean
    uncapMax?: boolean
    disabled?: boolean
    style?: React.CSSProperties
}): JSX.Element {
    const maxVal = useMemo(
        () => (typeof props.max === 'number' ? props.max : Number.parseFloat(props.max)),
        [props.max]
    )
    const minVal = useMemo(
        () => (typeof props.min === 'number' ? props.min : Number.parseFloat(props.min)),
        [props.min]
    )
    const step = useMemo(
        () => (typeof props.step === 'number' ? props.step : Number.parseFloat(props.step)),
        [props.step]
    )

    const [value, setValue] = useState(props.value)
    const [inputValue, setInputValue] = useState((props.value ?? 0).toString())
    const inputRef = useRef<HTMLInputElement>(null)
    const [showInput, setShowInput] = useState(false)

    const changeTimeout = useRef(0)
    const changeValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        clearTimeout(changeTimeout.current)
        setValue(e.target.valueAsNumber)
        setInputValue(e.target.value)
        changeTimeout.current = setTimeout(() => {
            props.onChange(e.target.valueAsNumber)
        }, props.changeDelay ?? 250) as any as number
    }
    useClickOutside(inputRef, () => showInput && setShowInput(false))
    useEffect(() => {
        clearTimeout(changeTimeout.current)
        setValue(props.value)
        setInputValue(props.value.toString())
    }, [props.value])

    return (
        <div style={props.style}>
            <div>
                <FlexRow>
                    <PrefixDetailHeader>
                        {(props.steps ? (value / props.steps) * 100 : 0).toFixed(2)}%
                    </PrefixDetailHeader>
                    <input
                        style={{
                            maxWidth: '120px',
                            padding: '5px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            display: showInput ? 'block' : 'none',
                        }}
                        ref={inputRef}
                        value={inputValue}
                        type="number"
                        disabled={props.disabled}
                        onChange={(e) => {
                            processNumericInput(
                                e.target.value,
                                minVal < 0,
                                props.uncapMin === true ? undefined : minVal,
                                props.uncapMax === true ? undefined : maxVal,
                                setValue,
                                setInputValue,
                                props.forceStep ? step : undefined,
                                props.preventDecimal
                            )
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setShowInput(false)
                            }
                        }}
                        onBlur={() => {
                            setInputValue(value.toString())
                            props.onChange(value)
                            setShowInput(false)
                        }}
                    />
                    <SubtleButton
                        style={{
                            display: showInput ? 'none' : 'block',
                        }}
                        onClick={() => {
                            setShowInput(true)
                            setTimeout(() => {
                                if (inputRef.current) inputRef.current.focus()
                            }, 50)
                        }}
                    >{`${[value].map((value) =>
                        value > 10000 ? `${(value / 1000).toFixed(2)}K` : `${value.toFixed(0)}`
                    )} steps`}</SubtleButton>
                </FlexRow>
            </div>
            <ThickSlider
                type="range"
                min={props.min}
                max={props.max}
                step={props.step}
                value={value}
                disabled={!!props.disabled}
                onChange={changeValue}
                onFocus={() => {
                    setShowInput(false)
                }}
            ></ThickSlider>
        </div>
    )
}
