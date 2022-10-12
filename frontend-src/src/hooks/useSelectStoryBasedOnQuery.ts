import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'
import { GlobalUserContext } from '../globals/globals'
import { SelectedStory, SelectedStoryId, SessionValue } from '../globals/state'

export function useSelectStoryBasedOnQuery(): void {
    const [selectedStory, setSelectedStory] = useRecoilState(SelectedStory)

    const authenticated = useRecoilValue(SessionValue('authenticated'))

    const router = useRouter()

    const setIfNotSet = useRecoilCallback(({ snapshot }) => async (requestedStory: string) => {
        const selectedStory = await snapshot.getPromise(SelectedStoryId)
        if (selectedStory === requestedStory) return

        const currentStoryContent = GlobalUserContext.storyContentCache.get(requestedStory)
        if (currentStoryContent) {
            setSelectedStory({ id: requestedStory, loaded: true })
        } else {
            setSelectedStory({ id: requestedStory, loaded: false })
        }
    })

    useEffect(() => {
        if (!authenticated) return
        const requestedStory = router.query.id ? (router.query.id as string) : ''
        if (!requestedStory || requestedStory === selectedStory.id) {
            return
        }

        const currentStoryMetadata = GlobalUserContext.stories.get(requestedStory)
        if (!currentStoryMetadata) return

        setIfNotSet(requestedStory)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated, router.query.id, setSelectedStory])
}
