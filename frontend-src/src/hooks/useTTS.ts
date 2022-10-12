import { useRecoilCallback } from 'recoil'
import { speakTTS, stopTTS } from '../components/controls/tts'
import { getUserSetting, TTSModel, TTSType } from '../data/user/settings'
import { Session } from '../globals/state'
import { downloadFile } from '../util/browser'
import { hasStreamedTTSAccess } from '../util/subscription'
import { createTTSRequest, TTSVoices } from '../util/tts'

export default function useTTS(): {
    speak: (text: string) => Promise<void>
    download: (text: string, onStart?: () => void) => Promise<void>
} {
    const speak = useRecoilCallback(({ snapshot }) => async (text: string) => {
        const session = await snapshot.getPromise(Session)
        let type = getUserSetting(session.settings, 'ttsType')
        if (type === TTSType.Off) {
            type = hasStreamedTTSAccess(session) ? TTSType.Streamed : TTSType.Local
        }
        return new Promise<void>((resolve, reject) => {
            stopTTS()
            speakTTS(type, session, text, {
                error: reject,
            })
                .then(() => resolve())
                .catch(reject)
        })
    })
    const download = useRecoilCallback(({ snapshot }) => async (text: string, onStart?: () => void) => {
        if (text.length > 1000) {
            throw 'TTS download limited to at most 1000 characters. Please select a smaller amount of text and try again.'
        }
        const session = await snapshot.getPromise(Session)
        let type = getUserSetting(session.settings, 'ttsType')
        if (type === TTSType.Off) {
            type = hasStreamedTTSAccess(session) ? TTSType.Streamed : TTSType.Local
        }
        if (type !== TTSType.Streamed) {
            throw 'Cannot download non-streamed TTS'
        }
        onStart?.call(onStart)
        return new Promise<void>((resolve, reject) => {
            const sid = getUserSetting(session.settings, 'sid')
            const model = getUserSetting(session.settings, 'ttsModel')
            createTTSRequest(
                model,
                text ? text.slice(0, 1000) : 'This is Novel AI, the GPT-powered AI Storyteller.',
                model === TTSModel.v1 ? sid : -1,
                false,
                session.auth_token,
                getUserSetting(session.settings, 'ttsModel') === TTSModel.v2
                    ? getUserSetting(session.settings, 'ttsV2Seed')
                    : getUserSetting(session.settings, 'ttsSeed')
            )
                .then((response) => {
                    if (response.status !== 200) {
                        response
                            .json()
                            .then((json) => reject('TTS Error: ' + json?.message))
                            .catch((error) => reject('TTS Error: ' + (error?.message ?? error)))
                        return
                    }
                    response
                        .arrayBuffer()
                        .then((data) => {
                            if (model === TTSModel.v2) {
                                downloadFile(
                                    new Uint8Array(data),
                                    `NovelAI_TTS2-${
                                        'seed.' + (getUserSetting(session.settings, 'ttsV2Seed') ?? '')
                                    }.${text.length > 20 ? text.slice(0, 20) + '…' : text}.mp3`,
                                    'audio/mpeg'
                                )
                            } else {
                                downloadFile(
                                    new Uint8Array(data),
                                    `NovelAI_TTS-${
                                        sid !== -1
                                            ? TTSVoices.find((v) => v.sid === sid)?.name
                                            : 'seed.' + (getUserSetting(session.settings, 'ttsSeed') ?? '')
                                    }.${text.length > 20 ? text.slice(0, 20) + '…' : text}.mp3`,
                                    'audio/mpeg'
                                )
                            }
                            resolve()
                        })
                        .catch(reject)
                })
                .catch(reject)
        })
    })
    return { speak, download }
}
