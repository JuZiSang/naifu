import React, { useEffect, useRef } from 'react'
import { MdAllInbox, MdCloudDone } from 'react-icons/md'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import ConflictHandler from '../components/conflicthandler'
import { createEditorEvent, EditorLoadEvent } from '../components/editor/events'
import { isSaving, queueLocalSave, queueSaving } from '../data/storage/queue'
import { StoryContainer } from '../data/story/storycontainer'
import { getUserSetting } from '../data/user/settings'
import { eventBus } from '../globals/events'
import { GlobalUserContext } from '../globals/globals'
import {
    RemeteSaveFailed,
    SaveStatus,
    SelectedStory,
    Session,
    Stories,
    StoryStateValue,
    StoryUpdate,
    UserPromptModal,
} from '../globals/state'
import { logDebug, logError, logInfo } from '../util/browser'

export default function useSaveStory(): void {
    const storyUpdate = useRecoilValue(StoryUpdate(''))

    const saveMessageTimeout = useRef(0)
    const lastStorySaveId = useRef('')

    // TODO: Review the state / saving interaction and untangle the story state update cascade
    const save = useRecoilCallback(
        ({ snapshot, set }) =>
            async (storyUpdate: StoryStateValue) => {
                const session = await snapshot.getPromise(Session)
                if (storyUpdate.id === '') {
                    // don't save there's nothing to be saved
                    return
                }
                logDebug('considering saving', storyUpdate, lastStorySaveId)

                if ((storyUpdate.error?.length ?? 0) > 0) {
                    logDebug('not saving because of error')
                    return
                }

                const oldId = storyUpdate.id
                const story = GlobalUserContext.stories.get(storyUpdate.id)
                if (!story) {
                    // tried to save a story that doesn't exist anymore
                    logDebug('not saving because no story')
                    return
                }
                if (storyUpdate.selected && !storyUpdate.loaded) {
                    // don't save a selected story that isn't loaded
                    logDebug('not saving because not loaded')
                    return
                }
                if (storyUpdate.selected && lastStorySaveId.current !== storyUpdate.id) {
                    // don't save a story on the update that is triggered by loading it
                    lastStorySaveId.current = storyUpdate.id
                    logDebug('not saving because first update')
                    return
                }

                logDebug('actually saving', storyUpdate)

                const oldStories = [...GlobalUserContext.stories.keys()].sort(
                    (a, b) =>
                        (GlobalUserContext.stories.get(b)?.lastSavedAt.valueOf() || 0) -
                        (GlobalUserContext.stories.get(a)?.lastSavedAt.valueOf() || 0)
                )

                const remote = story.remote || story.remoteId !== undefined

                if (remote) {
                    let storyOverwrittenByRemote = false
                    clearTimeout(saveMessageTimeout.current)
                    set(SaveStatus, 'Saving...')
                    const storyConflictHandler = (newStory: StoryContainer): Promise<boolean> =>
                        new Promise((resolve) => {
                            const localStory = StoryContainer.bundle(
                                story,
                                GlobalUserContext.storyContentCache.get(storyUpdate.id)
                            )
                            if (
                                (localStory.metadata.isModified && !newStory.metadata.isModified) ||
                                (localStory.content.getStoryText() && !newStory.content.getStoryText())
                            ) {
                                logInfo('overwriting empty remote story')
                                resolve(true)
                                return
                            }
                            set(UserPromptModal, {
                                label: 'Story Conflict Detected',
                                text: <ConflictHandler localStory={localStory} remoteStory={newStory} />,
                                hint: 'You can disable the Story Conflict Detection in the account settings.',
                                options: [
                                    {
                                        text: (
                                            <React.Fragment>
                                                Choose Local Changes{' '}
                                                <MdAllInbox style={{ opacity: 0.2, width: '25px' }} />
                                            </React.Fragment>
                                        ),
                                        onClick: () => resolve(true),
                                    },
                                    {
                                        text: (
                                            <React.Fragment>
                                                Choose Last Remote Save{' '}
                                                <MdCloudDone style={{ opacity: 0.2, width: '25px' }} />
                                            </React.Fragment>
                                        ),
                                        onClick: () => {
                                            storyOverwrittenByRemote = true
                                            resolve(false)
                                        },
                                    },
                                ],
                            })
                        })
                    queueSaving(
                        session,
                        oldId,
                        getUserSetting(session.settings, 'alwaysOverwriteConflicts')
                            ? () => Promise.resolve(true)
                            : storyConflictHandler
                    )
                        .then((saveResult) => {
                            if (!saveResult) {
                                if (!isSaving()) {
                                    set(SaveStatus, '')
                                }
                                return
                            }
                            const story = GlobalUserContext.stories.get(saveResult.newId)
                            if (story) {
                                story.lastSavedAt = new Date()
                                GlobalUserContext.stories.set(saveResult.newId, story)
                            }
                            // WB: We compare the two arrays, sorted by `lastSavedAt`:
                            //   * length
                            //   * whether every element in the array matches.
                            // ... whether to update the `Stories` state.
                            const newStories = [...saveResult.newStories].sort(
                                (a, b) =>
                                    (GlobalUserContext.stories.get(b)?.lastSavedAt.valueOf() || 0) -
                                    (GlobalUserContext.stories.get(a)?.lastSavedAt.valueOf() || 0)
                            )
                            if (
                                !(
                                    oldStories.length === saveResult.newStories.length &&
                                    oldStories.every((value, index) => value === newStories[index])
                                )
                            ) {
                                set(Stories, newStories)
                            }
                            if (story && storyOverwrittenByRemote) {
                                const storyContent = GlobalUserContext.storyContentCache.get(saveResult.newId)
                                const storyMetadata = GlobalUserContext.stories.get(saveResult.newId)
                                set(StoryUpdate(story.id), story.save(true))
                                set(SelectedStory, { id: saveResult.newId, loaded: true })
                                if (storyContent && storyMetadata) {
                                    eventBus.trigger(
                                        createEditorEvent(new EditorLoadEvent(storyContent, storyMetadata))
                                    )
                                }
                            }
                            if (!isSaving()) {
                                set(SaveStatus, 'All Stories Saved')
                                saveMessageTimeout.current = setTimeout(() => {
                                    if (!isSaving()) set(SaveStatus, '')
                                }, 5000) as any
                            }
                        })
                        .catch((error: any) => {
                            logError(error, true, 'error saving story:')
                            if (`${error}`.includes('body is too large')) {
                                set(RemeteSaveFailed, storyUpdate.id)
                            }
                            set(SaveStatus, 'Save Failed: ' + error)
                        })
                } else {
                    queueLocalSave(session, storyUpdate.id)
                }
                // eslint-disable-next-line react-hooks/exhaustive-deps
            },
        []
    )

    useEffect(() => {
        save(storyUpdate)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storyUpdate])
}
