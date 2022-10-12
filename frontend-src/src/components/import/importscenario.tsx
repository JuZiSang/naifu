import { Fragment, MutableRefObject, useEffect, useMemo, useState, useRef } from 'react'
import styled from 'styled-components'
import { useRecoilValue } from 'recoil'
import {
    extractScenarioPlaceholders,
    ReplacementSet,
    Scenario,
    scenarioToStory,
    scenarioToStoryPreservePlaceholders,
} from '../../data/story/scenario'
import { StoryContainer } from '../../data/story/storycontainer'
import {
    Label,
    ImportStoryStyle,
    Row,
    ImportContainer,
    Title,
    TagContainer,
    InnerRow,
    Description,
    StoryText,
    LeftAlignedRow,
    TitleRow,
    ScrollContainer,
    Spacer,
    ButtonRow,
} from '../../styles/components/import/importstory'
import { Button, InvertedButton, LightColorButton, SubtleButton } from '../../styles/ui/button'
import {
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    BackSendIcon,
    CheckIcon,
    CircleIcon,
    SendIcon,
} from '../../styles/ui/icons'
import { transparentize } from '../../util/colour'
import Tooltip from '../tooltip'
import { StackedIcons } from '../settings/themeeditor'
import { LargeClose } from '../../styles/components/modal'
import { modelDifferenceToast } from '../toasts/modeldifference'
import { Session } from '../../globals/state'
import { modelsCompatible } from '../../util/models'
import { DefaultModel } from '../../data/request/model'
import { getUserSetting } from '../../data/user/settings'

const ReplacedPlaceholder = styled.span<{ colored: boolean }>`
    color: ${(props) => (props.colored ? props.theme.colors.textHeadings : props.theme.colors.textMain)};
    font-weight: bold;
`

interface PlaceholderReplacement {
    text: string
    replaced?: string
    description?: string
    colored?: boolean
}

export function replacePlaceholdersElement(
    text: string,
    replacements: ReplacementSet[],
    selected: number
): Array<JSX.Element> {
    let matches: Array<PlaceholderReplacement> = [
        {
            text,
        },
    ]
    for (const replacementIndex of replacements.keys()) {
        const replacement = replacements[replacementIndex]
        matches = matches.flatMap((match) => {
            if (match.replaced) return [match]
            const results = new Array<PlaceholderReplacement>()
            const extractedPlaceholders = match.text.matchAll(/\${([^:[\]{|}]+)}/g)
            let offset = 0
            let sliceText = match.text
            for (const placeholder of extractedPlaceholders) {
                if (placeholder.index === undefined) continue
                if (placeholder[1] !== replacement.key) continue
                results.push(
                    {
                        text: sliceText.slice(0, placeholder.index - offset),
                    },
                    {
                        text: replacement.replacement,
                        replaced: sliceText.slice(
                            placeholder.index - offset,
                            placeholder.index - offset + placeholder[0].length
                        ),
                        description: replacement.description ?? replacement.key,
                        colored: selected === replacementIndex,
                    }
                )
                sliceText = sliceText.slice(placeholder.index - offset + placeholder[0].length)
                offset += placeholder.index - offset + placeholder[0].length
            }
            results.push({ text: sliceText })
            return results.length > 0 ? results : [match]
        })
    }
    return matches.map((match, i) => {
        if (match.replaced) {
            return (
                <Tooltip key={i} tooltip={match.description ?? match.replaced} delay={500}>
                    <ReplacedPlaceholder data-set={match.colored ?? false} colored={match.colored ?? false}>
                        {match.text}
                    </ReplacedPlaceholder>
                </Tooltip>
            )
        }
        return <Fragment key={i}>{match.text}</Fragment>
    })
}

const CloseButton = styled(LargeClose)`
    position: absolute;
    right: 15px;
    top: 15px;

    > div {
        width: 2rem;
        height: 2rem;
    }
    flex: 0 0 auto;

    z-index: 1;
`

const Author = styled.div`
    opacity: 0.7;
    margin-bottom: 10px;
    font-weight: 600;
`

const BackButton = styled(SubtleButton)`
    display: flex;
    align-items: center;
    font-size: 0.875rem !important;
    > div {
        height: 0.625rem;
        width: 0.625rem;
        margin-right: 6px;
    }
`

export function ImportScenario(props: {
    importedScenario: Scenario
    useStartText?: boolean
    onClickImport: (story: StoryContainer) => void
    close: () => void
    perspectiveButtons?: JSX.Element
    backButton?: boolean
}): JSX.Element {
    const [state, setState] = useState(0)
    const [placeholders, setPlaceholders] = useState<ReplacementSet[]>([])
    const importedScenario = props.importedScenario
    const session = useRecoilValue(Session)
    const buildScenario = (placeholders: ReplacementSet[]) => {
        const newStory = scenarioToStory(
            importedScenario,
            placeholders,
            getUserSetting(session.settings, 'useEditorV2')
        )

        props.onClickImport(newStory)
    }

    const buildScenarioWithPlaceholders = () => {
        const newStory = scenarioToStoryPreservePlaceholders(
            importedScenario,
            importedScenario.placeholders,
            getUserSetting(session.settings, 'useEditorV2')
        )
        props.onClickImport(newStory)
    }

    useEffect(() => {
        if (importedScenario.placeholders.length === 0) {
            extractScenarioPlaceholders(importedScenario)
        }

        setPlaceholders(
            importedScenario.placeholders
                .sort((a, b) => {
                    const aNum = a.order ?? Number.POSITIVE_INFINITY
                    const bNum = b.order ?? Number.POSITIVE_INFINITY
                    if (aNum !== bNum) {
                        return aNum - bNum
                    }
                    return a.key.localeCompare(b.key)
                })
                .map((p) => {
                    return {
                        key: p.key,
                        replacement: p.defaultValue ?? '',
                        description: p.description,
                        longDescription: p.longDescription,
                    }
                })
        )
    }, [importedScenario])

    switch (state) {
        case 0:
            return (
                <ImportStoryStyle>
                    <CloseButton aria-label="Close Modal" onClick={props.close}>
                        <div />
                    </CloseButton>
                    <TitleRow>
                        {props.backButton && (
                            <BackButton onClick={props.close}>
                                <ArrowLeftIcon /> Back to Scenarios
                            </BackButton>
                        )}
                    </TitleRow>
                    <TitleRow>
                        <Title>{importedScenario.title}</Title>
                    </TitleRow>
                    {!props.importedScenario.author ? (
                        <></>
                    ) : (
                        <LeftAlignedRow>
                            <Author> by {props.importedScenario.author}</Author>
                        </LeftAlignedRow>
                    )}

                    <ScrollContainer>
                        <Row>
                            <InnerRow>
                                <Description>{importedScenario.description}</Description>
                            </InnerRow>
                        </Row>
                        <Row>
                            <InnerRow>
                                <TagContainer>
                                    {importedScenario.tags.map((tag, index) => {
                                        return <span key={index}>{tag}</span>
                                    })}
                                </TagContainer>
                            </InnerRow>
                        </Row>
                        <Spacer />
                        <Row>
                            <div>
                                <Label>Prompt</Label>
                                <StoryText>{importedScenario.prompt}</StoryText>
                            </div>
                        </Row>
                    </ScrollContainer>
                    <ButtonRow>
                        <div>{props.perspectiveButtons}</div>
                        <ImportContainer>
                            {importedScenario.placeholders.length > 0 ? (
                                <LightColorButton onClick={buildScenarioWithPlaceholders}>
                                    {'Keep Placeholders'}
                                </LightColorButton>
                            ) : (
                                <div />
                            )}
                            <InvertedButton
                                onClick={() => {
                                    if (importedScenario.placeholders.length > 0) {
                                        setState(1)
                                    } else {
                                        if (
                                            !modelsCompatible(
                                                props.importedScenario.settings.model,
                                                getUserSetting(session.settings, 'defaultModel') ??
                                                    DefaultModel
                                            )
                                        ) {
                                            modelDifferenceToast(
                                                session,
                                                props.importedScenario.settings.model,
                                                true
                                            )
                                        }

                                        buildScenario(placeholders)
                                    }
                                }}
                            >
                                {props.importedScenario.placeholders.length > 0
                                    ? 'Fill Placeholders'
                                    : props.useStartText
                                    ? 'Start'
                                    : 'Import'}
                            </InvertedButton>
                        </ImportContainer>
                    </ButtonRow>
                </ImportStoryStyle>
            )
        case 1:
            return (
                <>
                    <PlaceholderModal
                        placeholders={placeholders}
                        text={importedScenario.prompt}
                        confirmPlaceholders={(p) => {
                            if (
                                !modelsCompatible(
                                    props.importedScenario.settings.model,
                                    getUserSetting(session.settings, 'defaultModel')
                                )
                            ) {
                                modelDifferenceToast(session, props.importedScenario.settings.model, true)
                            }
                            buildScenario(p)
                        }}
                    />
                    <CloseButton aria-label="Close Modal" onClick={props.close}>
                        <div />
                    </CloseButton>
                </>
            )
        default:
            return <></>
    }
}

const PlaceholderModalSplit = styled.div`
    background: ${(props) => props.theme.colors.bg2};
    color: ${(props) => props.theme.colors.textMain};
    font-size: 0.875rem;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 540px;
    max-height: 590px;
    height: max-content;
    padding-top: 30px;
    padding-bottom: 20px;
    > :first-child {
        font-weight: 600;
        display: flex;
        border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
        flex-direction: column;
        justify-content: space-between;
    }
    > :last-child {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 0px 30px;

        @media (max-width: 420px) {
            padding: 0px 20px;
        }
    }

    @media (max-width: 800px) {
        max-height: 100%;
        height: 100%;
    }
`

const EnterAValueText = styled.div`
    font-size: 0.875rem;
    margin-top: 20px;
`

const PlaceholderSelection = styled.div`
    margin-top: 10px;
    display: flex;
    flex-direction: row;
    overflow-x: scroll;
    > button {
        &:first-child {
            margin-left: 30px;
        }
        margin-right: 10px;
        &:last-child {
            margin-right: 30px;
        }
    }
`

const PlaceholderButton = styled(SubtleButton)<{ selected: boolean; set: boolean }>`
    padding: 8px 10px 8px 20px;
    background: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.bg1)};
    color: ${(props) =>
        props.set
            ? transparentize(0.3, props.theme.colors.textMain)
            : props.selected
            ? props.theme.colors.textHeadings
            : props.theme.colors.textMain};
    text-align: center;
    display: flex;
    min-height: 34px;
    > :first-child {
        white-space: pre;
        text-overflow: ellipsis;
        overflow: hidden;
    }
    > :last-child {
        width: 14px;
        margin-left: 5px;
    }
    align-items: center;
    max-width: 211px;
`

const PlaceholderNavigation = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    > :last-child {
        display: grid;
        grid-template-columns: auto auto auto auto;
        gap: 10px;
        align-items: center;

        > :nth-child(1) {
            padding: 6px 10px 6px 8px;
            > div {
                height: 12px;
                width: 6px;
            }
        }

        > :nth-child(3) {
            padding: 6px 8px 6px 10px;
            > div {
                height: 12px;
                width: 6px;
            }
        }
    }
`

const PlaceHolderInputRow = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    padding: 20px 0 0 0;

    button:first-child {
        margin-right: 20px;
        @media (max-width: 420px) {
            margin-right: 10px;
        }
    }

    button:last-child {
        margin-left: 20px;

        @media (max-width: 420px) {
            margin-left: 10px;
        }
    }
`

const PlaceholderInfo = styled.div`
    overflow: auto;
    display: flex;
    flex-direction: column;
`

const PlaceholderTitle = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1rem;
    margin-bottom: 20px;
    padding-left: 30px;
`

const PlaceholderName = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.125rem;
    color: ${(props) => props.theme.colors.textHeadings};
    font-weight: bold;
    line-height: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;

    > div {
        white-space: pre;
        overflow: hidden;
        text-overflow: ellipsis;
        // Should be replaced with line-clamp when/if it becomes availiable
        // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
    }
    button {
        margin-left: 4px;
        flex: 0 0 auto;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        font-family: ${(props) => props.theme.fonts.default};
        color: ${(props) => props.theme.colors.textMain};
        opacity: 0.7;
        div {
            margin-left: 5px;
            background-color: ${(props) => props.theme.colors.textMain};
            height: 6px;
        }
    }
`
const PlaceholderDescription = styled.div<{ clamp: boolean }>`
    font-size: 0.813rem;
    overflow-y: auto;
    white-space: pre-wrap;
    line-height: 1.178rem;
    height: ${(props) => (props.clamp ? '2.356' : '4.712')}rem;
    ${(props) =>
        props.clamp
            ? `
    overflow: hidden;
    text-overflow: ellipsis;
    // Should be replaced with line-clamp when/if it becomes availiable
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;`
            : ''};

    text-overflow: ellipsis;
`

const PromptAreaWrap = styled.div`
    position: relative;
    margin-top: 10px;
    &::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        pointer-events: none;
        background: linear-gradient(
            to bottom,
            ${(props) => props.theme.colors.bg3} 0%,
            ${(props) => props.theme.colors.bg3} 5%,
            transparent 15%,
            transparent 85%,
            ${(props) => props.theme.colors.bg3} 95%,
            ${(props) => props.theme.colors.bg3} 100%
        );
    }
`
const PromptArea = styled.div`
    background: ${(props) => props.theme.colors.bg3};
    flex-grow: 1;
    padding: 12px 20px;
    position: relative;
    overflow-y: auto;
    white-space: pre-wrap;
    > div {
        display: inline;
    }
    max-height: 170px;
`
const SelectContainerContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    > :first-child {
        flex: 1 1 0;
    }
    > :last-child {
        flex: 0 0 auto;
        font-size: 1rem;
        font-weight: bold;
        padding-left: 15px;
        padding-right: 39px;
        margin-bottom: 5px;
    }
`

export function PlaceholderModal(props: {
    placeholders: ReplacementSet[]
    text: string
    confirmPlaceholders: (placeholders: ReplacementSet[]) => void
}): JSX.Element {
    const [placeholders, setPlaceholders] = useState<ReplacementSet[]>(props.placeholders)
    const [selectedPlaceholder, setSelectedPlaceholder] = useState(0)
    const promptRef: MutableRefObject<HTMLDivElement | null> = useRef(null)
    const inputRef: MutableRefObject<HTMLInputElement | null> = useRef(null)
    const placeholderContainerRef: MutableRefObject<HTMLDivElement | null> = useRef(null)
    const [focusedPlaceholder, setFocusedPlaceholder] = useState(0)

    const [valueInput, setValueInput] = useState('')
    const [promptElement, setPromptElement] = useState([<></>])
    const [placeholderElements, setPlaceholderElements] = useState<HTMLSpanElement[]>([])
    const shouldScroll = useRef(true)
    const scroll = useRef(false)
    const [touched, setTouched] = useState<boolean[]>([])

    useEffect(() => {
        const tempPlaceholders: ReplacementSet[] = JSON.parse(JSON.stringify(placeholders))
        for (const [index, placeholder] of tempPlaceholders.entries()) {
            if (placeholder.replacement === '') {
                tempPlaceholders[index].replacement = '${' + placeholder.key + '}'
            }
        }
        setPromptElement(replacePlaceholdersElement(props.text, tempPlaceholders, selectedPlaceholder))
    }, [props.text, placeholders, selectedPlaceholder, valueInput])

    useEffect(() => {
        if (scroll.current && placeholderElements[0]) {
            scroll.current = false

            setTimeout(() => {
                placeholderElements[0].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                })
            }, 1)
            const placeholdersContainer = placeholderContainerRef.current?.querySelectorAll('button')
            if (placeholdersContainer && placeholdersContainer[selectedPlaceholder])
                placeholderContainerRef.current?.scroll({
                    left: placeholdersContainer[selectedPlaceholder].offsetLeft - 30,
                    behavior: 'smooth',
                })
        }
    }, [placeholderElements, selectedPlaceholder])

    useEffect(() => {
        if (promptRef.current) {
            const elements = [...promptRef.current.querySelectorAll('span[data-set="true"]')]
            setPlaceholderElements(elements as HTMLSpanElement[])
        }
        if (shouldScroll.current) {
            scroll.current = true
            shouldScroll.current = false
        }
    }, [promptElement])

    useEffect(() => {
        setPlaceholders(props.placeholders)
        setTouched(Array.from({ length: props.placeholders.length }))
    }, [props.placeholders])

    const placeholder = useMemo<ReplacementSet | undefined>(() => {
        return placeholders[selectedPlaceholder]
    }, [placeholders, selectedPlaceholder])

    useEffect(() => {
        setValueInput(placeholder?.replacement ?? '')
    }, [placeholder, selectedPlaceholder])

    const nextPlaceholder = () => {
        const tempTouched = [
            ...touched.slice(0, selectedPlaceholder),
            true,
            ...touched.slice(selectedPlaceholder + 1),
        ]
        setTouched(tempTouched)
        const startingPoint = selectedPlaceholder
        let next = selectedPlaceholder
        do {
            next++
            if (next >= placeholders.length) {
                next = 0
            }
            if (next === startingPoint) {
                props.confirmPlaceholders(placeholders)
                return
            }
        } while (tempTouched[next])
        shouldScroll.current = true
        setSelectedPlaceholder(next)
        inputRef.current?.focus()
    }
    const lastPlaceholder = () => {
        shouldScroll.current = true
        setSelectedPlaceholder((v) => {
            return Math.max(0, --v)
        })
        inputRef.current?.focus()
    }

    const [clampDescription, setClampDescription] = useState(true)

    return (
        <PlaceholderModalSplit>
            <div>
                <div>
                    <PlaceholderTitle>Placeholder Input</PlaceholderTitle>
                    <SelectContainerContainer>
                        <PlaceholderSelection ref={placeholderContainerRef}>
                            {placeholders.map((p, i) => {
                                return (
                                    <PlaceholderButton
                                        set={touched[i]}
                                        onClick={() => {
                                            setSelectedPlaceholder(i)
                                            inputRef.current?.focus()
                                            shouldScroll.current = true
                                        }}
                                        key={i}
                                        selected={selectedPlaceholder === i}
                                    >
                                        <div>{p.description ?? p?.key}</div>
                                        {touched[i] ? (
                                            <StackedIcons>
                                                <CircleIcon />
                                                <CheckIcon />
                                            </StackedIcons>
                                        ) : (
                                            <div></div>
                                        )}
                                    </PlaceholderButton>
                                )
                            })}
                        </PlaceholderSelection>
                        <div>
                            {selectedPlaceholder + 1}/{props.placeholders.length}
                        </div>
                    </SelectContainerContainer>
                </div>
            </div>
            <div>
                <PlaceholderInfo>
                    <EnterAValueText>Enter a value for</EnterAValueText>
                    <PlaceholderName>
                        <div>{placeholder?.description ?? placeholder?.key}</div>
                        <SubtleButton onClick={() => setClampDescription((v) => !v)}>
                            Desc{clampDescription ? <ArrowDownIcon /> : <ArrowUpIcon />}
                        </SubtleButton>
                    </PlaceholderName>
                    <PlaceholderDescription clamp={clampDescription}>
                        {placeholder?.longDescription ?? ''}
                    </PlaceholderDescription>
                    <PlaceholderNavigation>
                        <div>Context</div>
                        <div>
                            <LightColorButton
                                disabled={placeholderElements.length <= 1}
                                onClick={() => {
                                    if (placeholderElements.length <= 1) return
                                    setFocusedPlaceholder((v) => {
                                        const n = v - 1 < 0 ? placeholderElements.length - 1 : v - 1
                                        placeholderElements[n].scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center',
                                        })
                                        return n
                                    })
                                }}
                            >
                                <ArrowLeftIcon />
                            </LightColorButton>
                            <div>{`${Math.max(focusedPlaceholder + 1, placeholderElements.length)}/${
                                placeholderElements.length
                            }`}</div>
                            <LightColorButton
                                disabled={placeholderElements.length <= 1}
                                onClick={() => {
                                    if (placeholderElements.length <= 1) return
                                    setFocusedPlaceholder((v) => {
                                        const n = v + 1 >= placeholderElements.length ? 0 : v + 1
                                        placeholderElements[n].scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center',
                                        })
                                        return n
                                    })
                                }}
                            >
                                <ArrowRightIcon />
                            </LightColorButton>
                        </div>
                    </PlaceholderNavigation>
                    <PromptAreaWrap>
                        <PromptArea ref={promptRef}>{promptElement}</PromptArea>
                    </PromptAreaWrap>
                </PlaceholderInfo>
                <PlaceHolderInputRow>
                    <Button onClick={lastPlaceholder} disabled={selectedPlaceholder === 0} aria-label="Back">
                        <BackSendIcon />
                    </Button>

                    <input
                        ref={inputRef}
                        type="text"
                        autoCorrect={'off'}
                        autoCapitalize={'off'}
                        value={valueInput}
                        onChange={(e) => {
                            setPlaceholders([
                                ...placeholders.slice(0, selectedPlaceholder),
                                { ...placeholders[selectedPlaceholder], replacement: e.target.value },
                                ...placeholders.slice(selectedPlaceholder + 1),
                            ])
                            setValueInput(e.target.value)
                        }}
                        onKeyDown={(e) => {
                            if (e.key == 'Enter') nextPlaceholder()
                        }}
                    />
                    <Button onClick={nextPlaceholder}>
                        {touched.filter((b) => b === undefined).length > 1 ? 'Next' : 'Start'} <SendIcon />
                    </Button>
                </PlaceHolderInputRow>
            </div>
        </PlaceholderModalSplit>
    )
}
