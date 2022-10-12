import { useState, useRef } from 'react'

export function useDebounce<T>(
    value: T,
    updateFn: (v: T, o: T) => void,
    ms: number = 500
): [T, (v: T) => void, (v: T) => void] {
    const [innerValue, setInnerValue] = useState(value)
    const innerValueSaveRef = useRef(0)
    const updateInnerValue = (newInnerValue: T) => {
        const oldInnerValue = innerValue ? JSON.parse(JSON.stringify(innerValue)) : innerValue
        clearTimeout(innerValueSaveRef.current)
        setInnerValue(newInnerValue)
        innerValueSaveRef.current = setTimeout(
            () => updateFn(newInnerValue, oldInnerValue),
            ms
        ) as any as number
    }
    return [innerValue, setInnerValue, updateInnerValue]
}
