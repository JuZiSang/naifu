/* eslint-disable max-len */
import {
    useState,
    useEffect,
    useCallback,
    useRef,
    KeyboardEvent,
    CSSProperties,
    MutableRefObject,
} from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { serialize } from 'serializr'
import { v4 as uuid } from 'uuid'
import { useDrop as useDNDDrop } from 'react-dnd'
import styled from 'styled-components'
import { LoreEntry } from '../../data/ai/loreentry'
import { GlobalUserContext } from '../../globals/globals'
import {
    LorebookOpen,
    LorebookSort,
    SelectedLorebookEntry,
    SelectedStory,
    Session,
    StoryUpdate,
    LorebookSearch as LorebookSearchState,
    SiteTheme,
    LorebookTabs,
} from '../../globals/state'
import {
    LorebookLeft,
    LorebookRight,
    CloseButton,
    StyledLorebookModal,
    LOREBOOK_MOBILE_BREAKPOINT,
    LorebookEditor,
    MobileTop,
    SidebarToggle,
    ListEntryDeleteIcon,
} from '../../styles/components/lorebook'
import {
    SearchIcon,
    PlusIcon,
    BookIcon,
    ExportIcon,
    ImportIcon,
    ArrowLeftIcon,
    Icon,
    FunnelEmptyIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    ImageDownIcon,
    BoxCheckIcon,
    FunnelFilledIcon,
} from '../../styles/ui/icons'
import { LightColorButton, SubtleButton } from '../../styles/ui/button'
import { useWindowSize, useWindowSizeBreakpoint } from '../../hooks/useWindowSize'
import { addTextToPng, isPng, ImportDataType } from '../../data/story/storyconverter'
import { Lorebook as LorebookData, LorebookCategory as LorebookCategoryData } from '../../data/story/lorebook'
import { StoryContent } from '../../data/story/storycontainer'
import { ContextEntry } from '../../data/ai/contextfield'
import { ScreenreaderToggle } from '../../styles/ui/screenreadertoggle'
import { downloadFile, downloadTextFile } from '../../util/browser'
import { deserialize } from '../../util/serialization'
import { FlexCol, FlexColSpacer, FlexRow } from '../../styles/ui/layout'
import { Search } from '../../styles/components/menubar'
import { getDropdownStyle, getDropdownTheme, Select } from '../controls/select'
import LorebookBackground from '../../assets/images/lorebackground.svg'
import { LineBackground } from '../util/lineBackground'
import { SmallCheckbox } from '../controls/checkbox'
import WarningButton, { WarningButtonStyle } from '../deletebutton'
import { transparentize } from '../../util/colour'
import { SmallCheckOuter } from '../../styles/ui/checkbox'
import { FileImporterButtonType, FileImporterOverlayType } from '../controls/fileimporter'
import { AnyFileImporter } from '../modals/storyimporter'
import Sidebar from '../sidebars/common/sidebar'
import { eventBus } from '../../globals/events'
import { createEditorEvent, EditorDecorateEvent } from '../editor/events'
import { getUserSetting } from '../../data/user/settings'
import { CategoryEditArea } from './lorebookcategory'
import {
    LorebookCategoryListItem,
    LorebookCategorySelectItem,
    LorebookListItem,
    LorebookSelectItem,
} from './lorebookitems'
import LorebookEditArea from './lorebookeditarea'

export default function LorebookModal(): JSX.Element {
    const [lorebookVisible, setLorebookVisible] = useRecoilState(LorebookOpen)
    const selectedStory = useRecoilValue(SelectedStory)
    const [selectedEntry, setSelectedEntry] = useRecoilState(SelectedLorebookEntry)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const searchValue = useRecoilValue(LorebookSearchState)
    const order = useRecoilValue(LorebookSort)
    const selectedInputImage = useRef<HTMLInputElement>(null)
    const lorebookInputImage = useRef<HTMLInputElement>(null)
    const [multiselect, setMultiselect] = useState(false)
    const [multiselectedEntries, setMultiselectedEntries] = useState(new Set<string>())
    const [multiselectedCategories, setMultiselectedCategories] = useState(new Set<string>())
    const [confirmDelete, setConfirmDelete] = useState('')
    const session = useRecoilValue(Session)
    const [confirmMobileDelete, setConfirmMobileDelete] = useState(false)

    const closeLorebook = () => {
        setLorebookVisible(false)
    }

    const removeSelectedLorebookEntry = useCallback(() => {
        if (!confirmMobileDelete) {
            setConfirmMobileDelete(true)
            return
        }
        setConfirmMobileDelete(false)
        setSearchVisible(true)
        if (!selectedEntry) return
        if (currentStoryMetadata && currentStoryContent) {
            const index = currentStoryContent.lorebook.entries.findIndex((e) => e.id === selectedEntry)
            if (index === -1) {
                return
            }
            currentStoryContent.lorebook.entries = [
                ...currentStoryContent.lorebook.entries.slice(0, index),
                ...currentStoryContent.lorebook.entries.slice(index + 1),
            ]
            setSelectedEntry('')
            setStoryUpdate(currentStoryMetadata.save())
        }
    }, [
        confirmMobileDelete,
        currentStoryContent,
        currentStoryMetadata,
        selectedEntry,
        setSelectedEntry,
        setStoryUpdate,
    ])

    const removeLorebookEntry = useCallback(
        (entry: LoreEntry) => {
            if (confirmDelete !== entry.id) {
                setConfirmDelete(entry.id)
                return
            }
            setConfirmDelete('')
            if (currentStoryMetadata && currentStoryContent) {
                const index = currentStoryContent.lorebook.entries.indexOf(entry)
                currentStoryContent.lorebook.entries = [
                    ...currentStoryContent.lorebook.entries.slice(0, index),
                    ...currentStoryContent.lorebook.entries.slice(index + 1),
                ]
                if (entry.id === selectedEntry) setSelectedEntry('')
                setStoryUpdate(currentStoryMetadata.save())
            }
        },
        [
            confirmDelete,
            currentStoryContent,
            currentStoryMetadata,
            selectedEntry,
            setSelectedEntry,
            setStoryUpdate,
        ]
    )

    const duplicateEntry = useCallback(() => {
        if (currentStoryMetadata && currentStoryContent) {
            const entry = currentStoryContent.lorebook.entries.find((e) => e.id === selectedEntry)
            if (!entry) return
            const newEntry = deserialize(LoreEntry, serialize(entry) as LoreEntry)
            newEntry.id = uuid()
            newEntry.displayName = newEntry.displayName + ' (Copy)'
            currentStoryContent.lorebook.entries.push(newEntry)
            setSelectedEntry(newEntry.id)
            setStoryUpdate(currentStoryMetadata.save())
            if ((window.visualViewport?.width || window.innerWidth) < 800) {
                setSearchVisible(false)
            }
        }
    }, [currentStoryContent, currentStoryMetadata, selectedEntry, setSelectedEntry, setStoryUpdate])

    const addLorebookEntry = (categoryId: string = '') => {
        if (currentStoryMetadata && currentStoryContent) {
            const newEntry = createLorebookEntry(currentStoryContent, categoryId)
            currentStoryContent.lorebook.entries.push(newEntry)
            setSelectedEntry(newEntry.id)
            setStoryUpdate(currentStoryMetadata.save())
            if ((window.visualViewport?.width || window.innerWidth) < 800) {
                setSearchVisible(false)
            }
        }
    }

    const addLorebookCategory = () => {
        if (currentStoryMetadata && currentStoryContent) {
            const newCategory = new LorebookCategoryData()
            const categoryDefault = LoreEntry.deserialize(
                JSON.stringify(serialize(LoreEntry, currentStoryContent.contextDefaults.loreDefaults[0]))
            )
            categoryDefault.id = uuid()
            categoryDefault.category = ''
            categoryDefault.lastUpdatedAt = new Date()
            newCategory.categoryDefaults = categoryDefault
            const subcontextEntry = new ContextEntry(
                LoreEntry.deserialize(
                    JSON.stringify(serialize(LoreEntry, currentStoryContent.contextDefaults.loreDefaults[0]))
                ).contextConfig
            )
            newCategory.subcontextSettings = subcontextEntry
            currentStoryContent.lorebook.categories.push(newCategory)
            setSelectedEntry(newCategory.id)
            setStoryUpdate(currentStoryMetadata.save())
            if ((window.visualViewport?.width || window.innerWidth) < 800) {
                setSearchVisible(false)
            }
        }
    }

    const entriesMap = new Map<string, LoreEntry[]>()
    for (const category of currentStoryContent?.lorebook.categories.sort((a, b) => {
        return a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase())
    }) ?? []) {
        entriesMap.set(category.id, [])
    }
    for (const entry of currentStoryContent?.lorebook.entries
        .filter((entry) => {
            if (multiselect) return true
            let include = false
            include =
                include || entry.displayName.toLocaleLowerCase().includes(searchValue.toLocaleLowerCase())
            for (const key of entry.keys) {
                if (key)
                    include = include || key.toLocaleLowerCase().includes(searchValue.toLocaleLowerCase())
            }
            return include
        })
        .sort((a, b) => {
            let result = 0
            if (order.by.value === 'recent') {
                result = a.lastUpdatedAt < b.lastUpdatedAt ? 1 : -1
            } else {
                result = a.displayName.toLocaleLowerCase().localeCompare(b.displayName.toLocaleLowerCase())
            }
            return order.reverse ? result * -1 : result
        }) ?? []) {
        const array = entriesMap.get(entry.category) ?? []
        array.push(entry)
        entriesMap.set(entry.category, array)
    }

    const deleteAllSelected = () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        for (const category of multiselectedCategories) {
            // unset category for every entry that had the category set
            for (const entry of currentStoryContent.lorebook.entries.filter(
                (entry) => entry.category === category
            )) {
                entry.category = ''
            }
            // remove the category from the lorebooks category list
            currentStoryContent.lorebook.categories = currentStoryContent.lorebook.categories.filter(
                (c) => c.id !== category
            )
        }
        for (const entry of multiselectedEntries) {
            // remove the entry from the lorebook
            currentStoryContent.lorebook.entries = currentStoryContent.lorebook.entries.filter(
                (e) => e.id !== entry
            )
        }
        setMultiselect(false)
        setMultiselectedCategories(new Set())
        setMultiselectedEntries(new Set())
        setStoryUpdate(currentStoryMetadata.save())
    }

    const lorebookFromSelected = () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        let tempLorebook = new LorebookData()
        // copy selected categories
        tempLorebook.categories = currentStoryContent.lorebook.categories.filter((c) =>
            multiselectedCategories.has(c.id)
        )
        // copy selected entries
        tempLorebook.entries = currentStoryContent.lorebook.entries.filter((e) =>
            multiselectedEntries.has(e.id)
        )
        // clone
        tempLorebook = LorebookData.deserialize(JSON.stringify(serialize(LorebookData, tempLorebook)))
        // remove categories from entries that don't exist in the new lorebook
        for (const entry of tempLorebook.entries) {
            entry.category = multiselectedCategories.has(entry.category) ? entry.category : ''
        }

        return tempLorebook
    }

    const exportAllSelected = () => {
        if (!currentStoryContent || !currentStoryMetadata) return
        const lorebook = lorebookFromSelected()
        if (!lorebook) return
        // export

        // Default name is story name
        let title = currentStoryMetadata.title
        // When the lorebook contains a single entry, use the entry's name
        if (lorebook.entries.length === 1) {
            title = lorebook.entries[0].displayName
        }
        // When the lorebook contains a single category and all entries are in that category the name is the category name
        if (
            lorebook.categories.length === 1 &&
            lorebook.entries.every((e) => e.category === lorebook.categories[0].id)
        ) {
            title = lorebook.categories[0].name
        }

        downloadTextFile(
            lorebook.serialize(true),
            `${title.slice(0, 40)} (${new Date().toDateString()}).lorebook`
        )
        setMultiselect(false)
        setMultiselectedCategories(new Set())
        setMultiselectedEntries(new Set())
    }

    let entryList: any = []
    const noCategory = []
    if (currentStoryContent && currentStoryMetadata && lorebookVisible) {
        for (const [key, value] of entriesMap.entries()) {
            const category = currentStoryContent.lorebook.categories.find((c) => c.id === key)
            if (!category) {
                noCategory.push(...value)
                continue
            }

            const entries = value.map((entry) => {
                return multiselect ? (
                    <LorebookSelectItem
                        selected={multiselectedEntries.has(entry.id)}
                        key={entry.id}
                        onClick={() => {
                            if (multiselectedEntries.has(entry.id)) {
                                setMultiselectedEntries((v) => {
                                    v.delete(entry.id)
                                    return new Set(v)
                                })
                            } else {
                                setMultiselectedEntries((v) => new Set(v.add(entry.id)))
                            }
                        }}
                        indented={true}
                        entry={entry}
                    />
                ) : (
                    <LorebookListItem
                        selected={entry.id === selectedEntry}
                        key={entry.id}
                        entry={entry}
                        isConfirmDelete={entry.id === confirmDelete}
                        onClick={() => {
                            setSelectedEntry(entry.id)
                            if ((window.visualViewport?.width || window.innerWidth) < 800) {
                                setSearchVisible(false)
                            }
                        }}
                        onHold={() => {
                            setSelectedEntry(entry.id)
                        }}
                        onDeleteClick={() => {
                            removeLorebookEntry(entry)
                        }}
                        unsetDelete={() => setConfirmDelete('')}
                        duplicateEntry={duplicateEntry}
                        indented={true}
                    />
                )
            })
            entryList.push(
                multiselect ? (
                    <LorebookCategorySelectItem
                        key={key}
                        category={category}
                        selectCategory={(ctrl) => {
                            if (multiselectedCategories.has(category.id)) {
                                setMultiselectedCategories((v) => {
                                    v.delete(category.id)
                                    // remove all entries within the category from selected
                                    return new Set(v)
                                })
                                if (!ctrl) {
                                    setMultiselectedEntries((v) => {
                                        for (const entry of currentStoryContent.lorebook.entries.filter(
                                            (entry) => entry.category === category.id
                                        )) {
                                            v.delete(entry.id)
                                        }
                                        return new Set(v)
                                    })
                                }
                            } else {
                                setMultiselectedCategories((v) => new Set(v.add(category.id)))
                                // set all entries within category to selected
                                if (!ctrl) {
                                    setMultiselectedEntries((v) => {
                                        for (const entry of currentStoryContent.lorebook.entries.filter(
                                            (e) => e.category === category.id
                                        )) {
                                            v.add(entry.id)
                                        }
                                        return new Set(v)
                                    })
                                }
                            }
                        }}
                        selected={multiselectedCategories.has(category.id)}
                    >
                        {entries}
                    </LorebookCategorySelectItem>
                ) : (
                    <LorebookCategoryListItem
                        key={key}
                        category={category}
                        addEntry={() => addLorebookEntry(category.id)}
                        selectCategory={() => setSelectedEntry(category.id)}
                        selected={category.id === selectedEntry}
                    >
                        {entries}
                    </LorebookCategoryListItem>
                )
            )
        }
        let arr: any = []

        for (const entry of noCategory) {
            arr = [
                ...arr,
                multiselect ? (
                    <LorebookSelectItem
                        selected={multiselectedEntries.has(entry.id)}
                        key={entry.id}
                        onClick={() => {
                            if (multiselectedEntries.has(entry.id)) {
                                setMultiselectedEntries((v) => {
                                    v.delete(entry.id)
                                    return new Set(v)
                                })
                            } else {
                                setMultiselectedEntries((v) => new Set(v.add(entry.id)))
                            }
                        }}
                        indented={true}
                        entry={entry}
                    />
                ) : (
                    <LorebookListItem
                        selected={entry.id === selectedEntry}
                        key={entry.id}
                        entry={entry}
                        isConfirmDelete={entry.id === confirmDelete}
                        onClick={() => {
                            setSelectedEntry(entry.id)
                            if ((window.visualViewport?.width || window.innerWidth) < 800) {
                                setSearchVisible(false)
                            }
                        }}
                        onHold={() => {
                            setSelectedEntry(entry.id)
                        }}
                        onDeleteClick={() => {
                            removeLorebookEntry(entry)
                        }}
                        unsetDelete={() => setConfirmDelete('')}
                        duplicateEntry={duplicateEntry}
                    />
                ),
            ]
        }
        entryList = [...arr, ...entryList]
    }

    const exportLoreBook = () => {
        if (currentStoryContent && currentStoryMetadata) {
            downloadTextFile(
                currentStoryContent.lorebook.serialize(true),
                `${currentStoryMetadata.title.slice(0, 40)} (${new Date().toDateString()}).lorebook`
            )
        }
    }

    const [searchVisible, setSearchVisible] = useState(false)
    const windowSize = useWindowSize()

    useEffect(() => {
        if (windowSize.width > 800 && (!windowSize.prevWidth || windowSize.prevWidth <= 800)) {
            setSearchVisible(true)
        } else if (windowSize.width <= 800 && (!windowSize.prevWidth || windowSize.prevWidth > 800)) {
            setSearchVisible((currentStoryContent?.lorebook.entries.length ?? 0) > 0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowSize.prevWidth, windowSize.width])

    useEffect(() => {
        if (lorebookVisible && (window.visualViewport?.width || window.innerWidth) > 800) {
            setSearchVisible(true)
        } else {
            if (!currentStoryContent) return
            if (getUserSetting(session.settings, 'editorLoreKeys') !== true) return
            eventBus.trigger(createEditorEvent(new EditorDecorateEvent()))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lorebookVisible])

    const selectedLorebookEntry =
        currentStoryContent?.lorebook.entries.find((e) => e.id === selectedEntry) ?? null
    const selectedCategory =
        currentStoryContent?.lorebook.categories.find((e) => e.id === selectedEntry) ?? null

    // eslint-disable-next-line no-empty-pattern
    const [{}, drop] = useDNDDrop(
        () => ({
            accept: 'LorebookElement',
            drop: (item: { id: string }, monitor) => {
                if (!currentStoryContent || !currentStoryMetadata) {
                    return
                }
                if (monitor.didDrop()) {
                    return
                }
                const entry = currentStoryContent.lorebook.entries.find((e) => e.id === item.id)
                if (entry) {
                    entry.category = ''
                    setStoryUpdate(currentStoryMetadata.save())
                }
            },
            collect: () => ({}),
        }),
        [selectedStory]
    )

    const embedLorebook = async (event: any) => {
        if (!currentStoryContent || !currentStoryMetadata || !lorebookInputImage.current) return

        const file = event.target.files
        if (file.length === 0) {
            if (lorebookInputImage.current) lorebookInputImage.current.value = ''
            return
        }
        Promise.allSettled([file[0].arrayBuffer()]).then(async (results) => {
            if (results[0].status !== 'fulfilled') {
                if (lorebookInputImage.current) lorebookInputImage.current.value = ''
                return
            }
            if (!isPng(results[0].value)) {
                if (lorebookInputImage.current) lorebookInputImage.current.value = ''
                return
            }
            let png = results[0].value
            if (!currentStoryContent || !currentStoryMetadata) {
                if (lorebookInputImage.current) lorebookInputImage.current.value = ''
                return
            }
            const lorebook = currentStoryContent.lorebook
            png = await addTextToPng(png, JSON.stringify(serialize(LorebookData, lorebook)))
            downloadFile(png, `${currentStoryMetadata.title.slice(0, 40)}.png`, 'image/png')
        })
    }

    const embeedAllSelected = async (event: any) => {
        if (!currentStoryMetadata || !selectedInputImage.current) return

        const file = event.target.files
        if (file.length === 0) {
            if (selectedInputImage.current) selectedInputImage.current.value = ''
            return
        }
        Promise.allSettled([file[0].arrayBuffer()]).then(async (results) => {
            if (results[0].status !== 'fulfilled') {
                if (selectedInputImage.current) selectedInputImage.current.value = ''
                return
            }
            if (!isPng(results[0].value)) {
                if (selectedInputImage.current) selectedInputImage.current.value = ''
                return
            }
            let png = results[0].value
            const tempLorebook = lorebookFromSelected()
            if (!tempLorebook) {
                if (selectedInputImage.current) selectedInputImage.current.value = ''
                return
            }
            png = await addTextToPng(png, JSON.stringify(serialize(LorebookData, tempLorebook)))

            // Default name is story name
            let title = currentStoryMetadata.title
            // When the lorebook contains a single entry, use the entry's name
            if (tempLorebook.entries.length === 1) {
                title = tempLorebook.entries[0].displayName
            }
            // When the lorebook contains a single category and all entries are in that category the name is the category name
            if (
                tempLorebook.categories.length === 1 &&
                tempLorebook.entries.every((e) => e.category === tempLorebook.categories[0].id)
            ) {
                title = tempLorebook.categories[0].name
            }

            downloadFile(png, `${title.slice(0, 40)}.png`, 'image/png')
            if (selectedInputImage.current) {
                selectedInputImage.current.value = ''
            }
            setMultiselect(false)
            setMultiselectedCategories(new Set())
            setMultiselectedEntries(new Set())
        })
    }

    const allSelected = () => {
        if (!currentStoryContent) return false
        // check if any category is not selected
        for (const category of currentStoryContent.lorebook.categories) {
            if (!multiselectedCategories.has(category.id)) {
                return false
            }
        }
        // check if any entry is not selected
        for (const entry of currentStoryContent.lorebook.entries) {
            if (!multiselectedEntries.has(entry.id)) {
                return false
            }
        }
        return true
    }

    const allAreSelected = allSelected()
    const importerClickRef: MutableRefObject<null | (() => boolean)> = useRef(null)

    const modalOuterRef: MutableRefObject<null | HTMLDivElement> = useRef(null)

    return (
        <StyledLorebookModal className="lorebook" ref={modalOuterRef}>
            <AnyFileImporter
                overlay={FileImporterOverlayType.Absolute}
                overlayParentRef={modalOuterRef}
                button={FileImporterButtonType.None}
                buttonClickRef={importerClickRef}
                allowedFileTypes={[ImportDataType.naiLorebook, ImportDataType.aidWorldInfoExport]}
            />
            <CloseButton aria-label="Close Modal" onClick={closeLorebook}>
                <div />
            </CloseButton>
            <ScreenreaderToggle notShown={true}>
                <blockquote aria-live="assertive">
                    {confirmDelete !== '' ? 'Press again to confirm deletion' : ''}
                </blockquote>
            </ScreenreaderToggle>
            <input
                type="file"
                id="file"
                accept="image/png"
                ref={selectedInputImage}
                onChange={embeedAllSelected}
                style={{ display: 'none' }}
            />
            <input
                type="file"
                id="file"
                accept="image/png"
                ref={lorebookInputImage}
                onChange={embedLorebook}
                style={{ display: 'none' }}
            />
            <Sidebar
                left={true}
                open={searchVisible}
                setOpen={setSearchVisible}
                modalSidebar
                breakpointDesktop={LOREBOOK_MOBILE_BREAKPOINT}
                breakpointMobile={LOREBOOK_MOBILE_BREAKPOINT}
                noDragPoint={800}
            >
                <LorebookLeft className={'lorebook-sidebar'}>
                    <LorebookSearchHeader>
                        <FlexRow style={{ flex: '0 0 auto', width: 'max-content' }}>
                            <FlexCol style={{ flexWrap: 'wrap', flex: '0 0 auto' }}>
                                <LorebookTitle>
                                    <BookIcon style={{ width: '0.85rem', height: '1rem' }} />
                                    <div>Lorebook</div>
                                </LorebookTitle>
                            </FlexCol>
                            <HideSearchButton onClick={() => setSearchVisible(!searchVisible)}>
                                <ArrowLeftIcon />
                            </HideSearchButton>
                        </FlexRow>
                        <FlexRow
                            style={{
                                width: 'auto',
                                justifyContent: 'flex-start',
                            }}
                        >
                            <ExportImportButton
                                aria-label="Import"
                                onClick={() => {
                                    if (importerClickRef.current) importerClickRef.current()
                                }}
                                style={{
                                    justifyContent: 'space-around',
                                    flex: '1 1 0',
                                }}
                            >
                                <ImportIcon />
                            </ExportImportButton>
                            <ExportImportButton
                                aria-label="Export"
                                onClick={exportLoreBook}
                                style={{
                                    justifyContent: 'space-around',
                                    flex: '1 1 0',
                                }}
                            >
                                <ExportIcon />
                            </ExportImportButton>
                            <ExportImportButton
                                aria-label="Embed Lorebook in PNG"
                                onClick={() => lorebookInputImage.current?.click()}
                                style={{
                                    justifyContent: 'space-around',
                                    flex: '1 1 0',
                                }}
                            >
                                <ImageDownIcon />
                            </ExportImportButton>
                        </FlexRow>
                    </LorebookSearchHeader>
                    {multiselect ? (
                        <>
                            <MultiSelectSelected>
                                <div>
                                    {multiselectedEntries.size}{' '}
                                    {multiselectedEntries.size === 1 ? 'Entry' : 'Entries'} Selected
                                </div>
                                <SubtleButton
                                    aria-label="Cancel multiselect operation"
                                    onClick={() => {
                                        setMultiselect(false)
                                        setMultiselectedEntries(new Set())
                                        setMultiselectedCategories(new Set())
                                    }}
                                >
                                    Cancel
                                </SubtleButton>
                            </MultiSelectSelected>
                            <MultiSelectButtons>
                                <WarningButton
                                    disabled={multiselectedEntries.size + multiselectedCategories.size === 0}
                                    confirmButtonText={`Delete ${
                                        multiselectedEntries.size + multiselectedCategories.size > 1
                                            ? 'them'
                                            : 'it'
                                    }!`}
                                    warningColors
                                    buttonType={WarningButtonStyle.Light}
                                    onConfirm={() => {
                                        deleteAllSelected()
                                    }}
                                    warningText={
                                        <>
                                            Are you sure you want to delete{' '}
                                            {multiselectedCategories.size > 0 &&
                                                `${multiselectedCategories.size} ${
                                                    multiselectedCategories.size === 1
                                                        ? 'category'
                                                        : 'categories'
                                                }`}
                                            {multiselectedCategories.size > 0 &&
                                                multiselectedEntries.size > 0 &&
                                                ' and '}
                                            {multiselectedEntries.size > 0 &&
                                                `${multiselectedEntries.size} ${
                                                    multiselectedEntries.size === 1 ? 'entry' : 'entries'
                                                }`}
                                            ?
                                            <br />
                                            This cannot be reversed.
                                        </>
                                    }
                                    label={`Delete Selected?`}
                                    buttonText={
                                        <ListEntryDeleteIcon
                                            style={{
                                                margin: '0.1rem 0 0 0',
                                                height: '0.9rem',
                                                width: '0.9rem',
                                            }}
                                        />
                                    }
                                    style={{
                                        padding: '7px 14px',
                                        flex: '1 1 0px',
                                        marginRight: '10px',
                                    }}
                                />

                                <ExportImportButton
                                    disabled={multiselectedEntries.size + multiselectedCategories.size === 0}
                                    aria-label="Export Selected"
                                    onClick={exportAllSelected}
                                    style={{
                                        justifyContent: 'space-around',
                                        flex: '1 1 0',
                                    }}
                                >
                                    <ExportIcon />
                                </ExportImportButton>

                                <ExportImportButton
                                    disabled={multiselectedEntries.size + multiselectedCategories.size === 0}
                                    aria-label="Export Select to png"
                                    onClick={() => selectedInputImage.current?.click()}
                                    style={{
                                        justifyContent: 'space-around',
                                        flex: '1 1 0',
                                    }}
                                >
                                    <ImageDownIcon />
                                </ExportImportButton>
                            </MultiSelectButtons>
                            <MultiSelectAll selected={allAreSelected}>
                                <div>Select All</div>
                                <SmallCheckbox
                                    noLabel={true}
                                    label={`${
                                        allAreSelected ? 'Deselect' : 'Select'
                                    } all entries and categories`}
                                    displayText={false}
                                    value={allAreSelected}
                                    setValue={() => {
                                        if (!currentStoryContent) return
                                        if (!allAreSelected) {
                                            // select all categories
                                            for (const category of currentStoryContent.lorebook.categories) {
                                                setMultiselectedCategories((v) => new Set(v.add(category.id)))
                                            }
                                            // select all entries
                                            for (const entry of currentStoryContent.lorebook.entries) {
                                                setMultiselectedEntries((v) => new Set(v.add(entry.id)))
                                            }
                                        } else {
                                            // deselect all categories
                                            setMultiselectedCategories(new Set())
                                            // deselect all entries
                                            setMultiselectedEntries(new Set())
                                        }
                                    }}
                                />
                            </MultiSelectAll>
                        </>
                    ) : (
                        <LorebookFilterControls setMultiselect={() => setMultiselect((v) => !v)} />
                    )}
                    <div style={{ overflowY: 'auto', height: '100%' }}>
                        <LorebookList ref={drop}>{entryList}</LorebookList>
                    </div>
                    <div
                        style={{
                            padding: '20px',
                            marginTop: 'auto',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                        }}
                    >
                        <AddEntry onClick={() => addLorebookEntry()}>
                            <div>
                                <PlusIcon />
                                <span>Entry</span>
                            </div>
                        </AddEntry>

                        <AddCategory onClick={addLorebookCategory}>
                            <div>
                                <PlusIcon />
                                <span>Category</span>
                            </div>
                        </AddCategory>
                    </div>
                </LorebookLeft>
            </Sidebar>

            <LorebookRight className={'lorebook-content'}>
                {selectedCategory !== null ? (
                    <CategoryEditArea
                        category={selectedCategory}
                        setSearchVisible={setSearchVisible}
                        searchVisible={searchVisible}
                        isConfirmDelete={confirmMobileDelete}
                        onDeleteClick={() => {
                            removeSelectedLorebookEntry()
                        }}
                        unsetDelete={() => setConfirmMobileDelete(false)}
                    />
                ) : selectedLorebookEntry !== null ? (
                    <LorebookEditArea
                        entry={selectedLorebookEntry}
                        setSearchVisible={setSearchVisible}
                        searchVisible={searchVisible}
                        isConfirmDelete={confirmMobileDelete}
                        duplicateEntry={duplicateEntry}
                        onDeleteClick={() => {
                            removeSelectedLorebookEntry()
                        }}
                        unsetDelete={() => setConfirmMobileDelete(false)}
                    />
                ) : (currentStoryContent?.lorebook.entries.length ?? 0) > 0 ? (
                    <LorebookNoSelectedPage setSearchVisible={setSearchVisible} />
                ) : (
                    <LorebookIntroPage
                        setSearchVisible={setSearchVisible}
                        addLorebookEntry={addLorebookEntry}
                    />
                )}
            </LorebookRight>
        </StyledLorebookModal>
    )
}

export function createLorebookEntry(currentStoryContent?: StoryContent, categoryId: string = ''): LoreEntry {
    if (!currentStoryContent) {
        return new LoreEntry()
    }

    let newEntry = LoreEntry.deserialize(
        JSON.stringify(serialize(LoreEntry, currentStoryContent.contextDefaults.loreDefaults[0]))
    )
    if (categoryId !== '') {
        const category = currentStoryContent.lorebook.categories.find((c: LorebookCategoryData) => {
            return c.id === categoryId
        })
        if (category !== undefined) {
            newEntry = LoreEntry.deserialize(JSON.stringify(serialize(LoreEntry, category.categoryDefaults)))
        }
    }

    newEntry.id = uuid()
    newEntry.category = categoryId
    newEntry.lastUpdatedAt = new Date()
    return newEntry
}

const ExportImportButton = styled(LightColorButton)`
    flex: 0 0 auto;
    padding: 7px 14px;
    margin-right: 10px;
    > ${Icon} {
        margin: 0.1rem 0 0 0;
        height: 0.9rem;
        width: 0.9rem;
    }
`

const HideSearchButton = styled(SubtleButton)`
    flex: 0 0 auto;
    padding: 9px;
    display: none;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        display: block;
    }
`

const LorebookSearchHeader = styled.div`
    display: flex;
    flex-direction: row;
    padding: 17px 10px 9px 20px;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        > :nth-child(1) {
            width: 100% !important;
            > div {
                flex: 1 1 0 !important;
                > div {
                    flex: 1 1 0 !important;
                }
            }
        }

        > :nth-child(2) {
            width: 100%;
        }
    }
`

const LorebookTitle = styled.div`
    display: flex;
    flex: 1 1 0;
    align-items: center;
    font-weight: 700;
    font-family: ${(props) => props.theme.fonts.headings};
    > div {
        margin-right: 10px;
    }
`
const LorebookList = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    touch-action: pan-y;
`

const AddEntry = styled(LightColorButton)`
    flex: 1 1 auto;
    font-size: 1rem;
    cursor: pointer;
    gap: 0px;
    display: flex;
    padding: 10px;
    justify-content: space-around;
    align-items: center;
    padding-left: 10px;
    > div {
        display: flex;
        align-items: center;
        margin-right: 5px;
    }
    > div > div {
        height: 0.7rem;
        margin-right: 10px;
        width: 0.7rem;
    }
    span {
        word-break: keep-all;
    }
`
const AddCategory = styled(AddEntry)`
    &:hover {
        background: ${(props) => props.theme.colors.bg0};
    }
    background: none;
    border: 2px solid ${(props) => props.theme.colors.bg2};
`

function LorebookFilterControls(props: { setMultiselect(): void }) {
    const [searchValue, setSearchValue] = useRecoilState(LorebookSearchState)
    const siteTheme = useRecoilValue(SiteTheme)

    const [searchVisible, setSearchVisible] = useState(false)
    const [filterVisible, setFilterVisible] = useState(false)
    const [order, setOrder] = useRecoilState(LorebookSort)

    const searchKey = useRef<HTMLInputElement>(null)
    const searchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            prevSearchValue.current = ''
            setSearchValue('')
            searchKey.current?.blur()
            setSearchVisible(false)
            event.stopPropagation()
        }
    }
    const prevSearchValue = useRef('')
    const blurRef = useRef(0)

    const onSearchClick = () => {
        clearTimeout(blurRef.current)
        if (!searchVisible) {
            setTimeout(() => {
                const end = searchKey.current?.value.length
                end && searchKey.current?.setSelectionRange(end, end)
                searchKey.current?.focus()
            }, 10)
            setSearchValue(prevSearchValue.current)
        } else {
            prevSearchValue.current = searchValue
            setSearchValue('')
        }
        setSearchVisible(!searchVisible)
    }

    return (
        <FilterControlsBlock>
            <FilterControlsBlockControls
                onClick={() => {
                    onSearchClick()
                }}
            >
                <FlexRow style={{ justifyContent: 'left', overflow: 'hidden' }} grow={false}>
                    <span
                        style={{
                            position: 'relative',
                            top: '2px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Entries
                    </span>
                </FlexRow>
                <div style={{ flex: 1 }} />
                <Search
                    visible={searchVisible}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() =>
                        !searchValue &&
                        (blurRef.current = setTimeout(onSearchClick, 150) as unknown as number)
                    }
                >
                    <input
                        placeholder={'Search Lorebook Entries'}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => searchKeyDown(e)}
                        ref={searchKey}
                    />
                </Search>
                <IconsBlock>
                    <SubtleButton
                        aria-label="Start multiselect operation"
                        onClick={(e) => {
                            e.stopPropagation()
                            props.setMultiselect()
                            setSearchValue('')
                            setFilterVisible(!filterVisible)
                        }}
                    >
                        <BoxCheckIcon />
                    </SubtleButton>
                    <SubtleButton
                        aria-label="Open Sort Settings"
                        onClick={(e) => {
                            e.stopPropagation()
                            setFilterVisible(!filterVisible)
                        }}
                    >
                        {filterVisible ? (
                            <FunnelFilledIcon highlight={filterVisible} />
                        ) : (
                            <FunnelEmptyIcon highlight={filterVisible} />
                        )}
                    </SubtleButton>
                    <SubtleButton
                        aria-label="Search"
                        onClick={(e) => {
                            e.stopPropagation()
                            onSearchClick()
                        }}
                    >
                        <SearchIcon highlight={searchVisible} />
                    </SubtleButton>
                </IconsBlock>
            </FilterControlsBlockControls>
            <FilterBlock visible={filterVisible} onClick={(e) => e.stopPropagation()}>
                <FilterBlockHeader style={{ marginTop: '-5px' }}>
                    <span>Sort By </span>
                    <SubtleButton
                        aria-label="Change display order"
                        onClick={() => setOrder({ ...order, reverse: !order.reverse })}
                    >
                        {order.reverse ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    </SubtleButton>
                </FilterBlockHeader>
                <Select
                    aria-label="Select the sort order"
                    isSearchable={true}
                    value={order.by}
                    onChange={(e) => e && setOrder({ ...order, by: e })}
                    options={[
                        {
                            label: 'Alphabetical',
                            value: 'alphabetical',
                        },
                        {
                            label: 'Most Recent',
                            value: 'recent',
                        },
                    ]}
                    styles={getDropdownStyle(siteTheme)}
                    theme={getDropdownTheme(siteTheme)}
                />
            </FilterBlock>
        </FilterControlsBlock>
    )
}

const FilterControlsBlock = styled.div`
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    border-bottom: 2px solid ${(props) => props.theme.colors.bg3};
    margin-bottom: -2px;
    min-height: 45px;
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    z-index: 1;
`

const FilterControlsBlockControls = styled.div`
    padding: 10px 20px;
    height: 45px;
    display: flex;
    flex-direction: row;
    align-items: center;
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1rem;
    flex: 1 1 auto;
`
const IconsBlock = styled.div`
    display: flex;
    flex-direction: row;
    right: -2px;
    position: relative;
    > * {
        padding: 5px;
        position: relative;
        margin-left: 5px;
        cursor: pointer;
        pointer-events: all;
        flex: 1 1 auto;
        &:hover {
            ${Icon} {
                transform: scale(1.1);
            }
        }
        > * {
            height: 1rem;
            transition: transform ${(props) => props.theme.transitions.iteractive};
        }
    }
`
const FilterBlock = styled.div<{ visible: boolean }>`
    display: ${(props) => (props.visible ? 'flex' : 'none')};
    flex-direction: column;
    padding: 10px 20px 10px;
    font-size: 0.875rem;
    gap: 10px;
    flex: 1 1 auto;
`
const FilterBlockHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    flex: 1 1 auto;
    font-weight: 500;
    > * {
        flex: 0 1 auto;
    }
`

const DummyLorebookPage = styled(LorebookEditor)`
    width: 100vw;
    flex: 1 1 auto;
    mask-repeat: no-repeat;
    mask-size: cover;
    mask-position: center;
    padding: 0px;
    overflow: hidden;
    position: relative;
    background-color: ${(props) => props.theme.colors.bg2};
`

const MultiSelectSelected = styled(FlexRow)`
    border-top: 2px solid ${(props) => props.theme.colors.bg3};
    padding: 10px 20px 0px 20px;
    font-size: 0.875rem;
    font-weight: 600;
    > :nth-child(1) {
        font-family: ${(props) => props.theme.fonts.headings};
    }
    > :nth-child(2) {
        color: ${(props) => props.theme.colors.warning};
    }
`

const MultiSelectButtons = styled(FlexRow)`
    padding: 10px 10px 14px 20px;
    ${Icon} {
        mask-size: cover;
    }
`

const MultiSelectAll = styled.label<{ selected?: boolean }>`
    display: flex;
    justify-content: space-between;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 700;
    padding: 13px 20px;
    background-color: ${(props) => props.theme.colors.bg2};
    margin-bottom: -2px;

    color: ${(props) =>
        props.selected
            ? (props) => props.theme.colors.textHeadings
            : transparentize(0.3, props.theme.colors.textMain)};

    &:hover {
        color: ${(props) => !props.selected && props.theme.colors.textMain};
        &:hover {
            ${SmallCheckOuter} {
                background-color: ${(props) =>
                    !props.selected && transparentize(0.5, props.theme.colors.textMain)};
            }
        }
    }
`

function LorebookIntroPage(props: {
    setSearchVisible: (state: boolean) => void
    addLorebookEntry: () => void
}) {
    const lorebookTabs = useRecoilValue(LorebookTabs)
    const window = useWindowSizeBreakpoint(1600, 0)
    const pinAllowed = window.width > 1600
    const pinned = !!(lorebookTabs.pinnedEntry || lorebookTabs.pinnedCategory) && pinAllowed

    return (
        <DummyLorebookPage pinned={pinned}>
            <LineBackground background={LorebookBackground.src}>
                <MobileTop style={{ position: 'absolute', zIndex: 3, top: 15, left: 25 }}>
                    <SidebarToggle onClick={() => props.setSearchVisible(true)}>
                        <BookIcon style={{ cursor: 'auto' }}></BookIcon>
                        <ArrowRightIcon></ArrowRightIcon>
                    </SidebarToggle>
                </MobileTop>

                <FlexCol
                    style={{
                        justifyContent: 'flex-end',
                        fontWeight: 600,
                        position: 'absolute',
                        bottom: 0,
                    }}
                >
                    <FlexRow
                        style={{
                            flex: '0 0 auto',
                            width: 'max-content',
                            paddingBottom: 30,
                            paddingLeft: '30px',
                            alignItems: 'flex-end',
                        }}
                    >
                        <Circle style={{ backgroundColor: 'transparent', border: 'transparent' }}>
                            <WelcomeSVG
                                style={{
                                    position: 'absolute',
                                    bottom: '40px',
                                    left: '-30px',
                                }}
                            />
                            <Circle />
                            <BookIcon
                                style={{
                                    position: 'absolute',
                                    left: 'calc(50% - 10px)',
                                    top: 'calc(50% - 10px)',
                                    cursor: 'auto',
                                }}
                            />
                        </Circle>
                        <LorebookWelcome>
                            Welcome to
                            <br /> the Lorebook!
                        </LorebookWelcome>
                    </FlexRow>
                    <FlexRow
                        style={{
                            width: 'max-content',
                            maxWidth: 647,
                            flex: '0 0 auto',
                        }}
                    >
                        <LorebookWelcomeDesc>
                            The perfect place to flesh out your story’s world, events, locations, characters,
                            and environments. There are lots of settings, but you only need to worry about the
                            Entry tab if you’re just getting started.
                            <FlexColSpacer min={20} max={20} />
                            Simply place the info about your subject in the Entry Text field, and specify what
                            Activation Keys should be looked for to show the entry to the AI.
                        </LorebookWelcomeDesc>
                    </FlexRow>
                    <Spacer />
                    <FlexRow
                        style={{
                            width: 'max-content',
                            flex: '0 0 auto',
                        }}
                    >
                        <LorebookIntroAction>
                            <ArrowLeftIcon style={{ marginRight: 20, cursor: 'auto' }} />
                            You can get started by clicking the “+&nbsp;Entry” button.
                        </LorebookIntroAction>
                        <LorebookIntroButton onClick={() => props.addLorebookEntry()}>
                            <PlusIcon /> Create an Entry
                        </LorebookIntroButton>
                    </FlexRow>
                    <FlexColSpacer min={30} max={30} />
                </FlexCol>
            </LineBackground>
        </DummyLorebookPage>
    )
}

const LorebookWelcome = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textHeadings};
    margin-left: 40px;
    font-size: 2.125rem;

    line-height: 2.813rem;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        font-size: 1.4rem;
    }
`

const LorebookWelcomeDesc = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 1rem, 28px;
    font-weight: 400;
    padding-left: 30px;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        font-size: 0.875rem;
        padding-left: 20px;
    }
    max-width: calc(100vw - 30px);
`

const LorebookIntroAction = styled(LorebookWelcomeDesc)`
    font-weight: 600;
    flex-direction: row;
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        display: none;
    }
`
const LorebookIntroButton = styled(LightColorButton)`
    display: none;
    margin: 0 20px;
    width: calc(100vw - 40px);
    @media (max-width: ${LOREBOOK_MOBILE_BREAKPOINT}) {
        display: flex;
        justify-content: center;
    }
`

const Spacer = styled.div`
    height: max(min(128px, 10vh), 20px);
`

const Circle = styled.div`
    position: relative;
    height: 60px;
    width: 60px;
    border-radius: 50%;
    background-color: ${(props) => props.theme.colors.bg2};
    border: 1px solid ${(props) => props.theme.colors.textHeadings};
`

function WelcomeSVG(props: { style: CSSProperties }) {
    return (
        <>
            <svg
                style={props.style}
                width="1394"
                height="895"
                viewBox="0 0 1394 895"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <g clipPath="url(#clip0_6575_1891)">
                    <path
                        className="svg-color-bg0 svg-fill"
                        d="M349.5 794.999C255.1 781.399 102.5 762.999 76 884.499L57.5 893.999L45 884.499C46.2 851.299 -3.16667 786.666 -24 758.499V-21L1406 -21V758.499C1404.15 764.478 1238.5 800.499 1038 785.499C837.5 770.499 780.889 844.57 731 859.499C599 898.999 467.5 811.999 349.5 794.999Z"
                        fill="#101224"
                    />
                    <path
                        className="svg-color-textHeadings svg-stroke"
                        d="M349.5 794.997C255.1 781.397 102.5 762.996 76 884.496L57.5 893.996L45 884.496C46.2 851.296 -3.16667 786.663 -24 758.497V-19.5L1407 -19.5V758.497C1405.15 764.476 1238.5 800.497 1038 785.497C837.5 770.497 780.889 844.568 731 859.497C599 898.997 467.5 811.997 349.5 794.997Z"
                        stroke="#F5F3C2"
                    />
                    <path
                        className="svg-color-bg3 svg-stroke"
                        d="M50.4272 882C36.9272 839.5 53.7811 776.435 -0.0727615 711C-46.5727 654.5 -95.573 581 -16.073 493.5C63.4269 406 154.268 301.7 71.9269 130.5C-10.4146 -40.7 -78.6667 -65.8333 -102.5 -57M63.4269 882C59.9269 829.833 111.474 719.189 163.427 680.5C233.927 628 347.927 624.5 443.427 674.5C573.578 742.642 694 576 706.5 480.5C719 385 676 256 780.427 186C868.014 127.288 1084.39 186 1154.5 65.5C1224.61 -55 1197 -71 1189.5 -71M71.9269 882C67.7602 850.667 116.427 756.9 212.427 738.5C332.427 715.5 401.927 738.5 494.427 786C602.213 841.349 733.354 817 780.427 786C827.5 755 933.5 654 1058 646.5C1182.5 639 1354.5 640 1407 563M56.4272 882C54.0939 788.5 43.9629 591.119 163.427 562C288.927 531.409 369.354 533 374.427 437C379.5 341 342.9 39.3 504.5 -33.5"
                        stroke="#2B2D3F"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M70 777C73.3333 777 75 772.2 75 769C75 772.2 76.6667 777 80 777C76.6667 777 75 781.8 75 785C75 781.8 73.3333 777 70 777Z"
                        fill="#2B2D3F"
                    />
                    <path
                        className="svg-color-textMain svg-fill"
                        d="M163 626C168.333 626 171 618.2 171 613C171 618.2 173.667 626 179 626C173.667 626 171 633.8 171 639C171 633.8 168.333 626 163 626Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-textMain svg-fill"
                        d="M27 728C31 728 33 722 33 718C33 722 35 728 39 728C35 728 33 734 33 738C33 734 31 728 27 728Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-textMain svg-fill"
                        d="M478 733C482 733 484 727 484 723C484 727 486 733 490 733C486 733 484 739 484 743C484 739 482 733 478 733Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-textMain svg-fill"
                        d="M722 536C729.333 536 733 525.2 733 518C733 525.2 736.667 536 744 536C736.667 536 733 546.8 733 554C733 546.8 729.333 536 722 536Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-textMain svg-fill"
                        d="M930 217C937.333 217 941 206.2 941 199C941 206.2 944.667 217 952 217C944.667 217 941 227.8 941 235C941 227.8 937.333 217 930 217Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-textMain svg-fill"
                        d="M1090 505C1095.33 505 1098 497.2 1098 492C1098 497.2 1100.67 505 1106 505C1100.67 505 1098 512.8 1098 518C1098 512.8 1095.33 505 1090 505Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-textMain svg-fill"
                        d="M474 371C479.333 371 482 363.2 482 358C482 363.2 484.667 371 490 371C484.667 371 482 378.8 482 384C482 378.8 479.333 371 474 371Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-textMain svg-fill"
                        d="M39 273C44.3333 273 47 265.2 47 260C47 265.2 49.6667 273 55 273C49.6667 273 47 280.8 47 286C47 280.8 44.3333 273 39 273Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M944 741C949.333 741 952 733.2 952 728C952 733.2 954.667 741 960 741C954.667 741 952 748.8 952 754C952 748.8 949.333 741 944 741Z"
                        fill="white"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M330 689C334 689 336 683 336 679C336 683 338 689 342 689C338 689 336 695 336 699C336 695 334 689 330 689Z"
                        fill="#2B2D3F"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M613 782C618.333 782 621 774.2 621 769C621 774.2 623.667 782 629 782C623.667 782 621 789.8 621 795C621 789.8 618.333 782 613 782Z"
                        fill="#2B2D3F"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M722 613C727.333 613 730 605.2 730 600C730 605.2 732.667 613 738 613C732.667 613 730 620.8 730 626C730 620.8 727.333 613 722 613Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M1098 723C1103.33 723 1106 715.2 1106 710C1106 715.2 1108.67 723 1114 723C1108.67 723 1106 730.8 1106 736C1106 730.8 1103.33 723 1098 723Z"
                        fill="#2B2D3F"
                        fillOpacity="0.6"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M1283 536C1288.33 536 1291 528.2 1291 523C1291 528.2 1293.67 536 1299 536C1293.67 536 1291 543.8 1291 549C1291 543.8 1288.33 536 1283 536Z"
                        fill="#2B2D3F"
                        fillOpacity="0.3"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M-1 631C5.66667 631 9 621.4 9 615C9 621.4 12.3333 631 19 631C12.3333 631 9 640.6 9 647C9 640.6 5.66667 631 -1 631Z"
                        fill="#2B2D3F"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M420 571C425.333 571 428 563.2 428 558C428 563.2 430.667 571 436 571C430.667 571 428 578.8 428 584C428 578.8 425.333 571 420 571Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M597 332C602.333 332 605 324.2 605 319C605 324.2 607.667 332 613 332C607.667 332 605 339.8 605 345C605 339.8 602.333 332 597 332Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M179 319C184.333 319 187 311.2 187 306C187 311.2 189.667 319 195 319C189.667 319 187 326.8 187 332C187 326.8 184.333 319 179 319Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M302 104C307.333 104 310 96.2 310 91C310 96.2 312.667 104 318 104C312.667 104 310 111.8 310 117C310 111.8 307.333 104 302 104Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M-1 173C4.33333 173 7 165.2 7 160C7 165.2 9.66667 173 15 173C9.66667 173 7 180.8 7 186C7 180.8 4.33333 173 -1 173Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M763 50C768.333 50 771 42.2 771 37C771 42.2 773.667 50 779 50C773.667 50 771 57.8 771 63C771 57.8 768.333 50 763 50Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M888 437C893.333 437 896 429.2 896 424C896 429.2 898.667 437 904 437C898.667 437 896 444.8 896 450C896 444.8 893.333 437 888 437Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M1193 222C1198.33 222 1201 214.2 1201 209C1201 214.2 1203.67 222 1209 222C1203.67 222 1201 229.8 1201 235C1201 229.8 1198.33 222 1193 222Z"
                        fill="#2B2D3F"
                        fillOpacity="0.8"
                    />
                    <path
                        className="svg-color-bg3 svg-fill"
                        d="M111 531C116.333 531 119 523.2 119 518C119 523.2 121.667 531 127 531C121.667 531 119 538.8 119 544C119 538.8 116.333 531 111 531Z"
                        fill="#2B2D3F"
                    />
                </g>
                <defs>
                    <clipPath id="clip0_6575_1891">
                        <rect width="1394" height="895" fill="white" />
                    </clipPath>
                </defs>
            </svg>
        </>
    )
}

const NoEntry = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.125rem;
`

function LorebookNoSelectedPage(props: { setSearchVisible: (state: boolean) => void }) {
    const lorebookTabs = useRecoilValue(LorebookTabs)
    const window = useWindowSizeBreakpoint(1600, 0)
    const pinAllowed = window.width > 1600
    const pinned = !!(lorebookTabs.pinnedEntry || lorebookTabs.pinnedCategory) && pinAllowed

    return (
        <DummyLorebookPage pinned={pinned}>
            <LineBackground background={LorebookBackground.src}>
                <MobileTop style={{ position: 'absolute', zIndex: 3, top: 15, left: 25 }}>
                    <SidebarToggle onClick={() => props.setSearchVisible(true)}>
                        <BookIcon></BookIcon>
                        <ArrowRightIcon></ArrowRightIcon>
                    </SidebarToggle>
                </MobileTop>
                <FlexCol
                    style={{
                        height: ' 100%',
                        justifyContent: 'center',
                        fontWeight: 600,
                        position: 'absolute',
                        bottom: 0,
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <BookIcon style={{ height: '2rem', width: '2rem', cursor: 'auto' }} />
                    </div>
                    <FlexColSpacer min={15} max={15} />
                    <NoEntry>No Entry selected.</NoEntry>
                    <FlexColSpacer min={5} max={5} />

                    <div
                        style={{
                            opacity: 0.7,
                        }}
                    >
                        Select an Entry from the left to edit it.
                    </div>
                </FlexCol>
            </LineBackground>
        </DummyLorebookPage>
    )
}
