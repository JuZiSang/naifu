import { useCallback, useEffect, useState } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { Action } from 'typescript-fsa'
import { createEditorEvent, EditorEvent, EditorEventType, EditorLoadEvent } from '../components/editor/events'
import { StoryContent, StoryId, StoryMetadata } from '../data/story/storycontainer'
import { eventBus } from '../globals/events'
import { GlobalUserContext } from '../globals/globals'
import {
    SelectedStoryError,
    SelectedStoryId,
    SelectedStoryLoaded,
    SelectedStoryModified,
    StoryUpdate,
} from '../globals/state'
interface SelectedStoryState {
    id: StoryId
    loaded: boolean
    modified: boolean
    update?: number
    story?: StoryContent
    meta?: StoryMetadata
    error?: string
}

export function useSelectedStory(): SelectedStoryState {
    const [state, setState] = useState({ id: '', loaded: false, modified: false } as SelectedStoryState)

    const selectedStoryId = useRecoilValue(SelectedStoryId)
    const selectedStoryLoaded = useRecoilValue(SelectedStoryLoaded)
    const selectedStoryModified = useRecoilValue(SelectedStoryModified)
    const selectedStoryError = useRecoilValue(SelectedStoryError)
    useEffect(() => {
        if (!selectedStoryId) {
            setState({
                id: '',
                loaded: false,
                modified: false,
            })
            return
        }
        const story = GlobalUserContext.storyContentCache.get(selectedStoryId)
        const meta = GlobalUserContext.stories.get(selectedStoryId)
        setState({
            id: selectedStoryId,
            loaded: selectedStoryLoaded,
            modified: selectedStoryModified,
            story,
            meta,
            error: selectedStoryError,
        })
    }, [selectedStoryError, selectedStoryId, selectedStoryLoaded, selectedStoryModified])

    const handleEvent = useCallback((event: EditorEvent) => {
        switch (event.type) {
            case EditorEventType.load: {
                const load = event as EditorLoadEvent
                setState({
                    id: load.meta.id,
                    loaded: true,
                    modified: load.meta.isModified,
                    story: load.story,
                    meta: load.meta,
                    error: '',
                })
            }
        }
    }, [])
    useEffect(() => {
        const sub = eventBus.listenQueueing(createEditorEvent.match, (event: Action<EditorEvent>) => {
            handleEvent(event.payload)
        })
        return () => sub.unsubscribe()
    }, [handleEvent])

    return state
}

export function useSelectedStoryUpdate(): SelectedStoryState {
    const [state, setState] = useState({ id: '', loaded: false, modified: false } as SelectedStoryState)

    const selectedStoryId = useRecoilValue(SelectedStoryId)
    const storyUpdate = useRecoilValue(StoryUpdate(selectedStoryId))
    const selectedStoryModified = useRecoilValue(SelectedStoryModified)
    const selectedStoryError = useRecoilValue(SelectedStoryError)
    useEffect(() => {
        if (!selectedStoryId) {
            setState({
                id: '',
                loaded: false,
                modified: false,
            })
            return
        }
        if (!storyUpdate.selected || storyUpdate.id !== selectedStoryId) return
        const story = GlobalUserContext.storyContentCache.get(selectedStoryId)
        const meta = GlobalUserContext.stories.get(selectedStoryId)
        setState({
            id: selectedStoryId,
            loaded: storyUpdate.loaded || false,
            modified: selectedStoryModified,
            update: storyUpdate.update,
            story,
            meta,
            error: selectedStoryError,
        })
    }, [selectedStoryError, selectedStoryId, selectedStoryModified, storyUpdate])

    const handleEvent = useCallback((event: EditorEvent) => {
        switch (event.type) {
            case EditorEventType.load: {
                const load = event as EditorLoadEvent
                setState({
                    id: load.meta.id,
                    loaded: true,
                    modified: load.meta.isModified,
                    story: load.story,
                    meta: load.meta,
                    error: '',
                })
            }
        }
    }, [])
    useEffect(() => {
        const sub = eventBus.listenQueueing(createEditorEvent.match, (event: Action<EditorEvent>) => {
            handleEvent(event.payload)
        })
        return () => sub.unsubscribe()
    }, [handleEvent])

    return state
}
