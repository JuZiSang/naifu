import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil'
import { StoryContainer } from '../../data/story/storycontainer'
import {
    aidAdventureExportToStory,
    aidScenarioExportToScenario,
    ImportDataType,
} from '../../data/story/storyconverter'
import {
    Label,
    Description,
    ImportContainer,
    InnerRow,
    Row,
    Title,
    BiggerLabel,
    Centered,
} from '../../styles/components/import/importstory'
import { Button } from '../../styles/ui/button'
import Spinner from '../spinner'
import { GlobalUserContext } from '../../globals/globals'
import { Stories, SelectedStory, Session } from '../../globals/state'
import { localSave } from '../../data/storage/queue'
import Checkbox, { SmallCheckbox } from '../controls/checkbox'
import { logError } from '../../util/browser'
import { FlexCol } from '../../styles/ui/layout'
import { transparentize } from '../../util/colour'

export class ImportBundle {
    importObject: any = {}
    type: ImportDataType = ImportDataType.unknown
}

const ImportSpinner = styled(Spinner)`
    width: 30px;
    height: 30px;
`

const StoryListing = styled.div`
    width: 100%;
    display: grid;
    grid-template-columns: 70% calc(30% - 30px);
    gap: 30px;
    > :first-child {
        flex: 1 1 0;
    }
    @media (max-width: 1000px) {
        grid-template-columns: 100%;
    }

    padding: 10px;
    &:nth-child(2n-1) {
        background: ${(props) => props.theme.colors.bg1};
    }
`

const TagContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;

    > span {
        margin-right: 10px;
        margin-bottom: 10px;
    }
    span {
        background-color: ${(props) => props.theme.colors.bg3};
        padding: 6px 15px 6px 15px;
        color: ${(props) => transparentize(0.3, props.theme.colors.textMain)};
        font-weight: 600;
    }
`

export function ImportMisc(props: { importBundle: ImportBundle; onImportResolved: () => void }): JSX.Element {
    const [stories, setStories] = useRecoilState(Stories)
    const setSelectedStory = useSetRecoilState(SelectedStory)
    const session = useRecoilValue(Session)
    const [keepAngledBrackets, setKeepAngledBrackets] = useState(false)
    const [importInProgress, setImportInProgress] = useState(false)
    const [importCheck, setImportCheck] = useState<boolean[]>([])

    const [names, setNames] = useState<{ name: string; index: number }[]>([])
    const [filteredNames, setFilteredNames] = useState<{ name: string; index: number }[]>([])

    const [descriptions, setDescriptions] = useState<string[]>([])
    const [tags, setTags] = useState<string[][]>([])
    const [authors, setAuthors] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState(false)
    const [oneChecked, setOneChecked] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const [page, setPage] = useState(0)

    useEffect(() => {
        try {
            const names = props.importBundle.importObject.map((story: any, i: number) => {
                return { name: story.title ?? '', index: i }
            })
            setNames([...names])
            setFilteredNames([...names])
            setDescriptions(props.importBundle.importObject.map((story: any) => story.description ?? ''))
            setTags(props.importBundle.importObject.map((story: any) => [...(story.tags ?? [])]))
            setAuthors(props.importBundle.importObject.map((story: any) => story.user?.username ?? ''))
            setImportCheck(props.importBundle.importObject.map(() => false))
        } catch (error) {
            logError(error)
        }
    }, [props.importBundle.importObject])

    useEffect(() => {
        let checked = true
        let one = false
        for (const n of filteredNames.slice(page * 300, Math.min((page + 1) * 300, filteredNames.length))) {
            checked = checked && importCheck[n.index]
        }
        for (const check of importCheck) {
            one = one || check
            if (one) break
        }
        setOneChecked(one)
        setAllCheck(checked)
    }, [filteredNames, importCheck, page])

    const importAll = async () => {
        setImportInProgress(true)
        const newStories: StoryContainer[] = []
        for (const [i, o] of props.importBundle.importObject.entries()) {
            if (importCheck[i] === false) {
                continue
            }

            newStories.push(aidAdventureExportToStory(o, keepAngledBrackets))
        }

        // Process the new stories
        const ids: string[] = newStories.map((storyContainer) => {
            return storyContainer.metadata.id
        })
        for (const storyContainer of newStories) {
            GlobalUserContext.stories.set(storyContainer.metadata.id, storyContainer.metadata)
            GlobalUserContext.storyContentCache.set(storyContainer.metadata.id, storyContainer.content)
        }
        setStories([...ids, ...stories])
        for (const story of newStories) {
            await localSave(session, story.metadata.id)
        }
        setSelectedStory({ id: ids[0], loaded: false })

        setImportInProgress(false)
        props.onImportResolved()
    }

    const downloadAdventures = async () => {
        setImportInProgress(true)
        const zip = new JSZip()
        for (const [i, o] of props.importBundle.importObject.entries()) {
            if (importCheck[i] === false) {
                continue
            }
            const story = aidAdventureExportToStory(o, keepAngledBrackets)
            zip.file(
                `${i}. ${story.metadata.title
                    .replace(/["%*/:<>?\\|]/g, '_')
                    .slice(0, 40)} (${new Date().toISOString()}).story`,
                story.serialize(true)
            )
        }
        zip.generateAsync({ type: 'blob' }).then(function (content) {
            saveAs(content, `Converted Adventures (${new Date().toISOString()}).zip`)
            setImportInProgress(false)
            props.onImportResolved()
        })
    }
    const downloadScenarios = async () => {
        setImportInProgress(true)
        const zip = new JSZip()
        for (const [i, o] of props.importBundle.importObject.entries()) {
            if (importCheck[i] === false) {
                continue
            }
            const scenario = aidScenarioExportToScenario(o)
            zip.file(
                `${i}. ${scenario.title
                    .replace(/["%*/:<>?\\|]/g, '_')
                    .slice(0, 40)} (${new Date().toISOString()}).scenario`,
                scenario.serialize(true)
            )
        }
        zip.generateAsync({ type: 'blob' }).then(function (content) {
            saveAs(content, `Converted Scenarios (${new Date().toISOString()}).zip`)
            setImportInProgress(false)
            props.onImportResolved()
        })
    }
    return (
        <div>
            <Row>
                <Title>
                    {props.importBundle.type === ImportDataType.aidAdventureExport
                        ? ' Adventure Import/Conversion'
                        : ''}
                    {props.importBundle.type === ImportDataType.aidScenarioExport
                        ? ' Scenario Conversion'
                        : ''}
                </Title>
                <ImportContainer>
                    <ImportSpinner visible={importInProgress} />
                    {props.importBundle.type === ImportDataType.aidAdventureExport ? (
                        <>
                            <Button disabled={importInProgress || !oneChecked} onClick={importAll}>
                                Import Selected
                            </Button>
                            <Button disabled={importInProgress || !oneChecked} onClick={downloadAdventures}>
                                Convert and Download
                            </Button>
                        </>
                    ) : (
                        <></>
                    )}
                    {props.importBundle.type === ImportDataType.aidScenarioExport ? (
                        <>
                            <Button disabled={importInProgress || !oneChecked} onClick={downloadScenarios}>
                                Convert and Download
                            </Button>
                        </>
                    ) : (
                        <></>
                    )}
                </ImportContainer>
            </Row>
            <Row>
                {props.importBundle.type === ImportDataType.aidAdventureExport ? (
                    <div>
                        <div>
                            We found {names.length} adventures. What do you want to do with them? Import them
                            into NovelAI? or download them as a .zip containing .story files?
                        </div>
                        <div>
                            Note: This could take little bit depending on how many adventures you select.
                        </div>{' '}
                    </div>
                ) : (
                    <></>
                )}
                {props.importBundle.type === ImportDataType.aidScenarioExport ? (
                    <div>
                        <div>We found {names.length} scenarios. Convert them to NovelAI scenarios?</div>
                        <div>
                            Note: This could take little bit depending on how many scenarios you select.
                        </div>
                    </div>
                ) : (
                    <></>
                )}
            </Row>
            {props.importBundle.type === ImportDataType.aidAdventureExport ? (
                <Row>
                    <div>
                        <Checkbox
                            label="Keep '>' Characters"
                            value={keepAngledBrackets}
                            setValue={setKeepAngledBrackets}
                            checkedText="Do and say actions will include the prefixed '>&nbsp;'."
                            uncheckedText="Do and say actions will have the prefixed '>&nbsp;' stripped."
                            alternate={true}
                        ></Checkbox>
                    </div>
                </Row>
            ) : (
                <></>
            )}
            <Row>
                <div>
                    <div>Select All On Page:</div>
                    <Row>
                        <SmallCheckbox
                            label=""
                            value={allCheck}
                            setValue={(value) => {
                                setAllCheck(value)
                                setOneChecked(value)
                                for (const n of filteredNames.slice(
                                    page * 300,
                                    Math.min((page + 1) * 300, filteredNames.length)
                                )) {
                                    importCheck[n.index] = value
                                }
                            }}
                        ></SmallCheckbox>
                        {importCheck.filter(Boolean).length} of {importCheck.length} selected
                    </Row>{' '}
                </div>
            </Row>
            <Row>
                <InnerRow>
                    <div>Filter:</div>
                    <InnerRow>
                        <input
                            value={searchValue}
                            placeholder={'Type the name of a story, an author, or a tag here and hit enter'}
                            onChange={(e) => {
                                setSearchValue(e.target.value)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const filtered = names.filter((n) => {
                                        let included = false
                                        included =
                                            included ||
                                            n.name
                                                .toLocaleLowerCase()
                                                .includes(searchValue.toLocaleLowerCase())
                                        included =
                                            included ||
                                            authors[n.index]
                                                .toLocaleLowerCase()
                                                .includes(searchValue.toLocaleLowerCase())
                                        for (const tag of tags[n.index]) {
                                            included =
                                                included ||
                                                tag
                                                    .toLocaleLowerCase()
                                                    .includes(searchValue.toLocaleLowerCase())
                                        }
                                        return included
                                    })
                                    setPage(0)
                                    setFilteredNames(filtered)
                                }
                            }}
                        ></input>
                    </InnerRow>
                </InnerRow>
            </Row>
            <Row>
                <InnerRow>
                    <div>
                        <Centered>
                            <Button
                                disabled={page <= 0}
                                onClick={() => {
                                    setPage(page - 1)
                                }}
                            >
                                Previous
                            </Button>
                            <div>
                                Page {page + 1} of {Math.ceil(filteredNames.length / 300)}. Showing{' '}
                                {page * 300 + 1} to {Math.min((page + 1) * 300, filteredNames.length)} of{' '}
                                {filteredNames.length}
                            </div>
                            <Button
                                disabled={page >= Math.ceil(filteredNames.length / 300) - 1}
                                onClick={() => {
                                    setPage(page + 1)
                                }}
                            >
                                Next
                            </Button>
                        </Centered>
                        <Centered>{names.length - filteredNames.length} hidden by filter</Centered>
                    </div>
                </InnerRow>
            </Row>

            <FlexCol>
                {filteredNames
                    .slice(page * 300, Math.min((page + 1) * 300, filteredNames.length))
                    .map((name, i) => {
                        return (
                            <StoryListing key={i}>
                                <FlexCol style={{ justifyContent: 'flex-start' }}>
                                    <label
                                        style={{ display: 'flex', paddingBottom: '10px', cursor: 'pointer' }}
                                    >
                                        <SmallCheckbox
                                            label=""
                                            value={importCheck[name.index]}
                                            setValue={(value) =>
                                                setImportCheck([
                                                    ...importCheck.slice(0, name.index),
                                                    value,
                                                    ...importCheck.slice(name.index + 1),
                                                ])
                                            }
                                        ></SmallCheckbox>
                                        <BiggerLabel>{name.name}</BiggerLabel>
                                    </label>
                                    {props.importBundle.type === ImportDataType.aidScenarioExport ? (
                                        <>
                                            <div style={{ display: 'flex' }}>
                                                <Label>Author:</Label>
                                                <span> {authors[name.index]} [AID Export]</span>
                                            </div>
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                    <Description>{descriptions[name.index]}</Description>
                                </FlexCol>
                                <div>
                                    <Label>Tags</Label>
                                    {tags[name.index] ? (
                                        <TagContainer>
                                            {tags[name.index].map((tag, index) => {
                                                return <span key={index}>{tag}</span>
                                            })}
                                        </TagContainer>
                                    ) : (
                                        <></>
                                    )}
                                </div>
                            </StoryListing>
                        )
                    })}
            </FlexCol>
        </div>
    )
}
