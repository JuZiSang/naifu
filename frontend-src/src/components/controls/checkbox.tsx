import React, { ChangeEvent } from 'react'
import { MdHelpOutline } from 'react-icons/md'
import {
    Checkbox as CheckboxStyle,
    SmallCheckbox as SmallCheckboxStyle,
    CheckboxInnerText,
    CheckboxInnerVisual,
    CheckboxOuterVisual as CheckboxOuterVisual,
    CheckBoxText,
    SmallCheckInner,
    SmallCheckInnerText,
    SmallCheckOuter,
    CheckBoxTextStyle,
    AlternateCheckboxContainer,
    AltCheckboxText,
    SmallCheckboxNoLabel,
} from '../../styles/ui/checkbox'
import { CheckIcon, SmallCrossIcon } from '../../styles/ui/icons'
import { FlexRow } from '../../styles/ui/layout'
import { ScreenreaderToggle } from '../../styles/ui/screenreadertoggle'
import Tooltip from '../tooltip'

export default function Checkbox(props: {
    value: boolean
    setValue: (newValue: boolean) => void
    checkedText?: string | JSX.Element
    uncheckedText?: string | JSX.Element
    hideIcons?: boolean
    disabled?: boolean
    label: string
    alternate?: boolean
    tooltip?: string
    style?: React.CSSProperties
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    return (
        <CheckboxStyle alternate={props.alternate} disabled={props.disabled} style={props.style}>
            <FlexRow>
                <FlexRow style={{ justifyContent: 'flex-start', width: 'max-content' }}>
                    {props.children || props.label}
                    {props.tooltip && (
                        <Tooltip delay={1} tooltip={props.tooltip}>
                            <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                        </Tooltip>
                    )}
                </FlexRow>
                <div>
                    <CheckboxOuterVisual checked={props.value === true}>
                        <CheckboxInnerVisual checked={props.value === true}></CheckboxInnerVisual>

                        {props.hideIcons === true ? (
                            ''
                        ) : (
                            <CheckboxInnerText checked={props.value === true}></CheckboxInnerText>
                        )}
                        <ScreenreaderToggle notShown={true}>
                            <input
                                aria-label={props.label}
                                disabled={props.disabled}
                                type="checkbox"
                                onChange={(e) => props.setValue(e.target.checked)}
                                checked={props.value === true}
                            />
                        </ScreenreaderToggle>
                    </CheckboxOuterVisual>
                </div>
            </FlexRow>
            <CheckBoxText value={props.value}>
                <CheckBoxTextStyle aria-hidden={!props.value}>{props.checkedText}</CheckBoxTextStyle>
                <CheckBoxTextStyle aria-hidden={props.value}>{props.uncheckedText}</CheckBoxTextStyle>
            </CheckBoxText>
        </CheckboxStyle>
    )
}

export function AltCheckbox(props: {
    value: boolean
    setValue: (newValue: boolean) => void
    text: string | JSX.Element
    offText?: string | JSX.Element
    disabled?: boolean
    label: string
    style?: React.CSSProperties
}): JSX.Element {
    return (
        <AlternateCheckboxContainer disabled={props.disabled} checked={props.value} style={props.style}>
            <FlexRow>
                {props.value ? <CheckIcon /> : <SmallCrossIcon />}
                <AltCheckboxText value={props.value}>
                    <div aria-hidden={!props.value}>{props.text}</div>
                    <div aria-hidden={props.value}>{props.offText ?? props.text}</div>
                </AltCheckboxText>
            </FlexRow>
            <ScreenreaderToggle notShown={true}>
                <input
                    aria-label={props.label}
                    disabled={props.disabled}
                    type="checkbox"
                    onChange={(e) => props.setValue(e.target.checked)}
                    checked={props.value === true}
                />
            </ScreenreaderToggle>
        </AlternateCheckboxContainer>
    )
}

export function SmallCheckbox(props: {
    value: boolean
    setValue: (newValue: boolean, event: ChangeEvent<HTMLInputElement>) => void
    hideIcons?: boolean
    disabled?: boolean
    label: string
    displayText?: boolean
    noLabel?: boolean
}): JSX.Element {
    const innerElements = (
        <>
            <div>
                <SmallCheckOuter checked={props.value === true}>
                    <SmallCheckInner checked={props.value === true}></SmallCheckInner>
                    {props.hideIcons === true || !props.value ? (
                        ''
                    ) : (
                        <SmallCheckInnerText checked={props.value === true}></SmallCheckInnerText>
                    )}
                    <ScreenreaderToggle notShown={true}>
                        <input
                            aria-label={props.label}
                            disabled={props.disabled}
                            type="checkbox"
                            onChange={(e) => {
                                props.setValue(e.target.checked, e)
                            }}
                            checked={props.value === true}
                        />
                    </ScreenreaderToggle>
                </SmallCheckOuter>
            </div>
            {(props.displayText ?? true) && <span>{props.label}</span>}
        </>
    )
    return props.noLabel ? (
        <SmallCheckboxNoLabel disabled={props.disabled}>{innerElements}</SmallCheckboxNoLabel>
    ) : (
        <SmallCheckboxStyle disabled={props.disabled} selected={props.value}>
            {innerElements}
        </SmallCheckboxStyle>
    )
}
