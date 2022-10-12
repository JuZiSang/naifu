import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { MdHelpOutline } from 'react-icons/md'
import styled from 'styled-components'
import { usePopper } from 'react-popper'
import { createPortal } from 'react-dom'
import { adjustHue } from '../util/colour'
import {
    ContextViewerPage,
    CurrentContext,
    GenerationRequestActive,
    InputModes,
    LastContextReport,
    LastResponse,
    LorebookOpen,
    SelectedInputMode,
    SelectedLorebookEntry,
    SelectedStory,
    Session,
    SiteTheme,
} from '../globals/state'
import { GlobalUserContext } from '../globals/globals'
import { buildContext, ContextFieldReason, ContextReport, ContextStageReport } from '../data/ai/context'
import { EventHandler } from '../data/event/eventhandling'
import {
    ContextDisplay,
    InvisibleContext,
    OverrideTokenToggle,
    ReportTable,
    ShownContext,
    ShowNonActivated,
    StageControls,
    StyledContext,
    TableHeader,
    TableRow,
} from '../styles/components/contextviewer'
import { Button, LightColorButton, SubtleButton } from '../styles/ui/button'
import { modelMaxContextSize } from '../data/ai/model'
import { FlexCol, FlexRow } from '../styles/ui/layout'
import { getAccountContextLimit } from '../util/subscription'
import { NoModule } from '../data/story/storysettings'
import { getUserSetting } from '../data/user/settings'
import { DefaultModel } from '../data/request/model'
import { TooltipMain } from '../styles/ui/tooltip'
import { useSelectedStory, useSelectedStoryUpdate } from '../hooks/useSelectedStory'
import { LinkIcon, ReloadIcon } from '../styles/ui/icons'
import { LoreEntry } from '../data/ai/loreentry'
import Modal, { ModalType } from './modals/modal'
import Checkbox from './controls/checkbox'
import Tooltip from './tooltip'
import { EphemeralContext } from './ephemeralcontext'
import Tabs, { Tab } from './tabs'
import { TokenizerOutput } from './tokenizer'
import ContextConfig from './contextconfig'

export function ContextViewerButtons(): JSX.Element {
    const session = useRecoilValue(Session)
    const setContextViewerPage = useSetRecoilState(ContextViewerPage)
    const currentContext = useRecoilValue(CurrentContext)
    const colors = useContextColors(currentContext)
    const [stale, setStale] = useState(false)
    const { loading, update: updateContext } = useUpdateCurrentContext()
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    const limitMax = getAccountContextLimit(session) >= 2048
    const { id, update } = useSelectedStoryUpdate()
    useLayoutEffect(() => {
        setStale(true)
    }, [id, update])

    useLayoutEffect(() => {
        if (!loading) {
            setStale(false)
        } else {
            setStale(true)
        }
    }, [loading])

    useLayoutEffect(() => {
        if (!generationRequestActive) {
            updateContext(limitMax)
            setStale(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generationRequestActive, limitMax])

    return (
        <FlexCol style={{ gap: '10px' }}>
            <FlexRow>
                <div style={{ opacity: stale ? 0.5 : 1, flex: '1 1 0' }}>
                    <ContextBar context={currentContext} colors={colors} singleTooltip />
                </div>
                <SubtleButton
                    style={{ opacity: loading || !stale ? 0.7 : 1, padding: '7px 10px', height: '100%' }}
                    onClick={async () => {
                        await updateContext(limitMax)
                    }}
                >
                    <ReloadIcon style={{ height: 14, width: 14 }} />
                </SubtleButton>
            </FlexRow>
            <FlexRow style={{ gap: '10px' }}>
                <LightColorButton
                    style={{ flex: '1 1 50%' }}
                    tabIndex={0}
                    role="button"
                    centered={true}
                    onClick={() => setContextViewerPage(0)}
                    aria-label="View Last Context"
                >
                    Last Context
                </LightColorButton>
                <LightColorButton
                    style={{ flex: '1 1 50%' }}
                    tabIndex={0}
                    role="button"
                    centered={true}
                    onClick={() => setContextViewerPage(1)}
                    aria-label="View Current Context"
                >
                    Current Context
                </LightColorButton>
            </FlexRow>
            <EditContextSettings />
            <EphemeralContext />
        </FlexCol>
    )
}

export function useContextColors(context: ContextReport): Map<string, string> {
    const siteTheme = useRecoilValue(SiteTheme)
    const session = useRecoilValue(Session)
    const colors: Map<string, string> = useMemo(() => {
        const theme = siteTheme

        const loreColors = [
            theme.colors.textUser,
            adjustHue(15, theme.colors.textUser),
            adjustHue(30, theme.colors.textUser),
            adjustHue(-15, theme.colors.textUser),
            adjustHue(-30, theme.colors.textUser),
        ]
        const ephemeralColors = [
            theme.colors.textEdit,
            adjustHue(15, theme.colors.textEdit),
            adjustHue(30, theme.colors.textEdit),
            adjustHue(-15, theme.colors.textEdit),
            adjustHue(-30, theme.colors.textEdit),
        ]
        const newColors = new Map<string, string>()
        const loreStack: { id: string; color: string }[] = []
        const ephemeralStack: { id: string; color: string }[] = []
        const loreAdded = { count: 0 }
        const ephmeralAdded = { count: 0 }

        const addColors = (context: ContextReport) => {
            for (const [i, section] of context.structuredOutput.entries()) {
                let color = theme.colors.textMain
                if (getUserSetting(session.settings, 'contextViewerColors') === false) {
                    continue
                }
                switch (section.type) {
                    case 'ephemeral':
                    case 'lore':
                        const stack = section.type === 'lore' ? loreStack : ephemeralStack
                        const colors = section.type === 'lore' ? loreColors : ephemeralColors
                        const added = section.type === 'lore' ? loreAdded : ephmeralAdded
                        color = colors[added.count % (colors.length - 1)]
                        added.count = added.count + 1
                        if (!stack[stack.length - 1] || !context.structuredOutput[i + 1]) {
                            break
                        }
                        if (
                            color === stack[stack.length - 1].color &&
                            context.structuredOutput[i + 1].identifier === stack[stack.length - 1].id
                        ) {
                            added.count++
                            color = colors[i % (colors.length - 1)]
                        }
                        if (stack[stack.length - 1].id === section.identifier) {
                            const top = loreStack.pop()
                            if (top) color = top.color
                        }
                        if (
                            context.structuredOutput
                                .slice(i + 1)
                                .some((o) => section.identifier === o.identifier)
                        ) {
                            stack.push({ id: section.identifier, color: color })
                        }
                        break
                    case 'memory':
                        color = adjustHue(15, theme.colors.textPrompt)
                        break
                    case 'an':
                        color = adjustHue(-15, theme.colors.textPrompt)
                        break
                    case 'story':
                        color = theme.colors.textAI
                        break
                    default:
                        break
                }
                newColors.set(section.identifier, color)
            }
        }
        addColors(context)
        for (const status of context.contextStatuses) {
            if (status.subContext) {
                addColors(status.subContext)
            }
        }

        return newColors
    }, [context, session.settings, siteTheme])

    return colors
}

function useUpdateCurrentContext(): { loading: boolean; update: (limitMax: boolean) => Promise<void> } {
    const session = useRecoilValue(Session)
    const inputMode = useRecoilValue(SelectedInputMode)
    const inputModes = useRecoilValue(InputModes)
    const [loading, setLoading] = useState(true)
    const { story, meta } = useSelectedStory()
    const setCurrentContext = useSetRecoilState(CurrentContext)
    const model = (story?.settings.model || getUserSetting(session.settings, 'defaultModel')) ?? DefaultModel
    const update = async (b: boolean) => {
        setLoading(true)
        if (story && meta) {
            let limit = (b ? modelMaxContextSize(model) : 1024) - story.settings.parameters.max_length
            if (getUserSetting(session.settings, 'continueGenerationToSentenceEnd')) {
                limit -= 20
            }

            buildContext(
                story,
                new EventHandler(story, meta, inputMode, inputModes),
                limit,
                getUserSetting(session.settings, 'prependPreamble')
            ).then((result) => {
                setCurrentContext(result)
                setLoading(false)
            })
        }
    }
    return { loading, update }
}

export default function ContextViewerModal(props: {
    setTab: (index: number) => void
    onRequestClose: () => void
}): JSX.Element {
    const lastContext = useRecoilValue(LastContextReport)
    const [selectedStory] = useRecoilState(SelectedStory)
    const currentTab = useRecoilValue(ContextViewerPage)
    const session = useRecoilValue(Session)
    const currentContext = useRecoilValue(CurrentContext)

    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const model =
        (currentStoryContent?.settings.model || getUserSetting(session.settings, 'defaultModel')) ??
        DefaultModel
    const [showMax, setShowMax] = useState(getAccountContextLimit(session) >= 2048)
    const colors = useContextColors(currentContext)
    const lastColors = useContextColors(lastContext)
    const { loading, update } = useUpdateCurrentContext()
    useEffect(() => {
        if (currentTab === 1) {
            update(showMax)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        currentTab,
        session.settings?.continueGenerationToSentenceEnd,
        session.settings?.defaultModel,
        session.settings?.prependPreamble,
        showMax,
        model,
    ])

    const lastResponse = useRecoilValue(LastResponse)

    return (
        <Modal
            label="Context Viewer"
            isOpen={currentTab >= 0}
            shouldCloseOnOverlayClick={true}
            onRequestClose={props.onRequestClose}
        >
            <Tabs selected={currentTab} setSelected={props.setTab}>
                <Tab title="Last Context">
                    <>
                        <ContextReportDisplay
                            colors={lastColors}
                            context={lastContext}
                            usedTokens={`(max tokens [${
                                showMax ? modelMaxContextSize(model).toString() : '1024'
                            }]
                    ${
                        currentStoryContent
                            ? ' - output length [' + currentStoryContent.settings.parameters.max_length + ']'
                            : ''
                    }
                    ${
                        (currentStoryContent && currentStoryContent.settings.prefix !== NoModule) ?? false
                            ? ' - AI Module [20]'
                            : ''
                    }
                    ${
                        getUserSetting(session.settings, 'continueGenerationToSentenceEnd')
                            ? ' - continue to sentence end allowance [20]'
                            : ''
                    })`}
                        />

                        <h4 style={{ margin: '20px 0 0' }}>Response:</h4>
                        <TokenizerOutput
                            encoderType={lastResponse.tokenizer}
                            tokenizerText={lastResponse.tokens}
                        />
                    </>
                </Tab>
                <Tab title="Current Context">
                    <OverrideTokenToggle>
                        <div>Max Token Override (does not affect generation):</div>
                        <div>
                            <div>1024</div>
                            <Checkbox
                                label=""
                                hideIcons={true}
                                value={showMax}
                                setValue={(b) => {
                                    setShowMax(b)
                                }}
                            />
                            <div>{modelMaxContextSize(model)}</div>
                        </div>
                    </OverrideTokenToggle>
                    {loading ? (
                        <div>Building Context...</div>
                    ) : (
                        <ContextReportDisplay
                            colors={colors}
                            context={currentContext}
                            usedTokens={`(max tokens [${
                                showMax ? modelMaxContextSize(model).toString() : '1024'
                            }]
                        ${
                            currentStoryContent
                                ? ' - output length [' +
                                  currentStoryContent.settings.parameters.max_length +
                                  ']'
                                : ''
                        }
                        ${
                            (currentStoryContent && currentStoryContent.settings.prefix !== NoModule) ?? false
                                ? ' - AI Module [20]'
                                : ''
                        }
                        ${
                            getUserSetting(session.settings, 'continueGenerationToSentenceEnd')
                                ? ' - continue to sentence end allowance [20]'
                                : ''
                        })`}
                        />
                    )}
                </Tab>
            </Tabs>
        </Modal>
    )
}
function ContextReportDisplay(props: {
    colors: Map<string, string>
    context: ContextReport
    usedTokens?: string
}) {
    const [showNoKey, setShowNoKey] = useState(false)
    const [selectedEntry, setSelectedEntry] = useState('')
    const [selectedSubcontext, setSelectedSubcontext] = useState<ContextReport | undefined>()
    const [subcontextName, setSubcontextName] = useState('')

    if (props.context.output !== props.context.structuredOutput.map((o) => o.text).join('')) {
        throw 'Structured output did not match text output. '
    }
    const session = useRecoilValue(Session)
    const [selectedStage, setSelectedStage] = useState(props.context.stageReports.length - 1)
    let includedIndex = 0
    const stage = props.context.stageReports[selectedStage] ?? new ContextStageReport()
    const nextStage = props.context.stageReports[selectedStage + 1]

    const siteTheme = useRecoilValue(SiteTheme)

    const setLorebookOpen = useSetRecoilState(LorebookOpen)
    const setSelectedLorebookEntry = useSetRecoilState(SelectedLorebookEntry)

    return (
        <>
            <div>
                <div>
                    {props.context.tokens.length} tokens filled out of a maximum of {props.context.maxTokens}{' '}
                    {props.usedTokens}
                </div>
                <ContextBar
                    context={props.context}
                    colors={props.colors}
                    clickPart={(id) => setSelectedEntry((v) => (v === id ? '' : id))}
                />

                <br />

                <StageControls>
                    <Button disabled={selectedStage <= 0} onClick={() => setSelectedStage(selectedStage - 1)}>
                        Previous Stage
                    </Button>
                    <Button
                        disabled={selectedStage + 1 >= props.context.stageReports.length}
                        onClick={() => setSelectedStage(selectedStage + 1)}
                    >
                        Next Stage
                    </Button>

                    <div>
                        <div>
                            Stage {selectedStage}/{props.context.stageReports.length - 1}, Reserved:{' '}
                            {stage.reservedTokens}, Remaining: {stage.remainingTokens}
                        </div>
                    </div>
                </StageControls>
                {stage.description !== '' ? <div>Just: Inserted {stage.description}</div> : <div>&nbsp;</div>}
                {nextStage ? <div>Next: Insert {nextStage.description}</div> : <div>&nbsp;</div>}
                <br />
                <ContextDisplay>
                    <ShownContext>
                        {props.context.preamble.str}
                        {stage.structuredOutput.map((o, i) => {
                            const color = props.colors.get(o.identifier) ?? ''
                            return (
                                <StyledContext
                                    selected={selectedEntry === o.identifier}
                                    color={color}
                                    key={i}
                                    onClick={() => {
                                        if (selectedEntry === o.identifier) {
                                            setSelectedEntry('')
                                        } else {
                                            setSelectedEntry(o.identifier)
                                        }
                                    }}
                                >
                                    {o.text}
                                </StyledContext>
                            )
                        })}
                    </ShownContext>
                    <InvisibleContext>
                        {props.context.preamble.str}
                        {props.context.structuredOutput.map((o, i) => {
                            const color = props.colors.get(o.identifier) ?? ''
                            return (
                                <StyledContext
                                    selected={selectedEntry === o.identifier}
                                    color={color}
                                    key={i}
                                    onClick={() => {
                                        if (selectedEntry === o.identifier) {
                                            setSelectedEntry('')
                                        } else {
                                            setSelectedEntry(o.identifier)
                                        }
                                    }}
                                >
                                    {o.text}
                                </StyledContext>
                            )
                        })}
                    </InvisibleContext>
                </ContextDisplay>
            </div>
            <br />

            <ShowNonActivated>
                <Checkbox
                    label="Show non-activated entries"
                    value={showNoKey}
                    setValue={() => setShowNoKey(!showNoKey)}
                    alternate={true}
                />
            </ShowNonActivated>
            <Modal
                label={`Subcontext: ${subcontextName}`}
                isOpen={selectedSubcontext !== undefined}
                shouldCloseOnOverlayClick={true}
                // eslint-disable-next-line unicorn/no-useless-undefined
                onRequestClose={() => setSelectedSubcontext(undefined)}
            >
                {selectedSubcontext ? (
                    <ContextReportDisplay
                        colors={props.colors}
                        context={selectedSubcontext}
                    ></ContextReportDisplay>
                ) : (
                    <></>
                )}
            </Modal>
            <ReportTable>
                <thead>
                    <tr>
                        <TableHeader>Stage</TableHeader>
                        <TableHeader>Order</TableHeader>

                        <TableHeader>
                            Identifier
                            <Tooltip
                                delay={1}
                                tooltip={`The identifier for the context entry. Lorebook entries will use their display name.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </TableHeader>
                        <TableHeader>
                            Inclusion
                            <Tooltip
                                delay={1}
                                tooltip={`Whether or not the entry was included in the context or not.\
                        A partially included entry is one that was trimmed.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </TableHeader>
                        <TableHeader>
                            Reason
                            <Tooltip
                                delay={1}
                                tooltip={`The reason the entry was included or excluded from the context.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </TableHeader>
                        <TableHeader>
                            Key
                            <Tooltip
                                delay={1}
                                tooltip={`If the entry was included because it was a Lorebook entry activated by\
                                a key the key will be shown here.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </TableHeader>
                        <TableHeader>
                            Reserved
                            <Tooltip
                                delay={1}
                                tooltip={`The number of tokens that were reserved by the entry.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </TableHeader>
                        <TableHeader>
                            Tokens
                            <Tooltip
                                delay={1}
                                tooltip={`The number of tokens that were used by the entry.\
                                \nThe total of this column may not be the same as the length of the resulting context.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </TableHeader>
                        <TableHeader>
                            Trim Type
                            <Tooltip
                                delay={1}
                                tooltip={`How the entry was trimmed to be able to fit it into the context.\
                                \nThe priority used when trimming is no trim > newline > sentence > token.`}
                            >
                                <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                            </Tooltip>
                        </TableHeader>
                    </tr>
                </thead>
                <tbody>
                    {props.context.contextStatuses
                        .filter((s) => {
                            return (
                                showNoKey ||
                                (s.reason != ContextFieldReason.NoKeyTriggered &&
                                    s.reason != ContextFieldReason.Disabled &&
                                    s.reason != ContextFieldReason.EphemeralInactive &&
                                    s.reason != ContextFieldReason.NoActiveEntries)
                            )
                        })
                        .map((s, i) => {
                            if (s.included) {
                                includedIndex++
                            }
                            const stage = includedIndex
                            return (
                                <TableRow
                                    selected={selectedEntry === s.unqiueId}
                                    key={i}
                                    background={i % 2 === 0}
                                    textColor={
                                        getUserSetting(session.settings, 'contextViewerColors') === false
                                            ? siteTheme.colors.textMain
                                            : props.colors.get(s.unqiueId) ?? ''
                                    }
                                    onClick={() => {
                                        if (selectedEntry === s.unqiueId) {
                                            setSelectedEntry('')
                                        } else {
                                            setSelectedEntry(s.unqiueId)
                                        }
                                    }}
                                    stageSelected={selectedStage >= stage}
                                >
                                    <td>
                                        <button
                                            disabled={!s.included}
                                            onClick={(e) => {
                                                setSelectedStage(stage)
                                                e.stopPropagation()
                                            }}
                                        >
                                            {s.included ? includedIndex : '-'}
                                        </button>
                                    </td>
                                    <td>{s.settings.contextConfig.budgetPriority}</td>
                                    <td>
                                        <div>{s.identifier}</div>
                                        {s.subContext ? (
                                            <SubtleButton
                                                onClick={() => {
                                                    setSubcontextName(s.identifier.slice(2))
                                                    setSelectedSubcontext(s.subContext)
                                                }}
                                            >
                                                (Examine)
                                            </SubtleButton>
                                        ) : (
                                            <></>
                                        )}
                                        {s.type === 'lore' && (
                                            <SubtleButton
                                                onClick={() => {
                                                    setSelectedLorebookEntry((s.contextField as LoreEntry).id)
                                                    setLorebookOpen(true)
                                                }}
                                            >
                                                <LinkIcon style={{ height: 10, width: 10 }} />
                                            </SubtleButton>
                                        )}
                                    </td>
                                    <td>{s.state}</td>
                                    <td>{s.reason}</td>
                                    <td>{s.triggeringKey === '' ? '' : s.triggeringKey}</td>
                                    <td>{s.actualReservedTokens}</td>
                                    <td>{s.calculatedTokens}</td>
                                    <td>{s.included === true ? s.trimMethod : ''}</td>
                                </TableRow>
                            )
                        })}
                </tbody>
            </ReportTable>
            <br />
            <div>Included Phrase Bias Groups</div>
            <ReportTable>
                <thead>
                    <tr>
                        <TableHeader>Identifier</TableHeader>
                        <TableHeader>Number of Included Phrase Groups</TableHeader>
                    </tr>
                </thead>
                {props.context.biases.map((b, i) => {
                    const length = b.groups.filter((g) => g.phrases.length > 0).length
                    return length > 0 ? (
                        <tr key={i}>
                            <td>{b.identifier}</td>
                            <td>{length}</td>
                        </tr>
                    ) : (
                        <></>
                    )
                })}
            </ReportTable>
        </>
    )
}

export function EditContextSettings(): JSX.Element {
    const [modalVisible, setModalVisible] = useState(false)

    return (
        <FlexRow>
            <LightColorButton
                style={{ flex: '1 1 50%' }}
                tabIndex={0}
                role="button"
                onClick={() => setModalVisible(true)}
                aria-label="View Last Context"
            >
                <div style={{ margin: '0 auto' }}>Edit Context Settings</div>
            </LightColorButton>
            <Modal
                label="Advanced Context Settings"
                type={ModalType.Compact}
                isOpen={modalVisible}
                onRequestClose={() => setModalVisible(false)}
                shouldCloseOnOverlayClick={true}
            >
                <ContextConfig />
            </Modal>
        </FlexRow>
    )
}

const BarBackground = styled.div`
    width: 100%;
    height: 28px;
    border-radius: 3px;
    background-color: ${(props) => props.theme.colors.bg1};
    overflow: hidden;
    display: flex;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    padding: 1px;
    > {
        width: min-content;
    }
    > :first-child {
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
    }
    > :last-child {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
        border-right: none;
    }
`

const BarContents = styled.div<{ color: string }>`
    overflow: hidden;
    height: 100%;
    background-color: ${(props) => props.color};
    border-right: 1px solid ${(props) => props.theme.colors.bg1};
    box-sizing: border-box;
`

export function ContextBar(props: {
    context: ContextReport
    colors: Map<string, string>
    clickPart?: (id: string) => void
    singleTooltip?: boolean
}): JSX.Element {
    const [referenceElement, setReferenceElement] = useState<any>(null)
    const [popperElement, setPopperElement] = useState<any>(null)
    const [arrowElement, setArrowElement] = useState<any>(null)
    const [hovered, setHovered] = useState<string | undefined>()

    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: 'top',
        modifiers: [
            { name: 'arrow', options: { element: arrowElement } },
            {
                name: 'offset',
                options: {
                    offset: [0, 8],
                },
            },
        ],
    })

    const parts: { tokens: number; id: string; identifier: string }[] = props.context.contextStatuses
        .filter((s) => s.included)
        .map((s) => {
            return {
                tokens: s.calculatedTokens,
                id: s.unqiueId,
                identifier: s.identifier,
            }
        })
        .sort((a, b) => b.tokens - a.tokens)
    const limit = props.context.maxTokens
    const hoveredPart = parts.find((p) => p.id === hovered)

    const partToTipText = (part: { tokens: number; id: string; identifier: string }): JSX.Element => {
        return (
            <span style={{ color: props.colors.get(part.id) ?? 'white' }}>
                {part.identifier}: {part.tokens} tokens ({(((part.tokens ?? 0) / limit) * 100).toFixed(1)}
                %)
            </span>
        )
    }
    return (
        <>
            <BarBackground
                onMouseEnter={(e) => {
                    if (props.singleTooltip) {
                        setReferenceElement(e.currentTarget)
                        setHovered('bar')
                    }
                }}
                onMouseLeave={() => {
                    if (props.singleTooltip) {
                        setReferenceElement(null)
                        setHovered(void 0)
                    }
                }}
            >
                {parts.map((p, i) => {
                    const color = props.colors.get(p.id) ?? '#fff'
                    const element: JSX.Element = (
                        <BarContents
                            key={i}
                            color={color}
                            style={{
                                width: `${(p.tokens / limit) * 100}%`,
                            }}
                            onMouseEnter={(e) => {
                                if (!props.singleTooltip) {
                                    setReferenceElement(e.currentTarget)
                                    setHovered(p.id)
                                }
                            }}
                            onMouseLeave={() => {
                                if (!props.singleTooltip) {
                                    setReferenceElement(null)
                                    setHovered(void 0)
                                }
                            }}
                            onClick={() => {
                                if (props.clickPart) props.clickPart(p.id)
                            }}
                        />
                    )
                    return element
                })}
            </BarBackground>
            {hovered &&
                createPortal(
                    <TooltipMain
                        visible={true}
                        ref={setPopperElement}
                        style={styles.popper}
                        maxWidth={'200px'}
                        {...attributes.popper}
                    >
                        {props.singleTooltip ? (
                            <>
                                {parts.map((p, i) => (
                                    <div key={i}>{partToTipText(p)}</div>
                                ))}
                            </>
                        ) : (
                            <>{hoveredPart && partToTipText(hoveredPart)}</>
                        )}
                        <div ref={setArrowElement} style={styles.arrow} />
                    </TooltipMain>,
                    document.body
                )}
        </>
    )
}
