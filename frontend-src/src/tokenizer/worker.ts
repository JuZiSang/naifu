import Encoder, { ClipEncoder, EncoderType, loadEncoder } from './encoder'
import { getTokenizerExtraTokens, getTokenizerFileUrl } from './util'

const encoders: Map<EncoderType, Promise<Encoder | ClipEncoder>> = new Map()

const getEncoder = async (encoderType: EncoderType) => {
    let encoder = encoders.get(encoderType)
    if (!encoder) {
        encoder = new Promise((resolve, reject) => {
            loadEncoder(getTokenizerFileUrl(encoderType), getTokenizerExtraTokens(encoderType))
                .then(resolve)
                .catch(reject)
        })
    }
    encoders.set(encoderType, encoder)
    return encoder
}

// workaround for typescript lib interaction
// see https://github.com/microsoft/TypeScript/issues/20595
const worker = self as any as Worker

self.addEventListener('message', function ({ data }: MessageEvent) {
    switch (data.task) {
        case 'encode': {
            getEncoder(data.encoderType)
                .then((encoder) => {
                    worker.postMessage({
                        id: data.id,
                        data: encoder.encode(data.data),
                    })
                })
                .catch((error) => {
                    worker.postMessage({
                        id: data.id,
                        error: `Task error: ${error}`,
                    })
                })
            break
        }
        case 'decode': {
            getEncoder(data.encoderType)
                .then((encoder) => {
                    worker.postMessage({
                        id: data.id,
                        data: encoder.decode(data.data),
                    })
                })
                .catch((error) => {
                    worker.postMessage({
                        id: data.id,
                        error: `Task error: ${error}`,
                    })
                })
            break
        }
        default: {
            worker.postMessage({
                id: data.id,
                error: 'Task error: Unknown Task',
            })
        }
    }
})
