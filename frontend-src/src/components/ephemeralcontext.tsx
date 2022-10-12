import styled from 'styled-components'
import { useState } from 'react'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import {
    buildEphemeralContext,
    entryToText,
    EphemeralEntry,
    isEphemeralEntryActive,
} from '../data/ai/ephemeralcontext'
import { GlobalUserContext } from '../globals/globals'
import { SelectedStory, StoryUpdate } from '../globals/state'
import { ListEntryDelete, ListEntryDeleteIcon } from '../styles/components/lorebook'
import { LightColorButton, SubtleButton } from '../styles/ui/button'
import { ScreenreaderToggle } from '../styles/ui/screenreadertoggle'
import { FlexCol, FlexRow } from '../styles/ui/layout'
import Modal, { ModalType } from './modals/modal'

export function EphemeralContext(): JSX.Element {
    const [visible, setVisible] = useState(false)
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const [entryInput, setEntryInput] = useState('')
    const [selectedEntry, setSelectedEntry] = useState(-1)
    const [confirmDelete, setConfirmDelete] = useState(-1)

    if (!currentStoryContent || !currentStoryMetadata) {
        return <></>
    }
    return (
        <>
            <FlexCol style={{ gap: '10px' }}>
                <FlexRow style={{ gap: '10px' }}>
                    <LightColorButton
                        style={{ flex: '1 1 50%' }}
                        tabIndex={0}
                        role="button"
                        centered={true}
                        onClick={() => setVisible(true)}
                        aria-label="View Current Context"
                    >
                        Edit Ephemeral Context
                    </LightColorButton>
                </FlexRow>
                <FlexRow style={{ gap: '10px' }}>
                    {currentStoryContent.ephemeralContext
                        .filter((e) => isEphemeralEntryActive(e, currentStoryContent.getStoryStep()))
                        .map((e, i) => {
                            return e !== null ? (
                                <SidebarListItem key={i}>{e.text.replace(/\n/g, '\\n')}</SidebarListItem>
                            ) : (
                                <></>
                            )
                        })}
                </FlexRow>
            </FlexCol>
            <Modal
                label="Ephemeral Context"
                icon={false}
                type={ModalType.Compact}
                isOpen={visible}
                onRequestClose={() => {
                    setVisible(false)
                    setSelectedEntry(-1)
                    setEntryInput('')
                }}
                shouldCloseOnOverlayClick={true}
            >
                <Content>
                    <ScreenreaderToggle notShown={true}>
                        <blockquote aria-live="assertive">
                            {confirmDelete >= 0 ? 'Press again to confirm deletion' : ''}
                        </blockquote>
                    </ScreenreaderToggle>

                    <p>{`Ephemeral context entries let you insert context based on the current 'step' of the story. They can be \
                    entered in the format {step+delay~duration,position:text} with all but 'text' being numbers. Only the \
                    position and text are required.`}</p>
                    <p>{`Example:
                    The ephemeral context entry {+3~10,-2:Example} would place the text \
                    'Example' 1 newline from the bottom of the \
                    context for 10 steps after a delay of 3 steps.`}</p>
                    <div>Current Story Step: {currentStoryContent.getStoryStep()}</div>
                    <input
                        placeholder="Add ephemeral context entry"
                        type="text"
                        value={entryInput}
                        onChange={(e) => {
                            setEntryInput(e.target.value)
                        }}
                        onKeyDown={(e) => {
                            if (!currentStoryMetadata || !currentStoryContent) {
                                return
                            }
                            if (
                                e.key === 'Enter' &&
                                /^{!?(-?\d+)?(\+\d+r?)?(~\d+)?,?([+-]?\d+):.+}$/.test(entryInput)
                            ) {
                                if (selectedEntry < 0) {
                                    currentStoryContent.ephemeralContext.push(
                                        buildEphemeralContext(entryInput, currentStoryContent.getStoryStep())
                                    )
                                    setStoryUpdate(currentStoryMetadata.save())
                                    setEntryInput('')
                                    return
                                } else {
                                    currentStoryContent.ephemeralContext[selectedEntry] =
                                        buildEphemeralContext(entryInput, currentStoryContent.getStoryStep())

                                    setStoryUpdate(currentStoryMetadata.save())
                                    setSelectedEntry(-1)
                                    setEntryInput('')
                                }
                            }
                        }}
                    />
                    <ListContainer>
                        {currentStoryContent.ephemeralContext.map((e, i) => {
                            return (
                                <EphemeralListItem
                                    selected={i === selectedEntry}
                                    onClick={() => {
                                        if (i === selectedEntry) {
                                            setSelectedEntry(-1)
                                            setEntryInput('')
                                        } else {
                                            setSelectedEntry(i)
                                            setEntryInput(entryToText(e))
                                        }
                                    }}
                                    confirmDelete={i === confirmDelete}
                                    onDelete={() => {
                                        setSelectedEntry(-1)
                                        setEntryInput('')
                                        if (confirmDelete !== i) {
                                            setConfirmDelete(i)
                                            return
                                        }
                                        setConfirmDelete(-1)
                                        currentStoryContent.ephemeralContext = [
                                            ...currentStoryContent.ephemeralContext.slice(0, i),
                                            ...currentStoryContent.ephemeralContext.slice(i + 1),
                                        ]
                                        setStoryUpdate(currentStoryMetadata.save())
                                    }}
                                    unsetDelete={() => setConfirmDelete(-1)}
                                    key={i}
                                    entry={e}
                                    step={currentStoryContent.getStoryStep()}
                                />
                            )
                        })}
                    </ListContainer>
                </Content>
            </Modal>
        </>
    )
}

const SidebarListItem = styled.div`
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
    color: ${(props) => props.theme.colors.textHeadings};
`

const Content = styled.div`
    max-width: calc(100vw - 70px);

    @media (min-width: ${(props) => props.theme.breakpoints.mobile}) {
        width: 700px;
    }

    display: flex;
    flex-direction: column;
    /* for Firefox */
    min-height: 0;
    max-width: calc(100vw - 60px);
`

const ListItem = styled.div<{ selected: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    ${(props) => (props.selected ? 'background: ' + props.theme.colors.bg0 + ' !important' : '')};
`

const ListContainer = styled.div`
    max-width: calc(100vw - 60px);

    @media (min-width: ${(props) => props.theme.breakpoints.mobile}) {
        width: 700px;
    }
    height: 400px;
    display: flex;
    flex-direction: column;
    /* for Firefox */
    min-height: 0;
    margin: 10px 0;
    overflow-y: auto;
    > div:nth-child(2n-1) {
        background: ${(props) => props.theme.colors.bg1};
    }
    flex-grow: 1;
    position: relative;
`

const ListText = styled(SubtleButton)<{ active: boolean }>`
    padding: 0 0 0 5px;
    height: 100%;
    width: 100%;
    color: ${(props) => (!props.active ? props.theme.colors.textMain : props.theme.colors.textHeadings)};
    display: flex;
    align-items: center;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
    > span {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow-x: hidden;
    }
`

const ListDelete = styled(ListEntryDelete)`
    position: relative;
    bottom: 0;
    right: 0;
    flex-shrink: 0;
    margin: 0;
`

function EphemeralListItem(props: {
    entry: EphemeralEntry
    step: number
    selected: boolean
    onClick: () => void
    onDelete: () => void
    confirmDelete: boolean
    unsetDelete: () => void
}): JSX.Element {
    if (props.entry === null) {
        return <></>
    }
    return (
        <ListItem selected={props.selected}>
            <ListText onClick={props.onClick} active={isEphemeralEntryActive(props.entry, props.step)}>
                <span>
                    step: {props.entry.startingStep}; {props.entry.reverse ? 'reverse; ' : ''}
                    {props.entry.delay !== 1 ? 'delay: ' + props.entry.delay + '; ' : ''}
                    {props.entry.duration !== 1 ? 'duration: ' + props.entry.duration + '; ' : ''}
                    {props.entry.repeat ? 'repeat;' : ''} pos: {props.entry.contextConfig.insertionPosition}{' '}
                    text: {props.entry.text.replace(/\n/g, '\\n')}
                </span>
            </ListText>
            <ListDelete
                isConfirmDelete={props.confirmDelete}
                onClick={props.onDelete}
                aria-label="delete"
                onBlur={props.unsetDelete}
            >
                {props.confirmDelete ? <div>Delete</div> : <ListEntryDeleteIcon />}
            </ListDelete>
        </ListItem>
    )
}
