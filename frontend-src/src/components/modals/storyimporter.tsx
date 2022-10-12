import React, { useState, MutableRefObject, useCallback, RefObject, Fragment } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { v4 as uuid } from 'uuid'
import { toast } from 'react-toastify'
import { findSameEntries, findSharedNames, Lorebook } from '../../data/story/lorebook'
import { Scenario, storyAsScenario } from '../../data/story/scenario'
import { StoryContainer } from '../../data/story/storycontainer'
import {
    aidAdventureExportToStory,
    aidScenarioExportToScenario,
    aidWorldInfoToLorebook,
    holoStoryToStory,
    ImportDataType,
    koboldAISaveToStory,
    naiAlphaStoryToStory,
} from '../../data/story/storyconverter'
import { GlobalUserContext } from '../../globals/globals'
import {
    CustomModules,
    SelectedStory,
    Session,
    SettingsModalOpen,
    StoryStateValue,
    StoryUpdate,
    ThemePreview,
    UserPresets,
} from '../../globals/state'

import { AIModule, StoryPreset, TextGenerationSettings } from '../../data/story/storysettings'
import { getStorage, Storage } from '../../data/storage/storage'
import { AIModuleExport } from '../../data/ai/aimodule'
import { DataOrigin, Story, StoryMode } from '../../data/story/story'
import { Dark } from '../../styles/themes/dark'
import { logError, logInfo } from '../../util/browser'
import { ImportScenario } from '../import/importscenario'
import { ImportLorebook } from '../import/importlorebook'
import { ImportBundle, ImportMisc } from '../import/importmisc'
import { SettingsPages } from '../settings/constants'
import { FileInfo } from '../controls/fileinput'
import { badWordArrayToBannedSequences, migrateLogitBiasGroups } from '../../util/migration'
import { TextGenerationModel } from '../../data/request/model'
import { modelDifferenceToast } from '../toasts/modeldifference'
import {
    replaceSameIdCategories,
    replaceSameIdAddName,
    replaceSameNameEnforceUniqueId,
    replaceSameIdThenName,
    skipSameIdAddSameName,
} from '../../util/lorebook'
import { modelName, modelsCompatible } from '../../util/models'
import { copyPresetToStory } from '../../util/presets'
import { hasSameKeys, isModuleImageValid, addBans, addBiases } from '../../util/util'
import { deserialize } from '../../util/serialization'
import FileImporter, { FileImporterButtonType, FileImporterOverlayType } from '../controls/fileimporter'
import useAddStory from '../../hooks/useAddStory'
import { getUserSetting } from '../../data/user/settings'
import { Document } from '../../data/document/document'
import { DataOrigin as DocumentDataOrigin } from '../../components/editor/glue'
import Modal, { ModalType } from './modal'

export function ImportScenarioModal(props: {
    visible: boolean
    setVisible: React.Dispatch<React.SetStateAction<boolean>>
    importedScenario: Scenario
}): JSX.Element {
    const { importStory } = useAddStory({
        callback: () => {
            props.setVisible(false)
        },
    })

    return (
        <Modal
            label="Import Scenario"
            onRequestClose={() => props.setVisible(false)}
            isOpen={props.visible}
            shouldCloseOnOverlayClick={true}
            type={ModalType.Large}
        >
            <ImportScenario
                close={() => props.setVisible(false)}
                importedScenario={props.importedScenario}
                onClickImport={function (story: StoryContainer) {
                    importStory(story)
                }}
            />
        </Modal>
    )
}

// Wrapper to import the current Story as a placeholder'ed Scenario, handles cases where story import fails.
export function scenarioStarter(
    selectedStory: StoryStateValue,
    aiModules: AIModule[],
    setImportedScenario: React.Dispatch<React.SetStateAction<Scenario>>,
    setImported: React.Dispatch<React.SetStateAction<boolean>>
): void {
    const scenario = storyAsScenario(selectedStory.id, aiModules)
    if (scenario === undefined) {
        setImported(false)
    } else {
        setImportedScenario(scenario)
        setImported(true)
    }
}

export function AnyFileImporter(props: {
    children?: JSX.Element | JSX.Element[]
    overlay: FileImporterOverlayType
    overlayParentRef?: RefObject<any>
    button: FileImporterButtonType
    buttonClickRef?: MutableRefObject<null | (() => boolean)>
    allowedFileTypes?: ImportDataType[]
    onAllFilesHandled?: () => void
}): JSX.Element {
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const [importScenarioModalVisible, setImportScenarioModalVisible] = useState(false)
    const [importLorebookModalVisible, setImportLorebookModalVisible] = useState(false)
    const [miscImportModalVisible, setMiscImportModalVisible] = useState(false)
    const setSettingsModalOpen = useSetRecoilState(SettingsModalOpen)
    const setThemePreview = useSetRecoilState(ThemePreview)

    const [importedScenario, setImportedScenario] = useState(new Scenario())
    const [importedLorebook, setImportedLorebook] = useState(new Lorebook())
    const [importBundle, setImportBundle] = useState<ImportBundle>(new ImportBundle())

    const setModules = useSetRecoilState(CustomModules)
    const [userPresets, setUserPresets] = useRecoilState(UserPresets)

    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)

    const settings = currentStoryContent?.settings

    const session = useRecoilValue(Session)

    const { importStory, createStoryWithDefaults } = useAddStory()

    const importLorebook = async (
        lorebook: Lorebook,
        overwriteSameName: boolean,
        overwriteSameId: boolean
    ): Promise<void> => {
        const story =
            currentStoryContent && currentStoryMetadata
                ? StoryContainer.bundle(currentStoryMetadata, currentStoryContent)
                : await createStoryWithDefaults()

        if (!currentStoryContent || !currentStoryMetadata) {
            await importStory(story)
        }
        story.content.lorebook.settings = lorebook.settings
        replaceSameIdCategories(story.content.lorebook, lorebook)

        if (overwriteSameId && !overwriteSameName) {
            replaceSameIdAddName(story.content.lorebook, lorebook)
        }
        if (!overwriteSameId && overwriteSameName) {
            replaceSameNameEnforceUniqueId(story.content.lorebook, lorebook)
        }
        if (overwriteSameId && overwriteSameName) {
            replaceSameIdThenName(story.content.lorebook, lorebook)
        }
        if (!overwriteSameId && !overwriteSameName) {
            skipSameIdAddSameName(story.content.lorebook, lorebook)
        }

        toast(
            `Imported Lorebook containing ${lorebook.entries.length} ${
                lorebook.entries.length > 1 ? 'entries' : 'entry'
            }${
                lorebook.categories.length > 0
                    ? ` and ${lorebook.categories.length} ${
                          lorebook.categories.length > 1 ? 'categories' : 'category'
                      }`
                    : ''
            }.`
        )
        setStoryUpdate(story.metadata.save())
        setImportLorebookModalVisible(false)

        return
    }

    const handleImport = useCallback(
        (file: FileInfo): Promise<boolean> => {
            const innerHandleImport = async (): Promise<boolean> => {
                let story = null
                // TODO: better handlign of importing multiple files
                switch (file.type) {
                    case ImportDataType.naiTheme:
                        const value = JSON.parse(file.text)
                        if (!hasSameKeys(Dark, value, Dark)) {
                            toast('Invalid Theme File')
                            logError('Invalid theme', false)
                            return true
                        }
                        toast('Theme imported to theme editor')
                        setThemePreview(value)
                        setSettingsModalOpen(SettingsPages.Theme)
                        return true
                    case ImportDataType.naiModule:
                        const json = deserialize(AIModuleExport, JSON.parse(file.text))
                        if (!json) throw new Error('invalid module')
                        const modules = await getStorage(session).getModules()
                        AIModule.fromData(
                            json.name,
                            json.description,
                            json.data,
                            json.mode ?? StoryMode.normal,
                            json?.image && isModuleImageValid(json?.image) && json.image?.length < 1000000
                                ? json.image
                                : undefined,
                            json.model
                        )
                            .then(async (module) => {
                                if (!modules.some((cur) => cur.id === module.id)) {
                                    toast(
                                        `Imported AI Module "${json.name}" for model "${modelName(
                                            json.model
                                                ? (json.model as TextGenerationModel)
                                                : TextGenerationModel.j6bv4
                                        )}"`
                                    )
                                    await getStorage(session).saveModule(module)
                                    setModules([...modules, module])
                                } else {
                                    toast(`Module "${json.name}" has already been imported.`)
                                }
                            })
                            .catch((error) => {
                                toast('AI Module import failed.')
                                throw new Error('invalid module: ' + error)
                            })
                        break
                    case ImportDataType.naiStory:
                        story = StoryContainer.deserialize(file.text)
                        story.metadata.id = uuid()
                        break
                    case ImportDataType.naiAlphaStory:
                        story = naiAlphaStoryToStory(file.text)
                        story.metadata.id = uuid()
                        break
                    case ImportDataType.naiScenario:
                        setImportedScenario(Scenario.deserialize(file.text))
                        setImportScenarioModalVisible(true)
                        return true
                    case ImportDataType.naiLorebook:
                        const lorebook = await Lorebook.deserialize(file.text)
                        if (!currentStoryContent || !currentStoryMetadata) {
                            importLorebook(lorebook, false, false)
                            break
                        }
                        const duplicateNames = findSharedNames(lorebook, currentStoryContent.lorebook)
                        const duplicateEntries = findSameEntries(lorebook, currentStoryContent.lorebook)
                        let modalRequired = false
                        modalRequired = duplicateNames.length > 0
                        if (lorebook.lorebookVersion >= 3) {
                            modalRequired = modalRequired || duplicateEntries.length > 0
                        }
                        for (const category of lorebook.categories) {
                            category.open = false
                        }
                        if (modalRequired) {
                            setImportedLorebook(lorebook)
                            setImportLorebookModalVisible(true)
                            return true
                        } else {
                            importLorebook(lorebook, false, false)
                        }
                        break
                    case ImportDataType.aidAdventureExport:
                        const aidAdventures = JSON.parse(file.text)
                        if (Array.isArray(aidAdventures)) {
                            if (aidAdventures.length === 1) {
                                story = aidAdventureExportToStory(aidAdventures[0])
                            } else {
                                setImportBundle({
                                    importObject: aidAdventures,
                                    type: ImportDataType.aidAdventureExport,
                                })
                                setMiscImportModalVisible(true)
                            }

                            return true
                        } else {
                            story = aidAdventureExportToStory(aidAdventures)
                        }
                        break
                    case ImportDataType.aidScenarioExport:
                        const aidScenarios = JSON.parse(file.text)
                        if (Array.isArray(aidScenarios)) {
                            if (aidScenarios.length === 1) {
                                const scenario = aidScenarioExportToScenario(aidScenarios[0])
                                setImportedScenario(scenario)
                                setImportScenarioModalVisible(true)
                            } else {
                                setImportBundle({
                                    importObject: aidScenarios,
                                    type: ImportDataType.aidScenarioExport,
                                })
                                setMiscImportModalVisible(true)
                            }
                        } else {
                            const scenario = aidScenarioExportToScenario(aidScenarios)
                            setImportedScenario(scenario)
                            setImportScenarioModalVisible(true)
                        }
                        return true
                    case ImportDataType.aidWorldInfoExport: {
                        const lorebook = aidWorldInfoToLorebook(JSON.parse(file.text))
                        if (!currentStoryContent || !currentStoryMetadata) {
                            importLorebook(lorebook, false, false)

                            break
                        }
                        const duplicateNames = findSharedNames(lorebook, currentStoryContent.lorebook)
                        if (duplicateNames.length > 0) {
                            setImportedLorebook(lorebook)
                            setImportLorebookModalVisible(true)
                            return true
                        } else {
                            importLorebook(lorebook, false, false)
                        }
                        break
                    }
                    case ImportDataType.koboldAISave: {
                        story = koboldAISaveToStory(JSON.parse(file.text), 'KoboldAI Import')
                        break
                    }
                    case ImportDataType.storySettings: {
                        if (settings && currentStoryMetadata) {
                            settings.parameters = await TextGenerationSettings.deserialize(file.text)
                            setStoryUpdate(currentStoryMetadata.save())
                        }
                        break
                    }
                    case ImportDataType.naiPreset: {
                        const value = StoryPreset.deserialize(file.text)

                        const newPreset = new StoryPreset(value.name, value.model)
                        newPreset.parameters = {
                            ...newPreset.parameters,
                            ...value.parameters,
                        } as TextGenerationSettings

                        const newPresetSerialized = JSON.stringify({ ...newPreset, id: '', remoteId: '' })
                        const existingPreset = userPresets.find(
                            (p) => JSON.stringify({ ...p, id: '', remoteId: '' }) === newPresetSerialized
                        )
                        if (existingPreset) {
                            toast(
                                `Preset "${value.name}" for AI Model "${modelName(
                                    newPreset.model
                                )}" was already imported" as "${existingPreset?.name}"`
                            )
                        } else {
                            await new Storage(session).savePreset(newPreset)
                            setUserPresets((userPresets) => [newPreset, ...userPresets])
                            toast(
                                `Imported Preset "${value.name}" for AI Model "${modelName(newPreset.model)}"`
                            )

                            if (currentStoryContent && currentStoryMetadata) {
                                if (modelsCompatible(value.model, currentStoryContent.settings.model)) {
                                    copyPresetToStory(newPreset, currentStoryContent)
                                }
                                setStoryUpdate(currentStoryMetadata.save())
                            }
                        }
                        break
                    }
                    case ImportDataType.badWordsV0: {
                        if (settings && currentStoryMetadata) {
                            toast(`Imported Banned Tokens`)
                            currentStoryContent.bannedSequenceGroups = addBans(
                                currentStoryContent.bannedSequenceGroups,
                                [
                                    await badWordArrayToBannedSequences(
                                        JSON.parse(file.text).bad_words_ids ?? []
                                    ),
                                ]
                            )
                            setStoryUpdate(currentStoryMetadata.save())
                        }
                        break
                    }
                    case ImportDataType.badWordsV1: {
                        if (settings && currentStoryMetadata) {
                            toast(`Imported Banned Tokens`)
                            currentStoryContent.bannedSequenceGroups = addBans(
                                currentStoryContent.bannedSequenceGroups,
                                JSON.parse(file.text).bannedSequenceGroups
                            )
                            setStoryUpdate(currentStoryMetadata.save())
                        }
                        break
                    }
                    case ImportDataType.logitBiasV0:
                    case ImportDataType.logitBiasV1: {
                        if (settings && currentStoryMetadata) {
                            toast(`Imported Phrase Biases`)
                            const biasGroups =
                                file.type === ImportDataType.logitBiasV0
                                    ? JSON.parse(file.text).logit_bias_groups
                                    : JSON.parse(file.text).phraseBiasGroups
                            migrateLogitBiasGroups(
                                biasGroups,
                                file.type === ImportDataType.logitBiasV0 ? 0 : 1
                            )
                            currentStoryContent.phraseBiasGroups = addBiases(
                                currentStoryContent?.phraseBiasGroups,
                                biasGroups
                            )
                            setStoryUpdate(currentStoryMetadata.save())
                        }
                        break
                    }
                    case ImportDataType.holoStoryV8:
                    case ImportDataType.holoStory: {
                        const parsed = JSON.parse(file.text)
                        story = holoStoryToStory(JSON.parse(file.text), parsed.title ?? 'HoloAI Import')
                        break
                    }
                    case ImportDataType.plainText: {
                        story = new StoryContainer()
                        if (getUserSetting(session.settings, 'useEditorV2')) {
                            story.content.document = new Document()
                            story.content.document.appendText(
                                file.text,
                                new Map([[1, [DocumentDataOrigin.prompt]]])
                            )

                            story.metadata.hasDocument = true
                        } else {
                            story.content.story = new Story()
                            story.content.story.insert(DataOrigin.prompt, file.text, 0, 0)
                        }
                        story.metadata.id = uuid()
                        break
                    }
                    default:
                        logInfo('unsupported file type:', false, file.type)
                        if (file.size <= 2 || (file.text && file.text.length <= 2)) {
                            toast('Unsupported file type. Is this file empty?')
                        } else {
                            toast('Unsupported file type.')
                        }
                        break
                }

                const modelChangeBlocked = new Set([ImportDataType.naiStory])

                if (story) {
                    if (modelChangeBlocked.has(file.type)) {
                        if (
                            !modelsCompatible(
                                story.content.settings.model,
                                getUserSetting(session.settings, 'defaultModel')
                            )
                        ) {
                            modelDifferenceToast(session, story.content.settings.model, false)
                        }
                    } else {
                        story.content.settings.model = getUserSetting(session.settings, 'defaultModel')
                    }
                    importStory(story)
                    return true
                }

                return false
            }
            return innerHandleImport()
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            currentStoryContent,
            currentStoryMetadata,
            session,
            settings,
            userPresets,
            setModules,
            setSettingsModalOpen,
            setStoryUpdate,
            setThemePreview,
            setUserPresets,
        ]
    )

    return (
        <Fragment>
            <ImportScenarioModal
                visible={importScenarioModalVisible}
                setVisible={setImportScenarioModalVisible}
                importedScenario={importedScenario}
            />
            <Modal
                label="Import Lorebook"
                onRequestClose={() => setImportLorebookModalVisible(false)}
                isOpen={importLorebookModalVisible}
                shouldCloseOnOverlayClick={true}
            >
                <ImportLorebook
                    onClickImport={(overwriteSameName: boolean, overwriteSameId: boolean) =>
                        importLorebook(importedLorebook, overwriteSameName, overwriteSameId)
                    }
                    importedLorebook={importedLorebook}
                />
            </Modal>
            <Modal
                label="Bulk Import"
                onRequestClose={() => {
                    setMiscImportModalVisible(false)
                }}
                isOpen={miscImportModalVisible}
                shouldCloseOnOverlayClick={true}
            >
                <ImportMisc
                    importBundle={importBundle}
                    onImportResolved={() => {
                        setMiscImportModalVisible(false)
                    }}
                />
            </Modal>
            <FileImporter
                overlay={props.overlay}
                overlayParentRef={props.overlayParentRef}
                button={props.button}
                buttonClickRef={props.buttonClickRef}
                allowedFileTypes={props.allowedFileTypes}
                onImportFile={handleImport}
                onAllFilesHandled={props.onAllFilesHandled}
            >
                {props.children}
            </FileImporter>
        </Fragment>
    )
}
