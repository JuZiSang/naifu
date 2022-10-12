import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSetRecoilState, useRecoilValue, useRecoilState } from 'recoil'
import { GlobalUserContext } from '../../globals/globals'
import { LorebookCategoryTabs, LorebookTabs, SelectedStory, StoryUpdate } from '../../globals/state'
import { LorebookCategory as LorebookCategoryData } from '../../data/story/lorebook'
import {
    LorebookEditor,
    DisplayInput,
    EditAreaTop,
    EditAreaBottom,
    SidebarToggle,
    MobileTop,
    RegularTop,
    EditAreaTab,
} from '../../styles/components/lorebook'
import { BookIcon, ArrowRightIcon } from '../../styles/ui/icons'
import { AltCheckbox } from '../controls/checkbox'
import { setLocalStorage } from '../../util/storage'
import { useWindowSizeBreakpoint } from '../../hooks/useWindowSize'
import { LorebookTabCategoryBias } from './tabs/categorybias'
import { LorebookTabCategorySubcontext } from './tabs/categorysubcontext'
import { PinnableArea } from './lorebookeditarea'
import { LorebookTabCategoryDefaults } from './tabs/categorydefaults'
import { LorebookTabBlank } from './tabs/blank'

const CATEGORY_TABS = [
    {
        name: 'Defaults',
        val: LorebookCategoryTabs.Defaults,
    },
    {
        name: 'Subcontext',
        val: LorebookCategoryTabs.Subcontext,
    },
    {
        name: 'Phrase Bias',
        val: LorebookCategoryTabs.Bias,
    },
]

export function CategoryEditArea(props: {
    category: LorebookCategoryData | null
    setSearchVisible: (b: boolean) => void
    searchVisible: boolean
    isConfirmDelete: boolean
    onDeleteClick: () => void
    unsetDelete: () => void
}): JSX.Element {
    const [displayNameInput, setDisplayNameInput] = useState('')
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
        if (!props.category) {
            setDisplayNameInput('')
            setEnabledInput(false)
            return
        }
        setDisplayNameInput(props.category.name)
        setEnabledInput(props.category.enabled)
    }, [props.category])

    const setDisplayName = (displayName: string) => {
        if (props.category && currentStoryMetadata) {
            setDisplayNameInput(displayName)
            props.category.name = displayName
            delaySave()
        }
    }

    const [enabledInput, setEnabledInput] = useState(false)
    const setEnabled = (state: boolean) => {
        if (props.category && currentStoryMetadata) {
            props.category.enabled = state
            setEnabledInput(state)
            delaySave()
        }
    }

    const tabsElements: JSX.Element[] = useMemo(() => {
        return CATEGORY_TABS.filter((t) => !pinned || t.val !== lorebookTabs.pinnedCategory).map((t) => (
            <EditAreaTab
                key={t.val}
                selected={lorebookTabs.category === t.val}
                onClick={() => {
                    setLorebookTabs((v) => {
                        const newTabs = { ...v, category: t.val }
                        setLocalStorage('lorebookTabs', JSON.stringify(newTabs))
                        return newTabs
                    })
                }}
            >
                {t.name}
            </EditAreaTab>
        ))
    }, [lorebookTabs.category, lorebookTabs.pinnedCategory, pinned, setLorebookTabs])

    const getElement = useCallback(
        (tab: LorebookCategoryTabs) => {
            switch (tab) {
                case LorebookCategoryTabs.Subcontext:
                    return <LorebookTabCategorySubcontext category={props.category} save={delaySave} />
                case LorebookCategoryTabs.Bias:
                    return <LorebookTabCategoryBias category={props.category} save={delaySave} />
                case LorebookCategoryTabs.Defaults:
                    return <LorebookTabCategoryDefaults category={props.category} save={delaySave} />
                default:
                    return
            }
        },
        [delaySave, props.category]
    )

    const tabElement: JSX.Element | undefined = useMemo(() => {
        return getElement(lorebookTabs.category) ?? <LorebookTabBlank />
    }, [getElement, lorebookTabs.category])

    const pinnedElement: JSX.Element | undefined = useMemo(() => {
        return getElement(lorebookTabs.pinnedCategory)
    }, [getElement, lorebookTabs.pinnedCategory])

    const [transition, setTransition] = useState(false)
    const [transitionRemove, setTransitionRemove] = useState(false)

    if (props.category === null) {
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
                        disabled={props.category === null}
                        value={displayNameInput}
                        onChange={(e) => setDisplayName(e.target.value)}
                    ></DisplayInput>
                    <AltCheckbox
                        value={enabledInput}
                        setValue={setEnabled}
                        disabled={props.category === null}
                        label="Enable Lorebook Category"
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
                    pinnedName={
                        CATEGORY_TABS.find((t) => t.val === lorebookTabs.pinnedCategory)?.name ?? 'Unknown'
                    }
                    category={true}
                    pinTab={() => {
                        setLorebookTabs((v) => {
                            const newTabs = {
                                ...v,
                                category:
                                    v.category !== CATEGORY_TABS[0].val
                                        ? CATEGORY_TABS[0].val
                                        : CATEGORY_TABS[1].val,
                                pinnedCategory: v.category,
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
