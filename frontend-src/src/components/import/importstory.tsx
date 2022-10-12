import { StoryContainer } from '../../data/story/storycontainer'
import {
    Label,
    ImportStoryStyle,
    Description,
    ImportContainer,
    InnerRow,
    Row,
    TagContainer,
    Title,
    StoryText,
    ButtonRow,
    TitleRow,
    ScrollContainer,
    Spacer,
} from '../../styles/components/import/importstory'
import { Button } from '../../styles/ui/button'

export function ImportStory(props: {
    importedStory: StoryContainer
    onClickPaste: () => void
    onClickImport: (story: StoryContainer) => void
}): JSX.Element {
    return (
        <ImportStoryStyle>
            <TitleRow style={{ paddingBottom: '20px' }}>
                <Title>{props.importedStory.metadata.title}</Title>
            </TitleRow>
            <ScrollContainer>
                <Row>
                    <InnerRow>
                        <Label>Description</Label>
                        <Description>{props.importedStory.metadata.description}</Description>
                    </InnerRow>
                </Row>
                <Row>
                    <InnerRow>
                        <TagContainer>
                            {props.importedStory.metadata.tags.map((tag, index) => {
                                return <span key={index}>{tag}</span>
                            })}
                        </TagContainer>
                    </InnerRow>
                </Row>
                <Spacer />
                <Row>
                    <div>
                        <Label>Story Text</Label>
                        <StoryText>{props.importedStory.content.getStoryText()}</StoryText>
                    </div>
                </Row>
            </ScrollContainer>
            <ButtonRow>
                <div />
                <ImportContainer>
                    <Button onClick={props.onClickPaste}>Paste as text</Button>
                    <Button onClick={() => props.onClickImport(props.importedStory)}>Import story</Button>
                </ImportContainer>
            </ButtonRow>
        </ImportStoryStyle>
    )
}
