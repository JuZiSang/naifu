/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Transform } from 'prosemirror-transform'
import { EditorState } from 'prosemirror-state'
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view'
import { IGenerationRequest } from '../../data/request/request'
import { DataOrigin, Fragment, InsertionInfo } from '../../data/story/story'
import { StoryContent } from '../../data/story/storycontainer'
import { LoreEntry } from '../../data/ai/loreentry'
import { keyMatches } from '../../data/ai/context'
import { LogProbs } from '../../data/request/remoterequest'
import { logError } from '../../util/browser'
import { textSchema, activeNodes } from './schema'

export interface EditorQueueItem {
    performTransform: (tr: Transform, state: EditorState, view: EditorView) => void
}

export class EditorQueueAdd implements EditorQueueItem {
    text: string
    start: number
    origin: DataOrigin
    undo: boolean
    retry: boolean

    performTransform = (tr: Transform, state: EditorState, view: EditorView): void => {
        let node
        const marks = []
        if (this.undo) marks.push(textSchema.mark(textSchema.marks.undo_deletion_text))
        if (this.retry) marks.push(textSchema.mark(textSchema.marks.retry_deletion_text))
        marks.push(markFromOrigin(this.origin))
        if (this.text !== '') node = textSchema.text(this.text, marks)
        if (node) tr.insert(this.start, node)
        new EditorQueueCheckNodeType(this.start).performTransform(tr)
    }

    constructor(
        text: string,
        start: number,
        origin: DataOrigin,
        undo: boolean = false,
        retry: boolean = false
    ) {
        this.text = text
        this.start = start
        this.origin = origin
        this.undo = undo
        this.retry = retry
    }
}

export class EditorQueueParagraph implements EditorQueueItem {
    start: number

    performTransform = (tr: Transform, state: EditorState, view: EditorView): void => {
        tr.split(this.start, undefined, [{ type: textSchema.nodes.adventureStory }])

        new EditorQueueCheckNodeType(this.start).performTransform(tr)
    }

    constructor(start: number) {
        this.start = start
    }
}

export class EditorQueueRemove implements EditorQueueItem {
    start: number
    end: number

    performTransform = (tr: Transform, state: EditorState, view: EditorView): void => {
        const max = tr.doc.content.size
        const actualStart = Math.min(this.start, max)
        const actualEnd = Math.min(this.end, max)

        if (actualStart !== this.start) {
            logError({
                name: `start does not match actualStart`,
                message: `start does not match actualStart: ${this.start} != ${actualStart}`,
            } as Error)
        }
        if (this.end != actualEnd) {
            logError({
                name: `end does not match actualEnd`,
                message: `end does not match actualEnd: ${this.end} != ${actualEnd}`,
            } as Error)
        }

        tr.delete(actualStart, actualEnd)

        new EditorQueueCheckNodeType(this.start).performTransform(tr)
    }

    constructor(start: number, end: number) {
        this.start = start
        this.end = end
    }
}

export class EditorQueueMark implements EditorQueueItem {
    start: number
    end: number
    markType: DataOrigin | 'undo' | 'retry'

    performTransform = (tr: Transform, state: EditorState, view: EditorView): void => {
        const max = tr.doc.content.size
        if (this.markType !== 'undo' && this.markType !== 'retry')
            tr.removeMark(Math.min(this.start, max), Math.min(this.end, max))
        let mark
        if (this.markType === 'undo') mark = textSchema.mark(textSchema.marks.undo_deletion_text)
        else if (this.markType === 'retry') mark = textSchema.mark(textSchema.marks.retry_deletion_text)
        else mark = markFromOrigin(this.markType)
        tr.addMark(Math.min(this.start, max), Math.min(this.end, max), mark)

        new EditorQueueCheckNodeType(this.start).performTransform(tr)
    }

    constructor(start: number, end: number, markType: DataOrigin | 'undo' | 'retry') {
        this.start = start
        this.end = end
        this.markType = markType
    }
}

export class EditorQueueRemoveMark implements EditorQueueItem {
    start: number
    end: number
    markType: DataOrigin | 'undo' | 'retry'

    performTransform = (tr: Transform, state: EditorState, view: EditorView): void => {
        const max = tr.doc.content.size
        let mark
        if (this.markType === 'undo') mark = textSchema.mark(textSchema.marks.undo_deletion_text)
        else if (this.markType === 'retry') mark = textSchema.mark(textSchema.marks.retry_deletion_text)
        else mark = markFromOrigin(this.markType)
        tr.removeMark(Math.min(this.start, max), Math.min(this.end, max), mark)
    }

    constructor(start: number, end: number, markType: DataOrigin | 'undo' | 'retry') {
        this.start = start
        this.end = end
        this.markType = markType
    }
}

export class EditorQueueClear implements EditorQueueItem {
    performTransform = (tr: Transform, state: EditorState, view: EditorView): void => {
        tr.replaceWith(0, tr.doc.content.size, textSchema.nodes.adventureStory.create())
    }
}

export class EditorQueueFocus implements EditorQueueItem {
    performTransform = (tr: Transform, state: EditorState, view: EditorView): void => {
        // The existance of this item in the editor queue means that the editor will focus after the next state update
        // The actual focusing happens in conversationeditor.tsx
    }
}

export class EditorQueueSetDecorations implements EditorQueueItem {
    decorations: { range: Range; id: string }[]

    performTransform = (tr: Transform, state: EditorState, view: EditorView): void => {
        const decorations: Decoration[] = []
        for (const decInfo of this.decorations) {
            const decoration = Decoration.inline(decInfo.range.start, decInfo.range.end, {
                class: 'lorekey ' + decInfo.id,
            })
            decorations.push(decoration)
        }
        view.setProps({ decorations: (state) => DecorationSet.create(state.doc, [...decorations]) })

        if (this.decorations.length === 0) {
            view.setProps({ decorations: (state) => DecorationSet.create(state.doc, []) })
        }
    }

    constructor(decorations: { range: Range; id: string }[]) {
        this.decorations = decorations
    }
}

interface Range {
    start: number
    end: number
}

export class EditorQueueCheckNodeType implements EditorQueueItem {
    start: number

    performTransform = (tr: Transform): void => {
        const max = tr.doc.content.size
        const actualStart = Math.min(this.start, max)

        if (actualStart !== this.start) {
            logError({
                name: `start does not match actualStart`,
                message: `start does not match actualStart: ${this.start} != ${actualStart}`,
            } as Error)
        }

        const pos = tr.doc.resolve(actualStart)
        const nodeInsertedAt = pos.parent
        const insertedAtText = nodeInsertedAt?.textContent ?? ''

        let before = pos.before()
        if (!before) before = 0

        let validBefore = false
        for (const adnode of activeNodes.adventure) {
            if (adnode.regex && adnode.regex.test(insertedAtText)) {
                tr.setNodeMarkup(before, textSchema.nodes.adventureInput, {
                    icon: adnode.icon,
                    name: adnode.name,
                })
                validBefore = true
                break
            }
        }

        if (!validBefore) {
            if (tr.doc.nodeAt(pos.after()) === null) {
                tr.setNodeMarkup(before, textSchema.nodes.adventureStoryEnd)
            } else {
                tr.setNodeMarkup(before, textSchema.nodes.adventureStory)
            }
        }

        if (before <= 0) return
        const posBefore = tr.doc.resolve(before - 1)
        const beforeBefore = posBefore.before()
        if (!beforeBefore) return

        let validBeforeBefore = false
        for (const adnode of activeNodes.adventure) {
            if (adnode.regex && adnode.regex.test(posBefore.parent.textContent)) {
                validBeforeBefore = true
                break
            }
        }

        if (!validBeforeBefore) {
            if (validBefore) {
                tr.setNodeMarkup(beforeBefore, textSchema.nodes.adventureStoryEnd)
            } else {
                tr.setNodeMarkup(beforeBefore, textSchema.nodes.adventureStory)
            }
        }
    }

    constructor(start: number) {
        this.start = start
    }
}

interface Range {
    start: number
    end: number
}

export function fragmentsToEditorQueueItems(fragments: Fragment[], start: number): EditorQueueItem[] {
    const editorQueue: EditorQueueItem[] = []
    let characters = 0
    let newlines = 0

    for (const fragment of fragments) {
        if (fragment.data === '') continue
        const lines = fragment.data.split('\n')
        for (const [i, line] of lines.entries()) {
            if (i > 0) {
                editorQueue.push(new EditorQueueParagraph(start + characters + newlines))
                newlines += 2
            }
            if (line !== '') {
                editorQueue.push(new EditorQueueAdd(line, start + characters + newlines, fragment.origin))
                characters += line.length
            }
        }
    }
    return editorQueue
}

export function keyMatchesToDecorations(
    text: string,

    matches: Map<string, { key: string; index: number; length: number; entry: LoreEntry }>,
    offset: number
): EditorQueueItem[] {
    const editorQueue: EditorQueueItem[] = []
    const decInfo = []
    for (const match of matches.entries()) {
        if (match[1].length > 0) {
            const range = translateRange(
                text,
                match[1].index + offset,
                match[1].index + offset + match[1].length
            )
            decInfo.push({ range, id: match[0] })
        }
    }
    editorQueue.push(new EditorQueueSetDecorations(decInfo))

    return editorQueue
}

export function translateRange(text: string, start: number, end: number): Range {
    const textBefore = text.slice(0, start)
    const textInside = text.slice(start, end)
    const newlinesBefore =
        [...textBefore.matchAll(/\r?\n/g)].length - [...textBefore.matchAll(/\r\n/g)].length
    const newlinesInside =
        [...textInside.matchAll(/\r?\n/g)].length - [...textInside.matchAll(/\r\n/g)].length
    const startIndex = start + newlinesBefore + 1
    const endIndex = end + newlinesBefore + newlinesInside + 1
    return { start: startIndex, end: endIndex }
}

function markFromOrigin(origin: DataOrigin) {
    switch (origin) {
        case DataOrigin.user:
            return textSchema.mark(textSchema.marks.user_text)
        case DataOrigin.ai:
            return textSchema.mark(textSchema.marks.ai_text)
        case DataOrigin.edit:
            return textSchema.mark(textSchema.marks.edit_text)
        case DataOrigin.prompt:
            return textSchema.mark(textSchema.marks.prompt_text)
        default:
            return textSchema.mark(textSchema.marks.unknown_text)
    }
}

export function lastInsertionInfoToEditorQueueItems(
    text: string,
    insertionInfo: InsertionInfo[]
): EditorQueueItem[] {
    const items = []
    insertionInfo.reverse()
    for (const info of insertionInfo) {
        let newlines = 0
        let characters = 0

        const range = translateRange(text, info.start, info.removedEnd)
        if (info.start !== info.removedEnd) {
            const removed = info.removedFragments.map((f) => f.data).join('')
            const lines = removed.split('\n').length
            items.push(new EditorQueueRemove(range.start, range.start + removed.length + (lines - 1)))
        }
        if (info.text !== '') {
            const lines = info.text.split('\n')
            for (const [i, line] of lines.entries()) {
                if (i > 0) {
                    items.push(new EditorQueueParagraph(range.start + characters + newlines))
                    newlines += 2
                }
                if (line !== '') {
                    items.push(new EditorQueueAdd(line, range.start + characters + newlines, info.type, true))
                }
                characters += line.length
            }
        }
    }
    return items
}

export function lastInsertionInfoToEditorQueueMarks(
    text: string,
    insertionInfo: InsertionInfo[]
): EditorQueueItem[] {
    const items = []
    insertionInfo.reverse()
    for (const info of insertionInfo) {
        let characters = 0
        let newlines = 0

        const range = translateRange(text, info.start, info.removedEnd)

        items.push(new EditorQueueCheckNodeType(range.start + characters + newlines))

        if (info.text !== '') {
            const lines = info.text.split('\n')
            for (const [i, line] of lines.entries()) {
                if (i > 0) {
                    newlines += 2
                }
                if (line !== '') {
                    items.push(
                        new EditorQueueMark(
                            range.start + characters + newlines,
                            range.start + characters + newlines + line.length,
                            info.type
                        )
                    )
                }
                characters += line.length
            }
        }
    }
    return items
}

export function lastInsertionInfoToEditorQueueItemsUndo(
    text: string,
    insertionInfo: InsertionInfo[]
): EditorQueueItem[] {
    const items = []

    for (const info of insertionInfo) {
        const range = translateRange(text, info.start, info.end)
        if (info.text !== '') {
            const lines = info.text.split('\n')
            items.push(new EditorQueueRemove(range.start, range.start + info.text.length + lines.length - 1))
        }

        let newlines = 0
        let characters = 0

        for (const fragment of info.removedFragments) {
            if (fragment.data !== '') {
                const lines = fragment.data.split('\n')
                for (const [i, line] of lines.entries()) {
                    if (i > 0) {
                        items.push(new EditorQueueParagraph(range.start + characters + newlines))
                        newlines += 2
                    }
                    if (line !== '') {
                        items.push(
                            new EditorQueueAdd(line, range.start + characters + newlines, fragment.origin)
                        )
                        characters += line.length
                    }
                }
            }
        }
    }
    return items
}

let lastUndoRanges: Range[] = []
let lastRetryRanges: Range[] = []

export function clearLastUndoRetry(
    text?: string,
    previousText?: string,
    insertionInfo?: InsertionInfo[]
): EditorQueueItem[] {
    const items = []
    for (const range of lastUndoRanges) {
        let offset = 0
        let endOffset = 0
        if (insertionInfo && text && previousText)
            for (const info of insertionInfo) {
                const insertionRange = translateRange(text, info.start, info.end)
                const removedRange = translateRange(previousText, info.start, info.removedEnd)
                if (insertionRange.start > range.start + offset) {
                    endOffset += insertionRange.end - insertionRange.start
                    endOffset -= removedRange.end - removedRange.start
                }
                if (range.start + offset > insertionRange.start) {
                    offset += insertionRange.end - insertionRange.start
                    offset -= removedRange.end - removedRange.start
                }
            }

        items.push(
            new EditorQueueRemoveMark(
                range.start + offset,
                range.end + offset + Math.max(0, endOffset),
                'undo'
            )
        )
    }
    lastUndoRanges = []

    for (const range of lastRetryRanges) {
        let offset = 0
        let endOffset = 0
        if (insertionInfo && text && previousText)
            for (const info of insertionInfo) {
                const insertionRange = translateRange(text, info.start, info.end)
                const removedRange = translateRange(previousText, info.start, info.removedEnd)
                if (insertionRange.start > range.start + offset) {
                    endOffset += insertionRange.end - insertionRange.start
                    endOffset -= removedRange.end - removedRange.start
                }
                if (range.start + offset > insertionRange.start) {
                    offset += insertionRange.end - insertionRange.start
                    offset -= removedRange.end - removedRange.start
                }
            }
        items.push(
            new EditorQueueRemoveMark(
                range.start + offset,
                range.end + offset + Math.max(0, endOffset),
                'retry'
            )
        )
    }
    lastRetryRanges = []

    return items
}

export function lastInsertionInfoToUndoRetry(
    text: string,
    insertionInfo: InsertionInfo[]
): EditorQueueItem[] {
    const items = []
    for (const info of insertionInfo) {
        let newlines = 0
        let characters = 0

        const range = translateRange(text, info.start, info.removedEnd)
        if (info.text !== '') {
            const lines = info.text.split('\n')
            for (const [i, line] of lines.entries()) {
                if (i > 0) {
                    newlines += 2
                }
                items.push(
                    new EditorQueueMark(
                        range.start + characters + newlines,
                        range.start + line.length + characters + newlines,
                        'undo'
                    )
                )
                lastUndoRanges.push({
                    start: range.start + characters + newlines,
                    end: range.start + line.length + characters + newlines,
                })
                if (info.type === DataOrigin.ai) {
                    items.push(
                        new EditorQueueMark(
                            range.start + characters + newlines,
                            range.start + line.length + characters + newlines,
                            'retry'
                        )
                    )
                    lastRetryRanges.push({
                        start: range.start + characters + newlines,
                        end: range.start + line.length + characters + newlines,
                    })
                }
                characters += line.length
            }
        }
    }

    return items
}

export function decorations(story: StoryContent): EditorQueueItem[] {
    const storyText = story.getStoryText()
    const nonDisabledEntries = []
    const disabledCategories = new Set()
    for (const category of story.lorebook.categories) {
        if (!category.enabled) {
            disabledCategories.add(category.id)
        }
    }
    for (const entry of story.lorebook.entries) {
        if (!disabledCategories.has(entry.category)) {
            nonDisabledEntries.push(entry)
        }
    }
    const keys = keyMatches(storyText.slice(-10000), nonDisabledEntries, false)
    const offset = storyText.length - 10000 >= 0 ? storyText.length - 10000 : 0
    return keyMatchesToDecorations(storyText, keys, offset)
}

function removeDecorations() {
    return [new EditorQueueSetDecorations([])]
}

export function loadWrapper(story: StoryContent, decorate: boolean): EditorQueueItem[] {
    const storyText = story.getStoryText()
    return [
        new EditorQueueClear(),
        ...fragmentsToEditorQueueItems(story.story!.fragments, 1),
        ...lastInsertionInfoToUndoRetry(storyText, story.story!.lastInsertionInfo()),
        ...(decorate ? decorations(story) : removeDecorations()),
        new EditorQueueFocus(),
    ]
}

export function redoWrapper(story: StoryContent, index: number, decorate: boolean): EditorQueueItem[] {
    let queue = [...clearLastUndoRetry()]
    if (index >= 0) story.story!.redo(index)
    else story.story!.redo()
    queue = [
        ...queue,
        ...lastInsertionInfoToEditorQueueItems(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...lastInsertionInfoToUndoRetry(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...(decorate ? decorations(story) : removeDecorations()),
    ]
    return queue
}

export function undoWrapper(story: StoryContent, decorate: boolean): EditorQueueItem[] {
    if (!story.story!.canUndo()) {
        return []
    }

    let queue = [
        ...clearLastUndoRetry(),
        ...lastInsertionInfoToEditorQueueItemsUndo(story.getStoryText(), story.story!.lastInsertionInfo()),
    ]
    story.story!.undo()
    queue = [
        ...queue,
        ...lastInsertionInfoToUndoRetry(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...(decorate ? decorations(story) : removeDecorations()),
    ]
    return queue
}

export function insertionWrapper(
    story: StoryContent,
    origin: DataOrigin,
    text: string,
    start: number,
    end: number,
    decorate: boolean
): EditorQueueItem[] {
    let queue = [...clearLastUndoRetry()]
    story.story!.insert(origin, text, start, end)
    queue = [
        ...queue,
        ...lastInsertionInfoToEditorQueueItems(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...lastInsertionInfoToUndoRetry(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...(decorate ? decorations(story) : removeDecorations()),
    ]
    return queue
}

export function appendWrapper(
    story: StoryContent,
    origin: DataOrigin,
    text: string,
    decorate: boolean
): EditorQueueItem[] {
    let queue = [...clearLastUndoRetry()]
    story.story!.append(origin, text)
    queue = [
        ...queue,
        ...lastInsertionInfoToEditorQueueItems(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...lastInsertionInfoToUndoRetry(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...(decorate ? decorations(story) : removeDecorations()),
    ]
    return queue
}

export function editWrapper(
    story: StoryContent,
    text: string,
    decorate: boolean,
    origin?: DataOrigin
): { edited: boolean; queue: EditorQueueItem[] } {
    const previousText = story.getStoryText()
    const edited = story.story!.edit(text, origin)
    let queue = [...clearLastUndoRetry(story.getStoryText(), previousText, story.story!.lastInsertionInfo())]
    queue = [
        ...queue,
        ...lastInsertionInfoToEditorQueueMarks(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...lastInsertionInfoToUndoRetry(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...(decorate ? decorations(story) : removeDecorations()),
    ]
    return { edited, queue }
}

export function editOutsideWrapper(
    story: StoryContent,
    text: string,
    decorate: boolean,
    origin?: DataOrigin
): { edited: boolean; queue: EditorQueueItem[] } {
    const previousText = story.getStoryText()
    const edited = story.story!.edit(text, origin)
    let queue = [...clearLastUndoRetry(story.getStoryText(), previousText, story.story!.lastInsertionInfo())]
    queue = [
        ...queue,
        ...lastInsertionInfoToEditorQueueItems(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...lastInsertionInfoToUndoRetry(story.getStoryText(), story.story!.lastInsertionInfo()),
        ...(decorate ? decorations(story) : removeDecorations()),
    ]
    return { edited, queue }
}

export async function streamedResponseWrapper(
    story: StoryContent,
    addToQueue: (queue: Array<EditorQueueItem>) => void,
    generationComplete: (
        text: string,
        tokenResponse: number[],
        logprobs?: LogProbs[],
        shouldComment?: boolean
    ) => void,
    request: IGenerationRequest,
    startIndex: number,
    endIndex: number,
    error: (err: { status: number; message: string }) => void,
    onTokenRecieved: () => Promise<boolean>,
    delay: number,
    decorate: boolean
): Promise<void> {
    const range = translateRange(story.getStoryText(), startIndex, endIndex)
    let newlines = 0
    let characters = 0
    let combinedResponse = ''
    const combinedTokens: number[][] = []
    const logprobsArr: LogProbs[][] = []
    let currentResponse = ''
    const receivedTokens: { token: string; final: boolean }[] = []
    let currentIndex = 0
    let items: EditorQueueItem[] = [...clearLastUndoRetry(), new EditorQueueRemove(range.start, range.end)]
    let finalAdded = false
    let first = true
    const delayQueue: { queue: EditorQueueItem[]; final: boolean }[] = []
    let frames = 0
    let delayIndex = 0
    const updateEditor = () => {
        frames++
        if (frames < delay) {
            requestAnimationFrame(updateEditor)

            return
        }
        frames = 0
        if (delayQueue.length <= delayIndex) {
            requestAnimationFrame(updateEditor)
            return
        }
        const item = delayQueue[delayIndex]
        addToQueue(item.queue)
        delayIndex++

        if (!item.final) {
            requestAnimationFrame(updateEditor)
        } else {
            const shouldComment = story.getStoryText().length - endIndex < 100
            story.story!.insert(DataOrigin.ai, combinedResponse, startIndex, endIndex)
            generationComplete(combinedResponse, combinedTokens.flat(), logprobsArr.flat(), shouldComment)
            addToQueue([...(decorate ? decorations(story) : removeDecorations())])
        }
    }
    request.requestStream(
        async (
            token: string,
            index: number,
            final: boolean,
            tokenArr: number[],
            logprobs: LogProbs[] | undefined
        ) => {
            if (finalAdded) {
                return false
            }
            combinedTokens[index] = tokenArr
            if (logprobs) logprobsArr[index] = logprobs
            receivedTokens[index] = { token, final }
            for (let i = currentIndex; i < receivedTokens.length; i++) {
                const element = receivedTokens[i]
                if (element !== undefined) {
                    currentIndex++
                    const replaced = element.token.replace(/\r/g, '')
                    currentResponse += replaced
                    finalAdded = element.final
                } else {
                    break
                }
            }
            if (currentResponse !== '') {
                const workingString = currentResponse

                const lines = workingString.split('\n')
                for (const [i, line] of lines.entries()) {
                    if (i > 0) {
                        items.push(new EditorQueueParagraph(range.start + characters + newlines))
                        newlines += 2
                        combinedResponse += '\n'
                    }
                    if (line !== '') {
                        items.push(
                            new EditorQueueAdd(
                                line,
                                range.start + characters + newlines,
                                DataOrigin.ai,
                                true,
                                true
                            )
                        )
                        lastUndoRanges.push({
                            start: range.start + characters + newlines,
                            end: range.start + line.length + characters + newlines,
                        })
                        lastRetryRanges.push({
                            start: range.start + characters + newlines,
                            end: range.start + line.length + characters + newlines,
                        })

                        combinedResponse += line
                    }
                    characters += line.length
                }
                currentResponse = ''
            }
            if (!finalAdded) {
                if (delay > 0) {
                    delayQueue.push({ queue: [...items], final: false })
                    if (first) {
                        requestAnimationFrame(updateEditor)
                    }
                } else {
                    addToQueue([...items])
                }
                first = false
            } else {
                if (delay > 0) {
                    delayQueue.push({
                        queue: [...items],
                        final: true,
                    })
                } else {
                    const shouldComment = story.getStoryText().length - endIndex < 100
                    addToQueue([...items])
                    story.story!.insert(DataOrigin.ai, combinedResponse, startIndex, endIndex)
                    generationComplete(
                        combinedResponse,
                        combinedTokens.flat(),
                        logprobsArr.flat(),
                        shouldComment
                    )
                    addToQueue([...(decorate ? decorations(story) : removeDecorations())])
                }
            }
            items = []
            const resume = await onTokenRecieved()
            return resume
        },
        error
    )
}
