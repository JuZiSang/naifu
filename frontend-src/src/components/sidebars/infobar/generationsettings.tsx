import { serialize } from 'serializr'
import { useSetRecoilState, useRecoilValue } from 'recoil'
import { useEffect, useState, useRef, MutableRefObject, useMemo } from 'react'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import { SelectedStoryLoaded, Session, SiteTheme, StoryStateValue, StoryUpdate } from '../../../globals/state'
import { GlobalUserContext } from '../../../globals/globals'
import {
    LogitWarper,
    logitWarperName,
    OrderElement,
    StoryPreset,
    StorySettings,
    TextGenerationSettings,
} from '../../../data/story/storysettings'
import { AdvancedSettingsToggle } from '../../../styles/components/infobar'
import { Button, DarkColorButton, LightColorButton } from '../../../styles/ui/button'

import { Dark } from '../../../styles/themes/dark'
import { SetterPackage, setMaxLength, updateStory, exportPreset } from '../../../component-logic/optionslogic'
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CrossMidIcon,
    DeleteIcon,
    EditIcon,
    ExportIcon,
    PlusIcon,
    ReloadIcon,
    SaveIcon,
    UpDownArrow,
} from '../../../styles/ui/icons'
import { getStorage, Storage } from '../../../data/storage/storage'
import { MainSettingInfo } from '../../../styles/ui/editorcard'
import { logError } from '../../../util/browser'
import { isMobileDevice } from '../../../util/compat'
import { ImportDataType } from '../../../data/story/storyconverter'
import Checkbox from '../../controls/checkbox'
import EditorCard, {
    MultiActionEditorCard,
    MainSettingSliderCard,
    MinorSettingSliderCard,
} from '../common/editorcard'
import { Line, SidebarElementsContainer, SidebarPlaceholder } from '../common/common'
import { useReload } from '../../../hooks/useReload'
import { FileInfo, useFileInput } from '../../controls/fileinput'
import { DefaultModel, TextGenerationModel } from '../../../data/request/model'
import { getModelPresets } from '../../../data/story/defaultpresets'
import { modelRepPenMax, modelRepPenStepSize } from '../../../data/ai/model'
import { FlexCol } from '../../../styles/ui/layout'
import Modal, { ModalType } from '../../modals/modal'
import { CloseButton } from '../../modals/common'
import { modelName, modelsCompatible } from '../../../util/models'
import { copyPresetToStory, copyStoryToPreset } from '../../../util/presets'
import { getLocalStorage, setLocalStorage } from '../../../util/storage'
import { transparentize } from '../../../util/colour'
import { useStoryPresetSelect } from '../../presetselect'
import { DEFAULT_THEME } from '../../../styles/themes/theme'

const PresetParent = styled.div<{ padded?: boolean }>`
    display: flex;
    flex-direction: column;
    position: relative;
    padding-right: ${(props) => (props.padded ? '10px' : '0')};
`
const PresetManager = styled.div<{ visible: boolean }>`
    display: flex;
    height: ${(props) => (props.visible ? 'auto' : '0')};
    opacity: ${(props) => (props.visible ? '1' : '0')};
    transform: ${(props) => (props.visible ? 'scaleY(1)' : 'scaleY(0)')};
    transition: opacity 0.3s ease-in-out, transform 0.2s ease-in-out, padding 0.2s ease-in-out,
        margin-top 0.2s ease-in-out;
    transform-origin: top center;
    background: ${(props) => props.theme.colors.bg2};
    padding: ${(props) => (props.visible ? '15px' : '0')} 15px;
    margin-top: ${(props) => (props.visible ? '10px' : '0')};
    flex-direction: column;
`
const PresetManagerTop = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    & > div:nth-child(1) {
        display: flex;
        flex-direction: column;
        gap: 5px;
        & > div:nth-child(1) {
            font-size: 0.8rem;
            opacity: 0.8;
        }
        & > div:nth-child(2) {
            color: ${(props) => props.theme.colors.textHeadings};
            font-weight: bold;
            font-family: ${(props) => props.theme.fonts.headings};
        }
    }
    & > div:nth-child(2) {
        display: flex;
        flex-direction: row;
        & > * {
            align-self: center;
            padding: 12px;
        }
    }
`
const PresetManagerBottom = styled.div<{ extended: boolean }>`
    margin-top: 10px;
    & > *:nth-child(1) {
        cursor: pointer;
        font-size: 0.8rem;
        display: flex;
        gap: 10px;
        flex-direction: row;
        align-items: center;
    }
    & > *:nth-child(2) {
        margin-top: ${(props) => (props.extended ? '10px    ' : '0')};
        height: ${(props) => (props.extended ? 'auto' : '0')};
        opacity: ${(props) => (props.extended ? '1' : '0')};
        transform: ${(props) => (props.extended ? 'scaleY(1)' : 'scaleY(0)')};
        transition: opacity 0.2s ease-in-out, transform 0.15s ease-in-out, padding 0.1s ease-in-out,
            margin-top 0.1s ease-in-out;
        transform-origin: top center;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
`
const PresetManagerOverlay = styled(motion.div)`
    position: absolute;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    left: 0;
    top: 0;
    background: ${(props) => transparentize(0.27, props.theme.colors.bg0)};
    z-index: 100;
`
const PresetManagerInputContainer = styled(motion.div)`
    position: absolute;
    width: 100%;
    height: min-content;
    overflow-y: auto;
    left: 0;
    top: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
    z-index: 200;
    overflow: visible;
    button {
        margin-top: 5px;
    }
    input[type='text'] {
        outline: 1px solid ${(props) => props.theme.colors.bg3};
    }
`

const PresetSelectContainer = styled.div`
    display: flex;
    flex-direction: row;
    position: relative;
    overflow: visible;
    & > * {
        flex: 1;
    }
    & > *[disabled] {
        opacity: 0.5;
    }
`
const PresetIconButton = styled(LightColorButton)`
    flex: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px;
`
const OrderArrow = styled(Button)`
    flex: 0 0 auto;
    width: auto;
    > div {
        height: 0.5rem;
        width: 1rem;
    }
    padding: 4px 6px;
`
const OrderGroup = styled(Reorder.Group)`
    width: 100%;
    li {
        width: 100%;
    }
`
const OrderEntry = styled(Reorder.Item)`
    display: flex;
    margin: 2px;
    background: ${(props) => props.theme.colors.bg2};
    border: 1px solid ${(props) => props.theme.colors.bg3};
    width: 100%;
    cursor: grab;
    user-select: none;
`

const OrderFakeButton = styled.div`
    font-weight: 600;
    padding: 10px;
    display: flex;
    align-items: center;
    background: ${(props) => props.theme.colors.bg2};
`

const OrderDisabled = styled.div`
    color: ${(props) => transparentize(0.6, props.theme.colors.warning)};
    margin-left: 1ch;
`

const ToggleButton = styled(Button)`
    margin-left: auto;
    min-width: 9ch;
`

const StyledOrderModal = styled.div`
    padding: 30px;
    background: ${(props) => props.theme.colors.bg1};
    max-width: 100vw;
    width: 400px;
`

const HiddenSettingsText = styled.div`
    opacity: 0.6;
    margin-top: 4px;
    margin-left: 2px;
`
const OrderCard = styled.div`
    margin: 15px 15px;
    font-size: 0.875rem;
`

export default function GenerationSettings(props: { selectedStory: string }): JSX.Element {
    const session = useRecoilValue(Session)
    useRecoilValue(SelectedStoryLoaded)

    const [presetManagerExtended, setPresetManagerExtended] = useState(false)
    const [hideChangeDialog, setHideChangeDialog] = useState(true)
    const [saveNameDialog, setSaveNameDialog] = useState(false)
    const [changeNameDialog, setChangeNameDialog] = useState(false)
    const [saveNewName, setSaveNewName] = useState('')

    const [showAdvancedSettings, setShowAdvancedSettings] = useState(
        () => getLocalStorage('advancedSettingsShown') === 'true'
    )
    const [showRegularSettings, setShowRegularSettings] = useState(
        () => getLocalStorage('regularSettingsShown') !== 'false'
    )
    const newNameRef: MutableRefObject<HTMLInputElement | null> = useRef(null)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)

    const settings = currentStoryContent?.settings
    const genSettings = settings?.parameters

    const { presetSelect, currentPreset, setUserPresets, setPreset, userPresets, defaultPresets } =
        useStoryPresetSelect(
            () => {
                setSaveNameDialog(false)
                setChangeNameDialog(false)
                setHideChangeDialog(true)
            },
            () => {
                setHideChangeDialog(false)
            }
        )

    let combinedPresets = [...defaultPresets, ...userPresets]

    const savePreset = async (): Promise<void> => {
        if (!genSettings || !currentStoryContent) {
            return
        }

        if (!currentPreset.id || !combinedPresets.some((preset) => preset.id === settings?.preset ?? '')) {
            const newPreset = new StoryPreset('New', currentStoryContent.settings.model)
            copyStoryToPreset(currentStoryContent, newPreset)
            copyPresetToStory(newPreset, currentStoryContent)

            await new Storage(session).savePreset(newPreset)
            setUserPresets([newPreset, ...userPresets])
            combinedPresets = [newPreset, ...userPresets, ...defaultPresets]
        } else {
            let savePromise = Promise.resolve('')
            const newPresets = userPresets.map((preset) => {
                if (preset.id === currentPreset.id) {
                    const newPreset = StoryPreset.deserialize(JSON.stringify(serialize(StoryPreset, preset)))
                    copyStoryToPreset(currentStoryContent, newPreset)

                    savePromise = new Storage(session).savePreset(newPreset)
                    return newPreset
                }
                return preset
            })
            await savePromise
            setUserPresets(newPresets)
            combinedPresets = [...newPresets, ...defaultPresets]
        }
    }
    const saveNewPreset = async (): Promise<void> => {
        if (!genSettings || !currentStoryContent) {
            return
        }

        setSaveNameDialog(false)

        const newPreset = new StoryPreset(saveNewName ?? 'New', currentStoryContent.settings.model)
        copyStoryToPreset(currentStoryContent, newPreset)
        copyPresetToStory(newPreset, currentStoryContent)

        await getStorage(session).savePreset(newPreset)
        setUserPresets([newPreset, ...userPresets])
        combinedPresets = [newPreset, ...userPresets, ...defaultPresets]
    }
    const renamePreset = async (): Promise<void> => {
        let savePromise = Promise.resolve('')
        const newPresets = userPresets.map((preset) => {
            if (preset.id === currentPreset.id) {
                const newPreset = StoryPreset.deserialize(JSON.stringify(serialize(StoryPreset, preset)))
                newPreset.name = saveNewName
                savePromise = new Storage(session).savePreset(newPreset)
                return newPreset
            }
            return preset
        })
        await savePromise
        setUserPresets(newPresets)
        combinedPresets = [...newPresets, ...defaultPresets]
        setPreset(currentPreset.id)
    }
    const deletePreset = async (): Promise<void> => {
        const presetToDelete = userPresets.find((preset) => preset.id === currentPreset.id)
        if (!presetToDelete) {
            logError("Can't delete non-user preset" + currentPreset.id, false)
            return
        }
        const newPresets = userPresets.filter((preset) => preset.id !== currentPreset.id)
        await new Storage(session).deletePreset(presetToDelete)
        setUserPresets(newPresets)
        combinedPresets = [...newPresets, ...defaultPresets]
        setPreset(defaultPresets[0].id)
    }

    const importPreset = async (file: FileInfo): Promise<void> => {
        if (file.type === ImportDataType.naiPreset) {
            const value = StoryPreset.deserialize(file.text)

            const newPreset = new StoryPreset(value.name, value.model)
            newPreset.parameters = { ...newPreset.parameters, ...value.parameters } as TextGenerationSettings

            await new Storage(session).savePreset(newPreset)
            setUserPresets([newPreset, ...userPresets])
            combinedPresets = [newPreset, ...userPresets, ...defaultPresets]
            if (
                currentStoryContent &&
                modelsCompatible(newPreset.model, currentStoryContent.settings.model)
            ) {
                setPreset(newPreset.id)
            }

            toast(`Imported Preset "${value.name}" for AI Model "${modelName(newPreset.model)}"`)
            return
        }
        if (file.type === ImportDataType.storySettings) {
            const value = JSON.parse(file.text)

            const newPreset = new StoryPreset(
                file.name.split(/[/\\]/).slice(-1)[0].split('.').slice(0, -1).join('.'),
                TextGenerationModel.j6bv4
            )
            newPreset.parameters = { ...newPreset.parameters, ...value } as TextGenerationSettings

            await new Storage(session).savePreset(newPreset)
            setUserPresets([newPreset, ...userPresets])
            combinedPresets = [newPreset, ...userPresets, ...defaultPresets]
            setPreset(newPreset.id)

            toast(`Imported Generation Settings as Preset`)
            return
        }
    }

    const [inputElement, inputClick] = useFileInput({
        onFileImport: importPreset,
        allowedFileTypes: [ImportDataType.naiPreset, ImportDataType.storySettings],
    })

    const defaultSettings =
        combinedPresets.find((preset) => preset.id === currentPreset.id)?.parameters ??
        getModelPresets(currentStoryContent?.settings.model ?? DefaultModel)[0].parameters

    if (!settings) {
        return (
            <SidebarElementsContainer>
                <SidebarPlaceholder>
                    <h4>No Story selected.</h4>
                </SidebarPlaceholder>
            </SidebarElementsContainer>
        )
    }

    return (
        <SidebarElementsContainer>
            <AnimatePresence>
                {saveNameDialog || changeNameDialog ? (
                    <PresetManagerOverlay
                        onClick={() => {
                            setSaveNameDialog(false)
                            setChangeNameDialog(false)
                        }}
                        key="presetManagerOverlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { ease: 'easeInOut', duration: 0.2 } }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    ></PresetManagerOverlay>
                ) : null}
            </AnimatePresence>
            <PresetParent>
                <MultiActionEditorCard
                    title={'Config Preset'}
                    description="Choose from a selection of generation settings."
                    hints={
                        session.noAccount
                            ? [
                                  {
                                      hint: 'Export',
                                      onHintClick: () =>
                                          currentStoryContent &&
                                          exportPreset(
                                              currentStoryContent,
                                              currentPreset.name,
                                              currentPreset.model
                                          ),
                                  },
                              ]
                            : [
                                  {
                                      hint: 'Import',
                                      onHintClick: inputClick,
                                  },
                                  {
                                      hint: 'Export',
                                      onHintClick: () =>
                                          currentStoryContent &&
                                          exportPreset(
                                              currentStoryContent,
                                              currentPreset.name,
                                              currentPreset.model
                                          ),
                                  },
                              ]
                    }
                >
                    <PresetSelectContainer>
                        <AnimatePresence>
                            {saveNameDialog || changeNameDialog ? (
                                <PresetManagerInputContainer
                                    key="presetManagerInputContainer"
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: 1,
                                        transition: { ease: 'easeInOut', duration: 0.1 },
                                    }}
                                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                >
                                    <input
                                        type="text"
                                        maxLength={40}
                                        placeholder="Type name here and press enter"
                                        ref={newNameRef}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                        onChange={(e) => setSaveNewName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && saveNewName.length > 0) {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                if (saveNameDialog) saveNewPreset()
                                                else if (changeNameDialog) renamePreset()
                                            }
                                            if (e.key === 'Escape') {
                                                setSaveNameDialog(false)
                                                setChangeNameDialog(false)
                                            }
                                        }}
                                        value={saveNewName}
                                    />
                                    <LightColorButton
                                        disabled={saveNewName.length <= 0}
                                        onClick={() => {
                                            if (saveNameDialog) saveNewPreset()
                                            else if (changeNameDialog) renamePreset()
                                        }}
                                        style={{ justifyContent: 'center' }}
                                    >
                                        <SaveIcon /> Save
                                    </LightColorButton>
                                    {changeNameDialog ? (
                                        <LightColorButton
                                            onClick={() => deletePreset()}
                                            style={{ justifyContent: 'center' }}
                                        >
                                            <DeleteIcon /> Delete
                                        </LightColorButton>
                                    ) : null}
                                    <LightColorButton
                                        onClick={() => {
                                            setSaveNameDialog(false)
                                            setChangeNameDialog(false)
                                        }}
                                        style={{ justifyContent: 'center' }}
                                    >
                                        <CrossMidIcon /> Cancel
                                    </LightColorButton>
                                </PresetManagerInputContainer>
                            ) : null}
                        </AnimatePresence>

                        {presetSelect}

                        <PresetIconButton
                            aria-label="Edit Preset"
                            disabled={
                                !currentPreset.id ||
                                defaultPresets.some((preset) => currentPreset.id === preset.id)
                            }
                            onClick={() => {
                                setSaveNewName(currentPreset.name)
                                setChangeNameDialog(true)
                                setTimeout(() => newNameRef.current?.focus(), 50)
                            }}
                        >
                            <EditIcon />
                        </PresetIconButton>
                        {!session.noAccount ?? (
                            <PresetIconButton
                                aria-label="Create New Preset"
                                onClick={() => {
                                    setSaveNewName('')
                                    setSaveNameDialog(true)
                                    setTimeout(() => newNameRef.current?.focus(), 50)
                                }}
                            >
                                <PlusIcon />
                            </PresetIconButton>
                        )}
                    </PresetSelectContainer>
                </MultiActionEditorCard>
                <PresetManager
                    visible={currentPreset.changed && !hideChangeDialog}
                    aria-hidden={!(currentPreset.changed && !hideChangeDialog)}
                >
                    <PresetManagerTop>
                        <div>
                            <div>Settings saved to story.</div>
                            <div>
                                {!currentPreset.id ||
                                defaultPresets.some((preset) => currentPreset.id === preset.id)
                                    ? 'Save to new Preset?'
                                    : 'Update active Preset?'}
                            </div>
                        </div>
                        <div>
                            <LightColorButton
                                tabIndex={0}
                                role="button"
                                disabled={!(currentPreset.changed && !hideChangeDialog)}
                                aria-hidden={!(currentPreset.changed && !hideChangeDialog)}
                                onClick={() => {
                                    if (
                                        !currentPreset.id ||
                                        defaultPresets.some((preset) => currentPreset.id === preset.id)
                                    ) {
                                        setSaveNewName('')
                                        setSaveNameDialog(true)
                                        setTimeout(() => newNameRef.current?.focus(), 50)
                                    } else {
                                        savePreset()
                                    }
                                }}
                                aria-label="Save"
                                style={{ marginBottom: '5px' }}
                            >
                                <SaveIcon />
                            </LightColorButton>
                            <DarkColorButton
                                tabIndex={0}
                                role="button"
                                disabled={!(currentPreset.changed && !hideChangeDialog)}
                                aria-hidden={!(currentPreset.changed && !hideChangeDialog)}
                                onClick={() => {
                                    setHideChangeDialog(true)
                                }}
                                aria-label="Ignore"
                                style={{ marginBottom: '5px' }}
                            >
                                <CrossMidIcon />
                            </DarkColorButton>
                        </div>
                    </PresetManagerTop>
                    <PresetManagerBottom extended={presetManagerExtended}>
                        <div
                            tabIndex={!(currentPreset.changed && !hideChangeDialog) ? -1 : 0}
                            role="button"
                            aria-hidden={!(currentPreset.changed && !hideChangeDialog)}
                            onClick={() => setPresetManagerExtended(!presetManagerExtended)}
                        >
                            Other Options {presetManagerExtended ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        </div>
                        <div>
                            <Button
                                tabIndex={0}
                                role="button"
                                disabled={
                                    !(currentPreset.changed && !hideChangeDialog) || !presetManagerExtended
                                }
                                aria-hidden={
                                    !(currentPreset.changed && !hideChangeDialog) || !presetManagerExtended
                                }
                                onClick={() => {
                                    setPreset(currentPreset.id)
                                }}
                                aria-label="Reset Changes"
                                style={{ padding: '5px', justifyContent: 'center' }}
                            >
                                <ReloadIcon /> Reset Changes
                            </Button>
                            {!currentPreset.id ||
                            defaultPresets.some((preset) => currentPreset.id === preset.id) ? (
                                <></>
                            ) : (
                                <Button
                                    tabIndex={0}
                                    role="button"
                                    disabled={
                                        !(currentPreset.changed && !hideChangeDialog) ||
                                        !presetManagerExtended
                                    }
                                    aria-hidden={
                                        !(currentPreset.changed && !hideChangeDialog) ||
                                        !presetManagerExtended
                                    }
                                    onClick={() => {
                                        setSaveNewName('')
                                        setSaveNameDialog(true)
                                        setTimeout(() => newNameRef.current?.focus(), 50)
                                    }}
                                    aria-label="Save to New Preset"
                                    style={{ padding: '5px', justifyContent: 'center' }}
                                >
                                    <ExportIcon /> Save to New Preset
                                </Button>
                            )}
                        </div>
                    </PresetManagerBottom>
                </PresetManager>
                {inputElement}
            </PresetParent>
            <Line />

            <div>
                <EditorCard title="" small>
                    <AdvancedSettingsToggle
                        onClick={() => {
                            setLocalStorage('regularSettingsShown', !showRegularSettings ? 'true' : 'false')
                            setShowRegularSettings(!showRegularSettings)
                        }}
                    >
                        <span>Generation Options</span>
                        <UpDownArrow up={showRegularSettings} />
                    </AdvancedSettingsToggle>
                </EditorCard>
            </div>
            {showRegularSettings ? (
                <PresetParent padded={isMobileDevice}>
                    <RegularSettings selectedStory={props.selectedStory} defaultSettings={defaultSettings} />
                </PresetParent>
            ) : (
                <></>
            )}

            <div>
                <EditorCard title="">
                    <AdvancedSettingsToggle
                        onClick={() => {
                            setLocalStorage('advancedSettingsShown', !showAdvancedSettings ? 'true' : 'false')
                            setShowAdvancedSettings(!showAdvancedSettings)
                        }}
                    >
                        <span>Advanced Options</span>
                        <UpDownArrow up={showAdvancedSettings} />
                    </AdvancedSettingsToggle>
                </EditorCard>
            </div>
            {showAdvancedSettings ? (
                <PresetParent padded={isMobileDevice}>
                    <AdvancedSettings selectedStory={props.selectedStory} defaultSettings={defaultSettings} />
                </PresetParent>
            ) : (
                <></>
            )}
        </SidebarElementsContainer>
    )
}

function RegularSettings(props: { selectedStory: string; defaultSettings: TextGenerationSettings }) {
    const defaultSettings = props.defaultSettings
    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)
    const session = useRecoilValue(Session)
    const settings = currentStoryContent?.settings
    const model = settings?.model

    const genSettings = useMemo(
        () => settings?.parameters ?? new TextGenerationSettings(),
        [settings?.parameters]
    )
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))

    const update = useReload()
    const setterPackage: SetterPackage = useMemo(
        () => ({
            currentStory: currentStory,
            currentStoryContent: currentStoryContent,
            genSettings: genSettings,
            updateState: (
                valOrUpdater: StoryStateValue | ((currVal: StoryStateValue) => StoryStateValue)
            ) => {
                setStoryUpdate(valOrUpdater)
                update()
            },
        }),
        [currentStory, currentStoryContent, genSettings, setStoryUpdate, update]
    )

    const randomness = useMemo(() => {
        return (
            <MainSettingSliderCard
                title={'Randomness'}
                hint={'Default: ' + defaultSettings.temperature}
                tooltip={'The higher the value, the more random the output!'}
                onHintClick={() =>
                    updateStory(() => (genSettings.temperature = defaultSettings.temperature), setterPackage)
                }
                min="0.1"
                max="2.5"
                step="0.01"
                value={genSettings.temperature}
                onChange={(e) => updateStory(() => (genSettings.temperature = e), setterPackage)}
            ></MainSettingSliderCard>
        )
    }, [defaultSettings.temperature, genSettings, setterPackage])

    const outputLength = useMemo(() => {
        return (
            <MainSettingSliderCard
                title={'Output Length'}
                hint={'Default: ' + defaultSettings.max_length * 4}
                tooltip={'Increase the length of the generated responses'}
                onHintClick={() => setMaxLength(defaultSettings.max_length, setterPackage)}
                min={4}
                max={session.subscription.tier >= 3 ? 600 : 400}
                step={4}
                value={genSettings.max_length * 4}
                suffix={() => `Characters`}
                prefix={() => `~`}
                onChange={(e) => setMaxLength(Math.ceil(e / 4), setterPackage)}
                preventDecimal={true}
                forceStep={true}
            ></MainSettingSliderCard>
        )
    }, [defaultSettings.max_length, genSettings.max_length, session.subscription.tier, setterPackage])

    const repetitionPenalty = useMemo(() => {
        return (
            <MainSettingSliderCard
                title={'Repetition Penalty'}
                hint={'Default: ' + defaultSettings.repetition_penalty}
                tooltip={'Higher values make the output less repetitive.'}
                onHintClick={() =>
                    updateStory(() => {
                        genSettings.repetition_penalty = defaultSettings.repetition_penalty
                    }, setterPackage)
                }
                min="1.0"
                max={modelRepPenMax(model)}
                step={modelRepPenStepSize(model)}
                value={genSettings.repetition_penalty}
                onChange={(e) => updateStory(() => (genSettings.repetition_penalty = e), setterPackage)}
                uncapMin={true}
                uncapMax={true}
            ></MainSettingSliderCard>
        )
    }, [defaultSettings.repetition_penalty, genSettings, model, setterPackage])

    if (settings === undefined || currentStory === undefined || genSettings === undefined) {
        return <></>
    }

    return (
        <>
            {randomness}
            {outputLength}
            {repetitionPenalty}
        </>
    )
}

function AdvancedSettings(props: { selectedStory: string; defaultSettings: TextGenerationSettings }) {
    const defaultSettings = props.defaultSettings
    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)
    const settings = useMemo(
        () => currentStoryContent?.settings ?? new StorySettings(),
        [currentStoryContent?.settings]
    )
    const genSettings = useMemo(
        () => settings?.parameters ?? new TextGenerationSettings(),
        [settings?.parameters]
    )
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))

    const update = useReload()
    const setterPackage: SetterPackage = useMemo(
        () => ({
            currentStory: currentStory,
            currentStoryContent: currentStoryContent,
            genSettings: genSettings,
            updateState: (
                valOrUpdater: StoryStateValue | ((currVal: StoryStateValue) => StoryStateValue)
            ) => {
                setStoryUpdate(valOrUpdater)
                update()
            },
        }),
        [currentStory, currentStoryContent, genSettings, setStoryUpdate, update]
    )

    const topk = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Top K"
                title={`Top K`}
                hint={'Default: ' + (defaultSettings.top_k > 0 ? defaultSettings.top_k : '0 (off)')}
                tooltip={`Increases consistency by only selecting the most likely\
                            tokens and redistributing the probabilities. \nLower settings\
                            create a smaller pool of tokens, trading creativity for consistency.`}
                onHintClick={() =>
                    updateStory(() => (genSettings.top_k = defaultSettings.top_k), setterPackage)
                }
                suffix={(v) => (v > 0 ? '' : '(off)')}
                min="0"
                max="150"
                step="1"
                value={genSettings.top_k}
                onChange={(e) => updateStory(() => (genSettings.top_k = e), setterPackage)}
                preventDecimal={true}
                uncapMax={true}
            />
        )
    }, [defaultSettings.top_k, genSettings, setterPackage])

    const nucleus = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Nucleus"
                title={`Nucleus`}
                hint={'Default: ' + (defaultSettings.top_p < 1 ? defaultSettings.top_p : '1 (off)')}
                tooltip={`Increases consistency by taking tokens from the top and\
                adding up their probabilities until it reaches the percentage\
                set. \nLower settings create a smaller pool of tokens, trading\
                creativity for consistency.`}
                onHintClick={() =>
                    updateStory(() => (genSettings.top_p = defaultSettings.top_p), setterPackage)
                }
                suffix={(v) => (v < 1 ? '' : '(off)')}
                min="0.05"
                max="1.0"
                step="0.025"
                value={genSettings.top_p}
                onChange={(e) => updateStory(() => (genSettings.top_p = e), setterPackage)}
            />
        )
    }, [defaultSettings.top_p, genSettings, setterPackage])

    const tailFree = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Tail-Free"
                title={`Tail-Free`}
                hint={
                    'Default: ' +
                    (defaultSettings.tail_free_sampling < 1 ? defaultSettings.tail_free_sampling : '1 (off)')
                }
                tooltip={`Increases the consistency of the output by working from the\
                bottom and trimming the 'worst' possible tokens. \nGenerally\
                has a smaller effect on creativity than other sampling types.\
                Experiment!`}
                onHintClick={() =>
                    updateStory(
                        () => (genSettings.tail_free_sampling = defaultSettings.tail_free_sampling),
                        setterPackage
                    )
                }
                suffix={(v) => (v < 1 ? '' : '(off)')}
                min="0.05"
                max="1.00"
                step="0.001"
                value={genSettings.tail_free_sampling}
                onChange={(e) => updateStory(() => (genSettings.tail_free_sampling = e), setterPackage)}
                roundDigits={3}
            />
        )
    }, [defaultSettings.tail_free_sampling, genSettings, setterPackage])

    const topA = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Top A"
                title={`Top A`}
                hint={'Default: ' + (defaultSettings.top_a < 1 ? defaultSettings.top_a : '1 (off)')}
                tooltip={`Increases the consistency of the output by removing unlikely tokens\
                    based on the highest token probability.`}
                onHintClick={() =>
                    updateStory(() => (genSettings.top_a = defaultSettings.top_a), setterPackage)
                }
                suffix={(v) => (v < 1 ? '' : '(off)')}
                min="0.05"
                max="1.00"
                step="0.025"
                value={genSettings.top_a}
                onChange={(e) => updateStory(() => (genSettings.top_a = e), setterPackage)}
                roundDigits={3}
            />
        )
    }, [defaultSettings.top_a, genSettings, setterPackage])

    const typicalP = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Typical"
                title={`Typical`}
                hint={'Default: ' + (defaultSettings.typical_p < 1 ? defaultSettings.typical_p : '1 (off)')}
                tooltip={`Selects tokens according to the expected amount of information they contribute.`}
                onHintClick={() =>
                    updateStory(() => (genSettings.typical_p = defaultSettings.typical_p), setterPackage)
                }
                suffix={(v) => (v < 1 ? '' : '(off)')}
                min="0.05"
                max="1.00"
                step="0.025"
                value={genSettings.typical_p}
                onChange={(e) => updateStory(() => (genSettings.typical_p = e), setterPackage)}
                roundDigits={3}
            />
        )
    }, [defaultSettings.typical_p, genSettings, setterPackage])

    const [drprInput, setDrprInput] = useState(false)
    useEffect(() => setDrprInput(settings?.dynamicPenaltyRange ?? false), [settings?.dynamicPenaltyRange])
    const repPenRange = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Range"
                title={`Range`}
                hint={
                    'Default: ' +
                    (defaultSettings.repetition_penalty_range != 0
                        ? defaultSettings.repetition_penalty_range
                        : '0 (off)')
                }
                tooltip="How many tokens, starting from the last generated one, will
                be considered repeated if they appear in the next output."
                onHintClick={() => {
                    if (defaultSettings.repetition_penalty_range)
                        updateStory(
                            () =>
                                (genSettings.repetition_penalty_range =
                                    defaultSettings.repetition_penalty_range),
                            setterPackage
                        )
                }}
                disabled={drprInput === true}
                suffix={(v) => (v != 0 ? '' : '(off)')}
                min="0"
                max="2048"
                step="16"
                value={genSettings.repetition_penalty_range}
                onChange={(e) => updateStory(() => (genSettings.repetition_penalty_range = e), setterPackage)}
                preventDecimal={true}
            />
        )
    }, [defaultSettings.repetition_penalty_range, drprInput, genSettings, setterPackage])

    const drpr = useMemo(() => {
        return (
            <EditorCard style={{ marginTop: 0, marginBottom: '-15px' }}>
                <Checkbox
                    label={'Dynamic Range'}
                    alternate={true}
                    value={drprInput ?? false}
                    setValue={(e) => {
                        setDrprInput(e)
                        updateStory(() => (settings.dynamicPenaltyRange = e), setterPackage)
                    }}
                    checkedText={'The repetition penalty range is dynamic, only applying to "Story" text.'}
                    uncheckedText={'The repetition penalty range is a fixed number of tokens.'}
                />
            </EditorCard>
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setterPackage, settings, settings.dynamicPenaltyRange])

    const repPenSlope = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Slope"
                title={`Slope`}
                hint={
                    'Default: ' +
                    (defaultSettings.repetition_penalty_slope != 0
                        ? defaultSettings.repetition_penalty_slope
                        : '0 (off)')
                }
                tooltip={`Affects the ramping of the penalty's harshness, starting\
                from the final token. \nHigher values penalize the final\
                tokens more harshly, but are softer on the earlier tokens.\
                Lower values cause a smoother reduction of probability across all tokens.`}
                onHintClick={() => {
                    if (defaultSettings.repetition_penalty_slope)
                        updateStory(
                            () =>
                                (genSettings.repetition_penalty_slope =
                                    defaultSettings.repetition_penalty_slope),
                            setterPackage
                        )
                }}
                suffix={(v) => (v != 0 ? '' : '(off)')}
                min="0.00"
                max="10.00"
                step="0.09"
                value={genSettings.repetition_penalty_slope}
                onChange={(e) => updateStory(() => (genSettings.repetition_penalty_slope = e), setterPackage)}
            />
        )
    }, [defaultSettings.repetition_penalty_slope, genSettings, setterPackage])

    const repPenPresence = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Presence"
                title={`Presence`}
                hint={
                    'Default: ' +
                    (defaultSettings.repetition_penalty_presence != 0
                        ? defaultSettings.repetition_penalty_presence
                        : '0 (off)')
                }
                tooltip={`Applies a static penalty to the generation of tokens that appear within\
                the Repetition Penalty Range.
                This penalty is applied separately from the Repetition Penalty setting and is not affected by\
                Repetition Penalty Slope.`}
                onHintClick={() => {
                    updateStory(
                        () =>
                            (genSettings.repetition_penalty_presence =
                                defaultSettings.repetition_penalty_presence ?? 0),
                        setterPackage
                    )
                }}
                suffix={(v) => (v != 0 ? '' : '(off)')}
                min="0.00"
                max="5.00"
                step="0.05"
                value={genSettings.repetition_penalty_presence}
                onChange={(e) =>
                    updateStory(() => (genSettings.repetition_penalty_presence = e), setterPackage)
                }
            />
        )
    }, [defaultSettings.repetition_penalty_presence, genSettings, setterPackage])

    const repPenFrequency = useMemo(() => {
        return (
            <MinorSettingSliderCard
                key="Frequency"
                title={`Frequency`}
                hint={
                    'Default: ' +
                    (defaultSettings.repetition_penalty_frequency != 0
                        ? defaultSettings.repetition_penalty_frequency
                        : '0 (off)')
                }
                tooltip={`Applies a penalty to the generation of tokens based on the number of occurrences of that token within\
                the Repetition Penalty Range.
                This penalty is applied separately from the Repetition Penalty setting and is not affected by\
                Repetition Penalty Slope.`}
                onHintClick={() => {
                    updateStory(
                        () =>
                            (genSettings.repetition_penalty_frequency =
                                defaultSettings.repetition_penalty_frequency ?? 0),
                        setterPackage
                    )
                }}
                suffix={(v) => (v != 0 ? '' : '(off)')}
                min="0.00"
                max="1.00"
                step="0.01"
                value={genSettings.repetition_penalty_frequency}
                onChange={(e) =>
                    updateStory(() => (genSettings.repetition_penalty_frequency = e), setterPackage)
                }
            />
        )
    }, [defaultSettings.repetition_penalty_frequency, genSettings, setterPackage])

    const [orderModalOpen, setOrderModalOpen] = useState(false)
    const siteTheme = useRecoilValue(SiteTheme)

    if (settings === undefined || currentStory === undefined || genSettings === undefined) {
        return <></>
    }
    const hiddenSettingsCount = genSettings.order.reduce((a, b) => (b.enabled ? a : a + 1), 0)

    return (
        <>
            <MainSettingInfo
                style={{
                    color: siteTheme.colors.warning ?? DEFAULT_THEME.colors.warning,
                    padding: '5px 15px',
                }}
            >
                {`Experimentation with these settings is encouraged, but be warned that their effects aren't always obvious.`}
            </MainSettingInfo>

            {genSettings.order.filter((setting) => setting.enabled).length > 1 && (
                <MainSettingInfo
                    style={{
                        padding: '15px 15px 0 15px',
                        marginBottom: 0,
                    }}
                >
                    {`Sampling`}
                </MainSettingInfo>
            )}

            {genSettings.order
                .filter((setting) => setting.enabled)
                .map((setting) => {
                    switch (setting.id) {
                        case LogitWarper.TopK:
                            return topk
                        case LogitWarper.TopP:
                            return nucleus
                        case LogitWarper.TFS:
                            return tailFree
                        case LogitWarper.TopA:
                            return topA
                        case LogitWarper.TypicalP:
                            return typicalP
                    }
                })}

            <OrderCard>
                <>
                    <LightColorButton onClick={() => setOrderModalOpen(true)} style={{ width: '100%' }}>
                        Change Settings Order
                    </LightColorButton>
                    {hiddenSettingsCount > 0 && (
                        <HiddenSettingsText>
                            {hiddenSettingsCount} hidden due to order settings
                        </HiddenSettingsText>
                    )}

                    <OrderModal
                        isOpen={orderModalOpen}
                        genSettings={genSettings}
                        setterPackage={setterPackage}
                        onClose={() => setOrderModalOpen(false)}
                    />
                </>
            </OrderCard>

            <MainSettingInfo
                style={{
                    padding: '15px 15px 0 15px',
                    marginBottom: 0,
                }}
            >
                {`Repetition Penalty`}
            </MainSettingInfo>

            {repPenRange}
            {repPenSlope}
            {(window as any).debugUI === 1 && repPenPresence}
            {(window as any).debugUI === 1 && repPenFrequency}
            {drpr}

            <div style={{ flex: '1 1 0', minHeight: '20px' }}></div>
        </>
    )
}

function OrderModalItem(props: {
    order: OrderElement[]
    setOrder: (_: OrderElement[]) => void
    value: OrderElement
    index: number
}): JSX.Element {
    const { order, setOrder, value, index: i } = props
    const controls = useDragControls()
    return (
        <OrderEntry
            value={value}
            onPointerDown={(e) => controls.start(e)}
            dragListener={false}
            dragControls={controls}
            style={{ opacity: value.enabled ? 1 : 0.725 }}
        >
            <div>
                <OrderArrow
                    onClick={() => {
                        if (i > 0)
                            setOrder([
                                ...order.slice(0, i - 1),
                                value,
                                ...order.slice(i - 1, i),
                                ...order.slice(i + 1),
                            ])
                    }}
                >
                    <ArrowUpIcon />
                </OrderArrow>
                <OrderArrow
                    onClick={() => {
                        if (i < order.length)
                            setOrder([
                                ...order.slice(0, i),
                                ...order.slice(i + 1, i + 2),
                                value,
                                ...order.slice(i + 2),
                            ])
                    }}
                >
                    <ArrowDownIcon />
                </OrderArrow>
            </div>
            <OrderFakeButton>
                {logitWarperName(value.id)}
                {!value.enabled && <OrderDisabled>(disabled)</OrderDisabled>}
            </OrderFakeButton>

            {value.id !== LogitWarper.Temperature ? (
                <>
                    <ToggleButton
                        onDragStart={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        onClick={() => {
                            setOrder([
                                ...order.slice(0, i),
                                { ...value, enabled: !value.enabled },
                                ...order.slice(i + 1),
                            ])
                        }}
                    >
                        {value.enabled ? 'disable' : 'enable'}
                    </ToggleButton>
                </>
            ) : (
                <></>
            )}
        </OrderEntry>
    )
}

function OrderModal(props: {
    isOpen: boolean
    genSettings: TextGenerationSettings
    setterPackage: SetterPackage
    onClose: () => void
}): JSX.Element {
    const genSettings = props.genSettings
    const setterPackage = props.setterPackage

    const [order, setOrder] = useState([] as OrderElement[])
    useEffect(
        () => setOrder(genSettings.order.filter((v, i, a) => a.findIndex((v0) => v0.id === v.id) === i)),
        [genSettings.order]
    )
    const saveAndClose = () => {
        updateStory(() => (genSettings.order = order), setterPackage)
        props.onClose()
    }

    const modalContent = useMemo(
        () => (
            <StyledOrderModal>
                <CloseButton onClick={() => saveAndClose()}>
                    <div />
                </CloseButton>
                <h4>Order Settings</h4>
                <p>The order certain settings are applied can be changed here.</p>
                <p>Disabled settings will be hidden and not appear in the sidebar.</p>
                <FlexCol>
                    <OrderGroup values={order} onReorder={setOrder}>
                        {order.map((o, i) => (
                            <OrderModalItem
                                key={o.id}
                                value={o}
                                order={order}
                                setOrder={setOrder}
                                index={i}
                            />
                        ))}
                    </OrderGroup>
                </FlexCol>
            </StyledOrderModal>
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [order]
    )

    return (
        <Modal
            isOpen={props.isOpen}
            shouldCloseOnOverlayClick={true}
            onRequestClose={() => saveAndClose()}
            type={ModalType.Large}
        >
            {modalContent}
        </Modal>
    )
}
