import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import TextareaAutosize from 'react-textarea-autosize'
import { useDrag as useDNDDrag, useDrop as useDNDDrop } from 'react-dnd'
import styled from 'styled-components'
import { LoreEntry } from '../../data/ai/loreentry'
import { GlobalUserContext } from '../../globals/globals'
import { SelectedStory, StoryUpdate } from '../../globals/state'
import {
    ListEntryDelete,
    ListEntryCopyIcon,
    ListEntryDeleteIcon,
    LoreSidebarMain,
    LoreSidebarHeading,
    LoreSidebarEntryStyle,
    LorebookListEntryCategory,
    CategoryArrow,
    CategoryPlus,
} from '../../styles/components/lorebook'
import { LightColorButton, SubtleButton } from '../../styles/ui/button'
import { ArrowDownIcon, ArrowUpIcon, ExclamationPointIcon, Icon } from '../../styles/ui/icons'
import { transparentize } from '../../util/colour'
import { LorebookCategory } from '../../data/story/lorebook'
import WarningButton, { WarningButtonStyle } from '../deletebutton'
import { FlexColSpacer } from '../../styles/ui/layout'
import Checkbox, { SmallCheckbox } from '../controls/checkbox'
import LargeTrash from '../../assets/images/large-trash.svg'
import { SmallCheckOuter } from '../../styles/ui/checkbox'
import { isTouchScreenDevice } from '../../util/compat'

export function LoreSidebarEntry(props: { lore: LoreEntry }): JSX.Element {
    const [active, setActive] = useState(false)
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))

    const setText = (text: string) => {
        if (props.lore && currentStoryMetadata) {
            props.lore.text = text
            props.lore.lastUpdatedAt = new Date()
            setStoryUpdate(currentStoryMetadata.save())
        }
    }
    return (
        <LoreSidebarEntryStyle>
            <SubtleButton
                style={{ width: '100%' }}
                onClick={() => {
                    setActive(!active)
                }}
            >
                <LoreSidebarHeading>
                    <div>{props.lore.displayName}</div> {active ? <ArrowUpIcon /> : <ArrowDownIcon />}
                </LoreSidebarHeading>
            </SubtleButton>
            <LoreSidebarMain active={active}>
                {active ? (
                    <TextareaAutosize
                        minRows={3}
                        maxRows={8}
                        cacheMeasurements
                        value={props.lore.text}
                        onChange={(e) => {
                            setText(e.target.value)
                        }}
                    ></TextareaAutosize>
                ) : (
                    <SubtleButton
                        style={{ width: '100%', textAlign: 'left' }}
                        onClick={() => {
                            setActive(!active)
                        }}
                    >
                        {props.lore.text}
                    </SubtleButton>
                )}
            </LoreSidebarMain>
        </LoreSidebarEntryStyle>
    )
}

export function LorebookListItem(props: {
    selected: boolean
    entry: LoreEntry
    isConfirmDelete: boolean
    onClick: () => void
    onDeleteClick: () => void
    onHold: () => void
    unsetDelete: () => void
    duplicateEntry: () => void
    indented?: boolean
}): JSX.Element {
    useEffect(() => {
        const removeConfirmDelete = () => {
            props.unsetDelete()
        }

        if (props.isConfirmDelete) {
            document.addEventListener('click', removeConfirmDelete)
        }
        return () => {
            document.removeEventListener('click', removeConfirmDelete)
        }
    }, [props])

    const timeout = useRef<NodeJS.Timeout | undefined>()

    const [{ isDragging }, drag] = useDNDDrag(() => ({
        type: 'LorebookElement',
        item: () => ({
            id: props.entry.id,
        }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }))

    return (
        <ListEntryContainer ref={drag} style={{ opacity: !isTouchScreenDevice && isDragging ? 0.3 : 1 }}>
            <LorebookListEntry
                aria-label={props.entry.displayName === '' ? 'Unnamed Entry' : props.entry.displayName}
                disabled={!props.entry.enabled}
                selected={props.selected}
            >
                <LorebookListEntryContent
                    indented={props.indented}
                    onClick={() => {
                        props.onClick()
                    }}
                    onTouchStart={() => {
                        timeout.current = setTimeout(() => {
                            props.onHold()
                        }, 500)
                    }}
                    onTouchEnd={() => {
                        if (timeout.current) clearTimeout(timeout.current)
                    }}
                    onTouchMove={() => {
                        if (timeout.current) clearTimeout(timeout.current)
                    }}
                >
                    <Name>{props.entry.displayName === '' ? 'Unnamed Entry' : props.entry.displayName}</Name>
                    <Keys>
                        {props.entry.forceActivation ? (
                            <em>always on</em>
                        ) : props.entry.keys.length > 0 ? (
                            props.entry.keys.join(', ')
                        ) : (
                            <NoKeyError>
                                <div>
                                    <ExclamationPointIcon />
                                </div>
                                <div>&nbsp;&nbsp;Entry has no keys.</div>
                            </NoKeyError>
                        )}
                    </Keys>
                </LorebookListEntryContent>
                {props.selected && (
                    <QuickAccessButtons>
                        <ListEntryDelete
                            aria-label={`Delete Lorebook Entry "${props.entry.displayName}"`}
                            isConfirmDelete={props.isConfirmDelete}
                            onClick={(e) => {
                                props.onDeleteClick()
                                e.stopPropagation()
                            }}
                            onBlur={props.unsetDelete}
                        >
                            {props.isConfirmDelete ? <div>Delete</div> : <ListEntryDeleteIcon />}
                        </ListEntryDelete>
                        <LightColorButton aria-label="Duplicate Entry" onClick={() => props.duplicateEntry()}>
                            <ListEntryCopyIcon />
                        </LightColorButton>
                    </QuickAccessButtons>
                )}
            </LorebookListEntry>
        </ListEntryContainer>
    )
}

export function LorebookSelectItem(props: {
    selected: boolean
    entry: LoreEntry
    onClick: () => void
    indented?: boolean
}): JSX.Element {
    return (
        <ListEntryContainer>
            <LorebookEntrySelectContent indented={props.indented} selected={props.selected}>
                <Name>{props.entry.displayName === '' ? 'Unnamed Entry' : props.entry.displayName}</Name>
                <SmallCheckbox
                    label={`Toggle selection of entry ${props.entry.displayName}`}
                    displayText={false}
                    value={props.selected}
                    setValue={() => props.onClick()}
                    noLabel={true}
                />
            </LorebookEntrySelectContent>
        </ListEntryContainer>
    )
}

export function LorebookCategoryListItem(props: {
    children: JSX.Element[]
    category: LorebookCategory
    addEntry: () => void
    selectCategory: () => void
    selected: boolean
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))

    const [expanded, setExpanded] = useState(true)
    useEffect(() => {
        setExpanded(props.category.open ?? true)
    }, [props.category.open])

    const [{ isOver, canDrop }, drop] = useDNDDrop(
        () => ({
            accept: 'LorebookElement',
            drop: (item: { id: string }) => {
                if (!currentStoryContent || !currentStoryMetadata) {
                    return
                }
                const entry = currentStoryContent.lorebook.entries.find((e) => e.id === item.id)
                if (entry) {
                    entry.category = props.category.id
                    setStoryUpdate(currentStoryMetadata.save())
                }
            },
            collect: (monitor) => ({
                isOver: monitor.isOver(),
                canDrop: monitor.canDrop(),
            }),
        }),
        [props.category]
    )

    const [deleteContainingEntries, setDeleteContainingEntries] = useState(false)

    const deleteCategory = (deleteContainingEntries: boolean = false) => {
        if (!currentStoryContent || !currentStoryMetadata || props.category === null) return
        const index = currentStoryContent.lorebook.categories.findIndex((c) => {
            if (props.category === null) return false
            return c.id === props.category.id
        })
        if (index < 0) {
            return
        }
        if (deleteContainingEntries) {
            const outOfCategory = []
            for (const entry of currentStoryContent.lorebook.entries) {
                if (entry.category !== props.category.id) {
                    outOfCategory.push(entry)
                }
            }
            currentStoryContent.lorebook.entries = outOfCategory
        } else {
            for (const entry of currentStoryContent.lorebook.entries) {
                if (entry.category === props.category.id) {
                    entry.category = ''
                }
            }
        }
        currentStoryContent.lorebook.categories = [
            ...currentStoryContent.lorebook.categories.slice(0, index),
            ...currentStoryContent.lorebook.categories.slice(index + 1),
        ]
        setStoryUpdate(currentStoryMetadata.save())
    }

    const timeout = useRef<NodeJS.Timeout | undefined>()

    if (!currentStoryContent || !currentStoryMetadata) {
        return <></>
    }

    return (
        <LorebookListEntryCategory opaque={!props.category.enabled} key={props.category.id} ref={drop}>
            <CategoryContainer selected={props.selected} drop={isOver && canDrop}>
                <CategoryHeader
                    onClick={(e) => {
                        if (e.ctrlKey) {
                            setExpanded((v) => !v)
                            setStoryUpdate(currentStoryMetadata.save())
                            return
                        }
                        props.selectCategory()
                    }}
                    onTouchStart={() => {
                        timeout.current = setTimeout(() => {
                            props.selectCategory()
                        }, 500)
                    }}
                    onTouchEnd={() => {
                        if (timeout.current) clearTimeout(timeout.current)
                    }}
                    onTouchMove={() => {
                        if (timeout.current) clearTimeout(timeout.current)
                    }}
                >
                    <div>
                        <div> {props.category.name === '' ? 'Unnamed Category' : props.category.name}</div>
                        <div>
                            <div
                                role="button"
                                tabIndex={0}
                                style={{ padding: '5px 7px' }}
                                aria-label="Add Entry to Category"
                                onClick={(e) => {
                                    props.addEntry()
                                    setExpanded(true)
                                    e.stopPropagation()
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        props.addEntry()
                                        setExpanded(true)
                                    }
                                }}
                            >
                                <CategoryPlus style={{ width: '1rem' }} />
                            </div>
                            <div
                                role="button"
                                tabIndex={0}
                                style={{ padding: '5px 7px' }}
                                aria-label={expanded ? 'Minimize Category' : 'Expand Category'}
                                onClick={(e) => {
                                    setExpanded(!expanded)
                                    props.category.open = !expanded
                                    setStoryUpdate(currentStoryMetadata.save())
                                    e.stopPropagation()
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setExpanded(!expanded)
                                        props.category.open = !expanded
                                        setStoryUpdate(currentStoryMetadata.save())
                                    }
                                }}
                            >
                                <CategoryArrow up={expanded} style={{ width: '1rem' }} />
                            </div>
                        </div>
                    </div>
                    <CategoryEntryCount>{props.children.length} entries</CategoryEntryCount>
                </CategoryHeader>
                {props.selected && (
                    <QuickAccessButtons>
                        <WarningButton
                            confirmButtonText="Delete it!"
                            style={{ width: 'unset' }}
                            buttonType={WarningButtonStyle.Light}
                            warningColors
                            onConfirm={() => {
                                deleteCategory(deleteContainingEntries)
                            }}
                            iconURL={LargeTrash.src}
                            warningText={
                                <>
                                    Are you sure you want to delete the category {'"'}
                                    {props.category.name}
                                    {'"'}?
                                    <br />
                                    This cannot be reversed.
                                    <FlexColSpacer min={40} max={40} />
                                    <Checkbox
                                        label={'Delete Containing Entries'}
                                        checkedText={
                                            'Deleting the category will also delete all entries within it.'
                                        }
                                        uncheckedText={
                                            'Deleting the category will move all entries out of the category.'
                                        }
                                        value={deleteContainingEntries}
                                        setValue={setDeleteContainingEntries}
                                    />
                                </>
                            }
                            label="Delete Category?"
                            buttonText={<ListEntryDeleteIcon />}
                        />
                    </QuickAccessButtons>
                )}
            </CategoryContainer>
            {expanded ? props.children : <></>}
        </LorebookListEntryCategory>
    )
}

export function LorebookCategorySelectItem(props: {
    children: JSX.Element[]
    category: LorebookCategory
    selectCategory: (ctrl: boolean) => void
    selected: boolean
}): JSX.Element {
    return (
        <LorebookListEntryCategory opaque={false} key={props.category.id}>
            <CategorySelect selected={props.selected}>
                <div>
                    <div> {props.category.name === '' ? 'Unnamed Category' : props.category.name}</div>
                </div>
                <SmallCheckbox
                    label={`Toggle selection of category ${props.category.name}`}
                    displayText={false}
                    value={props.selected}
                    setValue={(b, e) => {
                        props.selectCategory((e.nativeEvent as PointerEvent | KeyboardEvent).ctrlKey)
                    }}
                    noLabel={true}
                />
            </CategorySelect>
            {props.children}
        </LorebookListEntryCategory>
    )
}

export const ListEntryContainer = styled.div`
    position: relative;
`

const LorebookListEntryContent = styled(SubtleButton)<{ indented?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: baseline;
    padding: 10px 10px 10px 20px;
    ${(props) => (props.indented ? 'padding-left: 30px;' : '')}
    flex-shrink: 0;
    width: 100%;
`

const LorebookEntrySelectContent = styled.label<{ indented?: boolean; selected?: boolean }>`
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    flex: 1 1 auto;
    width: 100%;

    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 10px 20px 10px 20px;
    ${(props) => (props.indented ? 'padding-left: 30px;' : '')}

    color: ${(props) =>
        props.selected
            ? (props) => props.theme.colors.textHeadings
            : transparentize(0.3, props.theme.colors.textMain)};
    &:hover {
        color: ${(props) => !props.selected && props.theme.colors.textMain};
        ${SmallCheckOuter} {
            background-color: ${(props) =>
                !props.selected && transparentize(0.5, props.theme.colors.textMain)};
        }
    }
    flex-shrink: 0;
    width: 100%;
`

const Name = styled.div`
    font-size: 1rem;
    font-weight: 600;
    font-family: ${(props) => props.theme.fonts.headings};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
`

const Keys = styled.div`
    font-size: 0.9rem;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.5;
    white-space: nowrap;
    width: 100%;
`

const LorebookListEntry = styled.div<{ disabled: boolean; selected: boolean }>`
    min-height: 60px;
    padding: 0px;
    display: flex;
    flex-direction: column;
    font-size: 1rem;
    width: 100%;
    cursor: pointer;
    position: relative;
    opacity: ${(props) => (props.disabled && !props.selected ? ' 0.5' : '1')};

    background: ${(props) => (props.selected ? props.theme.colors.bg2 : props.theme.colors.bg1)};
    ${Name} {
        color: ${(props) =>
            !props.selected
                ? transparentize(0.33, props.theme.colors.textMain)
                : props.theme.colors.textHeadings};
    }
    &:hover {
        ${Name} {
            ${(props) => !props.selected && 'color: ' + props.theme.colors.textMain}
        }
    }
`

const QuickAccessButtons = styled.div<{ indented?: boolean }>`
    display: flex;
    width: 100%;
    > button {
        margin-right: 10px;
        padding: 5px 12px;
        > ${Icon} {
            height: 1.2rem;
            width: 1.2rem;
        }
    }

    padding: 0px 10px 10px 20px;
    ${(props) => (props.indented ? 'padding-left: 30px;' : '')}
`

export const CategoryHeader = styled(SubtleButton)`
    padding: 8px 2px 10px 20px;
    width: 100%;
    > div:first-child {
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;

        > div:first-child {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 0 1 auto;
            display: flex;
            flex-direction: row;
        }
        > div:last-child {
            flex: 0 0 auto;
            display: flex;
            flex-direction: row;
        }
    }
`

export const CategorySelect = styled.label<{ selected?: boolean }>`
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    flex: 1 1 auto;
    width: 100%;

    padding: 8px 20px 10px 20px;
    width: 100%;
    font-size: 1rem;
    font-weight: 600;
    > div:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 0 1 auto;
        display: flex;
        flex-direction: row;
    }

    color: ${(props) =>
        props.selected
            ? (props) => props.theme.colors.textHeadings
            : transparentize(0.3, props.theme.colors.textMain)};
    &:hover {
        color: ${(props) => !props.selected && props.theme.colors.textMain};
        ${SmallCheckOuter} {
            background-color: ${(props) =>
                !props.selected && transparentize(0.5, props.theme.colors.textMain)};
        }
    }
`

export const CategoryContainer = styled.div<{ selected: boolean; drop: boolean }>`
    background: ${(props) =>
        props.drop
            ? props.theme.colors.bg3
            : props.selected
            ? props.theme.colors.bg2
            : props.theme.colors.bg1};
`

export const CategoryEntryCount = styled.div`
    font-size: 0.875rem;
    opacity: 0.5;
    text-align: left;
`

export const NoKeyError = styled.div`
    display: flex;
    align-items: center;
    color: ${(props) => props.theme.colors.warning};

    > :nth-child(1) {
        background-color: ${(props) => props.theme.colors.warning};
        padding: 3px;
        > div {
            background-color: ${(props) => props.theme.colors.bg1};
            width: 0.6rem;
            height: 0.6rem;
        }
    }
`
