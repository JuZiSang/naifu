import { useEffect, useRef } from 'react'
import { logInfo } from '../util/browser'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useTraceUpdate(props: Record<string, unknown>): void {
    const prev = useRef(props)
    useEffect(() => {
        // eslint-disable-next-line unicorn/prefer-object-from-entries
        const changedProps = Object.entries(props).reduce((ps: any, [k, v]) => {
            if (prev.current[k] !== v) {
                ps[k] = [prev.current[k], v]
            }
            return ps
        }, {})
        if (Object.keys(changedProps).length > 0) {
            logInfo('Changed props:', changedProps)
        }
        prev.current = props
    })
}
