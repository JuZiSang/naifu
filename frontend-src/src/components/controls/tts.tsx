/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable jsx-a11y/media-has-caption */
import { toast } from 'react-toastify'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { IoMdPause, IoMdPlay } from 'react-icons/io'
import { ImStop2 } from 'react-icons/im'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { User } from '../../data/user/user'
import { getUserSetting, TTSModel, TTSType } from '../../data/user/settings'
import { Session, TTSState } from '../../globals/state'
import { ScreenReader } from '../../styles/mixins'
import { Button } from '../../styles/ui/button'
import { createObjectURL, logDebug, logError } from '../../util/browser'
import { isIOS } from '../../util/compat'
import { getSessionStorage, setSessionStorage } from '../../util/storage'
import { hasStreamedTTSAccess } from '../../util/subscription'
import {
    blobSrc,
    createBlobAudioElement,
    createMediaSourceAudioElement,
    createTTSRequest,
    getDefaultTTS,
    isAndroid,
    isTTSAvailable,
    playAudio,
} from '../../util/tts'
import { splitSentences } from '../../data/ai/context'

const HiddenDiv = styled.div`
    visibility: hidden;
    ${ScreenReader}
`

export default function TTSPlayer(): JSX.Element {
    return (
        <HiddenDiv aria-hidden="true">
            <audio id="tts" autoPlay={true} />
        </HiddenDiv>
    )
}

let currentListener: () => void
let audioStringQueue: { text: string; seed?: string }[] = []
let audioQueue: HTMLAudioElement[] = []
let audioBlobQueue: Blob[] = []
const cantPlayAudioErrorMessage =
    'Could not play TTS audio. Please check that audio is not blocked by your browser and try again.'

export let pauseTTS: (type: TTSType) => void = () => {
    // do nothing
}
export let stopTTS: () => void = () => {
    // do nothing
}
export let speakTTS: (
    type: TTSType,
    session: User,
    text: string,
    options: {
        retry?: boolean
        voice?: SpeechSynthesisVoice
        comment?: boolean
        callback?: () => void
        error?: (error: string) => void
        seed?: string
    }
) => Promise<void> = async () => {
    logDebug('TTS not initialized.')
    // do nothing
}

export function TTSControls(): JSX.Element {
    const session = useRecoilValue(Session)
    const [ttsState, setTtsState] = useRecoilState(TTSState)

    const onTimeUpdate = (event: Event): void => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const audio = event.target as HTMLAudioElement
    }

    async function speakStreamedTTS(
        model: TTSModel,
        text: string,
        auth_token: string,
        sid: number = 17,
        volume: number = 1,
        rate: number = 1,
        seed?: string,
        audioEnd?: () => void,
        error?: (errorMessage: string) => void,
        comment?: boolean
    ): Promise<void> {
        const shouldStart = audioStringQueue.length === 0
        const lines = splitSentences(text) //text.split(/(?=\n)/)
        let carry = ''
        for (const line of lines) {
            if (line === '') continue
            carry += line
            if (carry.length > 1000) {
                //just split it
                while (carry.length > 0) {
                    audioStringQueue.push({ text: carry.slice(0, 500), seed })
                    carry = carry.slice(500)
                }
                carry = ''
            } else if (carry.length > 500) {
                // queue up
                audioStringQueue.push({ text: carry, seed })
                carry = ''
            }
            // not enough characters carry over
        }
        if (carry !== '') audioStringQueue.push({ text: carry, seed })

        const consumeQueue = async (chain: boolean) => {
            if (!audioStringQueue[0]) {
                return
            }

            const currentText = audioStringQueue[0]
            audioStringQueue = audioStringQueue.slice(1)
            const isMediaSource =
                typeof MediaSource !== 'undefined' &&
                (MediaSource.isTypeSupported('audio/webm;codecs="opus"') ||
                    MediaSource.isTypeSupported('audio/mpeg'))
            const isMP3 = isMediaSource && MediaSource.isTypeSupported('audio/mpeg')

            let response
            try {
                response = await createTTSRequest(
                    model,
                    currentText.text,
                    sid,
                    isMediaSource && !isMP3,
                    auth_token,
                    currentText.seed
                )
            } catch (error_: any) {
                if (error) error(`TTS Error: ${error_.message ?? error_}`)
                return
            }
            if (response.status !== 200) {
                const json = await response.json()
                if (error) error(`TTS Error: ${json.message}`)
                return
            }
            const audio = isMediaSource
                ? await createMediaSourceAudioElement(response, isMP3)
                : await createBlobAudioElement(response)
            if (!audio) {
                if (error) error('TTS fetch failed')
                return
            }

            const play = () => {
                audioQueue?.[0]?.play()
                setTtsState({
                    paused: false,
                    stopped: false,
                    commentSpeaking: !!comment,
                })
            }

            audio.volume = volume
            audio.playbackRate = rate

            const end = async () => {
                let playing = false
                audioQueue = audioQueue.slice(1)
                if (audioQueue.length > 0) {
                    try {
                        play()
                        playing = true
                    } catch {
                        if (error) error(cantPlayAudioErrorMessage)
                    }
                }

                if (chain && audioStringQueue.length > 0) {
                    await consumeQueue(chain)
                } else {
                    if (audioEnd) audioEnd()
                    if (!playing)
                        setTtsState({
                            paused: false,
                            stopped: true,
                            commentSpeaking: false,
                        })
                }
            }
            audio.addEventListener('error', end)
            audio.addEventListener('abort', end)
            audio.addEventListener('ended', end)
            audio.addEventListener('timeupdate', onTimeUpdate)

            audioQueue.push(audio)
            if (audioQueue.length === 1) {
                if (audioQueue[0].readyState >= 2) {
                    try {
                        play()
                    } catch {
                        if (error) error(cantPlayAudioErrorMessage)
                    }
                } else {
                    audioQueue[0].addEventListener('canplay', () => {
                        try {
                            play()
                        } catch {
                            if (error) error(cantPlayAudioErrorMessage)
                        }
                    })
                }
            }
        }

        if (shouldStart) {
            await consumeQueue(true)
            setTimeout(() => consumeQueue(true), 200)
        }
    }

    async function speakStreamedTTSiOS(
        model: TTSModel,
        text: string,
        auth_token: string,
        sid: number = 17,
        volume: number = 1,
        rate: number = 1,
        seed?: string,
        audioEnd?: () => void,
        error?: (errorMessage: string) => void,
        comment?: boolean
    ): Promise<void> {
        const shouldStart = audioStringQueue.length === 0
        const lines = text.split(/(?=\n)/)
        let carry = ''
        for (const line of lines) {
            if (line === '') continue
            carry += line
            if (carry.length > 1000) {
                //just split it
                while (carry.length > 0) {
                    audioStringQueue.push({ text: carry.slice(0, 500), seed })
                    carry = carry.slice(500)
                }
                carry = ''
            } else if (carry.length > 300) {
                // queue up
                audioStringQueue.push({ text: carry, seed })
                carry = ''
            }
            // not enough characters carry over
        }
        if (carry !== '') audioStringQueue.push({ text: carry, seed })

        const consumeQueue = async (chain: boolean) => {
            if (!audioStringQueue[0]) {
                return
            }

            const currentText = audioStringQueue[0]
            audioStringQueue = audioStringQueue.slice(1)
            const isMediaSource =
                typeof MediaSource !== 'undefined' &&
                (MediaSource.isTypeSupported('audio/webm;codecs="opus"') ||
                    MediaSource.isTypeSupported('audio/mpeg'))
            const isMP3 = isMediaSource && MediaSource.isTypeSupported('audio/mpeg')

            let response
            try {
                response = await createTTSRequest(
                    model,
                    currentText.text,
                    sid,
                    isMediaSource && !isMP3,
                    auth_token,
                    currentText.seed
                )
            } catch (error_: any) {
                if (error) error(`TTS Error: ${error_.message ?? error_}`)
                return
            }
            if (response.status !== 200) {
                const json = await response.json()
                if (error) error(`TTS Error: ${json.message}`)
                return
            }
            const blob = await blobSrc(response)
            playAudio.volume = volume
            playAudio.playbackRate = rate

            const play = () => {
                playAudio.play()
                setTtsState({
                    paused: false,
                    stopped: false,
                    commentSpeaking: !!comment,
                })
            }

            const end = () => {
                audioBlobQueue = audioBlobQueue.slice(1)
                let playing = false
                if (audioBlobQueue[0]) {
                    playAudio.src = createObjectURL(audioBlobQueue[0])
                    try {
                        play()
                        playing = true
                    } catch {
                        if (error) error(cantPlayAudioErrorMessage)
                    }
                }
                if (chain && audioStringQueue.length > 0) {
                    consumeQueue(chain)
                } else {
                    if (audioEnd) audioEnd()
                    if (!playing)
                        setTtsState({
                            paused: false,
                            stopped: true,
                            commentSpeaking: false,
                        })
                }
            }
            playAudio.removeEventListener('error', currentListener)
            playAudio.removeEventListener('ended', currentListener)
            currentListener = end
            playAudio.addEventListener('error', end)
            playAudio.addEventListener('ended', end)

            audioBlobQueue.push(blob)
            if (audioBlobQueue.length === 1) {
                playAudio.src = createObjectURL(audioBlobQueue[0])
                try {
                    play()
                } catch {
                    if (error) error(cantPlayAudioErrorMessage)
                }
            }
        }

        if (shouldStart) {
            await consumeQueue(true)
        }
    }

    function speakBrowserTTS(
        text: string,
        retry: boolean = true,
        voice?: SpeechSynthesisVoice,
        volume: number = 1,
        rate: number = 1,
        pitch: number = 1
    ): Promise<SpeechSynthesisEvent> {
        return new Promise((resolve, reject) => {
            if (!isTTSAvailable()) return reject(new Error('TTS not available'))
            let interval = 0
            function resume() {
                if (isAndroid) {
                    window.speechSynthesis.resume()
                    setTimeout(resume, 250) as unknown as number
                } else {
                    window.speechSynthesis.pause()
                    window.speechSynthesis.resume()
                    setTimeout(resume, 10000) as unknown as number
                }
            }
            let useVoice = voice ?? null
            if (!voice) {
                const voices = window?.speechSynthesis?.getVoices()
                if (voices.length === 0 && retry) {
                    // the voices aren't always immediatety populated
                    setTimeout(() => speakBrowserTTS(text, false), 500)
                    return
                }
                useVoice = getDefaultTTS(voices)
            }
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'en'
            utterance.voice = useVoice
            utterance.pitch = pitch
            utterance.rate = rate
            utterance.volume = volume
            utterance.onend = (event) => {
                clearTimeout(interval)
                resolve(event)
                setTtsState({
                    paused: false,
                    stopped: true,
                    commentSpeaking: false,
                })
            }
            // eslint-disable-next-line unicorn/prefer-add-event-listener
            utterance.onerror = (error) => {
                clearTimeout(interval)
                logError(error, false)
                reject(error)
                setTtsState({
                    paused: false,
                    stopped: true,
                    commentSpeaking: false,
                })
            }
            setTimeout(() => {
                setTtsState({
                    paused: false,
                    stopped: false,
                    commentSpeaking: false,
                })
                window?.speechSynthesis?.speak(utterance)
                if (useVoice?.name.startsWith('Google')) {
                    interval = setTimeout(resume, isAndroid ? 250 : 10000) as unknown as number
                }
            }, 10)
        })
    }

    function _stopTTS(): void {
        window?.speechSynthesis?.cancel()
        if (audioQueue.length > 0) {
            audioQueue[0].pause()
        }
        audioQueue = []
        audioStringQueue = []
        audioBlobQueue = []
        playAudio.src = ''
        setTtsState({
            paused: false,
            stopped: true,
            commentSpeaking: false,
        })
    }
    stopTTS = _stopTTS

    function _pauseTTS(type: TTSType) {
        const performPause = () => {
            switch (type) {
                case TTSType.Local:
                    if (window?.speechSynthesis) {
                        if (window?.speechSynthesis?.paused) {
                            window?.speechSynthesis?.resume()
                            return true
                        } else {
                            window?.speechSynthesis?.pause()
                            return false
                        }
                    }
                    break
                case TTSType.Off:
                case TTSType.Streamed:
                    if (isIOS) {
                        if (playAudio.paused) {
                            playAudio.play()

                            return true
                        } else {
                            playAudio.pause()
                            return false
                        }
                    } else {
                        if (audioQueue.length > 0) {
                            if (audioQueue[0].paused) {
                                audioQueue[0].play()
                                return true
                            } else {
                                audioQueue[0].pause()
                                return false
                            }
                        }
                    }
            }
        }

        const paused = !performPause()
        setTtsState({
            paused: paused,
            stopped: false,
            commentSpeaking: !paused,
        })
    }
    pauseTTS = _pauseTTS

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function ttsProgress(type: TTSType): number {
        switch (type) {
            case TTSType.Local:
                // Speech synthesis api has no means of determining progress
                return 0
            case TTSType.Off:
            case TTSType.Streamed:
                if (isIOS) {
                    return playAudio.currentTime
                } else {
                    if (audioQueue.length > 0) {
                        return audioQueue[0].currentTime
                    }
                }
        }
        return 0
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function ttsDuration(type: TTSType): number {
        switch (type) {
            case TTSType.Local:
                // Speech synthesis api has no means of determining duration
                return 0
            case TTSType.Off:
            case TTSType.Streamed:
                if (isIOS) {
                    return playAudio.duration
                } else {
                    if (audioQueue.length > 0) {
                        return audioQueue[0].duration
                    }
                }
        }
        return 0
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function isTTSPlaying(type: TTSType): boolean {
        switch (type) {
            case TTSType.Local:
                return !window?.speechSynthesis?.paused
            case TTSType.Off:
            case TTSType.Streamed:
                if (isIOS) {
                    return !playAudio.paused
                }
                return audioQueue.length > 0 && !audioQueue[0].paused
        }
    }

    async function _speakTTS(
        type: TTSType,
        session: User,
        text: string,
        options: {
            retry?: boolean
            voice?: SpeechSynthesisVoice
            comment?: boolean
            callback?: () => void
            error?: (error: string) => void
            seed?: string
        }
    ): Promise<void> {
        if (type === TTSType.Off) {
            type = hasStreamedTTSAccess(session) ? TTSType.Streamed : TTSType.Local
        }
        if (type === TTSType.Streamed && !hasStreamedTTSAccess(session)) {
            if (getSessionStorage('noStreamedWarning') !== 'true') {
                toast(
                    'Streamed TTS is only available for Opus tier subscriptions. Local TTS will be used instead.'
                )
                setSessionStorage('noStreamedWarning', 'true')
            }
            type = TTSType.Local
        }
        switch (type) {
            case TTSType.Local:
                if (isTTSAvailable())
                    await speakBrowserTTS(
                        text,
                        options.retry,
                        options.voice,
                        getUserSetting(session.settings, 'ttsVolume'),
                        getUserSetting(session.settings, 'ttsRate'),
                        getUserSetting(session.settings, 'ttsPitch')
                    )
                        .then(() => {
                            if (options.callback) options.callback()
                        })
                        .catch(() => {
                            if (options.callback) options.callback()
                        })
                break
            case TTSType.Streamed:
                const model = getUserSetting(session.settings, 'ttsModel')
                const sid =
                    getUserSetting(session.settings, 'ttsModel') === TTSModel.v2
                        ? -1
                        : getUserSetting(session.settings, 'sid')
                const volume = getUserSetting(session.settings, 'ttsVolume')
                const rate = getUserSetting(session.settings, 'ttsRateStreamed')
                const seed = options.seed
                    ? options.seed
                    : getUserSetting(session.settings, 'ttsModel') === TTSModel.v2
                    ? options.comment
                        ? getUserSetting(session.settings, 'ttsV2CommentSeed')
                        : getUserSetting(session.settings, 'ttsV2Seed')
                    : getUserSetting(session.settings, 'sid') === -1
                    ? getUserSetting(session.settings, 'ttsSeed')
                    : ''

                await (isIOS
                    ? speakStreamedTTSiOS(
                          model,
                          text,
                          session.auth_token,
                          sid,
                          volume,
                          rate,
                          seed,
                          options.callback,
                          options.error,
                          options.comment
                      )
                    : speakStreamedTTS(
                          model,
                          text,
                          session.auth_token,
                          sid,
                          volume,
                          rate,
                          seed,
                          options.callback,
                          options.error,
                          options.comment
                      ))
                break
        }
    }
    speakTTS = _speakTTS
    const conversationElem = document.querySelector('.tts-controls')

    if (!conversationElem) {
        return <></>
    }

    const controls = (
        <AnimatePresence>
            {!ttsState.stopped && (
                <motion.div
                    key={'tts'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', position: 'absolute', top: 0, right: 0, zIndex: 100 }}
                >
                    <BorderedButton
                        disabled={ttsState.stopped}
                        onClick={() => {
                            if (pauseTTS) pauseTTS(getUserSetting(session.settings, 'ttsType'))
                        }}
                    >
                        {!ttsState.paused ? <IoMdPause /> : <IoMdPlay />}
                    </BorderedButton>
                    <BorderedButton disabled={ttsState.stopped} onClick={stopTTS}>
                        <ImStop2 />
                    </BorderedButton>
                </motion.div>
            )}
        </AnimatePresence>
    )

    return <>{conversationElem && createPortal(controls, conversationElem)}</>
}

const BorderedButton = styled(Button)`
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
    &:first-child {
        border-left: 1px solid ${(props) => props.theme.colors.bg3};
        border-bottom-left-radius: 4px;
    }
`
