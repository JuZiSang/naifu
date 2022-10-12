import { useState, useEffect, useRef, Suspense, lazy, MutableRefObject } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { LoreEntry } from '../../data/ai/loreentry'
import { subscribeToHotEvent, HotEvent, HotEventSub } from '../../data/user/hotkeys'
import { GlobalUserContext } from '../../globals/globals'

import {
    LorebookGenerateOpen,
    LorebookOpen,
    LorebookTabs,
    SelectedLorebookEntry,
    SelectedStory,
    TutorialState,
} from '../../globals/state'
import {
    LorebookSearch,
    SearchContainer,
    SearchContainerInner,
    StyledLorebookModal,
} from '../../styles/components/lorebook'
import { BookIcon } from '../../styles/ui/icons'
import Book from '../../assets/images/book.svg'
import { LightColorButton } from '../../styles/ui/button'
import Modal, { ModalType } from '../modals/modal'
import { TutorialStates } from '../tutorial'
import { LoadingSpinner } from '../loading'
import { getLocalStorage } from '../../util/storage'
import { useWindowSizeBreakpoint } from '../../hooks/useWindowSize'
import { LoreSidebarEntry } from './lorebookitems'

const LorebookModal = lazy(() => import('./lorebookmodal'))

export function Lorebook(): JSX.Element {
    const [lorebookVisible, setLorebookVisible] = useRecoilState(LorebookOpen)
    const selectedStory = useRecoilValue(SelectedStory)
    const setSelectedEntry = useSetRecoilState(SelectedLorebookEntry)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const [sidebarSearchValue, setSidebarSearchValue] = useState('')
    const [lorebookTabs, setLorebookTabs] = useRecoilState(LorebookTabs)
    const window = useWindowSizeBreakpoint(1600, 0)
    const pinAllowed = window.width > 1600
    const pinned = !!(lorebookTabs.pinnedEntry || lorebookTabs.pinnedCategory) && pinAllowed

    useEffect(() => {
        try {
            const str = getLocalStorage('lorebookTabs')
            if (!str) {
                return
            }
            const json = JSON.parse(str)
            setLorebookTabs(json)
        } catch {
            // it's probably fine
        }
    }, [setLorebookTabs])

    const hotLorebookToggleRef = useRef<any>()
    const hotLorebookCloseRef = useRef<any>()

    const hotLorebookToggle = () => {
        setLorebookVisible(!lorebookVisible)
        return true
    }
    hotLorebookToggleRef.current = hotLorebookToggle

    const hotLorebookClose = () => {
        setLorebookVisible(false)
        return true
    }
    hotLorebookCloseRef.current = hotLorebookClose

    useEffect(() => {
        subscribeToHotEvent(HotEvent.lorebook, new HotEventSub('lbT', hotLorebookToggleRef))
        subscribeToHotEvent(HotEvent.closeModal, new HotEventSub('lbC', hotLorebookCloseRef))
    }, [])

    const closeLorebook = () => {
        setLorebookVisible(false)
    }

    const tutorialState = useRecoilValue(TutorialState)
    const setGenerateShown = useSetRecoilState(LorebookGenerateOpen)

    const searchKey: MutableRefObject<null | HTMLInputElement> = useRef(null)

    let sidebarEntries: LoreEntry[] = []
    if (sidebarSearchValue != '')
        sidebarEntries = [...(currentStoryContent?.lorebook.entries ?? [])]
            .sort((a, b) => {
                return a.displayName.localeCompare(b.displayName)
            })
            .filter((entry: LoreEntry) => {
                let include = false
                include =
                    include ||
                    entry.displayName?.toLocaleLowerCase().includes(sidebarSearchValue.toLocaleLowerCase())
                for (const key of entry.keys) {
                    include =
                        include || key?.toLocaleLowerCase().includes(sidebarSearchValue.toLocaleLowerCase())
                }
                return include
            })
            .slice(0, 3)

    return (
        <>
            <SearchContainer>
                <SearchContainerInner>
                    <LorebookSearch>
                        <input
                            type="text"
                            value={sidebarSearchValue}
                            ref={searchKey}
                            onChange={(event) => {
                                setSidebarSearchValue(event.target.value)
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setSidebarSearchValue('')
                                    searchKey.current?.blur()
                                    event.stopPropagation()
                                }
                            }}
                            placeholder="Search for an entry"
                        ></input>
                    </LorebookSearch>
                    <LightColorButton
                        tabIndex={0}
                        role="button"
                        onClick={() => {
                            if (tutorialState.state === TutorialStates.ADVANCED_TUTORIAL) {
                                setTimeout(() => tutorialState.next(), 100)
                                setSelectedEntry('74180e75-5c1d-415c-9b35-8dd7cb7428f3')
                                setGenerateShown(false)
                            }
                            setLorebookVisible(true)
                        }}
                        aria-label="Open Lorebook"
                    >
                        <BookIcon style={{ height: '14px' }} />
                    </LightColorButton>
                </SearchContainerInner>
                {currentStoryContent ? (
                    sidebarEntries.map((entry, index) => {
                        return (
                            <LoreSidebarEntry
                                lore={entry}
                                key={entry.displayName + entry.keys.join('') + index}
                            />
                        )
                    })
                ) : (
                    <></>
                )}
            </SearchContainer>
            <Modal
                type={ModalType.Large}
                iconUrl={Book}
                label="Lorebook"
                isOpen={lorebookVisible}
                onRequestClose={closeLorebook}
                shouldCloseOnOverlayClick={true}
                style={{ height: '100%', maxWidth: '100%' }}
            >
                <Suspense
                    fallback={
                        <StyledLorebookModal
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-around',
                                width: pinned ? 1644 : 1136,
                            }}
                        >
                            <LoadingSpinner visible={true} />
                        </StyledLorebookModal>
                    }
                >
                    <LorebookModal />
                </Suspense>
            </Modal>
        </>
    )
}
