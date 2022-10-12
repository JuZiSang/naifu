import React, { useEffect, useRef, useState } from 'react'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { createFilter, GroupBase, OptionsOrGroups } from 'react-select'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { serialize } from 'serializr'
import { toast } from 'react-toastify'
import styled from 'styled-components'
import { deleteStory, SetterPackage, StatePackage, updateStory } from '../../../component-logic/optionslogic'
import { modelSupportsModules } from '../../../data/ai/model'
import { getStorage } from '../../../data/storage/storage'
import { PrefixOptions } from '../../../data/story/defaultprefixes'
import { StoryMode } from '../../../data/story/story'
import { AIModule, DefaultPrefixOption, NoModule } from '../../../data/story/storysettings'
import { GlobalUserContext } from '../../../globals/globals'
import {
    CustomModules,
    GenerationRequestActive,
    InfobarSelectedTab,
    SelectedStory,
    SelectedStoryLoaded,
    SelectedStoryModel,
    Session,
    SessionValue,
    SettingsModalOpen,
    SiteTheme,
    Stories,
    StoryUpdate,
    UserPresets,
} from '../../../globals/state'
import { LightColorButton } from '../../../styles/ui/button'
import { ForwardArrowIcon, LinkIcon } from '../../../styles/ui/icons'
import WarningButton, { WarningButtonStyle } from '../../deletebutton'
import EditorCard from '../common/editorcard'
import { Lorebook } from '../../lorebook/lorebook'
import Modal from '../../modals/modal'
import PrefixBrowser from '../../prefixbrowser'
import { getDropdownStyle, getDropdownTheme, Select } from '../../controls/select'
import {
    Line,
    LineShort,
    PresetContainer,
    SidebarElementsContainer,
    SidebarPlaceholder,
    Spacer,
} from '../common/common'
import { useReload } from '../../../hooks/useReload'
import { FlexCol } from '../../../styles/ui/layout'
import { HotEvent, HotEventSub, subscribeToHotEvent } from '../../../data/user/hotkeys'
import { PrefixInnerDiv, useModuleOptions } from '../../../hooks/useModuleOptions'
import { DefaultModel, normalizeModel } from '../../../data/request/model'
import { getAvailiableModels, prefixIsDefault, modelName, modelsHaveSamePresets } from '../../../util/models'
import { copyPresetToStory, getDefaultPresetForModel } from '../../../util/presets'
import { isAdventureModeStory, isModuleImageValid } from '../../../util/util'
import { deserialize } from '../../../util/serialization'
import { SettingsPages } from '../../settings/constants'
import { PlatformImageData } from '../../../compatibility/platformtypes'
import { useStoryPresetSelect } from '../../presetselect'
import { getUserSetting } from '../../../data/user/settings'
import { useSelectedStoryUpdate } from '../../../hooks/useSelectedStory'
import ContextEditor from './items/contexteditor'
import StoryStats from './items/storystats'
import StorySettings from './items/storysettings'
import StoryExporter from './items/storyexporter'

const WarningText = styled.span`
    color: ${(props) => props.theme.colors.warning};
    opacity: 0.8;
`

export function ModuleSelector(props: {
    selectedStory: string
    presetModalVisible: boolean
    setPresetModalVisible: (visible: boolean) => void
}): JSX.Element {
    const [customModules, setCustomModules] = useRecoilState(CustomModules)

    const session = useRecoilValue(Session)
    useRecoilValue(SelectedStoryModel)

    const setStoryUpdate = useSetRecoilState(StoryUpdate(props.selectedStory))
    const selectedStory = useSelectedStoryUpdate()
    const reload = useReload()

    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)

    const settings = currentStoryContent?.settings
    const genSettings = settings?.parameters
    const selectedPrefix = settings?.prefix ? settings.prefix : DefaultPrefixOption
    const setterPackage: SetterPackage = {
        currentStory: currentStory,
        currentStoryContent: currentStoryContent,
        genSettings: genSettings,
        updateState: setStoryUpdate,
    }
    const prefixOptions = useModuleOptions(
        settings?.prefix ? settings.prefix : DefaultPrefixOption,
        currentStoryContent?.settings.model ?? DefaultModel,
        true
    )
    const combinedPrefixes = [
        ...customModules,
        ...[...PrefixOptions.keys()].map((key) => {
            return {
                id: key,
                mode: PrefixOptions.get(key)?.mode ?? StoryMode.normal,
                name: PrefixOptions.get(key)?.label ?? key,
                description: PrefixOptions.get(key)?.label ?? key,
                image: PrefixOptions.get(key)?.image,
            } as AIModule
        }),
    ]
    if (currentStoryContent?.settings.aiModule) {
        combinedPrefixes.push(currentStoryContent.settings.aiModule)
    }
    const hasStorySpecificPrefix =
        currentStoryContent &&
        currentStoryContent.settings &&
        currentStoryContent.settings.aiModule &&
        !customModules.some((e) => e.id === currentStoryContent?.settings?.aiModule?.id)

    const prefixSaving = useRef(false)
    const saveStorySpecificPrefix = async () => {
        if (prefixSaving.current) return
        try {
            if (!hasStorySpecificPrefix || !currentStoryContent?.settings?.aiModule) return
            prefixSaving.current = true
            const aiModule = deserialize(
                AIModule,
                serialize(AIModule, currentStoryContent?.settings?.aiModule)
            )
            aiModule.remoteId = ''
            if (customModules.some((existingModule) => existingModule.id === aiModule.id)) return
            await getStorage(session).saveModule(aiModule)
            setCustomModules([...customModules, aiModule])
        } catch (error: any) {
            toast(`${error.message ?? error}`)
        } finally {
            prefixSaving.current = false
        }
    }

    if (!settings) return <React.Fragment></React.Fragment>

    const setPrefix = (prefix: string) => {
        prefix &&
            updateStory(() => {
                settings.prefix = prefix ? prefix : DefaultPrefixOption
                settings.prefixMode =
                    combinedPrefixes.find((x) => x.id === settings.prefix)?.mode ?? StoryMode.normal
                reload()
            }, setterPackage)
    }

    const isEditorV2 =
        (!selectedStory.story && getUserSetting(session.settings, 'useEditorV2')) ||
        selectedStory.story?.document

    return (
        <PresetContainer>
            <ModuleSelect
                prefixOptions={prefixOptions}
                setPrefix={setPrefix}
                combinedPrefixes={combinedPrefixes}
                selectedPrefix={selectedPrefix}
            />
            {isEditorV2 && isAdventureModeStory(selectedStory.story?.settings) && (
                <WarningText>The Text Adventure UI is not currently supported on Editor V2</WarningText>
            )}
            {hasStorySpecificPrefix ? (
                <LightColorButton
                    tabIndex={0}
                    role="button"
                    onClick={() => saveStorySpecificPrefix()}
                    aria-label="Browse All Modules"
                    style={{ marginBottom: '5px' }}
                >
                    Save Story-Module to Account
                </LightColorButton>
            ) : null}
            <Modal
                isOpen={props.presetModalVisible}
                label="AI Modules"
                shouldCloseOnOverlayClick={true}
                onRequestClose={() => props.setPresetModalVisible(false)}
            >
                <PrefixBrowser
                    onSelect={(prefix) => {
                        updateStory(() => {
                            settings.prefix = prefix ? prefix : DefaultPrefixOption
                            settings.prefixMode =
                                combinedPrefixes.find((x) => x.id === settings.prefix)?.mode ??
                                StoryMode.normal
                        }, setterPackage)
                        props.setPresetModalVisible(false)
                    }}
                />
            </Modal>
        </PresetContainer>
    )
}

interface PrefixOptions {
    value: string
    label: JSX.Element
    rawLabel: string
    description: string
}

export function ModuleSelect(props: {
    prefixOptions: OptionsOrGroups<PrefixOptions, GroupBase<PrefixOptions>>
    setPrefix: (prefix: string) => void
    combinedPrefixes: AIModule[]
    selectedPrefix?: string
    minMenuHeight?: number
    maxMenuHeight?: number
}): JSX.Element {
    const moduleImage = props.combinedPrefixes.find((m) => m.id == props.selectedPrefix)?.image
    const moduleSelectOption = props.combinedPrefixes.find((e) => e.id === props.selectedPrefix) ?? {
        name: 'Unknown Module',
        description: 'Unknown Module',
    }
    const siteTheme = useRecoilValue(SiteTheme)

    return (
        <Select
            menuPlacement="auto"
            aria-label="Select an AI Module"
            minMenuHeight={props.minMenuHeight}
            maxMenuHeight={props.maxMenuHeight ?? 420}
            options={props.prefixOptions}
            isSearchable={true}
            filterOption={createFilter({
                ignoreCase: true,
                ignoreAccents: true,
                trim: false,
                matchFrom: 'any',
                stringify: (option) => `${option.data.rawLabel} ${option?.value} ${option.data.description}`,
            })}
            onChange={(e) => props.setPrefix(e?.value ?? '')}
            value={{
                value: (
                    props.combinedPrefixes.find((e) => e.id === props.selectedPrefix) ?? {
                        id: DefaultPrefixOption,
                    }
                ).id,
                label: (
                    <PrefixInnerDiv selected={false}>
                        <div>
                            <LazyLoadImage
                                effect="opacity"
                                src={
                                    isModuleImageValid((moduleImage as PlatformImageData)?.src)
                                        ? (moduleImage as PlatformImageData)?.src
                                        : ""
                                }
                            />
                        </div>
                        <div>{moduleSelectOption.name}</div>
                    </PrefixInnerDiv>
                ),
                rawLabel: moduleSelectOption.name,
                description: moduleSelectOption.name,
            }}
            styles={getDropdownStyle(siteTheme)}
            theme={getDropdownTheme(siteTheme)}
        />
    )
}

export function ModelSelect(props: { selectedStory: string }): JSX.Element {
    const reload = useReload()

    const userPresets = useRecoilValue(UserPresets)
    const siteTheme = useRecoilValue(SiteTheme)
    const session = useRecoilValue(Session)

    const [, setStoryUpdate] = useRecoilState(StoryUpdate(props.selectedStory))

    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)

    const setterPackage: SetterPackage = {
        currentStory: currentStory,
        currentStoryContent: currentStoryContent,
        genSettings: currentStoryContent?.settings.parameters,
        updateState: setStoryUpdate,
    }

    if (!currentStoryContent) return <></>

    const modelOptions = getAvailiableModels(session.subscription.tier >= 3)
    const selectedOption =
        modelOptions.find((m) => m.str === normalizeModel(currentStoryContent.settings.model)) ??
        modelOptions.find((m) => m.str === getUserSetting(session.settings, 'defaultModel')) ??
        modelOptions.find((m) => m.str === DefaultModel) ??
        modelOptions[0]

    return (
        <Select
            isSearchable={false}
            aria-label="Select an AI Model"
            options={modelOptions.map((model) => ({
                value: model.str,
                description: `${model.label}: ${model.description}`,
                label: (
                    <PrefixInnerDiv selected={false}>
                        <div>
                            <LazyLoadImage effect="opacity" src={model.img.src} />
                        </div>
                        <div>
                            <strong>{model.label}</strong>
                            <div>{model.description ? <div>{model.description}</div> : null}</div>
                        </div>
                    </PrefixInnerDiv>
                ),
            }))}
            onChange={(e) => {
                if (!e) return
                updateStory(() => {
                    const lastModel = currentStoryContent.settings.model
                    currentStoryContent.settings.model = e.value
                    if (
                        !prefixIsDefault(currentStoryContent.settings.prefix ?? '') ||
                        !modelSupportsModules(e.value)
                    ) {
                        currentStoryContent.settings.prefix = NoModule
                        currentStoryContent.settings.prefixMode = StoryMode.normal
                    }
                    if (
                        modelsHaveSamePresets(e.value, lastModel) &&
                        userPresets.some((p) => p.id === currentStoryContent.settings.preset)
                    ) {
                        // Preset is still valid, don't change it
                    } else {
                        const defaultPreset = getDefaultPresetForModel(e.value, session.settings, userPresets)
                        copyPresetToStory(defaultPreset, currentStoryContent)
                    }
                    reload()
                }, setterPackage)
            }}
            value={{
                value: selectedOption.str,
                description: selectedOption.label,
                label: (
                    <PrefixInnerDiv selected={false}>
                        <div>
                            <LazyLoadImage effect="opacity" src={selectedOption.img.src} />
                        </div>
                        <div>
                            <strong>{selectedOption.label}</strong>
                        </div>
                    </PrefixInnerDiv>
                ),
            }}
            styles={getDropdownStyle(siteTheme)}
            theme={getDropdownTheme(siteTheme)}
        />
    )
}

export function StoryOptions(props: { selectedStory: string }): JSX.Element {
    return (
        <div>
            <StoryStats selectedStory={props.selectedStory} />
            <Spacer />
            <StorySettings selectedStory={props.selectedStory} />
            <Spacer />
            <StoryExporter selectedStory={props.selectedStory} />
        </div>
    )
}

export function DeleteButton(props: { selectedStory: string }): JSX.Element {
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    const statePackage: StatePackage = {
        session: useRecoilValue(Session),
        setSelectedStory: useSetRecoilState(SelectedStory),
        storiesState: useRecoilState(Stories),
        storyUpdateState: useSetRecoilState(StoryUpdate(props.selectedStory)),
    }
    const showModalRef = useRef<() => boolean>(() => false)

    const authenticated = useRecoilValue(SessionValue('authenticated'))
    const hotDeleteStoryRef = useRef<any>(null)
    const hotDeleteStory = (): boolean => {
        if (!authenticated) {
            return false
        }
        showModalRef.current()
        return true
    }
    hotDeleteStoryRef.current = hotDeleteStory

    useEffect(() => {
        subscribeToHotEvent(HotEvent.deleteStory, new HotEventSub('stDEL', hotDeleteStoryRef))
    }, [])

    return (
        <WarningButton
            onConfirm={async () => {
                return await deleteStory(props.selectedStory, statePackage)
            }}
            buttonText={'Delete'}
            confirmButtonText="Delete it!"
            label="Delete your Story?"
            disabled={generationRequestActive}
            buttonType={WarningButtonStyle.Danger}
            warningColors
            warningText={
                <>
                    Are you sure you want to delete {'"'}
                    {GlobalUserContext.stories.get(props.selectedStory)?.title}
                    {'"'}?
                    <br />
                    This cannnot be reversed.
                </>
            }
            showModalRef={showModalRef}
        />
    )
}

export default function Story(props: { selectedStory: string }): JSX.Element {
    const [presetModalVisible, setPresetModalVisible] = useState(false)

    const session = useRecoilValue(Session)
    useRecoilValue(SelectedStoryLoaded)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)

    const setSettingsModalOpen = useSetRecoilState(SettingsModalOpen)
    const settings = currentStoryContent?.settings
    const setInfobarTab = useSetRecoilState(InfobarSelectedTab)
    const { presetSelect } = useStoryPresetSelect()

    if (!settings)
        return (
            <SidebarElementsContainer>
                <SidebarPlaceholder>
                    <h4>No Story selected.</h4>
                </SidebarPlaceholder>
            </SidebarElementsContainer>
        )

    const modelOptions = getAvailiableModels(session.subscription.tier >= 3)
    const selectedOption =
        modelOptions.find((m) => m.str === normalizeModel(currentStoryContent.settings.model)) ??
        modelOptions.find((m) => m.str === getUserSetting(session.settings, 'defaultModel')) ??
        modelOptions.find((m) => m.str === DefaultModel) ??
        modelOptions[0]

    return (
        <SidebarElementsContainer>
            <EditorCard
                title={'AI Model'}
                hint={
                    <>
                        Change Default <LinkIcon />
                    </>
                }
                onHintClick={() => setSettingsModalOpen(SettingsPages.Defaults)}
            >
                <ModelSelect selectedStory={props.selectedStory} />
            </EditorCard>

            {modelSupportsModules(selectedOption.str) ? (
                <>
                    <EditorCard
                        className={'ai-module-card'}
                        title={'AI Module'}
                        hint={
                            <>
                                All Modules <LinkIcon />
                            </>
                        }
                        description="Changes the style of the AI generated text."
                        onHintClick={() => setPresetModalVisible(true)}
                    >
                        <div>
                            <ModuleSelector
                                selectedStory={props.selectedStory}
                                presetModalVisible={presetModalVisible}
                                setPresetModalVisible={setPresetModalVisible}
                            />
                        </div>
                    </EditorCard>
                </>
            ) : (
                <EditorCard
                    title={'AI Module'}
                    description={
                        <div>
                            You are currently using {modelName(selectedOption.str)}, which does not support AI
                            Modules.
                        </div>
                    }
                    onHintClick={() => setPresetModalVisible(true)}
                >
                    <div></div>
                </EditorCard>
            )}
            <Line />
            <EditorCard
                style={{ marginTop: 0 }}
                title={'Config Preset'}
                description={'Quickly adjust how the AI generates.'}
                hint={
                    <>
                        Edit Preset <ForwardArrowIcon style={{ height: '0.8rem' }} />
                    </>
                }
                onHintClick={() => setInfobarTab(2)}
            >
                {presetSelect}
            </EditorCard>

            <Line />
            <FlexCol wide>
                <EditorCard
                    className="memory-card"
                    title="Memory"
                    description="The AI will better remember info placed here."
                    labelFor="memory-input"
                >
                    <ContextEditor id={'memory-input'} placeholder="" contextIndex={0} />
                </EditorCard>
                <EditorCard
                    className="an-card"
                    title="Author's Note"
                    description="Info placed here will strongly influence AI output."
                    labelFor="an-input"
                >
                    <ContextEditor id={'an-input'} placeholder="" contextIndex={1} />
                </EditorCard>
                <EditorCard className="lorebook-access-card" title="Lorebook Quick Access">
                    <Lorebook />
                </EditorCard>
            </FlexCol>
            <Line />
            <FlexCol wide>
                <EditorCard title="Story Options" className="story-options-card">
                    <StoryOptions selectedStory={props.selectedStory} />
                </EditorCard>
            </FlexCol>
            <LineShort />
            <EditorCard title="Delete Story" small={true} hint={'(cannot be undone)'}>
                <DeleteButton selectedStory={props.selectedStory} />
            </EditorCard>

            <div style={{ flex: '1 1 0', minHeight: '20px' }}></div>
        </SidebarElementsContainer>
    )
}
