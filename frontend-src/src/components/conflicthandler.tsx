import dayjs from 'dayjs'
import styled from 'styled-components'
import { StoryContainer } from '../data/story/storycontainer'
import { LightColorButton } from '../styles/ui/button'
import { downloadTextFile } from '../util/browser'
import { transparentize } from '../util/colour'

const StoryConflictElement = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: stretch;
    margin-top: 1rem;
    gap: 10px;
    > * {
        flex: 1;
        margin: 5px;
    }
`
const StoryConflictItem = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: stretch;
    margin-top: 1rem;
    > *:nth-child(1) {
        margin-bottom: 1rem;
    }
`

const StoryConflictDetail = styled.div`
    margin-bottom: 1rem;
    > div:nth-child(1) {
        margin-bottom: 0.25rem;
        opacity: 0.6;
        font-size: 0.8rem;
    }
    > div:nth-child(2) {
        background: ${(props) => transparentize(0.6, props.theme.colors.bg1)};
        padding: 0.5rem;
    }
`
const Title = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-weight: bold;
`
const Spacer = styled.div`
    flex: 1;
`

export default function ConflictHandler(props: {
    localStory: StoryContainer
    remoteStory: StoryContainer
}): JSX.Element {
    return (
        <div>
            A newer version of this story is stored remotely. Which one do you want to keep?
            <StoryConflictElement>
                <StoryConflictItem>
                    <strong>Local Changes</strong>
                    <StoryConflictDetail>
                        <div>Title</div>
                        <Title>{props.localStory.metadata.title}</Title>
                    </StoryConflictDetail>
                    <StoryConflictDetail>
                        <div>Last Changed</div>
                        <div>
                            {dayjs(props.localStory.metadata.lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                    </StoryConflictDetail>
                    <StoryConflictDetail>
                        <div>Recent Story</div>
                        <div>
                            {props.localStory.content.getStoryText().length > 250 ? (
                                <span style={{ opacity: 0.6 }}>... </span>
                            ) : null}
                            {props.localStory.content.getStoryText().slice(-250)}
                        </div>
                    </StoryConflictDetail>
                    <Spacer />
                    <LightColorButton
                        style={{ marginTop: '0.5rem', marginBottom: '-1rem' }}
                        onClick={() =>
                            downloadTextFile(
                                props.localStory.serialize(true),
                                `${props.localStory.metadata.title.slice(0, 40)} (${new Date(
                                    props.localStory.metadata.lastUpdatedAt
                                ).toISOString()}).story`
                            )
                        }
                    >
                        Download
                    </LightColorButton>
                </StoryConflictItem>
                <StoryConflictItem>
                    <strong>Last Remote Save</strong>
                    <StoryConflictDetail>
                        <div>&nbsp;</div>
                        <Title>{props.remoteStory.metadata.title}</Title>
                    </StoryConflictDetail>
                    <StoryConflictDetail>
                        <div>&nbsp;</div>
                        <div>
                            {dayjs(props.remoteStory.metadata.lastUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                    </StoryConflictDetail>
                    <StoryConflictDetail>
                        <div>&nbsp;</div>
                        <div>
                            {props.remoteStory.content.getStoryText().length > 250 ? (
                                <span style={{ opacity: 0.6 }}>... </span>
                            ) : null}
                            {props.remoteStory.content.getStoryText().slice(-250)}
                        </div>
                    </StoryConflictDetail>
                    <Spacer />
                    <LightColorButton
                        style={{ marginTop: '0.5rem', marginBottom: '-1rem' }}
                        onClick={() =>
                            downloadTextFile(
                                props.remoteStory.serialize(true),
                                `${props.remoteStory.metadata.title.slice(0, 40)} (${new Date(
                                    props.remoteStory.metadata.lastUpdatedAt
                                ).toISOString()}).story`
                            )
                        }
                    >
                        Download
                    </LightColorButton>
                </StoryConflictItem>
            </StoryConflictElement>
        </div>
    )
}
