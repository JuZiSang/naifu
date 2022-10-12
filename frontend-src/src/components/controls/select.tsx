import ReactSelect, { Props as SelectProps } from 'react-select'
import CreatableSelect from 'react-select/creatable'
import { useMemo } from 'react'
import { transparentize } from '../../util/colour'
import { Theme } from '../../styles/themes/theme'

export function getDropdownStyle(siteTheme: Theme): any {
    return {
        option: (provided: any, state: { isSelected: any }) => ({
            ...provided,
            color: state.isSelected ? siteTheme.colors.textHeadings : siteTheme.colors.textMain,
            cursor: 'pointer',
        }),
        menu: (provided: any) => ({
            ...provided,
            margin: '0',
        }),
        menuList: (provided: any) => ({
            ...provided,
            padding: '0',
        }),

        dropdownIndicator: (provided: any) => ({
            ...provided,
            color: siteTheme.colors.textMain,
        }),
        valueContainer: (provided: any, state: any) => {
            return {
                ...provided,
                '&:focus-within':
                    state.selectProps.isSearchable && state.children[0] !== null
                        ? {
                              opacity: 0.3,
                          }
                        : {},
                width: 0,
            }
        },
        singleValue: (provided: any) => ({
            ...provided,
            overflow: 'visible',
        }),
        multiValue: (provided: any) => ({
            ...provided,
            background: siteTheme.colors.bg2,
        }),
        clearIndicator: (provided: any) => ({
            ...provided,
            color: transparentize(0.7, siteTheme.colors.textMain),
        }),
        control: (provided: any) => ({
            ...provided,
            border: '0px !important',
            boxShadow: '0px !important',
            outline: `1px solid ${siteTheme.colors.bg3} !important`,
            cursor: 'pointer',
        }),
        placeholder: (provided: any) => ({
            ...provided,
            color: transparentize(0.8, siteTheme.colors.textMain),
        }),
        container: (provided: any) => ({
            ...provided,
            flex: '1 1 auto',
        }),
    }
}
export function getDropdownTheme(siteTheme: Theme, alternate: boolean = false): any {
    const primary = alternate ? 'bg0' : 'bg1'
    const secondary = alternate ? 'bg3' : 'bg2'
    return (theme: any) => ({
        ...theme,
        colors: {
            ...theme.colors,
            // Focused outline. Selected item background
            primary: siteTheme.colors[primary],
            primary95: transparentize(0.33, siteTheme.colors[primary]),
            primary90: transparentize(0.33, siteTheme.colors[primary]),
            primary75: transparentize(0.33, siteTheme.colors[primary]),
            primary50: transparentize(0.4, siteTheme.colors[primary]),
            primary25: transparentize(0.4, siteTheme.colors[primary]),
            neutral0: siteTheme.colors[secondary],
            neutral20: siteTheme.colors[primary],
            // Control border focused hover
            neutral30: siteTheme.colors[secondary],
            neutral40: transparentize(0.4, siteTheme.colors.textMain),
            neutral50: transparentize(0.4, siteTheme.colors[primary]),
            neutral60: transparentize(0.4, siteTheme.colors[primary]),
            neutral70: transparentize(0.4, siteTheme.colors[primary]),
            neutral80: siteTheme.colors.textMain,
            neutral90: transparentize(0.4, siteTheme.colors[primary]),
            neutral10: transparentize(0.7, siteTheme.colors[secondary]),
            neutral5: transparentize(0.33, siteTheme.colors[secondary]),
            // multi button hover color
            dangerLight: transparentize(0.4, siteTheme.colors.bg2),
            // Multi X hover color
            danger: siteTheme.colors.warning,
        },
        borderRadius: 0,
    })
}

const onFocus = (e: { focused: any; isDisabled: any }) => {
    const msg = `You are currently focused on option ${
        e.focused.description ?? e.focused.rawLabel ?? e.focused.label
    }${e.isDisabled ? ', disabled' : ''}`
    return msg
}
interface Props<T, Y extends boolean = false> extends SelectProps<T, Y> {
    custom?: boolean
    isValidNewOption?: (inputValue: string) => boolean
    formatCreateLabel?: (inputValue: string) => string
}
export function Select<Option = unknown, isMulti extends boolean = false>(
    props: Props<Option, isMulti>
): JSX.Element {
    const value = props?.value as any

    if (props?.value && typeof value.label === 'object') {
        const element = Object.create((props.value as any).label)
        element.toString = () =>
            (props.value as any).description ?? (props.value as any).value ?? 'unknown option'
        ;(props.value as any).label = element
    }

    return (
        <>
            {useMemo(
                () =>
                    props.custom ? (
                        <CreatableSelect
                            {...props}
                            blurInputOnSelect={true}
                            className={`${props.className ?? ''} select`}
                            ariaLiveMessages={{ onFocus }}
                            createOptionPosition="first"
                        />
                    ) : (
                        <ReactSelect
                            {...props}
                            blurInputOnSelect={true}
                            className={`${props.className ?? ''} select`}
                            ariaLiveMessages={{ onFocus }}
                        />
                    ),
                [props]
            )}
        </>
    )
}
