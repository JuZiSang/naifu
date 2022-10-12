import { test, expect } from '@jest/globals'

import { StoryInputEvent, EventHandler } from '../../event/eventhandling'
import { StoryMetadata, StoryContent } from '../storycontainer'
import { DefaultInputModes } from '../defaultinputmodes'

test('default', async () => {
    const inputText = 'run away'
    const expected = '> You run away.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Strip "You" opening', async () => {
    const inputText = 'You run away.'
    const expected = '> You run away.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Strip "> You" opening', async () => {
    const inputText = '> You run away.'
    const expected = '> You run away.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Strip "you" opening', async () => {
    const inputText = 'you run away.'
    const expected = '> You run away.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Strip "> you" opening', async () => {
    const inputText = 'you run away.'
    const expected = '> You run away.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "I" to "You"', async () => {
    const inputText = 'I run away'
    const expected = '> You run away.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "i" to "You"', async () => {
    const inputText = 'i run away'
    const expected = '> You run away.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "I" to "you"', async () => {
    const inputText = 'I run away from I'
    const expected = '> You run away from you.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "i" to "you"', async () => {
    const inputText = 'i run away from i'
    const expected = '> You run away from you.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "Me" to "You"', async () => {
    const inputText = 'I run away from Me'
    const expected = '> You run away from You.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "me" to "You"', async () => {
    const inputText = 'i run away from me'
    const expected = '> You run away from you.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "My" to "Your"', async () => {
    const inputText = 'I run away from My cat'
    const expected = '> You run away from Your cat.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "my" to "your"', async () => {
    const inputText = 'i run away from my cat'
    const expected = '> You run away from your cat.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "Mine" to "Yours"', async () => {
    const inputText = 'I run away from Mine'
    const expected = '> You run away from Yours.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "mine" to "yours"', async () => {
    const inputText = 'i run away from mine'
    const expected = '> You run away from yours.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "Myself" to "Yourself"', async () => {
    const inputText = 'I face Myself'
    const expected = '> You face Yourself.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "myself" to "yourself"', async () => {
    const inputText = 'I face myself'
    const expected = '> You face yourself.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "Myself" to "Yourself"', async () => {
    const inputText = 'I face Myself'
    const expected = '> You face Yourself.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "I am" to "You are"', async () => {
    const inputText = 'I am great'
    const expected = '> You are great.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "i am" to "You are"', async () => {
    const inputText = 'i am great'
    const expected = '> You are great.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "I\'m" to "You\'re"', async () => {
    const inputText = "I'm great"
    const expected = "> You're great.\n"
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "i\'m" to "You\'re"', async () => {
    const inputText = "i'm great"
    const expected = "> You're great.\n"
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "I’m" to "You’re"', async () => {
    const inputText = 'I’m great'
    const expected = '> You’re great.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "i’m" to "You’re"', async () => {
    const inputText = 'i’m great'
    const expected = '> You’re great.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "I\'d" to "You\'d"', async () => {
    const inputText = "I'd leave"
    const expected = "> You'd leave.\n"
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "i\'d" to "You\'d"', async () => {
    const inputText = "i'd leave"
    const expected = "> You'd leave.\n"
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "I’d" to "You’d"', async () => {
    const inputText = 'I’d leave'
    const expected = '> You’d leave.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Convert "i’d" to "You’d"', async () => {
    const inputText = 'i’d leave'
    const expected = '> You’d leave.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Ignore dialog "', async () => {
    const inputText = 'I say "This is absurd." I leave.'
    const expected = '> You say "This is absurd." You leave.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Ignore dialog “”', async () => {
    const inputText = 'I say “This is absurd.” I leave.'
    const expected = '> You say “This is absurd.” You leave.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Capitalize after dialog sentence "', async () => {
    const inputText = 'I say "This is absurd." I leave.'
    const expected = '> You say "This is absurd." You leave.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Capitalize after dialog sentence “”', async () => {
    const inputText = 'I say “This is absurd.” i leave.'
    const expected = '> You say “This is absurd.” You leave.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Mass conversion', async () => {
    const inputText = 'Me I Mine Myself "Some dialog" I\'d I\'m "More Dialog." I\'ve Myself I am'
    const expected =
        '> You you Yours Yourself "Some dialog" you\'d you\'re "More Dialog." You\'ve Yourself you are.\n'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Contractions', async () => {
    const inputText = "I'd I've I'm I'm I'm I'm I'm I'll I'll I'll I'll I'll"
    const expected = "> You'd you've you're you're you're you're you're you'll you'll you'll you'll you'll.\n"
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})

test('Continuation character', async () => {
    const inputText = 'leave*'
    const expected = '> You leave'
    const eventHandler = new EventHandler(
        new StoryContent(),
        new StoryMetadata(),
        DefaultInputModes[0],
        DefaultInputModes
    )
    const result = eventHandler.handleEvent(new StoryInputEvent('', inputText, true))
    expect(result.event.inputText).toStrictEqual(expected)
})
