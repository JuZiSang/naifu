import { useEffect, useState, useMemo, Fragment, useCallback, useRef, MutableRefObject } from 'react'
import { useRecoilCallback, useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'

import { toast } from 'react-toastify'
import { ScenarioGroup } from '../data/story/scenario'
import { StoryContainer, StoryMetadata } from '../data/story/storycontainer'
import { SearchFilter, ScenarioGroupMatchResult } from '../data/storage/search'
import { GlobalUserContext } from '../globals/globals'
import {
    StorySearch,
    SelectedStory,
    Session,
    Stories,
    StoryUpdate,
    ScenarioSelected,
    SessionValue,
    UserPresets,
} from '../globals/state'
import {
    ViewAll,
    Scenarios as StyledScenarios,
    ScenarioBlock as StyledScenario,
    Title,
    Description,
    Author,
    ScenarioBlockTop,
    ScenarioBlockBottom,
    PerspectiveDisplay,
    TitleRow,
    BrowserScenarios,
    ScenarioTagDisplay,
    ScenarioBlockAdditional,
    ScenarioBlockAdditionalVote,
} from '../styles/components/scenarios'
import { fetchWithTimeout } from '../util/general'
import {
    ArrowLeftIcon,
    BatIcon,
    CrownIcon,
    Place1Icon,
    Place2Icon,
    Place3Icon,
    PlaceSIcon,
    PlayIcon,
    ThumbEmptyIcon,
    ThumbIcon,
} from '../styles/ui/icons'
import { LightColorButton, SubtleButton } from '../styles/ui/button'
import { useWindowSize } from '../hooks/useWindowSize'
import { FlexColSpacer } from '../styles/ui/layout'
import { getAvailiableModels, modelsCompatible } from '../util/models'
import { randomizeArray } from '../util/util'
import { DefaultModel } from '../data/request/model'
import { eventBus } from '../globals/events'
import { transparentize } from '../util/colour'
import { BackendURLVoteContest } from '../globals/constants'
import { logError } from '../util/browser'
import { Dark } from '../styles/themes/dark'
import { getUserSetting, UserSettings } from '../data/user/settings'
import { copyPresetToStory, getDefaultPresetForModel } from '../util/presets'
import { DEFAULT_THEME } from '../styles/themes/theme'
import Modal, { ModalType } from './modals/modal'
import { ImportScenarioGroup } from './import/importscenariogroup'
import { TextHighlight } from './util/texthighlight'
import Tooltip from './tooltip'
import Spinner from './spinner'
import { createEditorEvent, EditorLoadEvent } from './editor/events'
import { WelcomeHeadingContainer } from './welcome'
import { CloseButton } from './modals/common'
import { NewUpdatesBubble } from './modals/splash'

const scenarioFilter = new SearchFilter()

const BackButton = styled(SubtleButton)`
    display: flex;
    font-size: 0.875rem;
    font-weight: 600;
    align-items: center;
    width: 100%;
    padding: 10px;
    > :first-child {
        height: 0.75rem;
        margin-right: 10px;
    }
`

export default function Scenarios(props: {
    onScenarioSelected?: () => void
    onScenariosLoaded?: () => void
    setShowScenarios: (b: boolean) => void
}): JSX.Element {
    const [showScenarioBrowser, setShowScenarioBrowser] = useState(false)
    const [defaultVanilla, setDefaultVanilla] = useState<ScenarioGroup[]>([])
    const [defaultAdventures, setDefaultAdventures] = useState<ScenarioGroup[]>([])
    const [defaultMenageries, setDefaultMenageries] = useState<ScenarioGroup[]>([])
    const [defaultAnniversaries, setDefaultAnniversaries] = useState<ScenarioGroup[]>([])
    const [defaultScenarios, setDefaultScenarios] = useState<ScenarioGroup[]>([])
    const [randomScenarios, setRandomScenarios] = useState<ScenarioGroup[]>([])
    const [shownScenarios, setShownScenarios] = useState(0)
    const [defaultScenarioLookup, setDefaultScenarioLookup] = useState(true)
    const [searchInput, setSearchInput] = useState('')
    const [showScenarioModal, setShowScenarioModal] = useState(false)
    const [selectedScenario, setSelectedScenario] = useState(new ScenarioGroup())

    useEffect(() => {
        Promise.all([
            fetchWithTimeout('../../defaultScenarios.json?v=6&static=true', { cache: 'force-cache' }),
            fetchWithTimeout('../../defaultTextAdventureScenarios.json?v=7&static=true', {
                cache: 'force-cache',
            }),
            fetchWithTimeout('../../defaultMenagerieScenarios.json?v=7&static=true', {
                cache: 'force-cache',
            }),
            fetchWithTimeout('../../defaultAnniversaryScenarios.json?v=7&static=true', {
                cache: 'force-cache',
            }),
        ])
            .then(([scenarios, textAdventureScenarios, menagerieScenarios, anniversaryScenarios]) => {
                if (
                    scenarios.status &&
                    textAdventureScenarios.status &&
                    menagerieScenarios.status &&
                    anniversaryScenarios.status
                ) {
                    Promise.all([
                        scenarios.json(),
                        textAdventureScenarios.json(),
                        menagerieScenarios.json(),
                        anniversaryScenarios.json(),
                    ])
                        .then(([json, adventureJson, menagerieJson, anniversaryJson]) => {
                            const arr = []
                            for (const scenario of json) {
                                arr.push(ScenarioGroup.deserialize(scenario))
                            }
                            const adventureArr = []
                            for (const scenario of adventureJson) {
                                adventureArr.push(ScenarioGroup.deserialize(scenario))
                            }
                            const menagerieArr = []
                            for (const scenario of menagerieJson) {
                                menagerieArr.push(ScenarioGroup.deserialize(scenario))
                            }
                            const anniversaryArr = []
                            for (const scenario of anniversaryJson) {
                                anniversaryArr.push(ScenarioGroup.deserialize(scenario))
                            }
                            arr.sort((a, b) => {
                                return a.name.localeCompare(b.name)
                            })
                            adventureArr.sort((a, b) => {
                                return a.name.localeCompare(b.name)
                            })
                            menagerieArr.sort((a, b) => {
                                return a.name.localeCompare(b.name)
                            })

                            setDefaultScenarios([
                                ...[...arr, ...adventureArr, ...menagerieArr, ...anniversaryArr].sort(
                                    (a, b) => {
                                        return a.name.localeCompare(b.name)
                                    }
                                ),
                            ])

                            setDefaultVanilla(randomizeArray([...arr]))
                            setDefaultAdventures(randomizeArray([...adventureArr]))
                            setDefaultMenageries(randomizeArray([...menagerieArr]))
                            setDefaultAnniversaries(randomizeArray([...anniversaryArr]))

                            props.onScenariosLoaded?.call(props.onScenariosLoaded)
                        })
                        .catch(() => {
                            setDefaultScenarioLookup(false)
                        })
                }
            })
            .catch(() => {
                setDefaultScenarioLookup(false)
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const setScenarioSelected = useSetRecoilState(ScenarioSelected)

    const handleScenarioClick = useRecoilCallback(({ set, snapshot }) => async (story: StoryContainer) => {
        const selectedStory = await snapshot.getPromise(SelectedStory)
        const session = await snapshot.getPromise(Session)
        const userPresets = await snapshot.getPromise(UserPresets)

        const currentStory = GlobalUserContext.stories.get(selectedStory.id)
        const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)

        setShowScenarioBrowser(false)
        let storyMetadata = currentStory

        // Make sure current story is not one that has been modified
        let storyModified = false
        if (storyMetadata?.isModified) {
            storyModified = true
        }
        if ((currentStoryContent?.story?.datablocks.length ?? -1) !== 1) {
            storyModified = true
        }
        if ((currentStoryContent?.getStoryText() ?? '') !== '') {
            storyModified = true
        }
        if ((currentStoryContent?.lorebook.entries.length ?? -1) !== 0) {
            storyModified = true
        }
        if ((currentStoryContent?.ephemeralContext.length ?? -1) !== 0) {
            storyModified = true
        }
        if ((currentStoryContent?.context[0].text.length ?? -1) !== 0) {
            storyModified = true
        }
        if ((currentStoryContent?.context[1].text.length ?? -1) !== 0) {
            storyModified = true
        }

        if (storyModified || !storyMetadata) {
            storyMetadata = new StoryMetadata()
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            set(Stories, (val) => [storyMetadata!.id, ...val])
            set(SelectedStory, { loaded: false, id: storyMetadata.id })
        }

        storyMetadata.description = story.metadata.description
        storyMetadata.title = story.metadata.title
        storyMetadata.tags = story.metadata.tags
        storyMetadata.hasDocument = story.metadata.hasDocument
        storyMetadata.eventId = selectedScenario.id ?? undefined
        storyMetadata.remote = getUserSetting(session.settings, 'remoteDefault')

        // set story model to user default if scenario default not availiable
        if (
            !getAvailiableModels(session.subscription.tier === 3).some((m) =>
                modelsCompatible(m.str, story.content.settings.model)
            )
        ) {
            story.content.settings.model = getUserSetting(session.settings, 'defaultModel')
            const defaultPreset = getDefaultPresetForModel(
                story.content.settings.model,
                session.settings,
                userPresets
            )

            story.content.settings.preset = defaultPreset.id
            copyPresetToStory(defaultPreset, story.content)
        }

        GlobalUserContext.storyContentCache.set(storyMetadata.id, story.content)
        GlobalUserContext.stories.set(storyMetadata.id, storyMetadata)

        eventBus.trigger(createEditorEvent(new EditorLoadEvent(story.content, storyMetadata)))
        ;(window as any).plausible('ScenarioStart', { props: { scenario: storyMetadata.title } })

        set(StoryUpdate(storyMetadata.id), storyMetadata.save())
        setShowScenarioModal(false)
        set(StorySearch, '')
        setScenarioSelected((v) => v + 1)
        props.onScenarioSelected?.call(props.onScenarioSelected)
    })

    useEffect(() => {
        function handleResize() {
            if (
                (window.visualViewport?.width || window.innerWidth) > 600 &&
                (window.visualViewport?.height || window.innerHeight) < 950
            ) {
                setShownScenarios(1)
            } else if (
                (window.visualViewport?.width || window.innerWidth) < 600 &&
                (window.visualViewport?.height || window.innerHeight) < 700
            ) {
                setShownScenarios(1)
            } else if ((window.visualViewport?.width || window.innerWidth) < 600) {
                setShownScenarios(2)
            } else {
                setShownScenarios(3)
            }
        }

        window.addEventListener('resize', handleResize)
        handleResize()
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const randoms = randomizeArray([...defaultVanilla, ...defaultAdventures, ...defaultAnniversaries])
        setRandomScenarios(randoms.slice(0, shownScenarios))
    }, [shownScenarios, defaultVanilla, defaultAdventures, defaultMenageries, defaultAnniversaries])

    const [votes, setVotes] = useState([] as string[])
    const loadVotes = useRecoilCallback(({ snapshot }) => async () => {
        const session = await snapshot.getPromise(Session)
        if (!session.authenticated || !session?.subscription?.active) {
            return false
        }
        try {
            const request = await fetch(BackendURLVoteContest + '/anniversary2022-scenario', {
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + session.auth_token,
                },
                method: 'GET',
            })
            const json = await request.json()
            if (json.statusCode && json.statusCode !== 200) {
                toast(json.message || 'Loading votes failed.')
                return false
            }
            setVotes(json?.map?.call(json, (e: Record<string, any>) => e.submissionId))
            return true
        } catch (error: any) {
            logError(error)
            toast(error.message ?? '' + error)
            return false
        }
    })
    const castVote = useRecoilCallback(({ snapshot }) => async (id: string, up: boolean) => {
        try {
            const session = await snapshot.getPromise(Session)
            const request = await fetch(BackendURLVoteContest + '/anniversary2022-scenario', {
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + session.auth_token,
                },
                method: up ? 'POST' : 'DELETE',
                body: JSON.stringify({
                    id,
                }),
            })
            if (request.status === 200 || request.status === 201) {
                if (up) setVotes((votes) => [...votes, id])
                else setVotes((votes) => votes.filter((vote) => vote !== id))
                return true
            }
            const json = await request.json()
            if (json.statusCode && (json.statusCode !== 200 || json.statusCode !== 201)) {
                toast(json.message || 'Voting failed.')
                return false
            }
            if (up) setVotes((votes) => [...votes, id])
            else setVotes((votes) => votes.filter((vote) => vote !== id))
            return true
        } catch (error: any) {
            logError(error)
            toast(error.message ?? ('' + error || 'Voting failed.'))
            return false
        }
    })
    useEffect(() => {
        loadVotes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const randomScenarioElements = useMemo(() => {
        return randomScenarios.map((scenarioGroup, index) => {
            return (
                <ScenarioBlock
                    key={index}
                    scenarioGroup={scenarioGroup}
                    isPreview={true}
                    onScenarioClick={() => {
                        ;(window as any).plausible('ScenarioClick', {
                            props: { scenario: scenarioGroup.scenarios[0]?.title },
                        })
                        setSelectedScenario(scenarioGroup)
                        setShowScenarioModal(true)
                    }}
                    voted={votes.includes(scenarioGroup.id ?? '')}
                    onVote={(up: boolean) => castVote(scenarioGroup.id ?? '', up)}
                />
            )
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [randomScenarios, votes])

    const [selectedTab, setSelectedTab] = useState(0)

    const filteredElements = useMemo(() => {
        let results
        switch (selectedTab) {
            default: {
                results = scenarioFilter.scenarioGroupMatch(defaultScenarios, searchInput)
                break
            }
        }
        const elements = results.map((result, index) => {
            return (
                <ScenarioBlock
                    showTags={true}
                    key={index}
                    scenarioGroup={result.group}
                    highlight={result}
                    isPreview={false}
                    onScenarioClick={() => {
                        ;(window as any).plausible('ScenarioClick', {
                            props: { scenario: result.group.scenarios[0]?.title },
                        })
                        setSelectedScenario(result.group)
                        setShowScenarioModal(true)
                    }}
                    voted={votes.includes(result.group.id ?? '')}
                    onVote={(up: boolean) => castVote(result.group.id ?? '', up)}
                />
            )
        })

        return elements
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultScenarios, searchInput, selectedTab, votes])

    const win = useWindowSize()
    const MOBILE_DEVICE = win.width <= 600

    return (
        <div style={{ overflow: 'auto', width: '100%' }}>
            <WelcomeHeadingContainer style={{ marginTop: MOBILE_DEVICE ? '0px' : '10px', height: 'unset' }}>
                {MOBILE_DEVICE ? (
                    <div>
                        <h2>
                            <span>Choose a Scenario</span>
                        </h2>
                        <div>
                            <p>
                                Use the browser below to select a scenario that tickles your fancy, you’ll be
                                able to view the contents before starting.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <FlexColSpacer min={20} max={20} />
                        <h2>
                            <span>Can{"'"}t think of any ideas? </span>
                            <span>Pick one of ours to get started.</span>
                        </h2>
                        <div>
                            <p>
                                Use the browser below to select a scenario that tickles your fancy, you’ll be
                                able to view the contents before starting.
                            </p>
                        </div>
                    </div>
                )}
                {MOBILE_DEVICE ? (
                    <></>
                ) : (
                    <LightColorButton
                        onClick={() => {
                            setDefaultVanilla((v) => randomizeArray([...v]))
                            setDefaultAdventures((v) => randomizeArray([...v]))
                            setDefaultMenageries((v) => randomizeArray([...v]))
                        }}
                    >
                        Shuffle
                    </LightColorButton>
                )}
            </WelcomeHeadingContainer>

            <StyledScenarios>
                {randomScenarioElements.length > 0 ? (
                    randomScenarioElements
                ) : !defaultScenarioLookup ? (
                    <ViewAll>
                        <div>
                            <div>Failed to load default scenarios.</div>
                        </div>
                    </ViewAll>
                ) : shownScenarios ? (
                    <ViewAll>
                        <div>
                            <div>Loading...</div>
                            <div>
                                <Spinner visible style={{ width: '20px' }} />
                            </div>
                        </div>
                    </ViewAll>
                ) : null}
                <ViewAll onClick={() => setShowScenarioBrowser(true)}>
                    <div style={{ position: 'relative' }}>
                        <div>View All Scenarios</div>
                        {/* <NewUpdatesBubble style={{ top: -14, left: -22, right: 'unset' }}>
                            New!
                        </NewUpdatesBubble> */}
                        {(window.visualViewport?.width || window.innerWidth) <= 600 ? (
                            <div />
                        ) : (
                            <div>Click Here</div>
                        )}
                    </div>
                </ViewAll>
            </StyledScenarios>

            {MOBILE_DEVICE ? (
                <BackButton onClick={() => props.setShowScenarios(false)}>
                    <ArrowLeftIcon />
                    Back
                </BackButton>
            ) : (
                <></>
            )}

            <Modal
                label={'Start Scenario'}
                isOpen={showScenarioModal}
                type={ModalType.Large}
                onRequestClose={() => {
                    setShowScenarioModal(false)
                }}
                shouldCloseOnOverlayClick={true}
            >
                <ImportScenarioGroup
                    onClose={() => {
                        setShowScenarioModal(false)
                    }}
                    scenarioGroup={selectedScenario}
                    onScenarioSelect={(s) => {
                        props.setShowScenarios(false)
                        handleScenarioClick(s)
                    }}
                ></ImportScenarioGroup>
            </Modal>
            <Modal
                style={{ width: '100%', maxHeight: 800 }}
                type={ModalType.Large}
                label="Scenario Browser"
                isOpen={showScenarioBrowser}
                shouldCloseOnOverlayClick={true}
                onRequestClose={() => setShowScenarioBrowser(false)}
            >
                <>
                    <CloseButton style={{ top: 38 }} onClick={() => setShowScenarioBrowser(false)}>
                        <div />
                    </CloseButton>
                    <ScenarioBrowserContainer>
                        <ScenarioBrowserTitle>Search for Scenarios</ScenarioBrowserTitle>

                        <SearchTabRow>
                            <input
                                style={{ maxWidth: 550, marginBottom: 10, flex: '1 1 0', borderRadius: 3 }}
                                placeholder="Search by title, author, tag, or perspective"
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            <div style={{ width: 40 }} />
                            {/*
                            <div style={{ flex: '0 0 auto', overflowX: 'auto', display: 'flex' }}>
                                <TabButton
                                    style={{ borderRadius: '0 3px 0 0 ' }}
                                    selected={selectedTab === 1}
                                    onClick={() => setSelectedTab(1)}
                                >
                                    Default
                                </TabButton>
                            </div>
                            */}
                        </SearchTabRow>
                        <BrowserScenarios>
                            {filteredElements.length > 0 ? filteredElements : 'No scenarios found.'}
                        </BrowserScenarios>
                    </ScenarioBrowserContainer>
                </>
            </Modal>
        </div>
    )
}

const ArtVoteBanner = styled.a`
    padding: 10px 30px 10px 30px;
    display: flex;
    align-items: center;
    justify-content: left;
    gap: 5px;
    transition: all ease-in-out 0.12s;
    font-size: 1rem;
    cursor: pointer;
    &:hover {
        font-size: 1.01rem;
        color: unset;
    }
`

function ScenarioBlock(props: {
    scenarioGroup: ScenarioGroup
    highlight?: ScenarioGroupMatchResult
    onScenarioClick: (scenarioGroup: ScenarioGroup) => void
    showTags?: boolean
    isPreview: boolean
    voted: boolean
    onVote: (up: boolean) => Promise<boolean>
}) {
    let tags: string[] = []

    for (const scenario of props.scenarioGroup.scenarios) {
        tags = [...tags, ...scenario.tags]
    }

    // const loading = useRef(false)
    // const vote = useCallback(() => {
    //     if (loading.current || !props.scenarioGroup.id) return Promise.reject()
    //     loading.current = true
    //     return props
    //         .onVote(!props.voted)
    //         .finally(() => (loading.current = false))
    //         .then((r) => r && !props.voted)
    // }, [props])

    const tagMap = new Map()
    for (const tag of tags) {
        tagMap.set(tag, tag)
    }
    const finalTags = [...tagMap.values()]

    // eslint-disable-next-line react/function-component-definition
    let PlaceIcon
    let title = ''
    if (props.scenarioGroup.scenarios[0].tags.includes('1st place')) {
        PlaceIcon = Place1Icon
        title = '1st Place'
    } else if (props.scenarioGroup.scenarios[0].tags.includes('2nd place')) {
        PlaceIcon = Place2Icon
        title = '2nd Place'
    } else if (props.scenarioGroup.scenarios[0].tags.includes('3rd place')) {
        PlaceIcon = Place3Icon
        title = '3rd Place'
    } else if (props.scenarioGroup.scenarios[0].tags.includes('staff pick')) {
        PlaceIcon = PlaceSIcon
        title = 'Staff Pick'
    }

    let EventIcon
    let eventTitle = ''
    if (props.scenarioGroup.scenarios[0].tags.includes('halloween')) {
        EventIcon = BatIcon
        eventTitle = 'Halloween Event'
    } else if (props.scenarioGroup.scenarios[0].tags.includes('anniversary contest')) {
        EventIcon = CrownIcon
        eventTitle = 'Anniversary Event'
    }

    const Type = StyledScenario
    return (
        <Type onClick={() => props.onScenarioClick(props.scenarioGroup)}>
            <ScenarioBlockTop>
                <TitleRow>
                    <Title>
                        <TextHighlight text={props.scenarioGroup.name} highlight={props.highlight?.name} />
                        {EventIcon ? (
                            <Tooltip tooltip={eventTitle} delay={200}>
                                <EventIcon
                                    style={{
                                        display: 'inline-block',
                                        height: '12px',
                                        margin: '0 0 0 3px',
                                    }}
                                />
                            </Tooltip>
                        ) : null}
                        {PlaceIcon ? (
                            <Tooltip tooltip={title} delay={200}>
                                <PlaceIcon
                                    style={{
                                        display: 'inline-block',
                                        height: '12px',
                                        margin: '0 0 0 2px',
                                    }}
                                />
                            </Tooltip>
                        ) : null}
                    </Title>
                    <LightColorButton>
                        <PlayIcon />
                    </LightColorButton>
                </TitleRow>
                <Author>
                    by{' '}
                    <TextHighlight
                        text={props.scenarioGroup.scenarios[0].author || 'Anon'}
                        highlight={props.highlight?.author}
                    />
                </Author>
                <div style={{ display: 'flex' }}>
                    {props.scenarioGroup.names.map((n, i) => {
                        return (
                            <PerspectiveDisplay key={i}>
                                <TextHighlight text={n} highlight={props.highlight?.names} />
                            </PerspectiveDisplay>
                        )
                    })}
                    {props.scenarioGroup.scenarios[0].tags.slice(0, 2).map((n, i) => {
                        return (
                            <PerspectiveDisplay tag={true} key={i}>
                                <TextHighlight text={n} highlight={props.highlight?.tags.get(n)} />
                            </PerspectiveDisplay>
                        )
                    })}
                </div>
            </ScenarioBlockTop>
            <ScenarioBlockBottom style={{ paddingBottom: props.showTags ? '0' : '13px' }}>
                <Description>
                    <TextHighlight
                        text={props.scenarioGroup.scenarios[0].description}
                        highlight={props.highlight?.description}
                    />
                </Description>
                <div style={{ flex: 1 }} />
                {props.showTags ? (
                    <ScenarioTagDisplay>
                        {finalTags.map((tag, i) => {
                            return (
                                <div key={i}>
                                    <TextHighlight text={tag} highlight={props.highlight?.tags.get(tag)} />
                                </div>
                            )
                        })}
                    </ScenarioTagDisplay>
                ) : (
                    <></>
                )}
            </ScenarioBlockBottom>
            {/* {tags.includes('anniversary contest') && (
                <ScenarioBlockAdditional
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                    }}
                >
                    <VoteButton voted={props.voted} onVote={vote} />
                </ScenarioBlockAdditional>
            )} */}
        </Type>
    )
}

function VoteButton(props: { voted: boolean; onVote: () => Promise<boolean> }) {
    const settings = useRecoilValue(SessionValue('settings')) as UserSettings
    const confettiRef: MutableRefObject<any> = useRef(null)
    const vote = () => {
        props.onVote().then((ok) => {
            if (ok)
                setTimeout(
                    () =>
                        confettiRef.current?.confetti({
                            spread: 38,
                            startVelocity: 14,
                            origin: { y: 0.5 },
                            particleCount: Math.floor(45),
                            colors: [
                                settings.siteTheme?.colors?.textHeadings ?? DEFAULT_THEME.colors.textHeadings,
                            ],
                            scalar: 0.75,
                        }),
                    10
                )
        })
    }
    return (
        <ScenarioBlockAdditionalVote
            onClick={() => vote()}
            aria-label={props.voted ? 'Remove Vote' : 'Cast Vote'}
        >
            Vote {props.voted ? <ThumbIcon /> : <ThumbEmptyIcon />}
        </ScenarioBlockAdditionalVote>
    )
}

const ScenarioBrowserContainer = styled.div`
    background-color: ${(props) => props.theme.colors.bg2};
    border: 1px solid ${(props) => props.theme.colors.bg3};
    border-radius: 3px;
    height: var(--app-height, 100%);
    max-height: 800px;
    display: flex;
    flex-direction: column;
`

const ScenarioBrowserTitle = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-family: ${(props) => props.theme.fonts.headings};
    font-weight: 700;
    font-size: 1.125rem;
    padding: 40px 30px 7px 30px;
`

const SearchTabRow = styled.div`
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
    padding: 10px 30px 0 30px;
    align-items: flex-end;
    @media (max-width: 650px) {
        flex-direction: column;
    }
`

const TabButton = styled(SubtleButton)<{ selected: boolean }>`
    background: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.bg1)};
    color: ${(props) =>
        !props.selected ? transparentize(0.3, props.theme.colors.textMain) : props.theme.colors.textMain};

    font-weight: 600;
    padding: 12px 30px;
    flex: 0 0 auto;
    position: relative;
    overflow: hidden;
`
