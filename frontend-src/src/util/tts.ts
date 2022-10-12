import { TTSModel } from '../data/user/settings'
import { BackendTTSUrl } from '../globals/constants'
import { createObjectURL, logError } from './browser'
import { isSafari } from './compat'
import { fetchWithTimeout } from './general'
import { getLocalStorage, removeLocalStorage, setLocalStorage } from './storage'
import { randomFromArray } from './util'

export function isTTSAvailable(): boolean {
    return typeof SpeechSynthesisUtterance !== 'undefined'
}

export function setDefaultTTS(voice: SpeechSynthesisVoice | null): void {
    if (!voice) removeLocalStorage('ttsName')
    else setLocalStorage('ttsName', voice.name)
}
export function getDefaultTTS(voices: Array<SpeechSynthesisVoice>): null | SpeechSynthesisVoice {
    if (voices.length === 0) return null
    const selectedVoiceName = getLocalStorage('ttsName')
    return (
        voices.find((voice) => voice.name === selectedVoiceName) ??
        voices.find((voice) => voice.lang.startsWith('en') && voice.default) ??
        voices.find((voice) => voice.lang.startsWith('en')) ??
        voices.find((voice) => voice.default) ??
        voices[0]
    )
}

export const TTSVoices = [
    { sid: 17, name: 'Cyllene', category: 'female' },
    { sid: 95, name: 'Leucosia', category: 'female' },
    { sid: 44, name: 'Crina', category: 'female' },
    { sid: 80, name: 'Hespe', category: 'female' },
    { sid: 106, name: 'Ida', category: 'female' },
    { sid: 6, name: 'Alseid', category: 'male' },
    { sid: 10, name: 'Daphnis', category: 'male' },
    { sid: 16, name: 'Echo', category: 'male' },
    { sid: 41, name: 'Thel', category: 'male' },
    { sid: 77, name: 'Nomios', category: 'male' },
    { sid: -1, name: 'Seed Input', category: 'custom' },
]

export const TTSv2Voices = [
    { name: 'Ligeia', category: 'unisex', seed: 'Anananan' },
    { name: 'Aini', category: 'female', seed: 'Aini' },
    { name: 'Orea', category: 'female', seed: 'Orea' },
    { name: 'Claea', category: 'female', seed: 'Claea' },
    { name: 'Lim', category: 'female', seed: 'Lim' },
    { name: 'Aurae', category: 'female', seed: 'Aurae' },
    { name: 'Naia', category: 'female', seed: 'Naia' },
    { name: 'Aulon', category: 'male', seed: 'Aulon' },
    { name: 'Elei', category: 'male', seed: 'Elei' },
    { name: 'Ogma', category: 'male', seed: 'Ogma' },
    { name: 'Raid', category: 'male', seed: 'Raid' },
    { name: 'Pega', category: 'male', seed: 'Pega' },
    { name: 'Lam', category: 'male', seed: 'Lam' },
]

async function fetchStream(url: string, auth_token: string) {
    const request: RequestInit = {
        mode: 'cors',
        cache: 'no-store',
        headers: {
            Authorization: 'Bearer ' + auth_token,
        },
        method: 'GET',
        credentials: 'include',
    }
    if (auth_token === '') {
        delete request.headers
    }
    const response = await fetchWithTimeout(url, request)
    if (!response.ok) {
        logError(response, false)
    }
    return response
}

export async function createMediaSourceAudioElement(
    response: Response,
    isMP3: boolean
): Promise<HTMLAudioElement> {
    const mediaSource = new MediaSource()
    const sourceOpen = async () => {
        if (!response.body) {
            mediaSource.endOfStream()
            return
        }
        const sourceBuffer = mediaSource.addSourceBuffer(isMP3 ? 'audio/mpeg' : 'audio/webm;codecs="opus"')
        if (!sourceBuffer) throw 'failed to create SourceBuffer for MediaSource'
        const reader = response.body.getReader()
        let isDone = false
        let bufferQueue: any[] = []
        sourceBuffer.addEventListener('updateend', () => {
            if (bufferQueue[0]) {
                sourceBuffer.appendBuffer(bufferQueue[0])
                bufferQueue = bufferQueue.slice(1)
            }
        })

        const endStream = () => {
            if (sourceBuffer.updating) {
                setTimeout(endStream, 100)
                return
            }
            mediaSource.endOfStream()
        }

        if (isSafari) {
            // Safari ignores the first thing appended to the buffer so append something empty
            sourceBuffer.appendBuffer(new Uint8Array([0]))
        }

        do {
            const { done, value } = await reader.read()
            isDone = done
            if (value) {
                bufferQueue = [...bufferQueue, value]
                if (!sourceBuffer.updating && value && bufferQueue.length === 1) {
                    sourceBuffer.appendBuffer(bufferQueue[0])
                    bufferQueue = bufferQueue.slice(1)
                }
            }
            if (done) setTimeout(endStream, 100)
        } while (!isDone)

        reader.releaseLock()
    }

    const audio = new Audio()
    audio.src = URL.createObjectURL(mediaSource)
    mediaSource.addEventListener('sourceopen', sourceOpen)

    return audio
}

export async function createBlobAudioElement(response: Response): Promise<HTMLAudioElement | undefined> {
    if (!response.body) {
        return
    }
    const arr = await response.arrayBuffer()

    const audio = new Audio()
    audio.src = createObjectURL(new Blob([arr], { type: 'audio/mpeg' }))
    return audio
}

export async function blobSrc(response: Response): Promise<Blob> {
    if (!response.body) {
        throw 'Error: no body'
    }
    const arr = await response.arrayBuffer()

    return new Blob([arr], { type: 'audio/mpeg' })
}

export function createTTSRequest(
    model: TTSModel,
    text: string,
    sid: number = 17,
    opus: boolean,
    auth_token: string,
    seed?: string
): Promise<Response> {
    return fetchStream(
        `${BackendTTSUrl}?text=${encodeURIComponent(
            text
                .replace(/\*{3}|⁂/g, '\n\n\n')
                .replace(/;/g, ',')
                .replace(/:/g, '.')
                .replace(/—/g, '...')
                .replace(/[“”]/g, '"')
                .replace(/[‘’]/g, "'")
                .replace(/([A-Za-z]+)~/g, '$1{{ipa.ːː}}')
        )}&voice=${sid}${
            sid === -1 ? '&seed=' + (seed ? encodeURIComponent(seed) : 'kurumuz12') : ''
        }&opus=${opus}&version=${model}`,
        auth_token
    )
}

const iosEnableTTS = () => {
    if (!isTTSAvailable()) return
    const temp = new SpeechSynthesisUtterance('')
    temp.volume = 0
    speechSynthesis.speak(temp)
    document.removeEventListener('click', iosEnableTTS)
    window?.speechSynthesis?.cancel()
}
if (typeof global.window?.document !== 'undefined') {
    document.addEventListener('click', iosEnableTTS)
}

export let playAudio: HTMLAudioElement

const enableTTSElement = () => {
    if (playAudio) return
    playAudio = new Audio()
    playAudio.src =
        // eslint-disable-next-line max-len
        'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'
    playAudio.muted = false
    playAudio.play()
    document.removeEventListener('click', enableTTSElement)
}

if (typeof global.window?.document !== 'undefined') {
    window.addEventListener('click', enableTTSElement)
}
export const isAndroid = (function () {
    return /(android)/i.test(navigator.userAgent)
})()

export async function randomTTSSeedPhrase(): Promise<string> {
    // eslint-disable-next-line unicorn/no-await-expression-member
    const words = (await import('../assets/wordlist.json')).default
    const categories = Object.keys(words)
    const maxWords = Math.ceil(Math.random() * 2)
    const spacerSelection = ['_']
    const numberSelection = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    const easterEggSelection = ['smedrins', 'priapus', 'kurumuz']
    let result = ''
    for (let i = 0; i < maxWords; ++i) {
        if (i === 0 || Math.random() > 0.3) {
            // easter-egg
            if (Math.floor(Math.random() * 1420) === 0) {
                result = result + randomFromArray(easterEggSelection)
            } else {
                const collName = randomFromArray(categories)
                const coll = (words as Record<string, any>)[collName]
                result = result + randomFromArray(coll)
            }
        } else {
            const numbers = Math.ceil(Math.random() * 4)
            for (let j = 0; j < numbers; ++j) {
                result = result + randomFromArray(numberSelection)
            }
        }
        if (i < maxWords - 1) {
            result = result + randomFromArray(spacerSelection)
        }
    }
    return result
}
