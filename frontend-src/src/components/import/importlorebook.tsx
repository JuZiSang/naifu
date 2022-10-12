import { useEffect, useRef, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { findSameEntries, findSharedNames, Lorebook } from '../../data/story/lorebook'
import { Row, ImportContainer } from '../../styles/components/import/importstory'
import { SelectedStory } from '../../globals/state'
import { GlobalUserContext } from '../../globals/globals'
import { LoreEntry } from '../../data/ai/loreentry'
import { Button } from '../../styles/ui/button'
import {
    ComparisonLabel,
    ImportScenarioStyle,
    LorebookComparison,
    LorebookComparisonName,
    LorebookScrollContainer,
    WarningText,
} from '../../styles/components/import/importlorebook'
import Radio from '../controls/radio'

export function ImportLorebook(props: {
    importedLorebook: Lorebook
    onClickImport: (overwriteAmeName: boolean, overwriteSameId: boolean) => void
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const duplicateNames = useRef<{ a: LoreEntry; b: LoreEntry }[]>([])
    const duplicateEntries = useRef<{ a: LoreEntry; b: LoreEntry }[]>([])
    const [nameOverwrite, setNameOverwrite] = useState('')
    const [idOverwrite, setIdOverwrite] = useState('')
    const [entriesCalculated, setEntriesCalculated] = useState(false)

    useEffect(() => {
        if (!currentStoryContent) {
            return
        }
        duplicateEntries.current = findSameEntries(props.importedLorebook, currentStoryContent.lorebook)
        duplicateNames.current = findSharedNames(props.importedLorebook, currentStoryContent.lorebook)
        const temp = []
        for (const names of duplicateNames.current) {
            const index = duplicateEntries.current.findIndex((entries) => {
                return names.a === entries.a && names.b === entries.b
            })
            if (index >= 0) {
                // nothing
            } else {
                temp.push(names)
            }
        }
        duplicateNames.current = temp
        setEntriesCalculated(true)
    }, [currentStoryContent, props.importedLorebook, props.importedLorebook.entries])

    let warningText = ''
    if (idOverwrite === 'overwrite' && nameOverwrite === 'overwrite') {
        warningText =
            'Entries with the same id will be overwritten, then remaining entries with the same name.'
    }
    if (idOverwrite === 'keep' && nameOverwrite === 'overwrite') {
        warningText = `Entries with with the same name will be overwritten.
        Any entries with the same id (unless they also share the same name) will be skipped.`
    }
    if (idOverwrite === 'overwrite' && nameOverwrite === 'keep') {
        warningText = `Entries with with the same id will be replaced. Entries with the same name will
                        be imported as normal.`
    }
    if (idOverwrite === 'keep' && nameOverwrite === 'keep') {
        warningText = `Entries with with the same id will be skipped. Entries with the same name (and not already skipped) will
                        be imported as normal.`
    }

    if (!entriesCalculated) {
        return <></>
    }

    return (
        <ImportScenarioStyle>
            {duplicateEntries.current.length > 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <div
                        style={{
                            textAlign: 'center',
                        }}
                    >
                        {`This Lorebook contains entries already present (same id) in
            the current Lorebook, would you like to overwrite them?`}
                    </div>
                    <Radio
                        name="Overwrite Name"
                        selected={idOverwrite}
                        disabled={false}
                        choices={['keep', 'overwrite']}
                        names={['Skip', 'Overwrite']}
                        onChoiceSelected={setIdOverwrite}
                    ></Radio>
                </div>
            ) : (
                <></>
            )}

            {duplicateNames.current.length > 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        {`This Lorebook contains entries who's display names match display names already present in the
            current story's Lorebook. Would you like to overwrite them?`}
                    </div>
                    <Radio
                        name="Overwrite Name"
                        selected={nameOverwrite}
                        disabled={false}
                        choices={['keep', 'overwrite']}
                        names={['Import Separately', 'Overwrite']}
                        onChoiceSelected={setNameOverwrite}
                    ></Radio>
                </div>
            ) : (
                <></>
            )}
            {duplicateEntries.current.length > 0 && duplicateNames.current.length > 0 ? (
                <Row
                    style={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <WarningText>{warningText}</WarningText>
                </Row>
            ) : (
                <></>
            )}
            <ImportContainer>
                <Button
                    disabled={
                        (duplicateNames.current.length > 0 && nameOverwrite === '') ||
                        (duplicateEntries.current.length > 0 && idOverwrite === '')
                    }
                    onClick={() =>
                        props.onClickImport(nameOverwrite === 'overwrite', idOverwrite === 'overwrite')
                    }
                >
                    Import
                </Button>
            </ImportContainer>
            {duplicateEntries.current.length > 0 ? (
                <div>
                    <h3>Same ID</h3>
                    <Row>
                        <ComparisonLabel>New</ComparisonLabel>
                        <ComparisonLabel>Current</ComparisonLabel>
                    </Row>
                    <LorebookScrollContainer>
                        {duplicateEntries.current?.map((entry) => {
                            return (
                                <LorebookComparison key={entry.a.displayName}>
                                    <div style={{ width: '100%', textAlign: 'center' }}>
                                        <LorebookComparisonName>{entry.a.displayName}</LorebookComparisonName>
                                        <LorebookComparisonName>{entry.b.displayName}</LorebookComparisonName>
                                    </div>
                                    <div>
                                        <div>{entry.a.id}</div>
                                        <div>{entry.b.id}</div>
                                    </div>
                                    <div>
                                        <div>{entry.a.text}</div>
                                        <div>{entry.b.text}</div>
                                    </div>
                                </LorebookComparison>
                            )
                        })}
                    </LorebookScrollContainer>
                </div>
            ) : (
                <></>
            )}
            {duplicateNames.current.length > 0 ? (
                <div>
                    <h3>Same Name</h3>
                    <Row>
                        <ComparisonLabel>New</ComparisonLabel>
                        <ComparisonLabel>Current</ComparisonLabel>
                    </Row>
                    <LorebookScrollContainer>
                        {duplicateNames.current?.map((entry) => {
                            return (
                                <LorebookComparison key={entry.a.id}>
                                    <div style={{ width: '100%', textAlign: 'center' }}>
                                        <LorebookComparisonName>{entry.a.displayName}</LorebookComparisonName>
                                        <LorebookComparisonName>{entry.b.displayName}</LorebookComparisonName>
                                    </div>
                                    <div>
                                        <span>{entry.a.id}</span>
                                        <span>{entry.b.id}</span>
                                    </div>
                                    <div>
                                        <div>{entry.a.text}</div>
                                        <div>{entry.b.text}</div>
                                    </div>
                                </LorebookComparison>
                            )
                        })}
                    </LorebookScrollContainer>
                </div>
            ) : (
                <></>
            )}
        </ImportScenarioStyle>
    )
}
