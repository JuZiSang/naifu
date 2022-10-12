import Link from 'next/link'
import { Fragment } from 'react'
import { FaImage } from 'react-icons/fa'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'

import { DefaultModel } from '../data/request/model'
import { getUserSetting, UserSettings } from '../data/user/settings'
import { SessionValue, StoryUpdate } from '../globals/state'
import useAddStory from '../hooks/useAddStory'
import { useSelectedStory } from '../hooks/useSelectedStory'
import { useWindowSizeBreakpoint } from '../hooks/useWindowSize'
import { LightColorButton, LightColorButtonLink } from '../styles/ui/button'
import { EaselIcon, SwordsIcon, TextIcon } from '../styles/ui/icons'
import { FlexColSpacer } from '../styles/ui/layout'

export function WelcomeHeading(props: {
    setShowScenarios: (b: boolean) => void
    onScenarioSelected?: () => void
}): JSX.Element {
    const selectedStory = useSelectedStory()
    const settings = useRecoilValue(SessionValue('settings')) as UserSettings

    const win = useWindowSizeBreakpoint(600, 0)
    const MOBILE_DEVICE = win.width <= 600

    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))

    const { addStory } = useAddStory()

    const onStartClick = async (adventure: boolean = false) => {
        ;(window as any).plausible('StartYourOwnClick', {
            props: { option: adventure ? 'Adventure' : 'Storyteller' },
        })
        let storyMetadata = selectedStory.meta
        let storyContent = selectedStory.story
        if (!storyContent || !storyMetadata) {
            const story = await addStory()
            if (!story) return
            storyMetadata = story.metadata
            storyContent = story.content
        }
        if (adventure) {
            storyContent.settings.model = DefaultModel
            storyContent.settings.prefix = 'theme_textadventure'
        }

        setStoryUpdate(storyMetadata.save(true))
        props.onScenarioSelected?.call(props.onScenarioSelected)
    }

    const isEditorV2 = !!(
        (!selectedStory.story && getUserSetting(settings, 'useEditorV2')) ||
        selectedStory.story?.document
    )

    return (
        <WelcomeHeadingContainer className="conversation-heading">
            <WelcomeHeadingContent>
                <h1 className="conversation-start-heading">Time to begin your Story.</h1>
                <FlexColSpacer min={20} max={20} />
                {MOBILE_DEVICE ? (
                    <></>
                ) : (
                    <h2 className="conversation-start-subheading">
                        <span>Want to start your own? </span>
                        <span>Click one of the options below.</span>
                    </h2>
                )}
                {MOBILE_DEVICE ? (
                    <div className="conversation-start-text">
                        <p style={{ marginBottom: '41px' }}>
                            To get started, go ahead and choose from one of the options below to start
                            writing.
                        </p>
                        <p>
                            <AltColor>Starting from scratch</AltColor> will leave you with an empty prompt,
                            ready for anything.
                        </p>
                        <br />
                        <p>
                            Otherwise, you can <AltColor>choose from one of our scenarios</AltColor>, just in
                            case you’re having trouble thinking of ideas.
                        </p>
                        <br />
                    </div>
                ) : (
                    <div className="conversation-start-text">
                        <p>
                            Simply select one of the options below and you’ll be free to do whatever you want!
                        </p>
                    </div>
                )}
                {MOBILE_DEVICE ? (
                    <>
                        <EditorSelectButton
                            onClick={() => onStartClick()}
                            style={{ marginTop: 'auto', marginBottom: '0', justifyContent: 'center' }}
                        >
                            <div>Start From Scratch</div>
                            <span style={{ opacity: 0.35, fontSize: '0.9rem' }}> (Recommended)</span>
                        </EditorSelectButton>
                        {!isEditorV2 && (
                            // TODO: re-enable when document editor has adventure mode
                            <AdventureSelectButton
                                onClick={() => onStartClick(true)}
                                style={{ marginBottom: '0' }}
                            >
                                <div>Blank Text Adventure</div>
                            </AdventureSelectButton>
                        )}
                        <Link href="/image" passHref>
                            <SmallImageGenerationSelectButton
                                style={{
                                    padding: '20px 30px',
                                }}
                            >
                                <div>Image Generation</div>
                            </SmallImageGenerationSelectButton>
                        </Link>
                        <LightColorButton
                            onClick={() => props.setShowScenarios(true)}
                            style={{ marginBottom: '10px' }}
                        >
                            Choose a Scenario
                        </LightColorButton>
                    </>
                ) : (
                    <BigButtonContainer>
                        <EditorSelectButton onClick={() => onStartClick()} style={{ flexGrow: 2.5 }}>
                            <div>
                                <TextIcon />
                            </div>
                            <div>Storyteller</div>
                            <div>
                                An empty canvas for your imagination. Let the AI create a story with you!
                                <br />
                                <span style={{ opacity: 0.35 }}>(Recommended)</span>
                            </div>
                        </EditorSelectButton>
                        <Fragment>
                            <div style={{ width: '20px' }} />
                            <AdventureSelectButton onClick={() => onStartClick(true)} disabled={isEditorV2}>
                                <div>
                                    <SwordsIcon />
                                </div>
                                <div>Text Adventure</div>
                                <div>
                                    {!isEditorV2
                                        ? `Let the AI tell a story using your words and actions!`
                                        : `Not yet supported with Editor V2`}
                                    <br />
                                    {!isEditorV2 && <span style={{ opacity: 0.35 }}>(Work in Progress)</span>}
                                </div>
                            </AdventureSelectButton>
                        </Fragment>
                        <Link href="/image" passHref>
                            <ImageGenerationSelectButton
                                style={{
                                    padding: '20px 30px',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginRight: '35px',
                                        }}
                                    >
                                        <EaselIcon
                                            style={{
                                                width: '30px',
                                                height: '30px',
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <div>Image Generation</div>
                                        <div>Have the AI draw a masterpiece for you!</div>
                                    </div>
                                </div>
                            </ImageGenerationSelectButton>
                        </Link>
                    </BigButtonContainer>
                )}
            </WelcomeHeadingContent>
        </WelcomeHeadingContainer>
    )
}

const AltColor = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
`

const EditorSelectButton = styled(LightColorButton)`
    border: 1px solid ${(props) => props.theme.colors.textHeadings};
    color: ${(props) => props.theme.colors.textHeadings};
    > div:nth-child(1) > div {
        background-color: ${(props) => props.theme.colors.textHeadings};
    }
`

const AdventureSelectButton = styled(LightColorButton)`
    border: 1px solid ${(props) => props.theme.colors.textEdit};
    color: ${(props) => props.theme.colors.textEdit};
    > div:nth-child(1) > div {
        background-color: ${(props) => props.theme.colors.textEdit};
    }
`

const ImageGenerationSelectButton = styled(LightColorButtonLink)`
    border: 1px solid ${(props) => props.theme.colors.textUser};
    color: ${(props) => props.theme.colors.textUser};
    background-color: ${(props) => props.theme.colors.bg1};
    &:hover {
        color: ${(props) => props.theme.colors.textUser};
    }
    display: flex;
    justify-content: center;
    > div > div:nth-child(2) {
        div:nth-child(1) {
            font-size: 1.375rem;
            font-family: ${(props) => props.theme.fonts.headings};
        }
        > div:nth-child(2) {
            font-size: 0.875rem;
            color: ${(props) => props.theme.colors.textMain};
        }
    }
    margin-top: 20px;
    width: 100%;
`

const SmallImageGenerationSelectButton = styled(LightColorButtonLink)`
    border: 1px solid ${(props) => props.theme.colors.textUser};
    color: ${(props) => props.theme.colors.textUser};
    justify-content: center;
    margin-top: 20px;
`

const BigButtonContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    padding-top: 10px;
    font-size: 1.375rem;
    button {
        padding: 30px !important;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        flex: 1 1 0;
        min-width: 240px;
        background-color: ${(props) => props.theme.colors.bg1};
        > :nth-child(1) {
            height: 1.563rem;
            width: 3rem;
            > div {
                width: 2rem;
                height: 1.563rem;
            }
            display: flex;
            justify-content: space-around;
        }
        > :nth-child(2) {
            margin-top: 10px;
            font-size: 1.375rem;
            font-family: ${(props) => props.theme.fonts.headings};
        }
        > :nth-child(3) {
            font-size: 0.875rem;
            color: ${(props) => props.theme.colors.textMain};
            max-width: 250px;
        }
    }
    > :nth-child(1) {
        > :nth-child(1) > div {
            height: 1.375rem;
        }
    }
    width: 100%;
`

export const WelcomeHeadingContainer = styled.div`
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    h1 {
        font-size: 2.125rem;
        @media (max-width: 600px) {
            font-size: 1.625rem;
        }
    }
    h2 {
        font-size: 1.375rem;
        > :first-child {
            color: ${(props) => props.theme.colors.textHeadings};
        }
        > :last-child {
            color: ${(props) => props.theme.colors.textMain};
        }
    }
    p {
        font-size: 0.875rem;
        margin-bottom: 0;
    }
    button {
        padding: 12px 30px;
        @media (max-width: 600px) {
            margin: 20px 0;
            padding: 15px;
            display: flex;
            justify-content: space-around;
            min-height: 70px;
        }
    }
    @media (max-width: 600px) {
        height: 100%;
        margin-left: 10px;
        margin-right: 10px;
        width: calc(100% - 20px);
    }
`

const WelcomeHeadingContent = styled.div`
    margin-bottom: 10px;
    transition: opacity 0.32s ease-in-out, margin-top 0.32s ease-in-out;
    overflow-y: auto;
    width: 100%;
    h1 {
        margin-top: 3rem;
    }

    @media (max-width: 600px) {
        margin-bottom: 0px;
        display: flex;
        flex-direction: column;
        height: 100%;
    }
`
