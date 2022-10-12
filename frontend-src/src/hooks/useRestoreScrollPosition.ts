import { MutableRefObject, useEffect, useState } from 'react'
import { getSessionStorage, setSessionStorage } from '../util/storage'

export default function useRestoreScrollPosition(
    scrollRef: MutableRefObject<HTMLElement | null>,
    id: string,
    skipFirstLoad: boolean = false
): () => void {
    const [skip, setSkip] = useState(skipFirstLoad)
    const store = () => {
        if (scrollRef.current) {
            setSessionStorage(id, `${scrollRef.current.scrollTop}`)
        }
    }
    useEffect(() => {
        const scrollPosString = getSessionStorage(id)
        if (scrollPosString && !skip) {
            const scrollPos = Number.parseInt(scrollPosString)
            if (Number.isFinite(scrollPos)) scrollRef.current?.scrollTo(0, scrollPos)
        }
        if (skip) {
            setSkip(false)
        }
        window.addEventListener('beforeunload', store)
        return () => {
            window.removeEventListener('beforeunload', store)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, scrollRef, scrollRef.current])
    return store
}
