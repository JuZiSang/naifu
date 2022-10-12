import { useEffect, useState } from 'react'

import { CommitHash } from '../globals/constants'
import { logError } from '../util/browser'

export function fetchVersion(): Promise<Response> {
    return fetch('/version', {
        cache: 'no-store',
        headers: {
            'Content-Type': 'text/plain',
        },
    })
}

export default function useVersionCheck(interval: number = 300000): {
    available: boolean
    version: string
} {
    const [newAvailable, setNewAvailable] = useState({ available: false, version: CommitHash })

    useEffect(() => {
        const doCheck = async () => {
            try {
                // eslint-disable-next-line unicorn/no-await-expression-member
                const version = (await (await fetchVersion()).text()).trim()
                if (version && version.length === CommitHash.length && version !== newAvailable.version) {
                    setNewAvailable({ available: true, version })
                }
            } catch (error) {
                logError(error, false, 'failed to check for updates')
            }
        }
        doCheck()
        if (interval > 0) {
            const check = setInterval(doCheck, interval)
            return () => {
                clearInterval(check)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return newAvailable
}
