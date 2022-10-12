import { useState } from 'react'

export function useReload(): () => void {
    const [, setValue] = useState(0)
    return () => setValue((value) => value + 1)
}
