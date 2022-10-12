import { createModelSchema, list, object, primitive, serialize } from 'serializr'
import { diff_match_patch } from 'diff-match-patch'
import { deserialize } from '../../util/serialization'

export enum DataOrigin {
    ai = 'ai',
    user = 'user',
    prompt = 'prompt',
    root = 'root',
    edit = 'edit',
    flattened = 'flattened',
    unknown = 'unknown',
}

export interface InsertionInfo {
    start: number
    end: number
    type: DataOrigin
    removedEnd: number
    text: string
    removedFragments: Fragment[]
}

export enum StoryMode {
    normal = 0,
    adventure = 1,
}

export class StoryStatistics {
    dataBlocks: number = 0
    abandonedDataBlocks: number = 0
    chainedBlocks: number = 0
    editBlocks: number = 0
    chainedEditBlocks: number = 0
    responseBlocks: number = 0
    chainedResponseBlocks: number = 0
    userBlocks: number = 0
    chainedUserBlocks: number = 0
    currentStep: number = 0
    furthestStep: number = 0
    characters: number = 0
    abandonedCharacters: number = 0
    paragraphs: number = 0

    deadEnds: number = 0
    noRetryStreak: number = 0
    longestAbandonedBranch: number = 0
    retries: number = 0
    stepsWhereResponseWasRequested: number = 0
    inputCharacters: number = 0
    abandonedInputCharacters: number = 0
    responseCharacters: number = 0
    abandonedResponseCharacters: number = 0
    editCharacters: number = 0
    abandonedEditCharacters: number = 0
    deletedCharacters: number = 0
    mostRetries: number = 0
}

export class NlpStoryStatistics {
    words: number = 0
    sentences: number = 0
    adverbs: number = 0
    pronouns: number = 0
    conjunctions: number = 0
    prepositions: number = 0
    nouns: number = 0
    verbs: number = 0
    usedWords: Map<string, number> = new Map()
}

/**
 * Stores text and metadata associed with the text.
 */
export class Fragment {
    data: string
    origin: DataOrigin
    constructor(data: string, origin: DataOrigin) {
        if (data === undefined) {
            // deserializing an empty string results in undefined
            data = ''
        }
        this.data = data
        this.origin = origin
    }
}
createModelSchema(Fragment, {
    data: primitive(),
    origin: primitive(),
})

/**
 * Contains the information necessary to make and revert changes
 * to a story.
 */
export class DataBlock {
    nextBlock: number[]
    prevBlock: number = -1
    origin: DataOrigin
    startIndex: number
    endIndex: number
    dataFragment: Fragment
    fragmentIndex: number = -1
    removedFragments: Fragment[] = []
    redoPath: number = 0
    chain: boolean = false
    constructor(
        origin: DataOrigin,
        data = '',
        startIndex = 0,
        endIndex = startIndex + data.length,
        chain = false
    ) {
        this.nextBlock = []
        this.origin = origin
        this.startIndex = startIndex
        if (data === undefined) {
            // deserializing an empty string results in undefined
            data = ''
        }
        this.dataFragment = new Fragment(data, origin)
        this.endIndex = endIndex
        this.chain = chain
    }
}
createModelSchema(DataBlock, {
    nextBlock: list(primitive()),
    prevBlock: primitive(),
    origin: primitive(),
    startIndex: primitive(),
    endIndex: primitive(),
    dataFragment: object(Fragment),
    fragmentIndex: primitive(),
    removedFragments: list(object(Fragment)),
    chain: primitive(),
})

/**
 * A class to hold and manage a story. Changes to the story are saved
 * in dataBlocks which contain the information required to make and
 * revert changes to the story. The text of the story is stored both
 * as a single string of text and as an array of fragments that can
 * contain metadata such as the source of the text.
 */
export class Story {
    version: number
    datablocks: DataBlock[] = []
    currentBlock: number = -1
    fragments: Fragment[] = []
    step: number = 0
    text?: string
    constructor() {
        this.version = 2
        this.currentBlock = 0
        this.datablocks.push(new DataBlock(DataOrigin.root))
        this.fragments.push(new Fragment('', DataOrigin.root))
    }

    /**
     * Creates a dataBlock from the given data and updates the story with it.
     * @param {The source of the data (user, AI, edit, etc.)} origin
     * @param {The textual data to append to the story} data
     */
    append(origin: DataOrigin, data: string): void {
        // appending is just inserting at the end
        this.insert(origin, data, this.getText().length, this.getText().length)
    }

    /**
     *
     * @param {The source of the data (user, AI, edit, etc.)} origin
     * @param {The textual data to insert into the story} data
     * @param {The index to begin the insertion at} startIndex
     * @param {Text between startIndex and endIndex is removed before data is inserted} endIndex
     */
    insert(
        origin: DataOrigin,
        data: string,
        startIndex: number,
        endIndex: number,
        chain: boolean = false
    ): void {
        // create a new datablock
        const newBlock = new DataBlock(origin, data, startIndex, endIndex, chain)
        const newBlockIndex = this.datablocks.length
        // link the new datablock to the current one
        newBlock.prevBlock = this.currentBlock
        this.datablocks[this.currentBlock].nextBlock[this.datablocks[this.currentBlock].nextBlock.length] =
            newBlockIndex
        this.datablocks.push(newBlock)
        this.updateStory(newBlockIndex)
    }

    /**
     * Undoes the changes made by the last datablock, setting it to
     * the same state as before that datablock modified the story
     */
    undo(): boolean {
        if (this.canUndo()) {
            const repeat = this.datablocks[this.datablocks[this.currentBlock].prevBlock].chain
            this.rollbackStory()
            if (repeat) {
                this.undo()
            }
            return true
        }
        return false
    }

    /**
     * Redoes an undo on the current dataBlock, using it to update the story.
     * If no index is given it will redo to the most recent data block.
     * @param {The index of the dataBlock to update the story with} index
     */
    redo(index: number = this.datablocks[this.currentBlock].redoPath): boolean {
        if (this.datablocks[this.currentBlock].nextBlock[index]) {
            this.updateStory(this.datablocks[this.currentBlock].nextBlock[index])
            if (this.datablocks[this.currentBlock].chain) {
                this.redo()
            }
            return true
        }
        return false
    }

    /**
     * Compares the given text to the current story and appends or inserts
     * as needed to update the story.
     * @param {The full edited text of the story} newText
     */
    edit(newText: string, origin?: DataOrigin): boolean {
        const diff = new diff_match_patch()
        const diffs = diff.diff_main(this.getText(), newText)
        diff.diff_cleanupSemantic(diffs)
        let lastRemove: { diff: { 0: number; 1: string }; start: number } | undefined
        const edits: { text: string; startIndex: number; endIndex: number }[] = []
        let currentStartIndex = 0
        for (const d of diffs) {
            if (d[0] === -1) {
                lastRemove = { diff: d, start: currentStartIndex }
            } else if (d[0] === 1) {
                const endIndex = lastRemove
                    ? currentStartIndex + lastRemove.diff[1].length
                    : currentStartIndex
                edits.push({
                    text: d[1],
                    startIndex: currentStartIndex,
                    endIndex,
                })
                lastRemove = undefined
            } else {
                if (lastRemove) {
                    edits.push({
                        text: '',
                        startIndex: lastRemove.start,
                        endIndex: lastRemove.start + lastRemove.diff[1].length,
                    })
                }
                lastRemove = undefined
            }
            if (d[0] !== -1) {
                currentStartIndex += d[1].length
            }
        }
        if (lastRemove) {
            edits.push({
                text: '',
                startIndex: lastRemove.start,
                endIndex: lastRemove.start + lastRemove.diff[1].length,
            })
        }
        for (const [index, edit] of edits.entries()) {
            if (this.getText().length === 0) {
                // if there is no existing text treat it as a prompt
                this.append(origin ?? DataOrigin.prompt, edit.text)
            } else if (edit.startIndex === this.getText().length) {
                // if the edit only adds text to the end append it as if it was user input
                this.append(origin ?? DataOrigin.user, edit.text)
            } else {
                // otherwise insert the text
                this.insert(
                    origin ?? DataOrigin.edit,
                    edit.text,
                    edit.startIndex,
                    edit.endIndex,
                    index !== edits.length - 1
                )
            }
        }

        return edits.length > 0
    }

    canUndo(): boolean {
        return this.datablocks[this.currentBlock].prevBlock !== -1
    }

    canRetry(): boolean {
        const currentBlock = this.datablocks[this.currentBlock]
        return currentBlock.prevBlock !== -1 && currentBlock.origin === DataOrigin.ai
    }

    getRedoOptions(): string[][][] {
        const options: string[][][] = []
        const datablock = this.datablocks[this.currentBlock]
        for (let index = 0; index < datablock.nextBlock.length; index++) {
            let nextBlock = this.datablocks[datablock.nextBlock[index]]
            const changeText: string[][] = [[], []]
            let repeat = false
            do {
                changeText[0].push(
                    this.getRemovedFragments(this.getFragmentChangeIndices(nextBlock))
                        .map((f) => f.data)
                        .join('')
                )
                changeText[1].push(nextBlock.dataFragment.data)
                repeat = nextBlock.chain
                nextBlock = this.datablocks[nextBlock.nextBlock[nextBlock.redoPath]]
            } while (nextBlock && repeat)
            options.push(changeText)
        }
        return options
    }

    lastDatablockIsAI(): boolean {
        return this.datablocks[this.currentBlock].origin === DataOrigin.ai
    }

    lastInsertionInfo(): InsertionInfo[] {
        const results: InsertionInfo[] = []
        let datablock = this.datablocks[this.currentBlock]
        results.push({
            start: datablock.startIndex,
            end: datablock.startIndex + datablock.dataFragment.data.length,
            type: datablock.origin,
            removedEnd: datablock.startIndex + datablock.removedFragments.map((d) => d.data).join('').length,
            text: datablock.dataFragment.data,
            removedFragments: datablock.removedFragments,
        })
        datablock = this.datablocks[datablock.prevBlock]
        if (datablock === undefined) {
            return results
        }
        while (datablock.chain) {
            results.push({
                start: datablock.startIndex,
                end: datablock.startIndex + datablock.dataFragment.data.length,
                type: datablock.origin,
                removedEnd:
                    datablock.startIndex + datablock.removedFragments.map((d) => d.data).join('').length,
                text: datablock.dataFragment.data,
                removedFragments: datablock.removedFragments,
            })
            datablock = this.datablocks[datablock.prevBlock]
        }
        return results
    }

    reconstructStory(): void {
        const currentBlock = this.currentBlock
        while (this.currentBlock !== 0) {
            this.undo()
        }
        for (const datablock of this.datablocks) {
            datablock.removedFragments = []
        }
        this.step = 0
        while (this.currentBlock !== currentBlock && this.datablocks[this.currentBlock]) {
            this.redo()
        }
    }

    flattenStory(): void {
        const newBlocks = [new DataBlock(DataOrigin.root)]
        const newFragments = [new Fragment('', DataOrigin.root)]
        const storyText = this.getText()
        this.datablocks = newBlocks
        this.fragments = newFragments
        this.currentBlock = this.datablocks.length - 1
        this.generateText()
        this.append(DataOrigin.flattened, storyText)
    }

    resetToPrompt(): void {
        const newBlocks = [new DataBlock(DataOrigin.root)]
        const newFragments = [new Fragment('', DataOrigin.root)]
        if (!this.datablocks[1]) {
            throw 'Story does not have a prompt.'
        }
        let firstFragment = 0
        for (let i = this.fragments.length - 1; i > 0; --i) {
            if (
                this.fragments[i].origin === DataOrigin.prompt ||
                this.fragments[i].origin === DataOrigin.flattened
            ) {
                firstFragment = i
                break
            }
        }
        let text = ''
        for (let i = firstFragment; i >= 0; --i) {
            const fragment = this.fragments[i]
            text = fragment.data + text
        }
        this.datablocks = newBlocks
        this.fragments = newFragments
        this.currentBlock = this.datablocks.length - 1
        this.step = 0
        this.generateText()
        this.append(DataOrigin.prompt, text)
    }

    trimBranches(): void {
        const newBlocks = Story.performBranchTrim(this.datablocks, this.currentBlock)
        this.datablocks = newBlocks
        this.datablocks[this.datablocks.length - 1].nextBlock = []
        this.currentBlock = this.datablocks.length - 1
    }

    trimBeforeStep(trimStep?: number): void {
        if (trimStep === undefined) {
            trimStep = this.step
        }
        if (trimStep < 0) {
            trimStep = this.step + trimStep
        }

        if (trimStep > this.step) {
            throw 'Can not trim from a step further than the current step.'
        }

        // Find the cutoff point
        let indexBlock = this.datablocks[this.currentBlock]
        let cutoffBlock = indexBlock
        let step = this.step
        while (indexBlock.prevBlock != -1) {
            if (step >= trimStep) {
                cutoffBlock = indexBlock
            } else {
                break
            }
            if (indexBlock.origin !== DataOrigin.edit) {
                step--
            }
            indexBlock = this.datablocks[indexBlock.prevBlock]
        }
        const cutoffIndex = this.datablocks.indexOf(cutoffBlock)

        const newBlocks = Story.performBranchTrim(this.datablocks, cutoffIndex)

        // Calculate index offset for cutoff blocks
        const cutoffOffset =
            newBlocks.length - (this.datablocks.length - this.datablocks.indexOf(cutoffBlock))
        const addedBlocks = this.datablocks.slice(this.datablocks.indexOf(cutoffBlock) + 1)
        for (const block of addedBlocks) {
            block.prevBlock -= cutoffOffset
            for (let index = 0; index < block.nextBlock.length; index++) {
                block.nextBlock[index] -= cutoffOffset
            }
        }
        this.datablocks = [...newBlocks, ...addedBlocks]
        this.currentBlock = this.datablocks.length - 1
    }

    private static performBranchTrim(datablocks: DataBlock[], trimIndex: number) {
        let indexBlock = datablocks[trimIndex]
        const tempBlocks = []

        while (indexBlock.prevBlock != -1) {
            tempBlocks.push(deserialize(DataBlock, serialize(indexBlock) as DataBlock))
            indexBlock = datablocks[indexBlock.prevBlock]
        }
        tempBlocks.push(indexBlock)

        // Loop through recorded blocks backwards, setting new
        // prevBlock and nextBlock indices
        const newBlocks: DataBlock[] = []
        let newIndex = 0
        for (let index = tempBlocks.length - 1; index >= 0; index--) {
            const element = tempBlocks[index]
            if (index !== tempBlocks.length - 1) {
                element.prevBlock = newIndex - 1
            }
            if (index !== 0) {
                element.nextBlock = [newIndex + 1]
            }
            element.redoPath = 0

            newBlocks.push(element)
            newIndex++
        }
        return newBlocks
    }

    /**
     * Updates the story's fragments with the given dataBlock
     * @param {The index of the datablock to update the story with} number
     */
    private updateStory(dataBlockIndex: number) {
        this.currentBlock = dataBlockIndex
        if (
            this.datablocks[dataBlockIndex].startIndex === this.getText().length &&
            this.datablocks[dataBlockIndex].origin !== 'edit'
        ) {
            // if the fragment goes on the end of the story
            this.appendFragment(this.datablocks[dataBlockIndex].dataFragment)
        } else {
            // otherwise insert it into the fragment array
            this.insertFragment(this.datablocks[dataBlockIndex])
        }
        if (this.datablocks[dataBlockIndex].origin !== 'edit') this.step++
        this.generateText()
    }

    /**
     * Undoes the changes made by updateStory for the given dataBlock
     * @param {The datablock to remove the changes of} datablock
     */
    private rollbackStory() {
        const currentDataBlock = this.datablocks[this.currentBlock]
        const removedFragments = this.datablocks[this.currentBlock].removedFragments
        const reconstructedFragments: Fragment[] = []
        if (removedFragments.length === 1) {
            reconstructedFragments.push(
                new Fragment(
                    this.fragments[currentDataBlock.fragmentIndex - 1].data +
                        removedFragments[0].data +
                        this.fragments[currentDataBlock.fragmentIndex + 1].data,
                    removedFragments[0].origin
                )
            )
        } else if (removedFragments.length > 1) {
            reconstructedFragments.push(
                new Fragment(
                    this.fragments[currentDataBlock.fragmentIndex - 1].data + removedFragments[0].data,
                    this.fragments[currentDataBlock.fragmentIndex - 1].origin
                )
            )
            if (removedFragments.length > 2) {
                reconstructedFragments.push(...removedFragments.slice(1, -1))
            }
            reconstructedFragments.push(
                new Fragment(
                    removedFragments[removedFragments.length - 1].data +
                        this.fragments[currentDataBlock.fragmentIndex + 1].data,
                    this.fragments[currentDataBlock.fragmentIndex + 1].origin
                )
            )
        }
        this.fragments =
            this.datablocks[this.currentBlock].fragmentIndex === this.fragments.length - 1
                ? this.fragments.slice(0, -1)
                : [
                      ...this.fragments.slice(0, this.datablocks[this.currentBlock].fragmentIndex - 1),
                      ...reconstructedFragments,
                      ...this.fragments.slice(this.datablocks[this.currentBlock].fragmentIndex + 2),
                  ]
        const undoneIndex = this.currentBlock

        this.datablocks[this.currentBlock].removedFragments = []

        // set the current dataBlock back
        this.currentBlock = this.datablocks[this.currentBlock].prevBlock
        // set the redoPath for later redoing
        this.datablocks[this.currentBlock].redoPath =
            this.datablocks[this.currentBlock].nextBlock.indexOf(undoneIndex)

        if (this.datablocks[undoneIndex].origin !== 'edit') this.step--
        this.generateText()
    }

    /**
     * Appends a fragment to the story's fragment array
     * @param {The fragment to append} fragment
     */
    private appendFragment(fragment: Fragment) {
        this.datablocks[this.currentBlock].fragmentIndex = this.fragments.length
        this.fragments = [...this.fragments, fragment]
    }

    /**
     * Uses the given dataBlock to insert a fragment into the story's
     * fragment list. The startIndex and endIndex of the dataBlock is
     * used to determine where to insert it. Spliting and removing other
     * fragments as needed. Removed fragments are stored in the datablock
     * for use in undoing later.
     * @param {The dataBlock containing the fragment to insert} dataBlock
     */
    private insertFragment(dataBlock: DataBlock) {
        const indices = this.getFragmentChangeIndices(dataBlock)
        // create new fragments for those cut off by the edit
        const startReplace = new Fragment(
            this.fragments[indices.lowerFragmentIndex].data.slice(
                0,
                this.fragments[indices.lowerFragmentIndex].data.length - indices.removedLowerCharacters
            ),
            this.fragments[indices.lowerFragmentIndex].origin
        )
        const endReplace = new Fragment(
            this.fragments[indices.upperFragmentIndex].data.slice(
                this.fragments[indices.upperFragmentIndex].data.length - indices.remainingUpperCharacters
            ),
            this.fragments[indices.upperFragmentIndex].origin
        )
        // store the fragments about to be removed in the datablock for later
        dataBlock.removedFragments = this.getRemovedFragments(indices)
        // construct a new fragment array containing the new fragment
        dataBlock.fragmentIndex = indices.lowerFragmentIndex + 1
        this.fragments = [
            ...this.fragments.slice(0, indices.lowerFragmentIndex),
            startReplace,
            dataBlock.dataFragment,
            endReplace,
            ...this.fragments.slice(indices.upperFragmentIndex + 1),
        ]
    }

    private getFragmentChangeIndices(dataBlock: DataBlock): {
        upperFragmentIndex: number
        lowerFragmentIndex: number
        removedLowerCharacters: number
        remainingUpperCharacters: number
    } {
        // set up characterCount for looping through
        let characterCount = this.getText().length
        // loop through fragments starting from the end and
        // find the last dataBlock that falls within the edit
        let endFound = false
        let i = this.fragments.length - 1
        while (!endFound && i >= 0) {
            if (dataBlock.endIndex >= characterCount - this.fragments[i].data.length) {
                endFound = true
            } else {
                characterCount -= this.fragments[i].data.length
                i--
            }
        }
        const upperFragmentIndex = i
        const remainingUpperCharacters = characterCount - dataBlock.endIndex

        // continue looping to find the first fragment that
        // falls within the edit
        let startFound = false
        while (!startFound && i >= 0) {
            if (dataBlock.startIndex >= characterCount - this.fragments[i].data.length) {
                startFound = true
            } else {
                characterCount -= this.fragments[i].data.length
                i--
            }
        }
        const lowerFragmentIndex = i
        const removedLowerCharacters = characterCount - dataBlock.startIndex

        return { upperFragmentIndex, lowerFragmentIndex, removedLowerCharacters, remainingUpperCharacters }
    }

    private getRemovedFragments(indices: {
        upperFragmentIndex: number
        lowerFragmentIndex: number
        removedLowerCharacters: number
        remainingUpperCharacters: number
    }) {
        const removedFragments: Fragment[] = []
        if (indices.lowerFragmentIndex === indices.upperFragmentIndex) {
            removedFragments.push(
                new Fragment(
                    this.fragments[indices.lowerFragmentIndex].data.slice(
                        this.fragments[indices.lowerFragmentIndex].data.length -
                            indices.removedLowerCharacters,
                        this.fragments[indices.lowerFragmentIndex].data.length -
                            indices.remainingUpperCharacters
                    ),
                    this.fragments[indices.lowerFragmentIndex].origin
                )
            )
        } else {
            removedFragments.push(
                new Fragment(
                    this.fragments[indices.lowerFragmentIndex].data.slice(
                        this.fragments[indices.lowerFragmentIndex].data.length -
                            indices.removedLowerCharacters
                    ),
                    this.fragments[indices.lowerFragmentIndex].origin
                ),
                ...this.fragments.slice(indices.lowerFragmentIndex + 1, indices.upperFragmentIndex),
                new Fragment(
                    this.fragments[indices.upperFragmentIndex].data.slice(
                        0,
                        this.fragments[indices.upperFragmentIndex].data.length -
                            indices.remainingUpperCharacters
                    ),
                    this.fragments[indices.upperFragmentIndex].origin
                )
            )
        }
        return removedFragments
    }

    getText(): string {
        if (this.text === undefined) {
            this.generateText()
        }
        return this.text ?? ''
    }

    /**
     * Combines the stories fragments into a single string.
     */
    private generateText(): string {
        this.text = ''
        for (let index = 0; index < this.fragments.length; index++) {
            const fragment = this.fragments[index]
            this.text += fragment.data
        }
        return this.text
    }

    async calculateStoryStatistics(): Promise<StoryStatistics> {
        const result = new StoryStatistics()
        for (const dataBlock of this.datablocks) {
            if (dataBlock.chain) {
                result.chainedBlocks++
                switch (dataBlock.origin) {
                    case DataOrigin.ai:
                        result.chainedResponseBlocks++
                        break
                    case DataOrigin.user:
                        result.chainedUserBlocks++
                        break
                    case DataOrigin.edit:
                        result.chainedEditBlocks++
                        break
                    default:
                        break
                }
            } else {
                result.dataBlocks++
                switch (dataBlock.origin) {
                    case DataOrigin.ai:
                        result.responseBlocks++
                        break
                    case DataOrigin.user:
                        result.userBlocks++
                        break
                    case DataOrigin.edit:
                        result.editBlocks++
                        break
                    default:
                        break
                }
            }
        }

        const currentPath: Set<number> = new Set()
        let currentBlock = this.currentBlock
        while (currentBlock >= 0) {
            currentPath.add(currentBlock)
            currentBlock = this.datablocks[currentBlock].prevBlock
        }
        const explored: Set<number> = new Set()
        const branchPoints: number[] = []
        let state = {
            currentStep: -1,
            noRetryStreak: -1,
            longestAbandonedBranch: -1,
        }
        const branchState: typeof state[] = []

        let skipStats = false
        let index = 0
        while (explored.size < this.datablocks.length) {
            const currentBlock = this.datablocks[index]
            if (!skipStats) {
                // Further Step
                if (currentBlock.origin !== 'edit') state.currentStep++

                if (state.currentStep > result.furthestStep) {
                    result.furthestStep = state.currentStep
                }

                let responses = 0
                for (const next of currentBlock.nextBlock) {
                    if (this.datablocks[next].origin === DataOrigin.ai) {
                        responses++
                    }
                }

                // Steps where a response was requested
                if (responses > 0) {
                    result.stepsWhereResponseWasRequested++
                }

                // Retries
                if (responses > 1) {
                    result.retries += responses - 1
                    if (responses - 1 > result.mostRetries) {
                        result.mostRetries = responses - 1
                    }
                }

                // No Retry Streak
                if (responses < 2 && !currentBlock.chain && currentBlock.origin !== DataOrigin.edit) {
                    state.noRetryStreak++
                    if (state.noRetryStreak > result.noRetryStreak) {
                        result.noRetryStreak = state.noRetryStreak
                    }
                } else if (responses > 1) {
                    state.noRetryStreak = 0
                }

                // Not on current path
                if (!currentPath.has(index)) {
                    // Abandoned Characters
                    result.abandonedCharacters += currentBlock.dataFragment.data.length
                    switch (currentBlock.origin) {
                        case DataOrigin.ai:
                            result.abandonedResponseCharacters += currentBlock.dataFragment.data.length
                            break
                        case DataOrigin.user:
                            result.abandonedInputCharacters += currentBlock.dataFragment.data.length
                            break
                        case DataOrigin.edit:
                            result.abandonedEditCharacters += currentBlock.dataFragment.data.length
                            break
                        default:
                            break
                    }

                    // Abandoned datablocks
                    result.abandonedDataBlocks++

                    // Dead ends
                    if (currentBlock.nextBlock.length === 0) {
                        result.deadEnds++
                    }

                    // Longest Abandoned Branch
                    state.longestAbandonedBranch++
                    if (!currentBlock.chain && state.longestAbandonedBranch > result.longestAbandonedBranch) {
                        result.longestAbandonedBranch = state.longestAbandonedBranch
                    }
                } else {
                    switch (currentBlock.origin) {
                        case DataOrigin.ai:
                            result.responseCharacters += currentBlock.dataFragment.data.length
                            break
                        case DataOrigin.user:
                            result.inputCharacters += currentBlock.dataFragment.data.length
                            break
                        case DataOrigin.edit:
                            result.editCharacters += currentBlock.dataFragment.data.length
                            result.deletedCharacters += currentBlock.removedFragments
                                .map((f) => f.data)
                                .join('').length
                            break
                        default:
                            break
                    }
                }
            }
            skipStats = false
            explored.add(index)
            let branch = false
            for (const next of currentBlock.nextBlock) {
                if (!explored.has(next)) {
                    branchPoints.push(index)
                    branchState.push(JSON.parse(JSON.stringify(state)))

                    index = next
                    branch = true
                    break
                }
            }
            if (branch) {
                continue
            }
            if (explored.size >= this.datablocks.length) {
                // Checked all
                break
            }
            const top = branchPoints.pop()
            const topState = branchState.pop()
            if (top === undefined || topState === undefined) {
                throw 'Error calculating stats: branch stack empty'
            }
            index = top
            state = topState
            skipStats = true
        }

        result.currentStep = this.step
        result.characters = this.getText().length
        result.paragraphs = this.getText().split(/^.+$/m).length - 1

        return result
    }

    async calculateNlpStats(): Promise<NlpStoryStatistics> {
        const result = new NlpStoryStatistics();

        return result
    }
}

createModelSchema(Story, {
    version: primitive(),
    step: primitive(),
    datablocks: list(object(DataBlock)),
    currentBlock: primitive(),
    fragments: list(object(Fragment)),
})
