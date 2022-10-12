import { useState, useRef } from 'react'
import { ScreenreaderToggle } from '../../styles/ui/screenreadertoggle'
import { RadioSelector } from '../contextsettings'

export default function Radio(props: {
    name: string
    selected: string
    choices: string[]
    names: string[]
    disabled?: boolean
    onChoiceSelected: (choice: string) => void
}): JSX.Element {
    const focused = useRef(props.choices.map(() => false))
    const [focusChanged, setFocusChanged] = useState(0)

    return (
        <div>
            <ScreenreaderToggle notShown={true}>
                {props.choices.map((s, i) => {
                    return (
                        <label key={i}>
                            {props.names[i]}
                            <input
                                defaultChecked={props.selected === s}
                                type="radio"
                                name={props.name}
                                value={s}
                                disabled={props.disabled}
                                onClick={() => {
                                    props.onChoiceSelected(s)
                                }}
                                onFocus={() => {
                                    const arr = Array.from<boolean>({ length: props.choices.length }).fill(
                                        false
                                    )
                                    arr[i] = true
                                    focused.current[i] = true
                                    setFocusChanged(focusChanged + 1)
                                }}
                                onBlur={() => {
                                    focused.current[i] = false
                                    setFocusChanged(focusChanged + 1)
                                }}
                            ></input>
                        </label>
                    )
                })}
            </ScreenreaderToggle>

            <div>
                {props.choices.map((s, i) => {
                    return (
                        <RadioSelector
                            key={i}
                            selected={props.selected === s}
                            onClick={() => {
                                if (!props.disabled) props.onChoiceSelected(s)
                            }}
                            disabled={props.disabled}
                            focused={focused.current[i]}
                        >
                            {props.names[i]}
                        </RadioSelector>
                    )
                })}
            </div>
        </div>
    )
}
