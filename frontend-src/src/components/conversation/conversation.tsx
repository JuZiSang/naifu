import { Fragment, useEffect, useState } from 'react'
import { atom, useRecoilCallback, useRecoilValue, useSetRecoilState } from 'recoil'
import styled, { createGlobalStyle } from 'styled-components'
import { toast } from 'react-toastify'

import {
    GenerationRequestActive,
    GenerationRequestCancelled,
    InputModes,
    IPLimitModal,
    SelectedInputMode,
    SelectedStory,
    SelectedStoryId,
    Session,
    StoryUpdate,
    SubscriptionDialogOpen,
    TrialUsedModal,
} from '../../globals/state'
import { GlobalUserContext } from '../../globals/globals'
import { DataOrigin, StoryMode } from '../../data/story/story'
import { StoryContent, StoryMetadata } from '../../data/story/storycontainer'
import { ConversationContainer, ConversationMain, LoadingBar } from '../../styles/components/conversation'
import { buildEphemeralContext } from '../../data/ai/ephemeralcontext'
import Book from '../../assets/images/book-open.svg'
import { Dark } from '../../styles/themes/dark'
import { EventHandler, StoryInputEvent } from '../../data/event/eventhandling'
import { isAdventureModeStory } from '../../util/util'
import { GenerateErrorType, RequestWrapper, useGenerate } from '../../hooks/useGenerate'
import useAddStory from '../../hooks/useAddStory'
import { useLogout } from '../../hooks/useLogout'
import { trimBrokenUnicode } from '../../data/ai/processresponse'
import { stopTTS } from '../controls/tts'
import CommentDisplay from '../comment'
import { getUserSetting } from '../../data/user/settings'
import {
    appendWrapper,
    EditorQueueItem,
    editOutsideWrapper,
    editWrapper,
    insertionWrapper,
    redoWrapper,
    streamedResponseWrapper,
    undoWrapper,
} from './editorutils'
import { activeNodes, SchemaNode, SchemaNodes } from './schema'
import { ConversationControls } from './conversationcontrols'
import ConversationEditor, { getEditorText } from './conversationeditor'
import ConversationTitle from './conversationtitle'

const Emphasis = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
`

export const editorQueue: { queue: Array<EditorQueueItem> } = { queue: [] }
export const EditorQueueUpdate = atom({
    key: 'editorqueue',
    default: 0,
})

function StateUpdater(props: {
    setEdited: (edited: boolean) => void
    setRedoOptions: (options: string[][][]) => void
    setUndoAvailable: (available: boolean) => void
    setRetryAvailable: (available: boolean) => void
}) {
    const selectedStory = useRecoilValue(SelectedStory)
    const storyUpdate = useRecoilValue(StoryUpdate(selectedStory.id))

    const currentStory = GlobalUserContext.stories.get(selectedStory.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)

    useEffect(() => {
        if (!selectedStory.loaded) {
            return
        }

        if (currentStoryContent?.getStoryText() || currentStory?.isModified) {
            props.setEdited(true)
        } else {
            props.setEdited(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStory, currentStoryContent, selectedStory.loaded, storyUpdate])

    useEffect(() => {
        if (currentStoryContent?.story) {
            props.setRedoOptions(currentStoryContent.story.getRedoOptions())
            props.setUndoAvailable(currentStoryContent.story.canUndo())
            props.setRetryAvailable(currentStoryContent.story.canRetry())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStory, currentStoryContent, storyUpdate])

    return <></>
}

export default function Conversation(props: {
    menuVisible: boolean
    infoVisible: boolean
    visible: boolean
}): JSX.Element {
    const selectedStoryId = useRecoilValue(SelectedStoryId)

    const inputMode = useRecoilValue(SelectedInputMode)
    const inputModes = useRecoilValue(InputModes)

    const setGenerationRequestCancelled = useSetRecoilState(GenerationRequestCancelled)

    const currentStory = GlobalUserContext.stories.get(selectedStoryId)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStoryId)

    const [edited, setEdited] = useState(false)
    const [undoAvailable, setUndoAvailable] = useState(false)
    const [retryAvailable, setRetryAvailable] = useState(false)
    const [redoOptions, setRedoOptions] = useState<Array<Array<Array<string>>>>([])
    const [retryHovered, setRetryHovered] = useState(false)
    const [undoHovered, setUndoHovered] = useState(false)

    const storyMode = isAdventureModeStory(currentStoryContent?.settings)
        ? StoryMode.adventure
        : StoryMode.normal

    useEffect(() => {
        const nodes: SchemaNode[] = []
        for (const mode of inputModes) {
            if (mode.node) {
                nodes.push(mode.node)
            }
        }
        activeNodes.adventure = nodes.reverse()
    }, [inputModes])

    const updateEditorQueue = useRecoilCallback(({ set }) => async () => {
        set(EditorQueueUpdate, (val) => val + 1)
    })

    const updateStory = useRecoilCallback(({ set }) => (metadata: StoryMetadata, content: StoryContent) => {
        metadata.textPreview = content.getStoryText().slice(0, 250)
        set(StoryUpdate(metadata.id), metadata.save())
    })

    const handleCancelRequest = () => {
        setGenerationRequestCancelled(true)
    }

    const handleContentChanged = () => {
        if (!edited) {
            setEdited(true)
        }
    }

    const logout = useLogout()

    const setTrialUsedModalOpen = useSetRecoilState(TrialUsedModal)
    const setIPLimitModalOpen = useSetRecoilState(IPLimitModal)
    const setSubscriptionModalOpen = useSetRecoilState(SubscriptionDialogOpen)

    const onRequest: RequestWrapper = useRecoilCallback(
        ({ snapshot, set }) =>
            async (
                story,
                request,
                startIndex,
                endIndex,
                onGenerationComplete,
                onGenerationError,
                onGenerationUpdate
            ) => {
                const session = await snapshot.getPromise(Session)
                if (getUserSetting(session.settings, 'streamResponses')) {
                    await streamedResponseWrapper(
                        story,
                        async (queue: EditorQueueItem[]) => {
                            editorQueue.queue = [...editorQueue.queue, ...queue]
                            set(EditorQueueUpdate, (val) => val + 1)
                        },
                        onGenerationComplete,
                        request,
                        startIndex,
                        endIndex,
                        onGenerationError,
                        onGenerationUpdate,
                        getUserSetting(session.settings, 'streamDelay'),
                        getUserSetting(session.settings, 'editorLoreKeys')
                    )
                } else {
                    const response = await request.request()
                    if (!response?.text) {
                        onGenerationError({ status: response.status, message: response.error })
                        return
                    }
                    let responseText = response.text.replace(/\r/g, '')
                    responseText = trimBrokenUnicode(responseText)
                    const shouldComment = story.getStoryText().length - endIndex < 100
                    onGenerationComplete(
                        responseText,
                        response.tokens ?? [],
                        response.logprobs,
                        shouldComment
                    )

                    editorQueue.queue = [
                        ...editorQueue.queue,
                        ...insertionWrapper(
                            story,
                            DataOrigin.ai,
                            responseText,
                            startIndex,
                            endIndex,
                            getUserSetting(session.settings, 'editorLoreKeys')
                        ),
                    ]
                    await set(EditorQueueUpdate, (val) => val + 1)
                }
            }
    )
    const requestGeneration = useGenerate({
        onRequest,
        onError: (error) => {
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
                            Selected model <Emphasis>{error.model}</Emphasis> is not available at your current
                            subscription tier. <br /> The selected model has been changed to{' '}
                            <Emphasis>{error.changedTo}</Emphasis>. Your settings have not been changed and
                            may need to be adjusted.
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
                    setTrialUsedModalOpen(true)
                    break
                }
                case GenerateErrorType.freeLimitReached: {
                    setIPLimitModalOpen(true)
                    break
                }
                case GenerateErrorType.noSubscription: {
                    setSubscriptionModalOpen({ open: true, blocked: false })
                    break
                }
                case GenerateErrorType.unauthorized: {
                    logout()
                    break
                }
            }
        },
    })

    const handleInputReceived = useRecoilCallback(
        ({ snapshot }) =>
            async (input: string, origin?: DataOrigin) => {
                const session = await snapshot.getPromise(Session)

                const storyMetadata = currentStory
                const storyContent = currentStoryContent
                if (!storyContent || !storyMetadata) {
                    return
                }

                if (/^{!?(-?\d+)?(\+\d+r?)?(~\d+)?,?([+-]?\d+):.+}$/.test(input)) {
                    currentStoryContent?.ephemeralContext.push(
                        buildEphemeralContext(input, storyContent.getStoryStep())
                    )
                    updateStory(storyMetadata, storyContent)
                    return
                }

                if (input.endsWith(' ')) {
                    input = input.slice(0, -1)
                }

                const eventHandler = new EventHandler(storyContent, storyMetadata, inputMode, inputModes)
                let isEdit = false
                let parsedInput = input
                if (storyMode === StoryMode.adventure) {
                    const result = eventHandler.handleEvent(
                        new StoryInputEvent(storyContent.getStoryText(), parsedInput, true)
                    )
                    parsedInput = result.event.inputText

                    if (eventHandler.isStoryEdit()) {
                        isEdit = true
                        parsedInput = result.event.storyText + parsedInput
                    }
                } else {
                    parsedInput = parsedInput.trimEnd()

                    if (storyContent.getStoryText().length > 0 && parsedInput.length > 0) {
                        parsedInput = '\n' + parsedInput
                    }
                }

                if (!isEdit) {
                    if (parsedInput.length > 0) {
                        editorQueue.queue = [
                            ...editorQueue.queue,
                            ...appendWrapper(
                                storyContent,
                                origin ??
                                    (currentStoryContent?.didGenerate ? DataOrigin.user : DataOrigin.prompt),
                                parsedInput,
                                getUserSetting(session.settings, 'editorLoreKeys')
                            ),
                        ]
                    }
                } else {
                    editorQueue.queue = [
                        ...editorQueue.queue,
                        ...editOutsideWrapper(
                            storyContent,
                            parsedInput,
                            getUserSetting(session.settings, 'editorLoreKeys'),
                            origin ?? (currentStoryContent?.didGenerate ? DataOrigin.user : DataOrigin.prompt)
                        ).queue,
                    ]
                }

                await updateEditorQueue()
                updateStory(storyMetadata, storyContent)

                if (eventHandler.finalResult() === undefined || eventHandler.finalResult()?.event.generate) {
                    await requestGeneration(
                        storyContent.getStoryText(),
                        storyMetadata,
                        storyContent,
                        eventHandler
                    )
                }
            }
    )

    const { addStory } = useAddStory()

    const handleEditRequest = useRecoilCallback(
        ({ snapshot }) =>
            async (editedText: string, generate: boolean = true, start?: number, end?: number) => {
                const session = await snapshot.getPromise(Session)
                let storyMetadata = currentStory
                let storyContent = currentStoryContent
                if (!storyContent || !storyMetadata) {
                    const story = await addStory()
                    if (!story) return
                    storyContent = story.content
                    storyMetadata = story.metadata
                }

                const editResult = storyContent.didGenerate
                    ? editWrapper(
                          storyContent,
                          editedText,
                          getUserSetting(session.settings, 'editorLoreKeys')
                      )
                    : editWrapper(
                          storyContent,
                          editedText,
                          getUserSetting(session.settings, 'editorLoreKeys'),
                          DataOrigin.prompt
                      )

                if (editResult && editResult.edited) {
                    editorQueue.queue = [...editorQueue.queue, ...editResult.queue]
                    await updateEditorQueue()

                    updateStory(storyMetadata, storyContent)
                }
                if (generate) {
                    const eventHandler = new EventHandler(storyContent, storyMetadata, inputMode, inputModes)
                    await requestGeneration(
                        storyContent.getStoryText(),
                        storyMetadata,
                        storyContent,
                        eventHandler,
                        start,
                        end
                    )
                }
            }
    )

    const forceEditoeStoryStateResolution = async () => {
        if (!getEditorText) return
        const text = getEditorText()
        await handleEditRequest(text, false)
    }

    const handleUndoRequest = useRecoilCallback(({ snapshot }) => async () => {
        stopTTS()
        const session = await snapshot.getPromise(Session)
        if (!currentStoryContent || !currentStory) {
            return
        }
        await forceEditoeStoryStateResolution()
        editorQueue.queue = [
            ...editorQueue.queue,
            ...undoWrapper(currentStoryContent, getUserSetting(session.settings, 'editorLoreKeys')),
        ]
        await updateEditorQueue()
        updateStory(currentStory, currentStoryContent)
    })

    const handleRedoRequest = useRecoilCallback(({ snapshot }) => async (index: number = -1) => {
        const session = await snapshot.getPromise(Session)
        if (!currentStoryContent || !currentStory) {
            return
        }
        await forceEditoeStoryStateResolution()
        editorQueue.queue = [
            ...editorQueue.queue,
            ...redoWrapper(currentStoryContent, index, getUserSetting(session.settings, 'editorLoreKeys')),
        ]
        await updateEditorQueue()
        updateStory(currentStory, currentStoryContent)
    })

    const handleRetryRequest = useRecoilCallback(({ snapshot }) => async () => {
        const session = await snapshot.getPromise(Session)
        stopTTS()

        const storyMetadata = currentStory
        const storyContent = currentStoryContent
        if (!storyContent?.story || !storyMetadata) {
            return
        }
        let start: number | undefined
        let removedEnd: number | undefined
        if (storyContent.story.lastDatablockIsAI()) {
            const last = storyContent.story.lastInsertionInfo()
            start = last[last.length - 1].start
            removedEnd = last[last.length - 1].removedEnd
            editorQueue.queue = [
                ...editorQueue.queue,
                ...undoWrapper(storyContent, getUserSetting(session.settings, 'editorLoreKeys')),
            ]
            if (start === storyContent.getStoryText().length) {
                const element = document.querySelectorAll('.ProseMirror')[0]?.parentElement as
                    | HTMLDivElement
                    | undefined
                if (element) {
                    element.scrollTop = element.scrollHeight
                }
            }

            await updateEditorQueue()
        }

        updateStory(storyMetadata, storyContent)

        const eventHandler = new EventHandler(storyContent, storyMetadata, inputMode, inputModes)
        await requestGeneration(
            storyContent.getStoryText(),
            storyMetadata,
            storyContent,
            eventHandler,
            start,
            removedEnd
        )
    })

    return (
        <>
            {storyMode === StoryMode.adventure ? (
                <GlobalAdventureStyle nodeTypes={activeNodes}></GlobalAdventureStyle>
            ) : null}
            <ConversationContainer className="conversation-container">
                <Fragment>
                    <ConversationTitle
                        menuVisible={props.menuVisible}
                        infoVisible={props.infoVisible}
                        visible={props.visible}
                    />
                    <ConversationMain
                        className="conversation-main tts-controls"
                        mode={storyMode}
                        showRetryHighlight={retryHovered}
                        showUndoHighlight={undoHovered}
                        style={{
                            display: 'flex',
                            visibility: props.visible ? 'visible' : 'hidden',
                        }}
                    >
                        <ConversationEditor
                            onEditRequest={handleEditRequest}
                            onContentChange={handleContentChanged}
                        />
                    </ConversationMain>
                </Fragment>
                <LoadingIndicator />
                <CommentDisplay />
                <ConversationControls
                    onRedoRequest={handleRedoRequest}
                    onUndoRequest={handleUndoRequest}
                    handleCancelRequest={handleCancelRequest}
                    onInputRecieved={handleInputReceived}
                    onRetryRequest={() => {
                        setRetryHovered(false)
                        handleRetryRequest()
                    }}
                    onRetryHover={(hovered: boolean) => setRetryHovered(hovered)}
                    onUndoHover={(hovered: boolean) => setUndoHovered(hovered)}
                    visible={props.visible}
                    redoOptions={redoOptions}
                    canUndo={undoAvailable}
                    canRetry={retryAvailable}
                    mode={storyMode}
                />
            </ConversationContainer>
            <StateUpdater
                setEdited={setEdited}
                setUndoAvailable={setUndoAvailable}
                setRetryAvailable={setRetryAvailable}
                setRedoOptions={setRedoOptions}
            />
        </>
    )
}

function LoadingIndicator() {
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    return <LoadingBar visible={generationRequestActive} className="loading-bar" />
}

export const GlobalAdventureStyle = createGlobalStyle<{ theme: typeof Dark; nodeTypes: SchemaNodes }>`
    .ProseMirror {
        border: none;
        padding: 0 !important;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;

        >p:not(.empty-node) {
            & {
                border: 1px solid ${(props) => props.theme.colors.bg3};
                border-bottom: none;
                padding: 15px !important;
                padding-left: 65px !important;
                position: relative;
                &:before {
                    content: '';
                    background: ${(props) => props.theme.colors.bg1};
                    width: 50px;
                    height: 100%;
                    position: absolute;
                    left: 0;
                    top:0;
                    border-right: 1px solid ${(props) => props.theme.colors.bg3};
                }
                &:after {
                    content: '';
                    background-position: center;
                    background-size: contain;
                    background-repeat: no-repeat;
                    mask-repeat: no-repeat;
                    mask-size: contain;
                    mask-position: center;
                    background-color: ${(props) => props.theme.colors.textMain};
                    mask-image: url(${Book.src});
                    width: 20px;
                    height: 20px;
                    position: absolute;
                    left: 15px;
                    top: 15px;
                    opacity: 0.9;
                }
            }
            &.adventureInput, &.adventureStoryEnd{
                border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
            }
            &.adventureStory + p.adventureStory {
                padding-top: 0px  !important;
                border-top: none ;
                &:after {
                    mask-image: none ;
                    background-color: unset ;
                }
            }
            &.adventureStoryEnd{
                margin-bottom: 15px;
                border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
            }
            &.adventureInput{
                background: ${(props) => props.theme.colors.bg1};
                margin-left: 20px;
                margin-bottom: 15px;
                &:before{
                }
            }
            &.adventureStoryEnd:last-child{
                margin-bottom: 0;
            }
            &.adventureInput{
                &:after {
                    background-color: ${(props) => props.theme.colors.textMain} !important;
                }
            }

            ${(props) =>
                props.nodeTypes.adventure.map((node) => {
                    return `
            &.adventureInput.${node.name} {
                &:after {
                    mask-image: url(${node.icon.src});
                }
            }`
                })}

        }
    }
`
