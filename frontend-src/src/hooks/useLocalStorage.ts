import { getLocalStorage, setLocalStorage } from '../util/storage'

export const useLocalStorage = <T>(
    key: string,
    defaultVal: T,
    transform: (val: T) => string,
    reverseTransform: (val: string) => T
): [() => T, (val: T) => void] => {
    const getVal = () => {
        const stringVal = getLocalStorage(key)
        if (stringVal) return reverseTransform(stringVal)
        return defaultVal
    }

    const setVal = (value: T) => {
        setLocalStorage(key, transform(value))
    }

    return [getVal, setVal]
}
