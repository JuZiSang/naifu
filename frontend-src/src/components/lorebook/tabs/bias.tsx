import { useEffect, useState } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { LoreEntry } from '../../../data/ai/loreentry'
import { GlobalUserContext } from '../../../globals/globals'
import { SelectedStory, StoryUpdate } from '../../../globals/state'
import { LoreBiasDisplay } from '../../../styles/components/lorebook'
import { ImportDataType } from '../../../data/story/storyconverter'
import { BiasGroupEdit } from '../../logitbias'
import { MultiActionEditorCard } from '../../sidebars/common/editorcard'
import { LogitBiasGroup } from '../../../data/story/logitbias'
import { FileInfo, useFileInput } from '../../controls/fileinput'
import { migrateLogitBiasGroups } from '../../../util/migration'
import { getModelEncoderType } from '../../../tokenizer/encoder'
import { downloadTextFile } from '../../../util/browser'
import { addBiases } from '../../../util/util'
import { DefaultModel } from '../../../data/request/model'

export function LorebookTabBias(props: { entry: LoreEntry | null }): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))

    const [selectedGroup, setSelectedGroup] = useState(props.entry?.loreBiasGroups.length ?? -1 > 0 ? 0 : -1)

    const downloadLogitBias = (group?: LogitBiasGroup[], name?: string) => {
        if (!group || !currentStoryMetadata || !name) return
        const json = {
            phraseBiasGroups: group,
        }
        for (const group of json.phraseBiasGroups) {
            for (const phrase of group.phrases) {
                phrase.tokens = undefined
            }
        }
        downloadTextFile(
            JSON.stringify(json, undefined, '  '),
            `${currentStoryMetadata.title.slice(0, 30)} ${name.slice(
                0,
                20
            )} (${new Date().toISOString()}).bias`
        )
    }

    const handleBiasImport = async (file: FileInfo) => {
        if (!props.entry || !currentStoryMetadata) return
        const biasGroups =
            file.type === ImportDataType.logitBiasV0
                ? JSON.parse(file.text).logit_bias_groups
                : JSON.parse(file.text).phraseBiasGroups
        await migrateLogitBiasGroups(biasGroups, file.type === ImportDataType.logitBiasV0 ? 0 : 1)
        props.entry.loreBiasGroups = addBiases(props.entry.loreBiasGroups, biasGroups)
        setStoryUpdate(currentStoryMetadata.save())
        return
    }

    const [biasImportElement, biasImportClick] = useFileInput({
        onFileImport: handleBiasImport,
        allowedFileTypes: [ImportDataType.logitBiasV0, ImportDataType.logitBiasV1],
    })
    useEffect(() => {
        setSelectedGroup(props.entry?.loreBiasGroups.length ?? -1 > 0 ? 0 : -1)
    }, [props.entry])

    return (
        <>
            <LoreBiasDisplay>
                {biasImportElement}
                <MultiActionEditorCard
                    style={{ margin: 0, marginTop: '1rem', marginLeft: 1 }}
                    title="Lorebook Entry Phrase Bias"
                    tooltip={`Set a bias on words or \
                                        phrases to increase or decrease their chance of being \
                                        generated when this entry is active.
                                        Surround with {curly braces} to input exact text.
                                        Surround with [square brackets] to input token ids (tokenizer specific)`}
                    hints={[
                        {
                            hint: 'Import',
                            onHintClick: biasImportClick,
                        },
                        {
                            hint: 'Export',
                            onHintClick: () =>
                                downloadLogitBias(props.entry?.loreBiasGroups, props.entry?.displayName),
                        },
                    ]}
                >
                    <>
                        <BiasGroupEdit
                            lorebook
                            encoderType={getModelEncoderType(
                                currentStoryContent?.settings.model ?? DefaultModel
                            )}
                            model={currentStoryContent?.settings.model ?? DefaultModel}
                            selectedGroup={selectedGroup}
                            setSelectedGroup={setSelectedGroup}
                            updateBiases={(e) => {
                                if (currentStoryMetadata && props.entry) {
                                    props.entry.loreBiasGroups = e
                                    setStoryUpdate(currentStoryMetadata.save())
                                }
                            }}
                            logitBiasGroups={props.entry?.loreBiasGroups ?? []}
                        />
                    </>
                </MultiActionEditorCard>
            </LoreBiasDisplay>
        </>
    )
}
