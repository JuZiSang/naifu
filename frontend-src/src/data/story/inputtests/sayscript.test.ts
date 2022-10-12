import { test, expect } from '@jest/globals'

import { StoryInputEvent, EventHandler } from '../../event/eventhandling'
import { StoryMetadata, StoryContent } from '../storycontainer'
import { DefaultInputModes } from '../defaultinputmodes'

test('default', async () => {
    const inputText = 'help me'
    const expected = '> You say "Help me."\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[1],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('quotes', async () => {
    const inputText = '"please leave"'
    const expected = '> You say "Please leave."\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[1],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('ask', async () => {
    const inputText = 'but why?'
    const expected = '> You ask "But why?"\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[1],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Continuation character', async () => {
    const inputText = 'help me*'
    const expected = '> You say "Help me'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[1],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})
