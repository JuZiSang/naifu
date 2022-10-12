/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { useSetRecoilState } from 'recoil'
import { useState, useEffect } from 'react'
import { MdHelpOutline } from 'react-icons/md'
import { StoryUpdate } from '../../../../globals/state'
import { GlobalUserContext } from '../../../../globals/globals'
import { BorderedButton, Button } from '../../../../styles/ui/button'
import {
    Section,
    StoryStatsSidebar,
    StatsContainer,
    StatsGrid,
    ButtonRow,
} from '../../../../styles/components/storystats'
import { NlpStoryStatistics, StoryStatistics } from '../../../../data/story/story'
import { StatsIcon } from '../../../../styles/ui/icons'
import Modal, { ModalType } from '../../../modals/modal'
import WarningButton, { WarningButtonStyle } from '../../../deletebutton'
import Spinner from '../../../spinner'
import Tooltip from '../../../tooltip'
import Scissors from '../../../../assets/images/scissors.svg'
import Flatten from '../../../../assets/images/flatten.svg'
import DotReset from '../../../../assets/images/dot-reset.svg'
import { eventBus } from '../../../../globals/events'
import { createEditorEvent, EditorLoadEvent } from '../../../editor/events'

export default function StoryStats(props: { selectedStory: string }): JSX.Element {
    // TODO: stats for document
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)
    const [statsModalVisible, setStatsModalVisible] = useState(false)
    const [stats, setStats] = useState(new StoryStatistics())
    const [nlpStats, setNlpStats] = useState<NlpStoryStatistics | undefined>()

    const [statsLoaded, setStatsLoaded] = useState(false)

    useEffect(() => {
        const generateStats = async () => {
            if (!currentStoryContent) {
                return
            }
            currentStoryContent.story?.calculateStoryStatistics().then((result) => {
                setStats(result)
                setStatsLoaded(true)
            })
        }

        if (statsModalVisible) {
            generateStats()
        }
    }, [currentStoryContent, currentStoryContent?.story, statsModalVisible])

    if (!currentStory || !currentStoryContent || !currentStoryContent.story) {
        return <></>
    }
    return (
        <StoryStatsSidebar>
            <BorderedButton
                style={{ width: '100%' }}
                color={'transparent'}
                centered={true}
                onClick={() => {
                    setStatsModalVisible(true)
                }}
                additionalClasses={'story-stats-button'}
            >
                <StatsIcon /> View Story Stats
            </BorderedButton>
            <Modal
                type={ModalType.Compact}
                isOpen={statsModalVisible}
                onRequestClose={() => {
                    setStatsModalVisible(false)
                }}
                label={'Stats'}
                icon={false}
                shouldCloseOnOverlayClick={true}
            >
                <>
                    {!statsLoaded ? (
                        <Spinner visible={true} />
                    ) : (
                        <StatsContainer>
                            <StatsGrid>
                                <div>
                                    <Section>
                                        <h4>Data</h4>
                                        <div>
                                            Data Blocks: {stats.dataBlocks} [{stats.abandonedDataBlocks}{' '}
                                            abandoned]
                                        </div>
                                        <div>
                                            - Edits: {stats.editBlocks} ({stats.chainedEditBlocks} chained)
                                        </div>
                                        <div>- AI Responses: {stats.responseBlocks}</div>
                                        <div>- User Input: {stats.userBlocks}</div>
                                        <div>
                                            Lorebook Entries: {currentStoryContent.lorebook.entries.length}
                                        </div>
                                        <div>
                                            Ephemeral Entries: {currentStoryContent.ephemeralContext.length}
                                        </div>
                                    </Section>
                                    <Section>
                                        <h4>Structure</h4>
                                        <div>Current Step: {stats.currentStep}</div>
                                        <div>Furthest Step: {stats.furthestStep}</div>
                                        <div>Dead Ends: {stats.deadEnds}</div>
                                        <div>No Retry Streak: {stats.noRetryStreak}</div>
                                        <div>Longest Abandoned Branch: {stats.longestAbandonedBranch}</div>
                                        <div>Most Retries: {stats.mostRetries}</div>
                                        <div>
                                            Average Retries:{' '}
                                            {(stats.retries / stats.stepsWhereResponseWasRequested).toFixed(
                                                2
                                            )}
                                        </div>
                                    </Section>
                                </div>
                                <div>
                                    <Section>
                                        <h4>Writing</h4>
                                        <div>
                                            Characters: {stats.characters} [{stats.abandonedCharacters}{' '}
                                            abandoned]
                                        </div>
                                        <div>
                                            - User: {stats.inputCharacters} [{stats.abandonedInputCharacters}{' '}
                                            abandoned]
                                        </div>
                                        <div>
                                            - AI: {stats.responseCharacters} [
                                            {stats.abandonedResponseCharacters} abandoned]
                                        </div>
                                        <div>
                                            - Edit: {stats.editCharacters} [{stats.abandonedEditCharacters}{' '}
                                            abandoned] ({stats.deletedCharacters} deleted)
                                        </div>
                                        <div>Paragraphs: {stats.paragraphs}</div>
                                    </Section>
                                </div>
                                <div>
                                    <Section>
                                        <h4>Additional Stats</h4>
                                        <Button
                                            onClick={async () => {
                                                currentStoryContent
                                                    .story!.calculateNlpStats()
                                                    .then((result) => {
                                                        setNlpStats(result)
                                                    })
                                            }}
                                        >
                                            Generate Additional Stats
                                        </Button>
                                    </Section>
                                </div>
                                <div>
                                    <Section>
                                        <div>Words: {nlpStats?.words ?? '???'}</div>
                                        <div>Sentences: {nlpStats?.sentences ?? '???'}</div>
                                    </Section>
                                    <Section>
                                        <h4>
                                            Most Used Words
                                            <Tooltip
                                                delay={1}
                                                tooltip={
                                                    'Excludes pronouns, conjunctions, prepositions, articles, and determiners'
                                                }
                                            >
                                                <MdHelpOutline
                                                    style={{
                                                        opacity: 0.3,
                                                        marginLeft: '0.3rem',
                                                    }}
                                                />
                                            </Tooltip>
                                        </h4>
                                        <ol>
                                            {!nlpStats ? (
                                                <li>???</li>
                                            ) : (
                                                [...nlpStats.usedWords.entries()]
                                                    .sort((a, b) => b[1] - a[1])
                                                    .slice(0, 10)
                                                    .map((e, i) => {
                                                        return (
                                                            <li key={i}>
                                                                {e[0]} - {e[1]}
                                                            </li>
                                                        )
                                                    })
                                            )}
                                        </ol>
                                    </Section>
                                </div>
                                <div>
                                    <Section>
                                        <h4>Experimental</h4>
                                        <div>
                                            WARNING: The following options are experimental and could result
                                            in permanent corruption of your story. Creating a backup first is
                                            heavily advised.
                                        </div>
                                        <ButtonRow>
                                            <WarningButton
                                                onConfirm={() => {
                                                    currentStoryContent.story!.trimBranches()
                                                    eventBus.trigger(
                                                        createEditorEvent(
                                                            new EditorLoadEvent(
                                                                currentStoryContent,
                                                                currentStory
                                                            )
                                                        )
                                                    )
                                                    setStoryUpdate(currentStory.save())
                                                }}
                                                buttonType={WarningButtonStyle.Danger}
                                                warningColors
                                                iconURL={Scissors.src}
                                                buttonText="Trim Story"
                                                label="Trim your Story?"
                                                warningText={
                                                    <>
                                                        Are you sure you want to trim the history of
                                                        {'"'}
                                                        {currentStory.title}
                                                        {'"'}? <br />
                                                        This will delete all story branches. <br />
                                                        This cannot be reversed.
                                                    </>
                                                }
                                                confirmButtonText="Trim it!"
                                            />
                                            <WarningButton
                                                onConfirm={() => {
                                                    currentStoryContent.story!.flattenStory()
                                                    eventBus.trigger(
                                                        createEditorEvent(
                                                            new EditorLoadEvent(
                                                                currentStoryContent,
                                                                currentStory
                                                            )
                                                        )
                                                    )
                                                    setStoryUpdate(currentStory.save())
                                                }}
                                                buttonType={WarningButtonStyle.Danger}
                                                warningColors
                                                iconURL={Flatten.src}
                                                buttonText="Flatten Story"
                                                label="Flatten your Story?"
                                                warningText={
                                                    <>
                                                        Are you sure you want to flatten {'"'}
                                                        {currentStory.title}
                                                        {'"'}? <br />
                                                        This will delete its entire history.
                                                        <br />
                                                        This cannot be reversed.
                                                    </>
                                                }
                                                confirmButtonText="Flatten it!"
                                            />
                                            <WarningButton
                                                iconURL={DotReset.src}
                                                onConfirm={() => {
                                                    currentStoryContent.story!.resetToPrompt()
                                                    currentStoryContent.didGenerate = false
                                                    currentStory.textPreview = currentStoryContent
                                                        .story!.getText()
                                                        .slice(0, 250)
                                                    eventBus.trigger(
                                                        createEditorEvent(
                                                            new EditorLoadEvent(
                                                                currentStoryContent,
                                                                currentStory
                                                            )
                                                        )
                                                    )
                                                    setStoryUpdate(currentStory.save())
                                                }}
                                                buttonType={WarningButtonStyle.Danger}
                                                warningColors
                                                buttonText="Reset to Prompt"
                                                label="Reset your Story to Prompt?"
                                                warningText={
                                                    <>
                                                        Are you sure you want to reset {'"'}
                                                        {currentStory.title}
                                                        {'"'} to its prompt? <br />
                                                        This will delete every input/output up til now.
                                                        <br />
                                                        This cannot be reversed.
                                                    </>
                                                }
                                                confirmButtonText="Reset it!"
                                            />
                                        </ButtonRow>
                                    </Section>
                                </div>
                            </StatsGrid>
                        </StatsContainer>
                    )}
                </>
            </Modal>
        </StoryStatsSidebar>
    )
}
