import { useEffect, useState, useRef } from 'react'

import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { GlobalUserContext } from '../../../../globals/globals'
import { SelectedStory, StoryUpdate, TokenizerOpen, TokenizerText } from '../../../../globals/state'
import { WorkerInterface } from '../../../../tokenizer/interface'
import { Container, MemoryInput, UsedMax } from '../../../../styles/components/contexteditor'
import { getModelEncoderType } from '../../../../tokenizer/encoder'

export default function ContextEditor(props: {
    contextIndex: number
    placeholder: string
    id?: string
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)

    const currentStory = GlobalUserContext.stories.get(selectedStory.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)

    const [usedTokens, setUsedTokens] = useState(props.contextIndex)

    const [storyUpdate, setStoryUpdate] = useRecoilState(StoryUpdate(''))

    const setTokenizerText = useSetRecoilState(TokenizerText)
    const setTokenizerOpen = useSetRecoilState(TokenizerOpen)

    useEffect(() => {
        if (!currentStoryContent || !currentStoryContent.context[props.contextIndex]) {
            return
        }
        const encoderType = getModelEncoderType(currentStoryContent.settings.model)

        new WorkerInterface()
            .encode(currentStoryContent.context[props.contextIndex].text, encoderType)
            .then((encoded) => {
                setUsedTokens(encoded.length)
            })
    }, [currentStory, currentStoryContent, props.contextIndex, storyUpdate])

    const [value, setValue] = useState(currentStoryContent?.context[props.contextIndex]?.text)
    useEffect(() => {
        setValue(currentStoryContent?.context[props.contextIndex]?.text)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStoryContent?.context[props.contextIndex]?.text, setValue])
    const saveRef = useRef(0)
    const setMemory = (memory: string) => {
        if (!currentStoryContent || !currentStoryContent.context[props.contextIndex] || !currentStory) {
            return
        }
        currentStoryContent.context[props.contextIndex] = {
            ...currentStoryContent.context[props.contextIndex],
            text: memory,
        }
        setStoryUpdate(currentStory.save())
    }
    const queueSetMemory = (memory: string) => {
        clearTimeout(saveRef.current)
        setValue(memory)
        saveRef.current = setTimeout(() => setMemory(memory), 500) as any as number
    }

    return (
        <Container>
            {currentStoryContent?.context !== undefined ? (
                <MemoryInput
                    id={props.id}
                    value={value}
                    onChange={(e) => queueSetMemory(e.target.value)}
                    placeholder={props.placeholder}
                    maxRows={12}
                    minRows={5}
                />
            ) : (
                <></>
            )}
            <UsedMax
                tabIndex={-1}
                aria-label={`${
                    props.contextIndex === 0 ? 'memory' : "author's note"
                } contains ${usedTokens} tokens`}
                onClick={() => {
                    setTokenizerText(value ?? '')
                    setTokenizerOpen(true)
                }}
            >
                <div>{usedTokens}</div>
                <div>&nbsp;tokens</div>
            </UsedMax>
        </Container>
    )
}
