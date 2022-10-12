import { v4 as uuid } from 'uuid'
import { logError } from '../util/browser'
import Encoder, { ClipEncoder, EncoderType, loadEncoder } from './encoder'
import { getTokenizerExtraTokens, getTokenizerFileUrl } from './util'

const GlobalEncoders = new Map<EncoderType, Encoder | ClipEncoder>()

export async function prepareGlobalEncoder(tokenizer: EncoderType): Promise<void> {
    const encoder = GlobalEncoders.get(tokenizer)
    if (!encoder) {
        const newEncoder = await loadEncoder(
            getTokenizerFileUrl(tokenizer),
            getTokenizerExtraTokens(tokenizer)
        )
        GlobalEncoders.set(tokenizer, newEncoder)
    }
}

export function getGlobalEncoder(tokenizer: EncoderType): Encoder | ClipEncoder {
    const encoder = GlobalEncoders.get(tokenizer)
    if (!encoder) throw 'GlobalEncoder called without prepare being called'
    return encoder
}

class WorkerError extends Error {
    constructor(error: any) {
        super(`worker error: ${error}`)
    }
}

let worker: Worker | undefined

export class WorkerInterface {
    constructor() {
        if (!worker) {
            worker = new Worker(new URL('worker', import.meta.url))
            worker.addEventListener('messageerror', function (error) {
                logError(new WorkerError(error))
            })
        }
    }

    private postMessage(
        message: any,
        timeout: number = 20000,
        errorMessage: string = 'Worker Timeout'
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = uuid()
            const timeoutid = setTimeout(() => reject(errorMessage), timeout)
            const listener = ({ data }: MessageEvent) => {
                if (data.id === id) {
                    clearTimeout(timeoutid)
                    worker?.removeEventListener('message', listener)
                    if (data.error) {
                        reject(data.error)
                    } else {
                        resolve(data.data)
                    }
                }
            }
            worker?.addEventListener('message', listener)
            worker?.postMessage({
                ...message,
                id,
            })
        })
    }

    encode(text: string, encoderType: EncoderType, timeout: number = 20000): Promise<number[]> {
        return this.postMessage(
            {
                task: 'encode',
                data: text,
                encoderType: encoderType,
            },
            timeout,
            'Encoder Worker Timeout'
        )
    }

    decode(tokens: any[], encoderType: EncoderType, timeout: number = 20000): Promise<string> {
        return this.postMessage(
            {
                task: 'decode',
                data: tokens,
                encoderType: encoderType,
            },
            timeout,
            'Decoder Worker Timeout'
        )
    }
}
