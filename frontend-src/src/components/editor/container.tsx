import { Fragment, MutableRefObject, useCallback, useEffect, useRef } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import { Action } from 'typescript-fsa'

import { StoryContent, StoryMetadata } from '../../data/story/storycontainer'
import {
    GenerationRequestActive,
    InputModes,
    IPLimitModal,
    SelectedInputMode,
    SessionValue,
    StoryUpdate,
    SubscriptionDialogOpen,
    TrialUsedModal,
} from '../../globals/state'
import { logDebug, logWarning } from '../../util/browser'
import { Document } from '../../data/document/document'
import { GenerateError, GenerateErrorType, RequestWrapper, useGenerate } from '../../hooks/useGenerate'
import { useLogout } from '../../hooks/useLogout'
import { EventHandler } from '../../data/event/eventhandling'
import { LogProbs } from '../../data/request/remoterequest'
import { LoadingBar } from '../../styles/components/conversation'
import CommentDisplay from '../comment'
import { getUserSetting, UserSettings } from '../../data/user/settings'
import { trimBrokenUnicode } from '../../data/ai/processresponse'
import { transparentize } from '../../util/colour'
import { eventBus } from '../../globals/events'

import { SectionType } from '../../data/document/section'
import { keyMatches } from '../../data/ai/context'
import { LoreEntry } from '../../data/ai/loreentry'
import { Editor, EditorHandle, EditorId, EditorSelection } from './editor'
import { EditorControls, EditorControlsHandle } from './controls'
import EditorTitle from './title'
import { EditorToolbox, EditorToolboxHandle } from './toolbox'
import { createEditorEvent, EditorEvent, EditorEventType } from './events'
import { EditorMenu, EditorMenuHandle } from './menu'
import { schema } from './schema'

interface EditorContainerProps {
    story: StoryContent
    meta: StoryMetadata
    menuVisible: boolean
    infoVisible: boolean
}
export default function EditorContainer({
    story,
    meta,
    menuVisible,
    infoVisible,
}: EditorContainerProps): JSX.Element {
    const editorRef = useRef<EditorHandle>(null)
    const controlsRef = useRef<EditorControlsHandle>(null)
    const toolboxRef = useRef<EditorToolboxHandle>(null)
    const menuRef = useRef<EditorMenuHandle>(null)
    const blockedRef = useRef(false)
    const didGenerateRef = useRef(0)

    const relayDocumentChange = useRecoilCallback(
        ({ set }) =>
            () => {
                meta.textPreview = story.getStoryText().slice(0, 250)
                set(StoryUpdate(meta.id), meta.save())
            },
        [meta, story]
    )

    const updateState = useCallback(
        (document: Document) => {
            if (controlsRef.current)
                controlsRef.current.state = {
                    blocked: blockedRef.current,
                    canUndo: document.canPopHistory(),
                    canRedo: document.canDescendHistory(),
                    canRetry: document.canPopHistory() && didGenerateRef.current > 0,
                    branches: [...document.getDescendents()].map((id) => ({
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        node: document.getDescendent(id)!,
                        preferred: document.getHistoryNode().route === id,
                    })),
                }
            if (editorRef.current)
                editorRef.current.state = {
                    blocked: blockedRef.current,
                    baseMark: story.didGenerate ? schema.marks.user_text : schema.marks.prompt_text,
                }
        },
        [story.didGenerate]
    )

    const updateLinks = useRecoilCallback(
        ({ snapshot }) =>
            async (document: Document) => {
                const settings = (await snapshot.getPromise(SessionValue('settings'))) as UserSettings
                if (settings.editorLoreKeys) {
                    let nonDisabledEntries = [] as LoreEntry[]
                    const disabledCategories = new Set()
                    for (const category of story.lorebook.categories) {
                        if (!category.enabled) {
                            disabledCategories.add(category.id)
                        }
                    }
                    for (const entry of story.lorebook.entries) {
                        if (!disabledCategories.has(entry.category)) {
                            nonDisabledEntries.push(entry)
                        }
                    }
                    const links = new Map()
                    let considered = 0
                    for (const { id, section } of document.withPushedHistory().getSections().reverse()) {
                        if (considered > 10000) break
                        if (section.type !== SectionType.text) continue
                        const text = section.text
                        const keys = keyMatches(text, nonDisabledEntries, false)
                        const active = [...keys.values()].filter(
                            ({ length, index, entry }) => length > 1 && index + considered < entry.searchRange
                        )
                        const activeIds = new Set(active.map((active) => active.entry.id))
                        nonDisabledEntries = nonDisabledEntries.filter((entry) => !activeIds.has(entry.id))
                        if (active.length > 0) {
                            links.set(
                                id,
                                active.map(({ index, length }) => [index, length])
                            )
                        }
                        considered += text.length
                    }
                    editorRef.current?.link(links)
                } else {
                    editorRef.current?.link()
                }
            },
        [story]
    )

    useEffect(() => {
        if (story.document) {
            updateState(story.document)
        }
    }, [story.document, updateLinks, updateState])

    const handleEvent = useCallback(
        (event: EditorEvent) => {
            if (!story.document) return
            switch (event.type) {
                case EditorEventType.load: {
                    didGenerateRef.current = 0
                    break
                }
                case EditorEventType.decorate: {
                    updateLinks(story.document)
                    break
                }
            }
        },
        [story, updateLinks]
    )
    useEffect(() => {
        const sub = eventBus.listenQueueing(createEditorEvent.match, (event: Action<EditorEvent>) => {
            handleEvent(event.payload)
        })
        return () => sub.unsubscribe()
    }, [handleEvent])

    const onReload = (document: Document, editorId: EditorId) => {
        if (meta.id !== editorId) {
            logWarning('documentChange handler mismatch')
            return
        }
        updateLinks(document)
    }

    const documentChangeShortTimeoutRef = useRef(0)
    const documentChangeLongTimeoutRef = useRef(0)
    const onDocumentChange = (document: Document, editorId: EditorId) => {
        didGenerateRef.current -= 1
        if (meta.id !== editorId) {
            logWarning('documentChange handler mismatch')
            return
        }
        clearTimeout(documentChangeShortTimeoutRef.current)
        clearTimeout(documentChangeLongTimeoutRef.current)
        documentChangeShortTimeoutRef.current = setTimeout(() => {
            if (controlsRef.current)
                controlsRef.current.state = {
                    blocked: blockedRef.current,
                    canUndo: document.canPopHistory(),
                    canRedo: document.canDescendHistory(),
                    canRetry: document.canPopHistory() && didGenerateRef.current > 0,
                    branches: [...document.getDescendents()].map((id) => ({
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        node: document.getDescendent(id)!,
                        preferred: document.getHistoryNode().route === id,
                    })),
                }
        }, 50) as unknown as number
        documentChangeLongTimeoutRef.current = setTimeout(() => {
            updateLinks(document)
            relayDocumentChange()
        }, 500) as unknown as number
    }

    const selectionChangeTimeoutRef = useRef(0)
    const onSelectionChange = (selection: EditorSelection, editorId: EditorId) => {
        if (meta.id !== editorId) {
            logWarning('documentChange handler mismatch')
            return
        }
        clearTimeout(selectionChangeTimeoutRef.current)
        if (toolboxRef.current && selection.from === selection.to) {
            toolboxRef.current.state = {
                visible: false,
                position: {
                    left: selection.left,
                    right: selection.right,
                    top: selection.top,
                    bottom: selection.bottom,
                },
                meta: selection.meta,
            }
        } else {
            if (toolboxRef.current) {
                toolboxRef.current.state = {
                    visible: toolboxRef.current.state.visible,
                    position: {
                        left: selection.left,
                        right: selection.right,
                        top: selection.top,
                        bottom: selection.bottom,
                    },
                    meta: selection.meta,
                }
            }
            selectionChangeTimeoutRef.current = setTimeout(() => {
                if (toolboxRef.current) {
                    toolboxRef.current.state = {
                        visible: true,
                        position: {
                            left: selection.left,
                            right: selection.right,
                            top: selection.top,
                            bottom: selection.bottom,
                        },
                        meta: selection.meta,
                    }
                }
            }, 200) as unknown as number
        }
    }

    const logout = useLogout()

    const onResponseRef = useRef(null) as MutableRefObject<null | ((response: string) => void)>
    const onRequest: RequestWrapper = useRecoilCallback(
        ({ snapshot }) =>
            async (
                story,
                request,
                startIndex,
                endIndex,
                onGenerationComplete,
                onGenerationError,
                onGenerationUpdate,
                context
            ) => {
                const settings = (await snapshot.getPromise(SessionValue('settings'))) as UserSettings
                let combinedResponse = ''
                let currentResponse = ''
                let currentIndex = 0
                const combinedTokens: number[][] = []
                const logprobsArr: LogProbs[][] = []
                const receivedTokens: { token: string; final: boolean }[] = []
                let finalAdded = false
                const shouldComment = story.getStoryText().length - endIndex < 100
                await new Promise((resolve, reject) => {
                    if (getUserSetting(settings, 'streamResponses')) {
                        request.requestStream(
                            async (token, index, final, tokenArr, logProbs) => {
                                if (finalAdded) return false
                                combinedTokens[index] = tokenArr
                                if (logProbs) logprobsArr[index] = logProbs
                                receivedTokens[index] = { token, final }
                                for (let i = currentIndex; i < receivedTokens.length; i++) {
                                    const element = receivedTokens[i]
                                    if (element !== undefined) {
                                        currentIndex++
                                        const replaced = element.token.replace(/\r/g, '')
                                        currentResponse += replaced
                                        finalAdded = element.final
                                    } else {
                                        break
                                    }
                                }
                                if (
                                    index === 0 &&
                                    context.spacesTrimmed > 0 &&
                                    currentResponse.startsWith(' ')
                                ) {
                                    currentResponse = currentResponse.replace(/^\s+/g, '')
                                }
                                if (final && context.preContextText[endIndex - 1] === ' ') {
                                    currentResponse += ' '
                                }
                                if (currentResponse !== '') {
                                    onResponseRef.current?.call(onResponseRef, currentResponse)
                                    combinedResponse += currentResponse
                                    currentResponse = ''
                                }
                                if (finalAdded) {
                                    setTimeout(() => {
                                        onGenerationComplete(
                                            combinedResponse,
                                            combinedTokens.flat(),
                                            logprobsArr.flat(),
                                            shouldComment
                                        )
                                        resolve(null)
                                    }, 20)
                                    return false
                                }
                                const resume = await onGenerationUpdate()
                                return resume
                            },
                            (error) => {
                                onGenerationError(error)
                                reject(null)
                            }
                        )
                    } else {
                        request
                            .request()
                            .then((response) => {
                                if (!response?.text) {
                                    onGenerationError({ status: response.status, message: response.error })
                                    reject(null)
                                    return
                                }
                                currentResponse = response.text.replace(/\r/g, '')
                                currentResponse = trimBrokenUnicode(currentResponse)
                                if (context.spacesTrimmed > 0 && currentResponse.startsWith(' ')) {
                                    currentResponse = currentResponse.replace(/^\s+/g, '')
                                }
                                if (context.preContextText[endIndex - 1] === ' ') {
                                    currentResponse += ' '
                                }
                                onResponseRef.current?.call(onResponseRef, currentResponse)
                                onGenerationComplete(
                                    currentResponse,
                                    response.tokens ?? [],
                                    response.logprobs,
                                    shouldComment
                                )
                                resolve(null)
                            })
                            .catch((error) => {
                                onGenerationError(error)
                                reject(null)
                            })
                    }
                })
            },
        []
    )
    const onError = useRecoilCallback(
        ({ set }) =>
            (error: GenerateError) => {
                blockedRef.current = false
                switch (error.type) {
                    case GenerateErrorType.generic: {
                        toast(error.message)
                        break
                    }
                    case GenerateErrorType.requestFailed: {
                        toast(error.message)
                        break
                    }
                    case GenerateErrorType.modelUnavailable: {
                        toast(
                            <>
                                Selected model <Emphasis>{error.model}</Emphasis> is not available at your
                                current subscription tier. <br /> The selected model has been changed to{' '}
                                <Emphasis>{error.changedTo}</Emphasis>. Your settings have not been changed
                                and may need to be adjusted.
                            </>
                        )
                        break
                    }
                    case GenerateErrorType.contextSetup: {
                        toast(
                            <>
                                Bottom of context is not story text.
                                <br /> This is likely caused by altered context settings and will cause
                                generations to be disconnected from the current narrative.
                            </>
                        )
                        break
                    }
                    case GenerateErrorType.trialUsed: {
                        set(TrialUsedModal, true)
                        break
                    }
                    case GenerateErrorType.freeLimitReached: {
                        set(IPLimitModal, true)
                        break
                    }
                    case GenerateErrorType.noSubscription: {
                        set(SubscriptionDialogOpen, { open: true, blocked: false })
                        break
                    }
                    case GenerateErrorType.unauthorized: {
                        logout()
                        break
                    }
                }
            },
        []
    )
    const generate = useGenerate({
        onRequest,
        onError,
    })
    const onRequestGeneration = useRecoilCallback(
        ({ snapshot }) =>
            async (onResponse: (text: string) => void, text: string, start?: number, end?: number) => {
                if (blockedRef.current) return

                blockedRef.current = true
                if (story.document) updateState(story.document)

                onResponseRef.current = onResponse

                const inputMode = await snapshot.getPromise(SelectedInputMode)
                const inputModes = await snapshot.getPromise(InputModes)
                const eventHandler = new EventHandler(story, meta, inputMode, inputModes)

                logDebug('generation request', text, text.length, start, end)
                await generate(text, meta, story, eventHandler, start, end).finally(() => {
                    blockedRef.current = false
                    didGenerateRef.current = 2
                    story.didGenerate = true
                    if (story.document) updateState(story.document)
                })
            },
        [meta, story]
    )

    if (!story.document)
        return <EditorContainerWrapper className="conversation-container">No Document</EditorContainerWrapper>
    return (
        <EditorContainerWrapper className="conversation-container">
            <EditorTitle infoVisible={infoVisible} menuVisible={menuVisible} />
            <div
                className="tts-controls"
                style={{
                    position: 'relative',
                    width: '100%',
                    flex: '1 1 100%',
                    minHeight: '200px',
                }}
            >
                <EditorElement
                    ref={editorRef}
                    className={'conversation-main'}
                    editorId={meta.id}
                    document={story.document}
                    onDocumentChange={onDocumentChange}
                    onSelectionChange={onSelectionChange}
                    onReload={onReload}
                    onRequestGeneration={onRequestGeneration}
                />
            </div>

            <EditorToolbox ref={toolboxRef} editorRef={editorRef} menuRef={menuRef} />
            <EditorMenu ref={menuRef} editorRef={editorRef} toolboxRef={toolboxRef} />
            <LoadingIndicator />
            <CommentDisplay />
            <EditorControls ref={controlsRef} editorRef={editorRef} />
            <EditorStateUpdater
                onGenerationRequestActive={(active) => {
                    blockedRef.current = active
                    if (story.document) updateState(story.document)
                }}
            />
        </EditorContainerWrapper>
    )
}

function LoadingIndicator() {
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    return <LoadingBar visible={generationRequestActive} className="loading-bar" />
}

interface EditorStateUpdaterProps {
    onGenerationRequestActive: (active: boolean) => void
}
function EditorStateUpdater({ onGenerationRequestActive }: EditorStateUpdaterProps) {
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    useEffect(() => {
        onGenerationRequestActive(generationRequestActive)
    }, [generationRequestActive, onGenerationRequestActive])
    return <Fragment />
}

const EditorElement = styled(Editor)`
    display: block;
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    width: 100%;
    height: 100%;
    *::selection {
        background: ${(props) => transparentize(0.5, props.theme.colors.textHeadingsOptions[0])};
    }
`
const EditorContainerWrapper = styled.div`
    height: 100%;
    width: 100%;
    flex: 1 1 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
`
const Emphasis = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
`
