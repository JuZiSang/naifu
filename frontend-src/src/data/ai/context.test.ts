/* eslint-disable max-len */
import fs from 'fs'
import { beforeAll, test, expect } from '@jest/globals'

import { StoryContainer } from '../story/storycontainer'
import { EventHandler } from '../event/eventhandling'
import { DataOrigin, Story } from '../story/story'
import Encoder from '../../tokenizer/encoder'
import { NoModule } from '../story/storysettings'
import {
    ContextEntry,
    ContextFieldConfig,
    getDefaultAuthorsNoteConfig,
    SeparationType,
    TrimDirection,
} from './contextfield'
import { buildContext, splitSentences } from './context'
import { LoreEntry } from './loreentry'

let tokenizer: Encoder

beforeAll(() => {
    // eslint-disable-next-line unicorn/prefer-module
    const tokenizerFile = fs.readFileSync(
        new URL('../../../public/tokenizer/gpt2_tokenizer.json', import.meta.url)
    )
    const tokenizerData = JSON.parse(tokenizerFile.toString())
    // eslint-disable-next-line unicorn/prefer-module
    tokenizer = new Encoder(tokenizerData.vocab, tokenizerData.merges, {})
})

test('token trim bottom', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 10,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text = 'This is a sentence with seven tokens'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        5,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('This is a sentence with')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('sentence trim bottom', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 5,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'This. Has. Multiple. Sentences.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('This. Has. ')
})

test('newline trim bottom', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.NewLine,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'This is a test.\nOf trimming newlines from the bottom.\nThis line should be cut'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        20,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('This is a test.\nOf trimming newlines from the bottom.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('token trim top', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 10,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimTop,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text = 'This is a sentence with seven tokens'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        5,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual(' a sentence with seven tokens')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('sentence trim top', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 7,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimTop,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'This. Has. Multiple. Sentences.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('Has. Multiple. Sentences.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('newline trim top', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimTop,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'This\n Has\n Multiple\n Newlines.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        7,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual(' Has\n Multiple\n Newlines.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('trim top no space', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimTop,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'This Has Multiple Newlines.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        3,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual(' Newlines.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('field priority', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 10,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }
    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 10,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
    }
    const config3: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 10,
        reservedTokens: 0,
        budgetPriority: 4,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'Last'
    const text2 = 'Middle'
    const text3 = 'First'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [
        new ContextEntry(config1, text1),
        new ContextEntry(config3, text3),
        new ContextEntry(config2, text2),
    ]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        5,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('LastMiddleFirst')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('positive token insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one two four'
    const text2 = ' three'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one two three four')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('zero token insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = ' one two three'
    const text2 = 'zero'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('zero one two three')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative one token insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: -1,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one two three'
    const text2 = ' four'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one two three four')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative token insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: -3,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one three four'
    const text2 = ' two'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one two three four')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negastive excess token insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: -99,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = ' two three four'
    const text2 = 'one'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one two three four')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('positive excess token insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 99,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one two three'
    const text2 = ' four'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one two three four')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('positive sentence insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one. two. four.'
    const text2 = 'three. '

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('zero sentence insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = ' one. two. three.'
    const text2 = 'zero.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('zero. one. two. three.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative one sentence insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: -1,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one. two. three. '
    const text2 = 'four.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        20,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative sentence insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: -3,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one. three. four'
    const text2 = 'two. '

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        12,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. four')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative excess sentence insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: -99,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = ' two. three. four.'
    const text2 = 'one.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('positive excess sentence insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 99,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one. two. three.'
    const text2 = ' four.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('positive newline insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.NewLine,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one\n two\n four\n'
    const text2 = ' three\n'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one\n two\n three\n four\n')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('zero newline insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.NewLine,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = ' one\n two\n three\n'
    const text2 = 'zero\n'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('zero\n one\n two\n three\n')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative one newline insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.NewLine,
        insertionPosition: -1,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one\n two\n three\n'
    const text2 = ' four\n'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one\n two\n three\n four\n')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative newline insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.NewLine,
        insertionPosition: -3,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one\n three\n four'
    const text2 = ' two\n'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one\n two\n three\n four')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative excess newline insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.NewLine,
        insertionPosition: -99,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = ' two\n three\n four\n'
    const text2 = 'one\n'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one\n two\n three\n four\n')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('positive excess newline insertion', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.NewLine,
        insertionPosition: 99,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one\n two\n three\n'
    const text2 = ' four\n'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one\n two\n three\n four\n')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('positive sentence insertion ignores common titles', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one. Dr. two. four.'
    const text2 = 'three. '

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        11,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. Dr. two. three. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('negative sentence insertion ignores common titles', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: -2,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = 'one. two. Dr. four.'
    const text2 = 'three. '

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        11,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. Dr. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('reserved tokens high priority', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 10,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: -1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: -3,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = '{>{>{>{>{>{>{>{>{>{>'
    const text2 = '<]<]<]<]<]<]<]<]<]<]'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        20,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('{>{>{>{>{>{>{>{>{>{>')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('reserved tokens low priority', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 10,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: -3,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text1 = '{>{>{>{>{>{>{>{>{>{>'
    const text2 = '<]<]<]<]<]<]<]<]<]<]'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        20,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('{>{>{>{>{><]<]<]<]<]')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('prefix', async () => {
    const config1: ContextFieldConfig = {
        prefix: '<><><>',
        suffix: '',
        tokenBudget: 10,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text = 'This is a sentence with a prefix.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        5,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('<><><>This')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('suffix', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '><><><',
        tokenBudget: 5,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text = 'This is a sentence with a suffix.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('This is><><><')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('prefix+suffix', async () => {
    const config1: ContextFieldConfig = {
        prefix: '<><><>',
        suffix: '><><><',
        tokenBudget: 100,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text = 'This is a sentence with a prefix and a suffix.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        100,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('<><><>This is a sentence with a prefix and a suffix.><><><')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('prefix+suffix no room', async () => {
    const config1: ContextFieldConfig = {
        prefix: '<><><>',
        suffix: '><><><',
        tokenBudget: 5,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text = "This is a sentence with out enough space for it's prefix and suffix."

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        100,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('prefix no room', async () => {
    const config1: ContextFieldConfig = {
        prefix: '<><><>',
        suffix: '',
        tokenBudget: 2,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text = "This is a sentence with out enough space for it's prefix."

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        100,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('suffix no room', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '><><><',
        tokenBudget: 2,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
        allowInsertionInside: true,
    }

    const text = "This is a sentence with out enough space for it's suffix."

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        100,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('Key Relative Insertion Before (sentence)', async () => {
    const text1 = 'This. Has. Some multiple. Sentences.'
    const text2 = 'Inserted Before '
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = -1
    loreentry.contextConfig.insertionType = SeparationType.Sentence
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual('This. Has. Some Inserted Before multiple. Sentences.')
})

test('Key Relative Insertion Negative (sentence)', async () => {
    const text1 = 'This. Has. Some multiple. Sentences. Another one.'
    const text2 = 'Inserted After '
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = -2
    loreentry.contextConfig.insertionType = SeparationType.Sentence
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual('This. Has. Inserted After Some multiple. Sentences. Another one.')
})

test('Key Relative Insertion Far Negative (sentence)', async () => {
    const text1 = 'This. Has. Some multiple. Sentences. Another one.'
    const text2 = 'Inserted After '
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = -99
    loreentry.contextConfig.insertionType = SeparationType.Sentence
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual('Inserted After This. Has. Some multiple. Sentences. Another one.')
})

test('Key Relative Insertion After (sentence)', async () => {
    const text1 = 'This. Has. Some multiple. Sentences. Another one.'
    const text2 = ' Inserted After'
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = 0
    loreentry.contextConfig.insertionType = SeparationType.Sentence
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual('This. Has. Some multiple Inserted After. Sentences. Another one.')
})

test('Key Relative Insertion Positive (sentence)', async () => {
    const text1 = 'This. Has. Some multiple. Sentences. Another one.'
    const text2 = 'Inserted After '
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = 1
    loreentry.contextConfig.insertionType = SeparationType.Sentence
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual('This. Has. Some multiple. Inserted After Sentences. Another one.')
})

test('Key Relative Insertion Far Positive (sentence)', async () => {
    const text1 = 'This. Has. Some multiple. Sentences. Another one.'
    const text2 = ' Inserted After'
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = 99
    loreentry.contextConfig.insertionType = SeparationType.Sentence
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual('This. Has. Some multiple. Sentences. Another one. Inserted After')
})

test('Key Relative Insertion Before (newline)', async () => {
    const text1 = 'This\n Has\n Some multiple\n Sentences\n'
    const text2 = 'Inserted Before '
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = -1
    loreentry.contextConfig.insertionType = SeparationType.NewLine
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual('This\n Has\n Some Inserted Before multiple\n Sentences\n')
})

test('Key Relative Insertion Negative (newline)', async () => {
    const text1 = 'This\n Has\n Some multiple\n Sentences\n Another one\n'
    const text2 = ' Inserted After'
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = -2
    loreentry.contextConfig.insertionType = SeparationType.NewLine
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual(
        'This\n Has\n Inserted After Some multiple\n Sentences\n Another one\n'
    )
})

test('Key Relative Insertion Far Negative (newline)', async () => {
    const text1 = 'This\n Has\n Some multiple\n Sentences\n Another one\n'
    const text2 = 'Inserted After '
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = -99
    loreentry.contextConfig.insertionType = SeparationType.NewLine
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual(
        'Inserted After This\n Has\n Some multiple\n Sentences\n Another one\n'
    )
})

test('Key Relative Insertion After (newline)', async () => {
    const text1 = 'This\n Has\n Some multiple\n Sentences\n Another one\n'
    const text2 = ' Inserted After'
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = 0
    loreentry.contextConfig.insertionType = SeparationType.NewLine
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual(
        'This\n Has\n Some multiple Inserted After\n Sentences\n Another one\n'
    )
})

test('Key Relative Insertion Positive (newline)', async () => {
    const text1 = 'This\n Has\n Some multiple\n Sentences\n Another one\n'
    const text2 = ' Inserted After'
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = 1
    loreentry.contextConfig.insertionType = SeparationType.NewLine
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual(
        'This\n Has\n Some multiple\n Inserted After Sentences\n Another one\n'
    )
})

test('Key Relative Insertion Far Positive (newline)', async () => {
    const text1 = 'This\n Has\n Some multiple\n Sentences\n Another one\n'
    const text2 = ' Inserted After'
    const loreentry = new LoreEntry(getDefaultAuthorsNoteConfig(), text2, 'TESTING', ['multiple'])
    loreentry.keyRelative = true
    loreentry.contextConfig.insertionPosition = 99
    loreentry.contextConfig.insertionType = SeparationType.NewLine
    loreentry.contextConfig.suffix = ''

    const story = new StoryContainer()
    story.content.story = new Story()
    story.content.settings.prefix = NoModule
    story.content.story.append('ai' as DataOrigin, text1)
    story.content.lorebook.entries.push(loreentry)
    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        1024,
        true,
        story.content.getStoryText().length,
        tokenizer
    )
    expect(context.output).toStrictEqual(
        'This\n Has\n Some multiple\n Sentences\n Another one\n Inserted After'
    )
})

test('shunted below', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
    }

    const text1 = 'one. two. four.'
    const text2 = ' three.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. four. three.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('shunted above', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 1,
        maximumTrimType: SeparationType.Token,
    }

    const text1 = 'one. two. four.'
    const text2 = 'three. '

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('three. one. two. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('insertion allowed', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
    }

    const text1 = 'one. two. four.'
    const text2 = 'three. '

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('insertion disallowed', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
    }

    const text1 = 'one. two. four.'
    const text2 = ' three.'

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. four. three.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('insertion allowed B', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
        allowInsertionInside: true,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
    }

    const text1 = 'one. two. four.'
    const text2 = 'three. '

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('insertion allowed C', async () => {
    const config1: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 1,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Token,
        insertionPosition: 0,
        maximumTrimType: SeparationType.Token,
    }

    const config2: ContextFieldConfig = {
        prefix: '',
        suffix: '',
        tokenBudget: 20,
        reservedTokens: 0,
        budgetPriority: 0,
        trimDirection: TrimDirection.TrimBottom,
        insertionType: SeparationType.Sentence,
        insertionPosition: 2,
        maximumTrimType: SeparationType.Token,
        allowInnerInsertion: true,
    }

    const text1 = 'one. two. four.'
    const text2 = 'three. '

    const story = new StoryContainer()
    story.content.settings.prefix = NoModule
    story.content.context = [new ContextEntry(config1, text1), new ContextEntry(config2, text2)]

    const context = await buildContext(
        story.content,
        new EventHandler(story.content, story.metadata),
        10,
        false,
        0,
        tokenizer
    )
    expect(context.output).toStrictEqual('one. two. three. four.')
    expect(context.output).toStrictEqual(context.structuredOutput.map((o) => o.text).join(''))
})

test('split sentence', async () => {
    const sentences = splitSentences('This is a sentence. This is too. Oh look, a third one!')
    expect(sentences.length).toStrictEqual(3)
    expect(sentences[0]).toStrictEqual('This is a sentence. ')
    expect(sentences[1]).toStrictEqual('This is too. ')
    expect(sentences[2]).toStrictEqual('Oh look, a third one!')
})

test('split sentence (various punctuation)', async () => {
    const sentences = splitSentences('This is a sentence? This is too... Oh look, a third one!')
    expect(sentences.length).toStrictEqual(3)
    expect(sentences[0]).toStrictEqual('This is a sentence? ')
    expect(sentences[1]).toStrictEqual('This is too... ')
    expect(sentences[2]).toStrictEqual('Oh look, a third one!')
})

test('split sentence (newlines)', async () => {
    const sentences = splitSentences('This is a sentence.\nThis is too\nOh look, a third one!')
    expect(sentences.length).toStrictEqual(3)
    expect(sentences[0]).toStrictEqual('This is a sentence.\n')
    expect(sentences[1]).toStrictEqual('This is too\n')
    expect(sentences[2]).toStrictEqual('Oh look, a third one!')
})

test('split sentences (common titles)', async () => {
    const sentences = splitSentences(
        'Mr. & Mrs. Smith should be judged harshly for their crimes. Dr. Anderson Esq. as well.'
    )
    expect(sentences.length).toStrictEqual(2)
    expect(sentences[0]).toStrictEqual('Mr. & Mrs. Smith should be judged harshly for their crimes. ')
    expect(sentences[1]).toStrictEqual('Dr. Anderson Esq. as well.')
})

test('split sentences (bracket handling)', async () => {
    const sentences = splitSentences(
        "This is a sentence.\n[ People commonly bracket things like this. ]\nIt would be best if that didn't cause problems."
    )
    expect(sentences.length).toStrictEqual(3)
    expect(sentences[0]).toStrictEqual('This is a sentence.\n')
    expect(sentences[1]).toStrictEqual('[ People commonly bracket things like this. ]\n')
    expect(sentences[2]).toStrictEqual("It would be best if that didn't cause problems.")
})

test('split sentences (abbreviation handling)', async () => {
    const sentences = splitSentences('I put the C.D. into the disc tray. After turning on the T.V.')
    expect(sentences.length).toStrictEqual(2)
    expect(sentences[0]).toStrictEqual('I put the C.D. into the disc tray. ')
    expect(sentences[1]).toStrictEqual('After turning on the T.V.')
})

test('split sentences (abbreviation, alt punctuation)', async () => {
    const sentences = splitSentences('I took the C.D! After turning on the T.V.')
    expect(sentences.length).toStrictEqual(2)
    expect(sentences[0]).toStrictEqual('I took the C.D! ')
    expect(sentences[1]).toStrictEqual('After turning on the T.V.')
})

test('split sentences (abbreviation, newline)', async () => {
    const sentences = splitSentences('I took the C.D.\n After turning on the T.V.')
    expect(sentences.length).toStrictEqual(2)
    expect(sentences[0]).toStrictEqual('I took the C.D.\n ')
    expect(sentences[1]).toStrictEqual('After turning on the T.V.')
})

test('split sentences (abbreviation, known fail case)', async () => {
    const sentences = splitSentences('I took the C.D. After turning on the T.V.')
    expect(sentences.length).toStrictEqual(1)
    expect(sentences[0]).toStrictEqual('I took the C.D. After turning on the T.V.')
})

test('split sentences (quotes)', async () => {
    const sentences = splitSentences(
        '"I\'ve made a breakthrough. This C.D contains incriminating evidence," he said. "I can\'t believe Dr. Smith such a thing!"'
    )
    expect(sentences.length).toStrictEqual(2)
    expect(sentences[0]).toStrictEqual(
        '"I\'ve made a breakthrough. This C.D contains incriminating evidence," he said. '
    )
    expect(sentences[1]).toStrictEqual('"I can\'t believe Dr. Smith such a thing!"')
})

test('split sentences (non-closed quote)', async () => {
    const sentences = splitSentences(
        '"I\'ve made a breakthrough. This C.D contains incriminating evidence\n"I can\'t believe Dr. Smith such a thing!"'
    )
    expect(sentences.length).toStrictEqual(2)
    expect(sentences[0]).toStrictEqual(
        '"I\'ve made a breakthrough. This C.D contains incriminating evidence\n'
    )
    expect(sentences[1]).toStrictEqual('"I can\'t believe Dr. Smith such a thing!"')
})
