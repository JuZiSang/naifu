import { StoryContent, StoryMetadata } from '../../data/story/storycontainer'
import { actionCreator } from '../../globals/events'

export enum EditorEventType {
    clear = 0,
    load = 1,
    decorate = 2,
}
export interface EditorEvent {
    type: EditorEventType
}

export const createEditorEvent = actionCreator<EditorEvent>('editor')

export class EditorLoadEvent implements EditorEvent {
    type = EditorEventType.load
    story: StoryContent
    meta: StoryMetadata
    constructor(story: StoryContent, meta: StoryMetadata) {
        this.story = story
        this.meta = meta
    }
}

export class EditorClearEvent implements EditorEvent {
    type = EditorEventType.clear
}

export class EditorDecorateEvent implements EditorEvent {
    type = EditorEventType.decorate
}
