import { test, expect } from '@jest/globals'

import { Story } from '../story/story'

test('edit test1', async () => {
    const story = new Story()
    story.append('prompt' as any, 'test')
    story.edit('teeest')

    expect(story.text).toStrictEqual('teeest')
})

test('edit test2', async () => {
    const story = new Story()
    story.append('prompt' as any, 'teest')
    story.edit('teeeeest')

    expect(story.text).toStrictEqual('teeeeest')
})

test('edit test3', async () => {
    const story = new Story()
    story.append('prompt' as any, 'teest')
    story.edit('tedddeest')

    expect(story.text).toStrictEqual('tedddeest')
})

test('edit test4', async () => {
    const story = new Story()
    story.append('prompt' as any, 'teeeeeeest')
    story.edit('test')

    expect(story.text).toStrictEqual('test')
})
