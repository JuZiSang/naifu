import { test, expect } from '@jest/globals'

import { trimResponse } from './processresponse'

test('trim response', async () => {
    const text = "This is a sentence that stops. And then another starts but doesn't end"
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that stops.')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response multiple periods', async () => {
    const text =
        "This is a sentence that stops. And then another starts and ends. But then another one doesn't"
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual(
        'This is a sentence that stops. And then another starts and ends.'
    )
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response decimal number', async () => {
    const text = 'This is a sentence that stops. And then another starts but contains 3.9'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that stops.')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response title', async () => {
    const text =
        'This is a sentence that stops. And then another that contains several titles Dr. Mr. Ms. Mrs.'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that stops.')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response nothing to trim', async () => {
    const text = 'This is a sentence that stops.'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that stops.')
    expect(trimmedText.wasTrimmed).toStrictEqual(false)
})

test('trim response trim would be too short', async () => {
    const text = 'A sentence. This sentence should not be cut since it is more than 80% of the response'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual(
        'A sentence. This sentence should not be cut since it is more than 80% of the response'
    )
    expect(trimmedText.wasTrimmed).toStrictEqual(false)
})

test('trim response closing parenthesis', async () => {
    const text = 'This is a sentence that (stops). And then another starts'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that (stops).')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing curly brace', async () => {
    const text = 'This is a sentence that {stops}. And then another starts'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that {stops}.')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing square brace', async () => {
    const text = 'This is a sentence that [stops]. And then another starts'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that [stops].')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing quote', async () => {
    const text = "This is a sentence that 'stops'. And then another starts"
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual("This is a sentence that 'stops'.")
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing double quotes', async () => {
    const text = 'This is a sentence that "stops". And then another starts'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that "stops".')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing parenthesis inside', async () => {
    const text = 'This is a sentence that (stops.) And then another starts'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that (stops.)')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing curly brace inside', async () => {
    const text = 'This is a sentence that {stops.} And then another starts'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that {stops.}')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing square brace inside', async () => {
    const text = 'This is a sentence that [stops.] And then another starts'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that [stops.]')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing quote inside', async () => {
    const text = "This is a sentence that 'stops.' And then another starts"
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual("This is a sentence that 'stops.'")
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response closing double quotes inside', async () => {
    const text = 'This is a sentence that "stops." And then another starts'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that "stops."')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response with question mark', async () => {
    const text = "This is a sentence that stops? And then another starts but doesn't end"
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that stops?')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response with exclamation mark', async () => {
    const text = "This is a sentence that stops! And then another starts but doesn't end"
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that stops!')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response with semicolon', async () => {
    const text = "This is a sentence that stops; And then another starts but doesn't end"
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual('This is a sentence that stops;')
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})

test('trim response only period works for title', async () => {
    const text = 'This is a sentence that stops. And then another that contains several titles Dr! Mr? Ms;'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual(
        'This is a sentence that stops. And then another that contains several titles Dr! Mr? Ms;'
    )
    expect(trimmedText.wasTrimmed).toStrictEqual(false)
})

test('trim response only period works for decimal number', async () => {
    const text = 'This is a sentence that stops. And then another starts but contains 3!9'
    const trimmedText = trimResponse(text)
    expect(trimmedText.trimmed).toStrictEqual(
        'This is a sentence that stops. And then another starts but contains 3!'
    )
    expect(trimmedText.wasTrimmed).toStrictEqual(true)
})
