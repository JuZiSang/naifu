import { useMemo, useState } from 'react'
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil'
import { GlobalUserContext } from '../../../globals/globals'
import {
    CustomModules,
    SelectedStoryLoaded,
    Session,
    StoryStateValue,
    StoryUpdate,
} from '../../../globals/state'
import { SidebarElementsContainer, SidebarPlaceholder } from '../common/common'
import EditorCard, { MinorSettingSliderCard } from '../common/editorcard'
import { ContextViewerButtons } from '../../contextviewer'
import { modelSupportsPhraseBias } from '../../../data/ai/model'
import { BiasGroupEdit } from '../../logitbias'
import { downloadTextFile } from '../../../util/browser'
import { setMinLength, SetterPackage, updateStory } from '../../../component-logic/optionslogic'
import { BannedSequenceGroupEdit } from '../../filter'
import Checkbox from '../../controls/checkbox'
import { LightColorButton } from '../../../styles/ui/button'
import { ImportScenarioModal, scenarioStarter } from '../../modals/storyimporter'
import { Scenario } from '../../../data/story/scenario'
import { FlexColSpacer, FlexRow } from '../../../styles/ui/layout'
import { TokenInput } from '../../tokeninput'
import { useReload } from '../../../hooks/useReload'
import { DefaultModel } from '../../../data/request/model'
import { getModelEncoderType } from '../../../tokenizer/encoder'

export function PhraseBiasCard(props: { selectedStory: string }): JSX.Element {
    const [, setStoryUpdate] = useRecoilState(StoryUpdate(props.selectedStory))

    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)

    const settings = currentStoryContent?.settings
    const genSettings = settings?.parameters

    const [selectedGroup, setSelectedGroup] = useState(
        currentStoryContent?.phraseBiasGroups?.length ?? -1 > 0 ? 0 : -1
    )

    const setterPackage: SetterPackage = {
        currentStory: currentStory,
        currentStoryContent: currentStoryContent,
        genSettings: genSettings,
        updateState: setStoryUpdate,
    }

    if (settings === undefined || currentStory === undefined || genSettings === undefined) {
        return <></>
    }

    const downloadLogitBias = () => {
        if (!currentStoryContent?.phraseBiasGroups) return
        const json = {
            phraseBiasGroups: currentStoryContent?.phraseBiasGroups,
        }
        for (const group of json.phraseBiasGroups) {
            for (const phrase of group.phrases) {
                phrase.tokens = undefined
            }
        }
        downloadTextFile(
            JSON.stringify(json, undefined, '  '),
            `${currentStory.title.slice(0, 40)} (${new Date().toISOString()}).bias`
        )
    }

    return (
        <EditorCard
            title="Phrase Bias"
            hint="Export"
            description="Weigh the AI’s chance of generating certain words or phrases."
            tooltip={`Set a bias on words or phrases to increase or decrease their chance of being generated.
Surround with {curly braces} to input exact text.
Surround with [square brackets] to input token ids (tokenizer specific)`}
            onHintClick={currentStoryContent?.phraseBiasGroups ? downloadLogitBias : undefined}
            collapseKey="collapse-phrase-bias"
        >
            <BiasGroupEdit
                encoderType={getModelEncoderType(currentStoryContent?.settings.model ?? DefaultModel)}
                model={currentStoryContent?.settings.model ?? DefaultModel}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                updateBiases={(e) => {
                    if (!currentStoryContent) return
                    updateStory(() => (currentStoryContent.phraseBiasGroups = e), setterPackage)
                }}
                logitBiasGroups={currentStoryContent?.phraseBiasGroups ?? []}
            />
        </EditorCard>
    )
}

export function BannedTokensCard(props: { selectedStory: string }): JSX.Element {
    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)
    const settings = currentStoryContent?.settings
    const genSettings = settings?.parameters
    const [, setStoryUpdate] = useRecoilState(StoryUpdate(props.selectedStory))

    const setterPackage: SetterPackage = {
        currentStory: currentStory,
        currentStoryContent: currentStoryContent,
        genSettings: genSettings,
        updateState: setStoryUpdate,
    }

    const [selectedGroup, setSelectedGroup] = useState(
        currentStoryContent?.bannedSequenceGroups?.length ?? -1 > 0 ? 0 : -1
    )

    if (settings === undefined || currentStory === undefined || genSettings === undefined) {
        return <></>
    }

    const downloadBannedTokens = () => {
        if (!currentStoryContent?.bannedSequenceGroups) return
        const json = {
            bannedSequenceGroups: currentStoryContent?.bannedSequenceGroups,
        }

        for (const group of json.bannedSequenceGroups ?? []) {
            for (const sequence of group.sequences) {
                sequence.tokens = undefined
            }
        }

        downloadTextFile(
            JSON.stringify(json, undefined, '  '),
            `${currentStory.title.slice(0, 40)} (${new Date().toISOString()}).badwords`
        )
    }

    return (
        <>
            <EditorCard
                collapseKey="collapse-banned-tokens"
                title="Banned Tokens"
                hint="Export"
                description="Prevents certain token sequences from being generated."
                tooltip={`Ban sequences of tokens from being generated.
Input regularly to automatically ban variants.
Surround with {curly braces} to input exact text.
Surround with [square brackets] to input token ids (tokenizer specific)`}
                onHintClick={currentStoryContent?.bannedSequenceGroups ? downloadBannedTokens : undefined}
            >
                <div>
                    <BannedSequenceGroupEdit
                        encoderType={getModelEncoderType(currentStoryContent?.settings.model ?? DefaultModel)}
                        selectedGroup={selectedGroup}
                        setSelectedGroup={setSelectedGroup}
                        updateBannedSequences={(e) => {
                            if (!currentStoryContent) return
                            updateStory(() => (currentStoryContent.bannedSequenceGroups = e), setterPackage)
                        }}
                        bannedSequenceGroups={currentStoryContent?.bannedSequenceGroups ?? []}
                    />
                </div>
                <FlexColSpacer min={20} max={20} />
                <Checkbox
                    label={'Ban Bracket Generation'}
                    alternate={true}
                    value={settings.banBrackets}
                    setValue={(e) => updateStory(() => (settings.banBrackets = e), setterPackage)}
                    checkedText={"Tokens containing brackets won't be generated"}
                    uncheckedText={'Tokens containing brackets can be generated'}
                />
            </EditorCard>
        </>
    )
}

export function ImportAndStart(props: { selectedStory: string }): JSX.Element {
    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const [importScenarioModalVisible, setImportScenarioModalVisible] = useState(false)
    const [importedScenario, setImportedScenario] = useState(new Scenario())

    const startAsScenario = useRecoilCallback(({ snapshot }) => async () => {
        if (!currentStory) return
        const customModules = await snapshot.getPromise(CustomModules)

        scenarioStarter(currentStory, customModules, setImportedScenario, setImportScenarioModalVisible)
    })

    return (
        <EditorCard
            title="Duplicate and Start as Scenario"
            hint="Imports current story as a scenario with placeholders"
        >
            <FlexRow>
                <LightColorButton style={{ flex: '1 1 100%' }} centered={true} onClick={startAsScenario}>
                    Duplicate and Start as Scenario
                </LightColorButton>
                <ImportScenarioModal
                    visible={importScenarioModalVisible}
                    setVisible={setImportScenarioModalVisible}
                    importedScenario={importedScenario}
                />
            </FlexRow>
        </EditorCard>
    )
}

export function EndOfSampling(props: { selectedStory: string }): JSX.Element {
    const [, setStoryUpdate] = useRecoilState(StoryUpdate(props.selectedStory))
    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const session = useRecoilValue(Session)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)
    const settings = currentStoryContent?.settings
    const update = useReload()

    const genSettings = settings?.parameters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const setterPackage: SetterPackage = {
        currentStory: currentStory,
        currentStoryContent: currentStoryContent,
        genSettings: genSettings,
        updateState: (valOrUpdater: StoryStateValue | ((currVal: StoryStateValue) => StoryStateValue)) => {
            setStoryUpdate(valOrUpdater)
            update()
        },
    }

    const minOutput = useMemo(() => {
        return (
            <MinorSettingSliderCard
                title={`Min Output Length`}
                hint={'Default: 1'}
                tooltip={`The minimum generated output length in tokens,\
                            which are 4-5 characters long on average.\nOnly has an effect if\
                            at least one Stop Sequence is set.`}
                onHintClick={() => setMinLength(1, setterPackage)}
                min={1}
                max={session.subscription.tier >= 3 ? 150 : 100}
                step={1}
                value={genSettings?.min_length ?? 1}
                suffix={() => 'Tokens'}
                onChange={(e) => setMinLength(e, setterPackage)}
                disabled={
                    currentStoryContent?.eosSequences === undefined ||
                    currentStoryContent?.eosSequences.length < 1
                }
                preventDecimal={true}
                style={{ margin: '10px 0 0 0' }}
            />
        )
    }, [currentStoryContent?.eosSequences, genSettings?.min_length, session.subscription.tier, setterPackage])

    const encoderType = getModelEncoderType(currentStoryContent?.settings.model ?? DefaultModel)
    const eos = useMemo(() => {
        return (
            <div>
                <EditorCard
                    collapseKey="collapse-eos-sequences"
                    title={'Stop Sequences'}
                    tooltip={`Cuts generation short upon reaching a specified token sequence.
                    Note: if under minimum output length (${
                        genSettings?.min_length ?? 1
                    }), generation will not be interrupted.
                    Surround with [square brackets] to input token ids (tokenizer specific)
                   `}
                >
                    <TokenInput
                        encoderType={encoderType}
                        placeholder={'Type here and hit enter to add a stop sequence'}
                        onTokenSubmit={(e) => {
                            if (!currentStoryContent) return
                            updateStory(() => (currentStoryContent.eosSequences = e), setterPackage)
                        }}
                        eosSequences={currentStoryContent?.eosSequences ?? []}
                    />

                    {minOutput}
                </EditorCard>
            </div>
        )
    }, [genSettings?.min_length, encoderType, currentStoryContent, minOutput, setterPackage])

    return <>{eos}</>
}

export default function Advanced(props: { selectedStory: string }): JSX.Element {
    useRecoilValue(SelectedStoryLoaded)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)
    const settings = currentStoryContent?.settings

    if (!settings)
        return (
            <SidebarElementsContainer>
                <SidebarPlaceholder>
                    <h4>No Story selected.</h4>
                </SidebarPlaceholder>
            </SidebarElementsContainer>
        )

    return (
        <SidebarElementsContainer>
            <EditorCard
                collapseKey="collapse-context"
                title="Context"
                description="Get a full view of what’s sent to the AI."
            >
                <ContextViewerButtons />
            </EditorCard>
            {modelSupportsPhraseBias(currentStoryContent?.settings.model) ? (
                <PhraseBiasCard selectedStory={props.selectedStory} />
            ) : (
                <></>
            )}
            <div>
                <BannedTokensCard selectedStory={props.selectedStory} />
            </div>
            <EndOfSampling selectedStory={props.selectedStory} />
            <ImportAndStart selectedStory={props.selectedStory} />
            <div style={{ flex: '1 1 0', minHeight: '20px' }}></div>
        </SidebarElementsContainer>
    )
}
