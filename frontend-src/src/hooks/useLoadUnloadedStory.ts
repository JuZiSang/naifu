import { useEffect } from 'react'
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'
import nProgress from 'nprogress'
import { getStorage } from '../data/storage/storage'
import { GlobalUserContext } from '../globals/globals'
import { SelectedStory, SelectedStoryId, Session, SessionValue } from '../globals/state'
import { logError } from '../util/browser'
import { StoryId } from '../data/story/storycontainer'

export function useLoadUnloadedStory(): void {
    const [selectedStory, setSelectedStory] = useRecoilState(SelectedStory)

    const authenticated = useRecoilValue(SessionValue('authenticated'))
    const session = useRecoilValue(Session)

    const setLoaded = useRecoilCallback(({ snapshot }) => async (storyId: StoryId, error?: string) => {
        const currentStoryId = await snapshot.getPromise(SelectedStoryId)
        if (currentStoryId === storyId) {
            setSelectedStory({ id: storyId, loaded: true, error: error })
        }
    })

    useEffect(() => {
        if (!authenticated) return
        if (selectedStory.loaded) return

        const storage = getStorage(session)
        const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
        const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)

        if (!currentStoryMetadata) return

        if (currentStoryContent) {
            setSelectedStory({ ...selectedStory, loaded: true })
            return
        }

        const storyId = selectedStory.id
        nProgress.start()
        storage
            .getStoryContent(currentStoryMetadata)
            .then((storyContent) => {
                GlobalUserContext.storyContentCache.set(storyId, storyContent)
                setLoaded(storyId)
                nProgress.done()
            })
            .catch((error) => {
                // TODO: show error in the UI
                logError(error)
                setLoaded(storyId, `${error.message ?? error}`)
                nProgress.done()
            })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated, selectedStory, setSelectedStory])
}
