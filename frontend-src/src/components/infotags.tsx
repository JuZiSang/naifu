import { useState } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { StoryMetadata } from '../data/story/storycontainer'
import { GlobalUserContext } from '../globals/globals'
import { SelectedStory, StoryUpdate } from '../globals/state'
import { TagContainer, TagDisplay as StyledTagDisplay, TagEntry } from '../styles/components/infotags'
import { SubtleButton } from '../styles/ui/button'

export function Tags(): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStory = GlobalUserContext.stories.get(selectedStory.id)
    const updateStory = useRecoilCallback(({ set }) => (metadata: StoryMetadata) => {
        set(StoryUpdate(metadata.id), metadata.save())
    })

    return (
        <TagEntry>
            <TagEditor
                onTagSubmit={(tag) => {
                    if (currentStory) {
                        currentStory.tags = [...(currentStory?.tags ?? []), tag]
                        updateStory(currentStory)
                    }
                }}
            />
            <TagDisplay
                tagList={currentStory?.tags ?? []}
                onTagClick={(i) => {
                    if (currentStory) {
                        currentStory.tags = [
                            ...currentStory.tags.slice(0, i),
                            ...currentStory.tags.slice(i + 1),
                        ]
                        updateStory(currentStory)
                    }
                }}
            />
        </TagEntry>
    )
}

export function TagEditor(props: { onTagSubmit(tag: string): void }): JSX.Element {
    const [tagInput, setTagInput] = useState('')

    function handleKeyDown(e: any) {
        if (e.key === 'Enter' && tagInput !== '') {
            props.onTagSubmit(tagInput)
            setTagInput('')
        }
    }
    return (
        <input
            placeholder="Type here and hit enter to save"
            onKeyDown={handleKeyDown}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
        ></input>
    )
}

export function TagDisplay(props: { tagList?: string[]; onTagClick(index: number): void }): JSX.Element {
    const tags = props.tagList?.map((tag, index) => {
        return (
            <SubtleButton key={index} onClick={() => props.onTagClick(index)}>
                {tag}
            </SubtleButton>
        )
    })
    return (
        <StyledTagDisplay>
            <div>
                <div></div>
                <div>Click a tag to delete it.</div>
            </div>
            <TagContainer>{tags}</TagContainer>
        </StyledTagDisplay>
    )
}
