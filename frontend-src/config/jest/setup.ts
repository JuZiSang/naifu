import '@testing-library/jest-dom/extend-expect'

import { webcrypto } from 'crypto'
import { TextEncoder, TextDecoder } from 'util'
import { jest } from '@jest/globals'

const globals: any = global

globals.crypto = webcrypto
globals.TextEncoder = TextEncoder
globals.TextDecoder = TextDecoder
if (!globals.window) {
    globals.window = {}
    jest.mock('recoil')
}
if (!globals.document) {
    globals.document = globals.document || {}
    globals.document.documentElement = globals.document.documentElement || {}
    globals.document.documentElement.style = globals.document.documentElement.style || {}
}
