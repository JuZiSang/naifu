import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { MdHelpOutline } from 'react-icons/md'
import { createFilter } from 'react-select'
import styled from 'styled-components'
import { isInvalidRegexKey, LoreEntry } from '../../../data/ai/loreentry'
import { GlobalUserContext } from '../../../globals/globals'
import {
    GenerationRequestActive,
    IPLimitModal,
    LastResponse,
    LorebookGenerateClipboard,
    LorebookGeneratedExpanded,
    LorebookGenerateKeysInput,
    LorebookGenerateOpen,
    SelectedStory,
    Session,
    SettingsModalOpen,
    SiteTheme,
    StoryUpdate,
    TokenizerOpen,
    TokenizerText,
    TrialUsageRemaining,
    TrialUsedModal,
    TutorialState,
    UserPresets,
} from '../../../globals/state'
import {
    LorebookEditorKeys,
    LorebookEditorKeyDisplay,
    TokenCount,
    KeyPill,
    PillDelete,
    KeyPillText,
    Label,
    KeyDisplayContainer,
    GenerateArea,
    GenerateToggle,
    LightOnIcon,
    LightOffIcon,
    GenerateError,
    GenerateContextLabel,
    AddContextContainer,
    HistoryItems,
    Description,
    MinorLabel,
    LorebookKeyContainer,
    HistoryTitle,
    HistoryBody,
    KeyFiller,
} from '../../../styles/components/lorebook'
import {
    CrossMidIcon,
    SendIcon,
    PlusIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ReloadIcon,
    LinkIcon,
} from '../../../styles/ui/icons'
import { WorkerInterface } from '../../../tokenizer/interface'
import { Button, LightColorButton, SubtleButton } from '../../../styles/ui/button'
import { AltCheckbox } from '../../controls/checkbox'
import Tooltip from '../../tooltip'
import { getDropdownStyle, getDropdownTheme, Select } from '../../controls/select'
import { getGenerationRequest } from '../../../data/request/request'
import { trimResponse } from '../../../data/ai/processresponse'
import { LoadingBar } from '../../../styles/components/conversation'
import Modal, { ModalType } from '../../modals/modal'
import { TutorialStates } from '../../tutorial'
import { getModelEncoderType } from '../../../tokenizer/encoder'
import { DefaultModel } from '../../../data/request/model'
import { modelMaxContextSize } from '../../../data/ai/model'
import { getLocalStorage, setLocalStorage } from '../../../util/storage'
import { getAccountContextLimit, subscriptionIsActive } from '../../../util/subscription'
import { addKeyToEntry } from '../lorebookeditarea'
import { FlexCol, FlexColSpacer, FlexRow } from '../../../styles/ui/layout'
import { getModelLoreGenPresets, getModelPresets } from '../../../data/story/defaultpresets'
import {
    buildLegacyLoreGenContext,
    buildLoreGenContext,
    prepareLegacyLoreGenSettings,
    prepareLoreGenSettings,
} from '../loregen/loregencontext'
import { EditorCardHint } from '../../../styles/ui/editorcard'
import { SettingsPages } from '../../settings/constants'
import { getUserSetting } from '../../../data/user/settings'

const placeholders = new Map<string, string>([
    ['general', 'an ancient ruin, a punk band, The Vindicator, Morl (insect), Nia (diety, forge)...'],
    ['person', 'a notable astronomer, Melisande (princess, magical)...'],
    ['place', 'a cursed mansion, Verel-4 (planet, toxic)...'],
    ['object', 'a robot designed to be used for cleaning, The Rhapsody (airship, retired)...'],
    ['life', 'a species of giant insects, Neurastria (aquatic, parasite)...'],
    ['faction', 'a holy order, The Atalantia Corporation (military, futuristic)...'],
    ['occupation', 'a person who synthesises novel materials, Scrivener (spells, arcane)...'],
    ['concept', "a fundamental law of magic,  Scrivener's Plague (occult, disease)..."],
    ['event', 'a recurring festival, Battle of Ryris (coup, demons)...'],
])

const TypeOptions = [
    { name: 'General', val: 'general' },
    { name: 'Person', val: 'person' },
    { name: 'Place', val: 'place' },
    { name: 'Thing', val: 'object' },
    { name: 'Life', val: 'life' },
    { name: 'Faction', val: 'faction' },
    { name: 'Role', val: 'occupation' },
    { name: 'Concept', val: 'concept' },
    { name: 'History', val: 'event' },
]
const entryInputs = new Map<string, string>([])
const entryLastInputs = new Map<string, string>([])
const entryLastOutputs = new Map<string, string>([])
let generationHistory: string[][] = []

export function LorebookTabEntry(props: {
    entry: LoreEntry | null
    setDisplayNameInput: (name: string) => void
    save: () => void
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryMetadata = GlobalUserContext.stories.get(selectedStory.id)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const setStoryUpdate = useSetRecoilState(StoryUpdate(''))
    const [keyInput, setKeyInput] = useState('')
    const [currentEditKey, setCurrentEditKey] = useState(-1)
    const keyInputRef = useRef<HTMLInputElement>(null)
    const session = useRecoilValue(Session)

    const addKey = (key: string) => {
        if (!props.entry || !currentStoryMetadata) {
            return
        }
        addKeyToEntry(key, props.entry, props.save, props.setDisplayNameInput)
    }

    const editKey = (key: string, index: number) => {
        if (!props.entry || !currentStoryMetadata) {
            return
        }
        if (!props.entry.keys.includes(key) && key !== '') {
            props.entry.keys[index] = key
            props.entry.lastUpdatedAt = new Date()
            props.save()
        } else if (key !== props.entry.keys[index]) {
            props.entry.keys = [...props.entry.keys.slice(0, index), ...props.entry.keys.slice(index + 1)]
            props.save()
        }
    }

    const removeKey = (index: number) => {
        if (props.entry && currentStoryMetadata) {
            props.entry.keys = [...props.entry.keys.slice(0, index), ...props.entry.keys.slice(index + 1)]
            props.entry.lastUpdatedAt = new Date()
            props.save()
        }
    }

    const handleKeySubmit = () => {
        if (currentEditKey >= 0) {
            editKey(keyInput, currentEditKey)
            setCurrentEditKey(-1)
        } else {
            addKey(keyInput)
        }
        setKeyInput('')
    }

    const categoryOptions: any = []
    categoryOptions.push({
        value: '',
        description: 'No Category',
        label: <div>No Category</div>,
    })

    for (const category of currentStoryContent?.lorebook.categories ?? []) {
        categoryOptions.push({
            value: category.id,
            description: category.name === '' ? 'Unnamed Category' : category.name,
            label: category.name === '' ? 'Unnamed Category' : category.name,
        })
    }

    const selectedCategory = currentStoryContent?.lorebook.categories.find(
        (c) => c.id === props.entry?.category
    )

    const setCategory = (category: string) => {
        if (props.entry && currentStoryMetadata) {
            props.entry.category = category
            props.entry.lastUpdatedAt = new Date()
            setStoryUpdate(currentStoryMetadata.save())
        }
    }

    const [forceInput, setForceInput] = useState(false)
    const setForceActivation = (state: boolean) => {
        if (props.entry && currentStoryMetadata) {
            setForceInput(state)
            props.entry.forceActivation = state
            props.save()
        }
    }

    useEffect(() => {
        if (!props.entry) {
            setForceInput(false)
            return
        }
        setForceInput(props.entry.forceActivation)
    }, [props.entry])

    const siteTheme = useRecoilValue(SiteTheme)

    return (
        <>
            <LoreGeneratorTextInput entry={props.entry} save={props.save} />
            <FlexColSpacer min={30} max={30} />
            <LorebookEditorKeys className={'lorebook-keys'}>
                <FlexRow style={{ flexWrap: 'wrap-reverse' }}>
                    <FlexCol style={{ width: 'auto' }}>
                        <FlexRow style={{ width: 'auto', flex: '0 0 auto' }}>
                            <Label>Activation Keys</Label>
                            <Tooltip
                                delay={1}
                                tooltip={`A Lorebook entry is activated and its text placed in context whenever \
                                        one of its keys is found in the recent story. Keys are case-insensitive.\
                                        \nKeys that begin and end with '/' are evaluated as regex. These regex keys\
                                        are case-sensitive and support the following flags: i, s, m, and u.`}
                            >
                                <MdHelpOutline
                                    style={{
                                        opacity: 0.3,
                                        marginLeft: '0.3rem',
                                    }}
                                />
                            </Tooltip>{' '}
                        </FlexRow>
                        <Description>Activates the entry when found within the recent story.</Description>
                    </FlexCol>
                    <AltCheckbox
                        style={{ marginLeft: 'auto' }}
                        value={forceInput}
                        setValue={() => {
                            setForceActivation(!forceInput)
                        }}
                        disabled={props.entry === null}
                        text={'Always On'}
                        label={'Always On'}
                    />
                </FlexRow>
                <FlexColSpacer min={5} max={5} />
                <LorebookKeyContainer
                    style={{
                        opacity: props.entry?.forceActivation ? '0.5' : '1',
                    }}
                >
                    <FlexRow style={{ minHeight: 44 }}>
                        <input
                            style={{ minHeight: 44 }}
                            ref={keyInputRef}
                            disabled={props.entry === null}
                            placeholder={
                                currentEditKey >= 0 ? '' : 'Type a key here and hit enter to save it'
                            }
                            type="text"
                            value={keyInput}
                            onChange={(e) => {
                                setKeyInput(e.target.value)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleKeySubmit()
                                }
                            }}
                        ></input>
                        <LightColorButton
                            style={{ minHeight: 44 }}
                            aria-label={'save key'}
                            disabled={props.entry === null}
                            onClick={handleKeySubmit}
                        >
                            <PlusIcon></PlusIcon>
                        </LightColorButton>
                    </FlexRow>
                    <KeyDisplayContainer>
                        {(props.entry?.keys ?? []).length === 0 ? (
                            <KeyFiller>No Keys set.</KeyFiller>
                        ) : (
                            <LorebookEditorKeyDisplay>
                                <>
                                    <FlexRow style={{ fontSize: '0.875rem', marginBottom: '10px' }}>
                                        <span>Keys </span>
                                        <span style={{ opacity: 0.7 }}>
                                            {currentEditKey >= 0
                                                ? 'Press enter to save edit'
                                                : 'Select a key to edit it'}
                                        </span>
                                    </FlexRow>
                                    {props.entry ? (
                                        props.entry.keys.map((key, index) => {
                                            return (
                                                <KeyPill key={index}>
                                                    <KeyPillText
                                                        tabIndex={0}
                                                        selected={currentEditKey === index}
                                                        error={isInvalidRegexKey(key)}
                                                        onClick={() => {
                                                            if (currentEditKey === index) {
                                                                setCurrentEditKey(-1)
                                                                setKeyInput('')
                                                            } else {
                                                                setKeyInput(key)
                                                                setCurrentEditKey(index)
                                                                if (keyInputRef.current)
                                                                    keyInputRef.current.focus()
                                                            }
                                                        }}
                                                    >
                                                        {key}
                                                    </KeyPillText>
                                                    {currentEditKey === index ? (
                                                        <PillDelete
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                removeKey(index)
                                                                setCurrentEditKey(-1)
                                                                setKeyInput('')
                                                                e.stopPropagation()
                                                            }}
                                                            key={index}
                                                        >
                                                            <CrossMidIcon />
                                                        </PillDelete>
                                                    ) : (
                                                        <></>
                                                    )}
                                                </KeyPill>
                                            )
                                        })
                                    ) : (
                                        <></>
                                    )}
                                </>
                            </LorebookEditorKeyDisplay>
                        )}
                    </KeyDisplayContainer>
                </LorebookKeyContainer>
            </LorebookEditorKeys>
            <FlexColSpacer min={20} max={20} />
            <Label>Category</Label>
            <FlexColSpacer min={5} max={5} />
            <div style={{ marginLeft: 1, maxWidth: '300px' }}>
                <Select
                    custom={!getUserSetting(session.settings, 'legacyLoreGen')}
                    menuPlacement="top"
                    aria-label="Select a lorebook category"
                    maxMenuHeight={420}
                    options={categoryOptions}
                    isSearchable={true}
                    filterOption={createFilter({
                        ignoreCase: true,
                        ignoreAccents: true,
                        trim: true,
                        matchFrom: 'any',
                        stringify: (option) => `${option.label}`,
                    })}
                    onChange={(e) => {
                        if (e !== null) {
                            setCategory(e.value)
                        }
                    }}
                    value={{
                        value: selectedCategory?.id ?? '',
                        description:
                            (selectedCategory?.name ?? 'No Category') === ''
                                ? 'Unnamed Category'
                                : selectedCategory?.name ?? 'No Category',

                        label:
                            (selectedCategory?.name ?? 'No Category') === ''
                                ? 'Unnamed Category'
                                : selectedCategory?.name ?? 'No Category',
                    }}
                    styles={getDropdownStyle(siteTheme)}
                    theme={getDropdownTheme(siteTheme)}
                />
            </div>
        </>
    )
}

function LoreGeneratorTextInput(props: { entry: LoreEntry | null; save: () => void }) {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory.id)
    const [lastGenerationInput, setLastGenerationInput] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [showHistoryModal, setShowHistoryModel] = useState(false)
    const [addContextShown, setAddContextShown] = useRecoilState(LorebookGeneratedExpanded)
    const session = useRecoilValue(Session)
    const tutorialState = useRecoilValue(TutorialState)
    const [generateShown, setGenerateShown] = useRecoilState(LorebookGenerateOpen)
    const [entryTokenCount, setEntryTokenCount] = useState(0)
    const generateTextBox = useRef<HTMLInputElement>(null)
    const setLastResponse = useSetRecoilState(LastResponse)
    const [generateInput, setGenerateInput] = useState('')
    const [inputIsRandom, setInputIsRandom] = useState(false)
    const [keysInput, setKeysInput] = useRecoilState(LorebookGenerateKeysInput)
    const [useMemory, setUseMemory] = useState(() => getLocalStorage('lorebookGenerateUseMemory') === 'true')
    const [useAuthorsNote, setUseAuthorsNote] = useState(
        () => getLocalStorage('lorebookGenerateUseAuthorsNote') === 'true'
    )
    const [useStory, setUseStory] = useState(() => getLocalStorage('lorebookGenerateUseStory') === 'true')

    const processingGeneration = useRef<boolean>(false)
    const setSettingsModalOpen = useSetRecoilState(SettingsModalOpen)
    let group = useMemo(() => getLocalStorage('selectedGenerationGroup'), [])

    if (group === null) {
        group = 'General'
    }

    const [loreGenerate, setLoreGenerate] = useRecoilState(LorebookGenerateClipboard)

    const [generationGroup, setGenerationGroup] = useState<string>(group)

    const [generationRequestActive, setGenerationRequestActive] = useRecoilState(GenerationRequestActive)
    const [trialUsage, setTrialUsage] = useRecoilState(TrialUsageRemaining)
    const setModalOpen = useSetRecoilState(TrialUsedModal)
    const setIPLimitModal = useSetRecoilState(IPLimitModal)
    const setTokenizerText = useSetRecoilState(TokenizerText)
    const setTokenizerOpen = useSetRecoilState(TokenizerOpen)
    const userPresets = useRecoilValue(UserPresets)

    const loreText = props.entry === null ? '' : props.entry.text
    useEffect(() => {
        if (!currentStoryContent || props.entry === null) {
            return
        }
        const encoderType = getModelEncoderType(currentStoryContent.settings.model)

        new WorkerInterface().encode(loreText, encoderType).then((encoded) => {
            setEntryTokenCount(encoded.length)
        })
    }, [props.entry, loreText, currentStoryContent?.settings.model, currentStoryContent])

    const [textInput, setTextInput] = useState('')
    const setText = useCallback(
        (text: string) => {
            if (props.entry) {
                setTextInput(text)
                props.entry.text = text
                props.entry.lastUpdatedAt = new Date()
                props.save()
            }
        },
        [props]
    )
    useEffect(() => {
        if (generateShown && generateTextBox !== null && generateTextBox.current !== null)
            generateTextBox.current.focus()
    }, [generateShown])

    const generateLoreEntry = useCallback(
        async (type: string = 'continue', text: string = generateInput, group: string = generationGroup) => {
            try {
                if (!subscriptionIsActive(session.subscription) && trialUsage === 0) {
                    setModalOpen(true)
                    return
                }
                setErrorMessage('')
                if (!currentStoryContent || props.entry === null) return
                setGenerationRequestActive(true)
                let stub = ''
                if (type === 'reset') {
                    // nothing
                }
                if (type === 'continue') {
                    stub = textInput
                    setInputIsRandom(false)
                }
                if (type === 'retry') {
                    stub = entryLastOutputs.get(props.entry.id) ?? textInput
                    if (textInput === '') stub = ''
                    if (inputIsRandom) {
                        setGenerateInput('')
                        text = ''
                    }
                }

                const matchSpaces = stub.match(/ +$/)
                let spaces = 0
                if (matchSpaces && matchSpaces[0]) {
                    spaces = matchSpaces[0].length
                }
                if (spaces > 0) {
                    stub = stub.slice(0, -1 * spaces)
                }
                setTextInput(stub)
                const model = getUserSetting(session.settings, 'loreGenModel')
                const encoderType = getModelEncoderType(model)

                const encodedStub = await new WorkerInterface().encode(stub, encoderType)
                const notEarlyGeneration = encodedStub.length > 60 && type !== 'reset'

                if (type !== 'reset' && stub !== '' && !notEarlyGeneration) {
                    stub = ' ' + stub
                }
                const modelDefaultPresets = getModelPresets(model)
                const modelLoreGenPresets = getModelLoreGenPresets(model)
                const combinedPresets = [...modelDefaultPresets, ...modelLoreGenPresets, ...userPresets]
                const preset =
                    combinedPresets.find((p) => p.id === getUserSetting(session.settings, 'loreGenPreset')) ||
                    modelLoreGenPresets[0] ||
                    modelDefaultPresets[0]

                const legacy = getUserSetting(session.settings, 'legacyLoreGen')
                let settings
                let context
                if (legacy) {
                    context = await buildLegacyLoreGenContext(
                        text,
                        stub,
                        Math.min(getAccountContextLimit(session), modelMaxContextSize(model)) - 100,
                        {
                            model,
                            group,
                            keysInput,
                            useMemory,
                            useStory,
                            useAuthorsNote,
                            selectedEntryID: props.entry.id,
                            storyContent: currentStoryContent,
                        },
                        notEarlyGeneration
                    )

                    if (context.charactersCut > 0) {
                        setErrorMessage(
                            `Context Overloaded: ${context.charactersCut} characters were excluded.`
                        )
                    }

                    settings = await prepareLegacyLoreGenSettings(
                        currentStoryContent,
                        notEarlyGeneration,
                        context.generatingText,
                        context.exampleText,
                        model,
                        preset
                    )
                } else {
                    context = await buildLoreGenContext(
                        text,
                        stub,
                        Math.min(getAccountContextLimit(session), modelMaxContextSize(model)) - 100,
                        {
                            model,
                            group,
                            keysInput,
                            useMemory,
                            useAuthorsNote,
                            useStory,
                            selectedEntryID: props.entry.id,
                            storyContent: currentStoryContent,
                        },
                        notEarlyGeneration
                    )

                    if (context.charactersCut > 0) {
                        setErrorMessage(
                            `Context Overloaded: ${context.charactersCut} characters were excluded.`
                        )
                    }

                    settings = await prepareLoreGenSettings(
                        currentStoryContent,
                        notEarlyGeneration,
                        model,
                        preset
                    )
                }
                if (text.length === 0) {
                    settings.settings.parameters.max_length += 10
                }

                const request = getGenerationRequest(
                    session,
                    context.tokens,
                    settings.settings,
                    settings.additional,
                    settings.paramOverride
                )

                const response = await request.request()
                if (!response || !response.text) {
                    if (response && response.error) {
                        setGenerationRequestActive(false)
                        if (response.error?.includes?.call(response.error, 'quota reached')) {
                            setIPLimitModal(true)
                            return
                        }

                        throw new Error(response.error)
                    }
                    setGenerationRequestActive(false)
                    throw new Error('No response')
                }
                setLastResponse({
                    tokens: response.tokens ?? [],
                    logprobs: response.logprobs,
                    tokenizer: encoderType,
                })
                setLastGenerationInput(text)
                entryLastInputs.set(props.entry?.id ?? '', loreGenerate.text)

                let result = response.text
                if (result.endsWith('\n***')) result = response.text.slice(0, -4)

                if (text === '' && stub === '') {
                    const split = result.split('\n')
                    const firstLine = split[0]
                    if (firstLine.endsWith(')') || firstLine.endsWith(']')) {
                        const trimmed = firstLine.slice(0, -2).trim()
                        setGenerateInput(trimmed)
                        setInputIsRandom(true)
                        text = trimmed
                    }
                    result = split.slice(1).join('\n')
                }

                const textResponse = trimResponse(result).trimmed
                generationHistory = [
                    [stub.trimStart(), stub === '' ? textResponse.trim() : textResponse.trimEnd(), text],
                    ...generationHistory.slice(0, 50),
                ]
                const resultText = (stub + textResponse).replace(/^ */, '').trimEnd()
                setText(resultText)

                switch (type) {
                    case 'continue':
                        entryLastOutputs.set(props.entry.id, textInput)
                        break

                    case 'reset':
                        entryLastOutputs.set(props.entry.id, '')
                        break

                    case 'retry':
                        const last = entryLastOutputs.get(props.entry.id) ?? textInput
                        entryLastOutputs.set(props.entry.id, last)
                        break
                    default:
                        break
                }
                setTrialUsage((v) => {
                    return Math.max(v - 1, 0)
                })

                setGenerationRequestActive(false)
            } catch (error: any) {
                if (error.message) {
                    setErrorMessage(error.message)
                }
                setGenerationRequestActive(false)
            }
        },
        [
            currentStoryContent,
            generateInput,
            generationGroup,
            inputIsRandom,
            keysInput,
            loreGenerate.text,
            props.entry,
            session,
            setGenerationRequestActive,
            setIPLimitModal,
            setLastResponse,
            setModalOpen,
            setText,
            setTrialUsage,
            textInput,
            trialUsage,
            useAuthorsNote,
            useMemory,
            useStory,
            userPresets,
        ]
    )
    useEffect(() => {
        if (loreGenerate.text === '') return
        if (!currentStoryContent) return
        if (processingGeneration.current == true) {
            return
        }
        processingGeneration.current = true
        setGenerateInput(loreGenerate.text)
        entryInputs.set(props.entry?.id ?? '', loreGenerate.text)
        setGenerateShown(true)
        setGenerationGroup(loreGenerate.group)
        setLocalStorage('selectedGenerationGroup', loreGenerate.group)

        setLoreGenerate({ text: '', group: '' })
        generateLoreEntry('reset', loreGenerate.text, loreGenerate.group).then(() => {
            processingGeneration.current = false
        })
    }, [
        currentStoryContent,
        generateLoreEntry,
        generationRequestActive,
        loreGenerate,
        props.entry?.id,
        setGenerateShown,
        setLoreGenerate,
    ])

    useEffect(() => {
        if (!props.entry) {
            setGenerateInput('')
            setLastGenerationInput('')
            return
        }
        const genInput = entryInputs.get(props.entry.id)
        setGenerateInput(genInput ?? '')
        const lastGenInput = entryInputs.get(props.entry.id)
        setLastGenerationInput(lastGenInput ?? '')
    }, [props.entry])
    useEffect(() => {
        if (tutorialState.state === TutorialStates.ADVANCED_TUTORIAL) {
            return
        }
        setGenerateShown(() => getLocalStorage('lorebookGenerateShown') === 'true')
        setAddContextShown(() => getLocalStorage('lorebookAddContextShown') === 'true')
    }, [setAddContextShown, setGenerateShown, tutorialState])
    useEffect(() => {
        if (!props.entry) {
            setTextInput('')
            return
        }
        setTextInput(props.entry.text)
    }, [props.entry])

    const siteTheme = useRecoilValue(SiteTheme)

    return (
        <>
            <FlexRow style={{ alignItems: 'baseline' }}>
                <Label>Entry Text</Label>
                <FlexRow style={{ flex: '0 0 auto', width: 'auto' }}>
                    <GenerateToggle
                        disabled={props.entry === null}
                        toggled={generateShown}
                        onClick={() => {
                            setLocalStorage('lorebookGenerateShown', !generateShown ? 'true' : 'false')
                            if (tutorialState.state === TutorialStates.ADVANCED_TUTORIAL) {
                                setTimeout(() => tutorialState.next(), 1)
                            }
                            setGenerateShown((v) => !v)
                        }}
                        className="generate-toggle"
                    >
                        {generateShown ? <LightOnIcon /> : <LightOffIcon />}
                        Generator
                        {generateShown ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    </GenerateToggle>
                    <Tooltip
                        delay={1}
                        tooltip={`Let the AI fill in the blanks for you!
                                    Choose the type of entry from the list, enter what you want to generate, and hit generate.
                                    You can also have the AI add to text written in the Lore entry just like in the Story.`}
                    >
                        <MdHelpOutline
                            style={{
                                opacity: 0.3,
                                margin: '0.3rem',
                            }}
                        />
                    </Tooltip>
                </FlexRow>
            </FlexRow>
            <FlexRow style={{ flexWrap: 'wrap-reverse' }}>
                <Description>The following text will be referenced when the Keys are activated.</Description>
            </FlexRow>

            {generateShown && (
                <>
                    <FlexColSpacer min={3} max={3} />

                    <GenerateControlsBox>
                        <EditorCardHint>
                            <SubtleButton
                                onClick={() => setSettingsModalOpen(SettingsPages.Defaults)}
                                style={{ display: 'flex', position: 'absolute', right: 5, top: 7 }}
                            >
                                Change Settings <LinkIcon />
                            </SubtleButton>
                        </EditorCardHint>
                        <TypeInputRow>
                            <div>
                                <MinorLabel style={{ display: 'flex', alignItems: 'center' }}>
                                    Generation Type
                                    <Tooltip
                                        delay={1}
                                        tooltip={`Influences the generator towards generating a specific type of entry.
                                                A custom type can be set by typing with the dropdown open and hitting enter.`}
                                    >
                                        <MdHelpOutline
                                            style={{
                                                margin: '0.3rem',
                                                opacity: '0.5',
                                            }}
                                        />
                                    </Tooltip>
                                </MinorLabel>
                                <Select
                                    filterOption={createFilter({
                                        ignoreCase: true,
                                        ignoreAccents: false,
                                        trim: false,
                                        matchFrom: 'any',
                                        stringify: (option) =>
                                            `${option.data.description} ${option.data.value}`,
                                    })}
                                    custom={!getUserSetting(session.settings, 'legacyLoreGen')}
                                    className="lorebook-generation-select"
                                    aria-label="Select a generation type"
                                    maxMenuHeight={420}
                                    isDisabled={props.entry === null}
                                    options={TypeOptions.map((s) => {
                                        return {
                                            value: s.val,
                                            description: s.name,
                                            label: <div>{s.name}</div>,
                                        }
                                    })}
                                    onChange={(e) => {
                                        if (e !== null) {
                                            setGenerationGroup(e.value)
                                            setLocalStorage('selectedGenerationGroup', e.value)
                                        }
                                    }}
                                    value={{
                                        value: generationGroup,
                                        label: (
                                            <div>
                                                {TypeOptions.find((t) => t.val === generationGroup)?.name ??
                                                    (getUserSetting(session.settings, 'legacyLoreGen')
                                                        ? 'General'
                                                        : generationGroup)}
                                            </div>
                                        ),
                                        description:
                                            TypeOptions.find((t) => t.val === generationGroup)?.name ??
                                            (getUserSetting(session.settings, 'legacyLoreGen')
                                                ? 'General'
                                                : generationGroup),
                                    }}
                                    styles={{
                                        ...getDropdownStyle(siteTheme),
                                        control: (base) => ({
                                            ...base,
                                            ...getDropdownStyle(siteTheme).control(),
                                            minHeight: 44,
                                        }),
                                    }}
                                    theme={getDropdownTheme(siteTheme)}
                                />
                            </div>
                            <div>
                                <MinorLabel style={{ display: 'flex', alignItems: 'center' }}>
                                    Input Text
                                    <Tooltip
                                        delay={1}
                                        tooltip={`This is where you put what you want to be generated. Proper nouns \
                                            like "Geometry Incorporated" or short descriptions like "an enthusiastic \
                                            merchant" work best.\n\nYou can add tags in parenthesis to further \
                                            describe the entry, e.g. "Stalagmal (prison, space)"`}
                                    >
                                        <MdHelpOutline
                                            style={{
                                                margin: '0.3rem',
                                                opacity: '0.5',
                                            }}
                                        />
                                    </Tooltip>
                                </MinorLabel>
                                <input
                                    style={{ minHeight: '44px' }}
                                    disabled={props.entry === null}
                                    ref={generateTextBox}
                                    type="text"
                                    aria-label="Lore generation"
                                    placeholder={placeholders.get(generationGroup) ?? ''}
                                    onChange={(e) => {
                                        if (e.target.value === '') {
                                            entryLastOutputs.set(props.entry?.id ?? '', e.target.value)
                                        }
                                        entryInputs.set(props.entry?.id ?? '', e.target.value)
                                        setGenerateInput(e.target.value)
                                        setInputIsRandom(false)
                                    }}
                                    value={generateInput}
                                    onKeyDown={(e) => {
                                        if (generationRequestActive) return
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                            generateLoreEntry('reset')
                                            e.preventDefault()
                                            e.stopPropagation()
                                        } else if (e.key === 'Enter') {
                                            if (generateInput === lastGenerationInput) {
                                                generateLoreEntry()
                                            } else {
                                                generateLoreEntry('reset')
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </TypeInputRow>
                        <FlexColSpacer min={10} max={10} />
                        <ContextButtonRow>
                            <GenerateContextLabel
                                onClick={() => {
                                    setLocalStorage('lorebookAddContextShown', (!addContextShown).toString())
                                    setAddContextShown((v) => !v)
                                }}
                                aria-expanded={addContextShown}
                            >
                                Add Context (advanced) {addContextShown ? <ArrowUpIcon /> : <ArrowDownIcon />}{' '}
                                <Tooltip
                                    delay={1}
                                    tooltip={`Include Memory, Author's Note, the most recent story text (~2500 characters), \
                                    or other Lorebook entries in context so that information can be used in generating entries.`}
                                >
                                    <MdHelpOutline
                                        style={{
                                            margin: '0.3rem',
                                            fontSize: '0.875rem',
                                        }}
                                    />
                                </Tooltip>
                            </GenerateContextLabel>
                            <GenerateArea className={'lorebook-generate'}>
                                <GenerateButton
                                    style={{ opacity: generationRequestActive ? '0.6' : '1' }}
                                    disabled={props.entry === null}
                                    onClick={() => {
                                        if (generationRequestActive) return
                                        generateLoreEntry()
                                    }}
                                    aria-label="Generate Entry"
                                >
                                    Generate&nbsp;&nbsp;
                                    <SendIcon />
                                </GenerateButton>
                                <RetryButton
                                    style={{ opacity: generationRequestActive ? '0.6' : '1' }}
                                    disabled={props.entry === null}
                                    onClick={() => {
                                        if (generationRequestActive) return
                                        generateLoreEntry('retry')
                                    }}
                                    aria-label="Retry"
                                >
                                    <ReloadIcon style={{ height: 14 }} />
                                </RetryButton>
                            </GenerateArea>
                        </ContextButtonRow>

                        {addContextShown && (
                            <AddContextContainer className={'lorebook-add-context'}>
                                <AltCheckbox
                                    value={useMemory}
                                    setValue={() => {
                                        setLocalStorage(
                                            'lorebookGenerateUseMemory',
                                            !useMemory ? 'true' : 'false'
                                        )
                                        setUseMemory((v) => !v)
                                    }}
                                    disabled={props.entry === null}
                                    label="Enable Memory for lorebook generation"
                                    text={'Memory'}
                                />
                                <AltCheckbox
                                    value={useAuthorsNote}
                                    setValue={() => {
                                        setLocalStorage(
                                            'lorebookGenerateUseAuthorsNote',
                                            !useAuthorsNote ? 'true' : 'false'
                                        )
                                        setUseAuthorsNote((v) => !v)
                                    }}
                                    disabled={props.entry === null}
                                    label={`Enable Author's Note for lorebook generation`}
                                    text={`Author's Note`}
                                />
                                <AltCheckbox
                                    value={useStory}
                                    setValue={() => {
                                        setLocalStorage(
                                            'lorebookGenerateUseStory',
                                            !useStory ? 'true' : 'false'
                                        )
                                        setUseStory((v) => !v)
                                    }}
                                    disabled={props.entry === null}
                                    label={`Enable recent story for lorebook generation`}
                                    text={`Story`}
                                />
                                <div>
                                    <input
                                        disabled={props.entry === null}
                                        ref={generateTextBox}
                                        type="text"
                                        aria-label="Enter Lorebook Keys to Search"
                                        placeholder="Enter Lorebook Keys to Search"
                                        onChange={(e) => setKeysInput(e.target.value)}
                                        value={keysInput}
                                    ></input>

                                    <Tooltip
                                        delay={1}
                                        tooltip={`The text here will be searched for Lorebook activation keys, \
                                        and the matching Lore placed in context.`}
                                    >
                                        <MdHelpOutline
                                            style={{
                                                opacity: 0.3,
                                                margin: '0.3rem',
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </AddContextContainer>
                        )}

                        <FlexColSpacer min={8} max={8} />
                        <FlexRow style={{ width: '100%' }}>
                            <GenerateError>{errorMessage.toString()}</GenerateError>
                            <GenerateContextLabel
                                disabled={props.entry === null}
                                onClick={() => setShowHistoryModel(true)}
                            >
                                Generation History
                            </GenerateContextLabel>
                        </FlexRow>
                        <Modal
                            label="Generation History"
                            isOpen={showHistoryModal}
                            onRequestClose={() => setShowHistoryModel(false)}
                            shouldCloseOnOverlayClick={true}
                            type={ModalType.Compact}
                        >
                            <div>
                                <p>Shows the last 50 outputs. Cleared on page refresh.</p>
                                {generationHistory.length === 0 ? <p>History empty</p> : ''}
                                <HistoryItems>
                                    {generationHistory.map((m, i) => (
                                        <SubtleButton
                                            style={{ padding: '10px' }}
                                            key={i}
                                            onClick={() => {
                                                if (props.entry === null) return
                                                entryLastOutputs.set(props.entry.id, m[0])
                                                setText(m[0] + m[1])
                                                setGenerateInput(m[2] ?? '')
                                                setShowHistoryModel(false)
                                            }}
                                        >
                                            <HistoryTitle>{m[2]}</HistoryTitle>
                                            <HistoryBody>
                                                <span>{m[0]}</span>
                                                <span>{m[1]}</span>
                                            </HistoryBody>
                                        </SubtleButton>
                                    ))}
                                </HistoryItems>
                            </div>
                        </Modal>
                    </GenerateControlsBox>
                </>
            )}
            <LoadingBar visible={generationRequestActive} className="loading-bar" />

            <FlexColSpacer min={5} max={5} />
            <TextareaContainer>
                <TextareaAutosize
                    className={'lorebook-inserted-text'}
                    style={{
                        opacity: generationRequestActive ? '0.6' : '1',
                        paddingLeft: '15px',
                        paddingRight: '10px',
                        paddingBottom: '1rem',
                    }}
                    disabled={props.entry === null}
                    minRows={(window.visualViewport?.height || window.innerHeight) > 1200 ? 10 : 8}
                    maxRows={(window.visualViewport?.height || window.innerHeight) > 1200 ? 14 : 12}
                    cacheMeasurements
                    placeholder="Type information about the entry here."
                    value={textInput}
                    onChange={(e) => {
                        if (generationRequestActive) return
                        if (e.target.value === '') {
                            entryLastOutputs.set(props.entry?.id ?? '', e.target.value)
                        }
                        setInputIsRandom(false)
                        setText(e.target.value)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault()
                            e.stopPropagation()
                            generateLoreEntry('continue')
                        } else if (e.key === 'r' && e.altKey) {
                            e.preventDefault()
                            e.stopPropagation()
                            generateLoreEntry('retry')
                        }
                    }}
                />
                <TokenCount
                    onClick={() => {
                        setTokenizerText(textInput ?? '')
                        setTokenizerOpen(true)
                    }}
                >{`${entryTokenCount} Tokens`}</TokenCount>
            </TextareaContainer>
        </>
    )
}

const TextareaContainer = styled.div`
    position: relative;
`

const GenerateControlsBox = styled.div`
    border: 1px solid ${(props) => props.theme.colors.bg3};
    padding: 20px 20px 10px 15px;
    position: relative;
`

const TypeInputRow = styled.div`
    display: grid;
    grid-template-columns: 2fr 4fr;
    gap: 20px;

    @media (max-width: 500px) {
        display: flex;
        flex-direction: column;
    }
`

const ContextButtonRow = styled(TypeInputRow)`
    @media (max-width: 500px) {
        flex-direction: column-reverse;
    }
`

const GenerateButton = styled(LightColorButton)`
    height: 44px;
    padding: 4px 35px 4px 37px;
    font-size: 0.875rem;
    > div {
        height: 0.8rem;
    }
`

const RetryButton = styled(Button)`
    background-color: ${(props) => props.theme.colors.bg0};
    &:hover {
        background-color: ${(props) => props.theme.colors.bg1};
    }
    height: 44px;
    padding: 13px 13px;
    > div {
        height: 1rem;
    }
`
