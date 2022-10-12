import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { SelectedStoryId, SessionValue } from '../globals/state'

export function useSetQueryBasedOnStory(): void {
    const selectedStoryId = useRecoilValue(SelectedStoryId)
    const authenticated = useRecoilValue(SessionValue('authenticated'))

    const router = useRouter()

    useEffect(() => {
        if (!authenticated) return

        if (!selectedStoryId) {
            return
        }

        const requestedStory = router.query.id ? (router.query.id as string) : ''
        if (requestedStory === selectedStoryId) {
            return
        }

        router.push(`/stories?id=${selectedStoryId}`)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated, selectedStoryId])
}
