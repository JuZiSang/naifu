import { useEffect, useState } from 'react'

import { logError } from '../util/browser'
import { UpdateNote } from '../data/updates/updatenote'
import { deserialize } from '../util/serialization'

export function fetchUpdateNotes(): Promise<Response> {
    return fetch('/updates.json', {
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
    })
}

export default function useLoadUpdates(interval: number = 0): Array<UpdateNote> {
    const [updates, setUpdates] = useState(new Array<UpdateNote>())

    useEffect(() => {
        const doUpdate = () =>
            fetchUpdateNotes()
                .then((result) => {
                    if (result.status) {
                        result
                            .json()
                            .then((json) => {
                                const arr = []
                                for (const update of json) {
                                    arr.push(deserialize(UpdateNote, update))
                                }
                                const newUpdates = arr.sort((a, b) => {
                                    return b.date.getTime() - a.date.getTime()
                                })
                                if (
                                    (!updates && newUpdates) ||
                                    JSON.stringify(updates) !== JSON.stringify(newUpdates)
                                )
                                    setUpdates(newUpdates)
                            })
                            .catch((error) => {
                                logError(error, true, 'failed loading updates:')
                            })
                    }
                })
                .catch((error) => {
                    logError(error, true, 'failed loading updates:')
                })
        doUpdate()
        if (interval > 0) {
            const update = setInterval(doUpdate, interval)
            return () => {
                clearInterval(update)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval])

    return updates
}
