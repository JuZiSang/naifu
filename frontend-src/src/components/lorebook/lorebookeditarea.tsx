import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { isRegexKey, LoreEntry } from '../../data/ai/loreentry'
import { GlobalUserContext } from '../../globals/globals'
import {
    LorebookCategoryTabs,
    LorebookEntryTabs,
    LorebookTabs,
    SelectedStory,
    StoryUpdate,
} from '../../globals/state'
import {
    LorebookEditor,
    DisplayInput,
    EditAreaContents as EditAreaContents,
    EditAreaTop,
    EditAreaBottom,
    SidebarToggle,
    MobileTop,
    RegularTop,
    EditAreaTabs,
    EditAreaTab,
    EditAreaTabContent,
    FakeAreaTab,
    DockText,
    EditAreaPinnedTabContent,
} from '../../styles/components/lorebook'
import { BookIcon, ArrowRightIcon, DockIcon } from '../../styles/ui/icons'
import { AltCheckbox } from '../controls/checkbox'
import { setLocalStorage } from '../../util/storage'
import { FlexSpaceFull } from '../../styles/ui/layout'
import { useWindowSizeBreakpoint } from '../../hooks/useWindowSize'
import { LorebookTabEntry } from './tabs/entry'
import { LorebookTabContext } from './tabs/context'
import { LorebookTabBias } from './tabs/bias'
import { LorebookTabBlank } from './tabs/blank'

const ENTRY_TABS = [
    {
        name: 'Entry',
        val: LorebookEntryTabs.Entry,
    },
    {
        name: 'Placement',
        val: LorebookEntryTabs.Context,
    },
    {
        name: 'Phrase Bias',
        val: LorebookEntryTabs.Bias,
    },
]

export default function LorebookEditArea(props: {
    entry: LoreEntry | null
    setSearchVisible: (b: boolean) => void
    searchVisible: boolean
    isConfirmDelete: boolean
    onDeleteClick: () => void
    unsetDelete: () => void
    duplicateEntry: () => void
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const timeout = useRef<NodeJS.Timeout | null>(null)
    const [lorebookTabs, setLorebookTabs] = useRecoilState(LorebookTabs)
    const window = useWindowSizeBreakpoint(1600, 0)
    const pinAllowed = window.width > 1600
    const pinned = !!(lorebookTabs.pinnedEntry || lorebookTabs.pinnedCategory) && pinAllowed

    const delaySave = useCallback(() => {
        if (timeout.current !== null) {
            clearTimeout(timeout.current)
        }
        timeout.current = setTimeout(() => {
            if (currentStoryMetadata) {
                setStoryUpdate(currentStoryMetadata.save())
            }
        }, 750)
    }, [currentStoryMetadata, setStoryUpdate])

    useEffect(() => {
        if (!props.entry) {
            setDisplayNameInput('')
            setEnabledInput(false)
            return
        }
        setDisplayNameInput(props.entry.displayName)
        setEnabledInput(props.entry.enabled)
    }, [props.entry])

    const [displayNameInput, setDisplayNameInput] = useState('')
    const setDisplayName = (displayName: string) => {
        if (props.entry && currentStoryMetadata) {
            setDisplayNameInput(displayName)
            props.entry.displayName = displayName
            props.entry.lastUpdatedAt = new Date()
            delaySave()
        }
    }

    const [enabledInput, setEnabledInput] = useState(false)
    const setEnabled = (state: boolean) => {
        if (props.entry && currentStoryMetadata) {
            props.entry.enabled = state
            setEnabledInput(state)
            delaySave()
        }
    }

    const tabsElements: JSX.Element[] = useMemo(() => {
        return ENTRY_TABS.filter((t) => !pinned || t.val !== lorebookTabs.pinnedEntry).map((t) => (
            <EditAreaTab
                key={t.val}
                selected={lorebookTabs.entry === t.val}
                onClick={() => {
                    setLorebookTabs((v) => {
                        const newTabs = { ...v, entry: t.val }
                        setLocalStorage('lorebookTabs', JSON.stringify(newTabs))
                        return newTabs
                    })
                }}
            >
                {t.name}
            </EditAreaTab>
        ))
    }, [lorebookTabs.entry, lorebookTabs.pinnedEntry, pinned, setLorebookTabs])

    const getElement = useCallback(
        (tab: LorebookEntryTabs) => {
            switch (tab) {
                case LorebookEntryTabs.Context:
                    return <LorebookTabContext entry={props.entry} />
                case LorebookEntryTabs.Bias:
                    return <LorebookTabBias entry={props.entry} />
                case LorebookEntryTabs.Entry:
                    return (
                        <LorebookTabEntry
                            entry={props.entry}
                            save={delaySave}
                            setDisplayNameInput={setDisplayNameInput}
                        />
                    )
                default:
                    return
            }
        },
        [delaySave, props.entry]
    )

    const tabElement: JSX.Element | undefined = useMemo(() => {
        return getElement(lorebookTabs.entry) ?? <LorebookTabBlank />
    }, [getElement, lorebookTabs.entry])

    const pinnedElement: JSX.Element | undefined = useMemo(() => {
        return getElement(lorebookTabs.pinnedEntry)
    }, [getElement, lorebookTabs.pinnedEntry])

    const [transition, setTransition] = useState(false)
    const [transitionRemove, setTransitionRemove] = useState(false)

    if (props.entry === null) {
        return <></>
    }

    return (
        <LorebookEditor
            pinned={pinned}
            style={
                transition || transitionRemove
                    ? {
                          transition: 'max-width 0.2s ease-in-out',
                      }
                    : {}
            }
        >
            <EditAreaTop>
                <MobileTop>
                    <SidebarToggle onClick={() => props.setSearchVisible(!props.searchVisible)}>
                        <BookIcon></BookIcon>
                        <ArrowRightIcon></ArrowRightIcon>
                    </SidebarToggle>
                </MobileTop>
                <RegularTop>
                    <DisplayInput
                        placeholder="Display Name"
                        type="text"
                        disabled={props.entry === null}
                        value={displayNameInput}
                        onChange={(e) => setDisplayName(e.target.value)}
                    ></DisplayInput>
                    <AltCheckbox
                        value={enabledInput}
                        setValue={setEnabled}
                        disabled={props.entry === null}
                        label="Enable Lorebook Entry"
                        text={'Enabled'}
                        offText={'Disabled'}
                    />
                </RegularTop>
            </EditAreaTop>
            <EditAreaBottom>
                <PinnableArea
                    tabs={tabsElements}
                    selectedTab={tabElement}
                    pinnedTab={pinnedElement}
                    pinnedName={ENTRY_TABS.find((t) => t.val === lorebookTabs.pinnedEntry)?.name ?? 'Unknown'}
                    pinTab={() => {
                        setLorebookTabs((v) => {
                            const newTabs = {
                                ...v,
                                entry: v.entry !== ENTRY_TABS[0].val ? ENTRY_TABS[0].val : ENTRY_TABS[1].val,
                                pinnedEntry: v.entry,
                            }
                            setLocalStorage('lorebookTabs', JSON.stringify(newTabs))
                            return newTabs
                        })
                    }}
                    transition={transition}
                    setTransition={setTransition}
                    transitionRemove={transitionRemove}
                    setTransitionRemove={setTransitionRemove}
                />
            </EditAreaBottom>
        </LorebookEditor>
    )
}

export function PinnableArea(props: {
    tabs: JSX.Element[]
    selectedTab: JSX.Element | undefined
    pinnedTab: JSX.Element | undefined
    pinnedName: string
    category?: boolean
    pinTab: () => void
    transition: boolean
    setTransition: (b: boolean) => void
    transitionRemove: boolean
    setTransitionRemove: (b: boolean) => void
}): JSX.Element {
    const [lorebookTabs, setLorebookTabs] = useRecoilState(LorebookTabs)
    const window = useWindowSizeBreakpoint(1600, 0)
    const pinAllowed = window.width > 1600
    const pinned = !!(lorebookTabs.pinnedEntry || lorebookTabs.pinnedCategory) && pinAllowed
    return (
        <>
            <EditAreaContents>
                <EditAreaTabs>
                    {props.tabs}
                    <FlexSpaceFull style={{ height: 44 }} />
                    {pinAllowed && (
                        <DockText
                            onClick={() => {
                                props.pinTab()
                                props.setTransition(true)
                                setTimeout(() => props.setTransition(false), 300)
                            }}
                        >
                            <DockIcon />
                            {(props.category && lorebookTabs.pinnedCategory) ||
                            (!props.category && lorebookTabs.pinnedEntry)
                                ? 'Replace docked tab'
                                : 'Dock active tab to side'}
                        </DockText>
                    )}
                </EditAreaTabs>
                <EditAreaTabContent
                    style={{
                        paddingRight: pinned ? '30px' : '0',
                        opacity: props.transition ? 0 : 1,
                        transition: props.transition ? 'opacity 0s ease-in-out' : 'opacity 0.2s ease-in-out',
                    }}
                >
                    {props.selectedTab}
                </EditAreaTabContent>
            </EditAreaContents>
            {pinned && (
                <EditAreaContents>
                    {props.pinnedTab ? (
                        <>
                            <EditAreaTabs>
                                <FakeAreaTab>{props.pinnedName} (docked)</FakeAreaTab>
                                <DockText
                                    onClick={() => {
                                        setLorebookTabs((v) => {
                                            const newTabs = {
                                                ...v,
                                                pinnedEntry: LorebookEntryTabs.None,
                                                pinnedCategory: LorebookCategoryTabs.None,
                                            }
                                            setLocalStorage('lorebookTabs', JSON.stringify(newTabs))
                                            return newTabs
                                        })
                                        props.setTransitionRemove(true)
                                        setTimeout(() => props.setTransitionRemove(false), 300)
                                    }}
                                >
                                    Undock
                                </DockText>
                            </EditAreaTabs>
                            <EditAreaPinnedTabContent
                                style={{
                                    opacity: props.transition ? 0 : 1,
                                    transition:
                                        props.transition || props.transitionRemove
                                            ? 'opacity 0.2s ease-in-out'
                                            : 'opacity 0.2s ease-in-out',
                                }}
                            >
                                {props.pinnedTab}
                            </EditAreaPinnedTabContent>
                        </>
                    ) : (
                        <EditAreaPinnedTabContent>
                            <LorebookTabBlank />
                        </EditAreaPinnedTabContent>
                    )}
                </EditAreaContents>
            )}
        </>
    )
}
export const addKeyToEntry = (
    key: string,
    entry: LoreEntry,
    save: () => void,
    setDisplayName: (name: string) => void
): void => {
    if (key.length > 250) {
        key = key.slice(0, 250)
    }
    if (!entry.keys.includes(key) && key !== '') {
        if (isRegexKey(key).isRegex) {
            entry.keys.push(key)
        } else {
            const keys = key.split(/, ?/)
            for (const key of keys) {
                if (entry.displayName === 'New Lorebook Entry') {
                    entry.displayName = key.trim()
                    setDisplayName(key.trim())
                }
                const trimmedKey = key.trim().toLocaleLowerCase()
                if (!entry.keys.includes(trimmedKey)) {
                    entry.keys.push(key.trim())
                }
            }
        }

        entry.lastUpdatedAt = new Date()
        save()
    }
}
