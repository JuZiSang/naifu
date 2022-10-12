import { useState } from 'react'
import { getLocalStorage, setLocalStorage } from '../util/storage'

export default function useRememberedValue<T>(key: string, defaultValue: T): [T, (value: T) => void] {
    const [value, setValue] = useState(() => {
        const value = getLocalStorage(key)
        if (value) {
            return JSON.parse(value)
        }
        return defaultValue
    })
    const setValueAndRemember = (value: T) => {
        setValue(value)
        setLocalStorage(key, JSON.stringify(value))
    }
    return [value, setValueAndRemember] as [T, (value: T) => void]
}
