import styled from 'styled-components'
import { v4 as uuid } from 'uuid'
import { useRef, useState, useEffect, MutableRefObject, useMemo } from 'react'
import { deflate, FlateError } from 'fflate'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { Line, LineChart, XAxis, YAxis } from 'recharts'
import { createPortal } from 'react-dom'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { fetchWithTimeout } from '../../util/general'
import { transparentize } from '../../util/colour'
import { InvertedButton, LightColorButton, SubtleButton } from '../../styles/ui/button'
import { AnlaIcon, CrossMidIcon, FileIcon, ModuleIcon } from '../../styles/ui/icons'
import Spinner from '../spinner'

import {
    BackendURLPrefix,
    BackendURLPrefixAll,
    BackendURLPrefixSubmit,
    BackendURLSubscriptions,
} from '../../globals/constants'
import { Session, CustomModules, SiteTheme, SelectedStoryId } from '../../globals/state'
import { CloseButton } from '../../styles/components/lorebook'
import { getStorage } from '../../data/storage/storage'
import { AIModule } from '../../data/story/storysettings'
import { AIModuleExport } from '../../data/ai/aimodule'
import { Dark } from '../../styles/themes/dark'
import WarningButton, { WarningButtonStyle } from '../deletebutton'
import Modal, { ModalType } from '../modals/modal'
import { StoryMode } from '../../data/story/story'
import { downloadTextFile, logError } from '../../util/browser'
import { getDropdownStyle, getDropdownTheme, Select } from '../controls/select'
import { DefaultModel, normalizeModel, TextGenerationModel } from '../../data/request/model'
import { PrefixInnerDiv } from '../../hooks/useModuleOptions'
import { getModuleTrainingModels } from '../../util/models'
import { formatErrorResponse } from '../../util/util'
import { StepSlider } from '../sidebars/common/editorcard'
import { ImportDataType } from '../../data/story/storyconverter'
import { FileInfo } from '../controls/fileinput'
import FileImporter, { FileImporterButtonType, FileImporterOverlayType } from '../controls/fileimporter'
import { GlobalUserContext } from '../../globals/globals'
import { FlexRow } from '../../styles/ui/layout'
import { DEFAULT_THEME } from '../../styles/themes/theme'
import { getUserSetting } from '../../data/user/settings'
import { getTrainingSteps } from '../../util/subscription'
import Purchase from './purchase'

const StyledPrefixModal = styled.div`
    height: 100%;
    width: 100%;
    background: ${(props) => props.theme.colors.bg2};
    color: ${(props) => props.theme.colors.textMain};
    overflow: hidden;
`

const PrefixEditor = styled.div`
    width: 100%;
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    min-height: 300px;
    input,
    textarea {
        background: ${(props) => props.theme.colors.bg1};
    }
    transition: opacity 0.05s ease-in-out;
    padding: 30px;
    overflow: hidden;
    height: 100%;
    position: relative;
    @media (max-width: 800px) {
        overflow: auto;
    }
`

const PrefixHeader = styled.div`
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 3000;
    margin-bottom: 1rem;

    > div:first-child > div:first-child {
        background-color: ${(props) => props.theme.colors.textHeadings};
        margin-right: 10px;
    }
    > div {
        display: flex;
        flex-direction: row;
        align-items: center;
    }
`
const PrefixInfo = styled.div`
    flex: 0 0 auto;
    padding-bottom: 30px;
`
const PrefixBody = styled.div`
    flex: 1 1 auto;
    @media (max-width: 800px) {
        flex: 1 0 auto;
    }
    display: flex;
    flex-direction: row;
    overflow: hidden;
    > div:nth-child(1) {
        padding-right: 15px;
    }
    > div:nth-child(2) {
        padding-left: 15px;
    }
    @media (max-width: 800px) {
        flex-direction: column;
        > div:nth-child(1) {
            padding-right: 5px;
            padding-bottom: 15px;
        }
        > div:nth-child(2) {
            padding-left: 5px;
        }
    }
`

const PrefixStepsCounter = styled.div`
    border: 1px solid ${(props) => props.theme.colors.bg3};
    display: flex;
    flex-direction: row;
    margin-right: 40px;
    > *:nth-child(1) {
        padding: 8px 15px;
        display: flex;
        flex-direction: row;
        > div:nth-child(2) {
            color: ${(props) => props.theme.colors.textHeadings};
            font-weight: bold;
            margin-left: 10px;
        }
    }
    > *:nth-child(2) {
        background-color: ${(props) => props.theme.colors.bg3};
        padding: 8px 15px;
        font-weight: 600;
    }
`

const PrefixUpload = styled.div`
    flex: 1 1 50%;
    display: flex;
    flex-direction: column;
    padding: 5px;
`
const PrefixUploadSelector = styled.div`
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    border-bottom: 2px solid ${(props) => transparentize(0.5, props.theme.colors.bg3)};
    padding-bottom: 10px;
    margin-bottom: 10px;
    align-items: center;
    > div:nth-child(1) {
        display: flex;
        flex-direction: column;
        > div:nth-child(1) {
            padding-bottom: 0;
        }
        > div:nth-child(2) {
            opacity: 0.6;
        }
    }
`
const PrefixUploadInfo = styled.div`
    flex: 1 1 auto;
    background: ${(props) => props.theme.colors.bg0};
    padding: 10px;
    position: relative;
    min-height: 50px;
    overflow: auto;
`
const PrefixUpdloadInfoContent = styled.div`
    height: auto;
    flex: 1 1 auto;
`
const PrefixFileCard = styled.div`
    display: flex;
    flex-direction: row;
    padding: 10px;
    justify-content: space-between;
    align-items: center;
    background: ${(props) => props.theme.colors.bg2};
    margin-bottom: 10px;
    > div {
        padding: 0 5px;
    }
    > div:nth-child(1) {
        word-break: break-all;
    }
`
const PrefixFilePlaceholder = styled.div`
    position: absolute;
    width: auto;
    height: auto;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
    opacity: 0.8;
`

const PrefixDetails = styled.div`
    flex: 1 1 50%;
    display: flex;
    flex-direction: column;
    padding: 5px;
    overflow: auto;
    @media (max-width: 800px) {
        overflow: unset;
    }
`
const PrefixDetailsContent = styled.div`
    height: auto;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    > div:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
    }
`
const PrefixDetailsCard = styled.div`
    padding-bottom: 20px;
    display: flex;
    flex-direction: column;
    > div {
        flex: 0 0 auto;
    }

    &:nth-child(2) {
        border-bottom: 2px solid ${(props) => transparentize(0.5, props.theme.colors.bg3)};
        margin-bottom: 5px;
    }
`
const PrefixDetailHeader = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textHeadings};
    padding-bottom: 10px;
    font-weight: 600;
`
const PrefixDetailRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
`
const PrefixDetailTrain = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    font-size: 1.3rem;
    font-weight: 600;
`

const ErrorMessage = styled.div`
    color: ${(props) => props.theme.colors.warning};
    padding-bottom: 10px;
`

const Delete = styled.div`
    padding: 5px;
    opacity: 0.8;
    cursor: pointer;
    &:hover {
        opacity: 1;
    }
`

const Spacer = styled.div`
    height: 10px;
`

const LoadingOverlay = styled.div`
    position: absolute;
    width: auto;
    height: auto;
    left: 0;
    right: 0;
    top: 100px;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    background-color: ${(props) => transparentize(0.6, props.theme.colors.bg1)};
`

const ResultOverlay = styled.div`
    position: absolute;
    width: auto;
    height: auto;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
    z-index: 2000;
    background-color: ${(props) => transparentize(0.2, props.theme.colors.bg1)};
    @media (max-width: 800px) {
        position: fixed;
    }
`
const ResultQueueInfo = styled.div<{ centered?: boolean }>`
    background-color: ${(props) => props.theme.colors.bg1};
    border-top: 2px solid ${(props) => props.theme.colors.bg2};
    padding: 30px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    align-items: ${(props) => (props.centered ? 'center' : 'left')};
    position: relative;
    max-height: calc(100% - 80px);
    @media (max-width: 800px) {
        max-height: calc(100% - 120px);
    }
    overflow: auto;
    position: relative;
    > * {
        flex-shrink: 0;
    }
`
const ResultQueueProgress = styled.div<{ percentage: number }>`
    height: 50px;
    background: ${(props) => props.theme.colors.bg0};
    position: relative;
    &::after {
        content: '';
        position: absolute;
        height: 100%;
        left: 0;
        width: ${(props) => props.percentage}%;
        background: ${(props) => props.theme.colors.textHeadings};
        transition: width linear 0.8s;
    }
`
const ResultLossProgress = styled.div<{ visible: boolean }>`
    display: block;
    position: relative;
    height: ${(props) => (props.visible ? 'auto' : '0')};
    overflow: ${(props) => (props.visible ? 'auto' : 'hidden')};
    opacity: ${(props) => (props.visible ? '1' : '0')};
    pointer-events: ${(props) => (props.visible ? 'all' : 'none')};
    width: 100%;
`

const ToggleLossButton = styled(SubtleButton)`
    position: absolute;
    top: 0px;
    right: 10px;
    padding: 10px;
    border: none;
    outline: none;
    background: none;
    cursor: pointer;
    &:focus {
        opacity: 0.9;
    }
    &:hover {
        opacity: 0.8;
    }
`

interface TrainingFileContent {
    id: string
    uncompressedText: string
    characterCount: number

    fileName: string
    fileSize: number

    setCharacterCount: number
    setPercentage: number
}

enum PrefixUploaderState {
    Loading,
    FreeToUse,
    Queued,
    CurrentlyTraining,
    TrainingComplete,
    ErrorBlocked,
}

const downloadModuleFile = (aimodule: any) => {
    const data = JSON.parse(aimodule.data)
    const exportData = Object.assign(new AIModuleExport(), {
        moduleVersion: 1,
        data: data.encoded_emb,
        name: aimodule.name,
        description: aimodule.description,
        // Defaults to sigurd as all training results without a module defined are sigurd.
        model: aimodule.model ?? TextGenerationModel.j6bv4,
        steps: aimodule.steps,
        loss:
            aimodule.lossHistory.length > 0
                ? aimodule.lossHistory[aimodule.lossHistory.length - 1]
                : undefined,
        lossHistory: aimodule.lossHistory,
        mode: StoryMode.normal,
    })
    downloadTextFile(exportData.serialize(true), `${aimodule.name}.module`)
}

const totalFileSizer = (files: TrainingFileContent[]): number =>
    files.map((file) => file.fileSize).reduce((p, c) => p + c, 0)

export default function PrefixUploader(props: { onClose: () => void }): JSX.Element {
    const maxUploadSize = 50000000 // bytes
    const inputFile = useRef<HTMLInputElement>(null)

    const session = useRecoilValue(Session)
    const setModules = useSetRecoilState(CustomModules)

    const selectedStory = useRecoilValue(SelectedStoryId)
    const currentStory = GlobalUserContext.stories.get(selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory)
    const currentStoryText = useMemo(() => currentStoryContent?.getStoryText() ?? '', [currentStoryContent])

    const menuStateRef = useRef(PrefixUploaderState.Loading)
    const [menuState, setMenuState] = useState(PrefixUploaderState.Loading)

    useEffect(() => {
        menuStateRef.current = menuState
    }, [menuState])

    const [loading, setLoading] = useState(false)
    const [currentlyTraining, setCurrentlyTraining] = useState({} as any)

    const [files, setFiles] = useState([] as Array<TrainingFileContent>)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState('')
    const [percent, setPercent] = useState(100)
    const [remainingSteps, setRemainingSteps] = useState(
        getTrainingSteps(session.subscription.trainingStepsLeft)
    )
    useEffect(() => {
        setRemainingSteps(getTrainingSteps(session.subscription.trainingStepsLeft))
    }, [session.subscription, setRemainingSteps])
    const [selectedSteps, setSelectedSteps] = useState(0)
    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)

    const chartRef: MutableRefObject<HTMLDivElement | null> = useRef(null)
    const [chartVisible, setChartVisible] = useState(false)

    const steps = files.map((file) => file.characterCount / (3.5 * 256)).reduce((p, c) => p + c, 0)
    const modelOptions = getModuleTrainingModels(session.subscription.tier >= 3)
    const defaultModel =
        modelOptions.find((m) => m.str === getUserSetting(session.settings, 'defaultModel')) ??
        modelOptions.find((m) => m.str === DefaultModel) ??
        modelOptions[0]

    const [model, setModel] = useState(defaultModel.str)
    const selectedOption = modelOptions.find((m) => m.str === model) ?? modelOptions[0]

    useEffect(() => {
        setPercent(steps ? (selectedSteps / steps) * 100 : 0)
    }, [selectedSteps, steps])

    const [moduleTrainingError, setModuleTrainingError] = useState(false)

    const checkForUpdates = async () => {
        try {
            setRemainingSteps(
                await fetchWithTimeout(BackendURLSubscriptions, {
                    mode: 'cors',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + session.auth_token,
                    },
                    method: 'GET',
                })
                    .then(async (response) => {
                        if (!response.ok) {
                            logError(response)
                            throw await formatErrorResponse(response)
                        }
                        return response.json()
                    })
                    .then((json) => {
                        if (selectedSteps === 0) {
                            setSelectedSteps(Math.min(getTrainingSteps(json.trainingStepsLeft), 1000))
                        }
                        return getTrainingSteps(json.trainingStepsLeft)
                    })
            )
            const all = await fetchWithTimeout(
                BackendURLPrefixAll,
                {
                    mode: 'cors',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + session.auth_token,
                    },
                    method: 'GET',
                },
                20000
            )
            if (!all.ok) {
                logError(all)
                throw await formatErrorResponse(all)
            }
            let response = await all.json()
            const last = response.length - 1
            if (response && Array.isArray(response)) {
                response = response.sort((a, b) => (a.status ?? '').localeCompare(b.status ?? ''))
            }
            if (!response || response.length === 0 || !response[last].status) {
                setError('')
                setMenuState(PrefixUploaderState.FreeToUse)
                setCurrentlyTraining({})
            } else {
                switch (response[last].status) {
                    case 'pending': {
                        setError('')
                        setMenuState(PrefixUploaderState.Queued)
                        setCurrentlyTraining(response[last])
                        break
                    }
                    case 'training': {
                        setError('')
                        setMenuState(PrefixUploaderState.CurrentlyTraining)
                        setCurrentlyTraining(response[last])
                        break
                    }
                    case 'ready': {
                        const modules = await getStorage(session).getModules()
                        const newModule = await AIModule.fromData(
                            response[last].name,
                            response[last].description,
                            JSON.parse(response[last].data).encoded_emb,
                            StoryMode.normal,
                            undefined,
                            response[last].model
                        )
                        if (!modules.some((cur) => cur.id === newModule.id)) {
                            await getStorage(session).saveModule(newModule)
                            setModules([...modules, newModule])
                        }
                        setError('')
                        setMenuState(PrefixUploaderState.TrainingComplete)
                        setCurrentlyTraining(response[last])
                        break
                    }
                    case 'error': {
                        setModuleTrainingError(true)
                        setError(response[last].data.message ?? response[last].data)
                        setMenuState(PrefixUploaderState.ErrorBlocked)

                        break
                    }
                    default: {
                        setError('')
                        setMenuState(PrefixUploaderState.FreeToUse)
                        setCurrentlyTraining({})
                    }
                }
            }
        } catch (error: any) {
            setError(`${error}`)
            logError(error, true, 'Something went wrong:')
            setLoading(false)
            setMenuState(PrefixUploaderState.FreeToUse)
        }
    }

    const importFile = async (file: FileInfo, last: boolean) => {
        const rv = file.text
        if (inputFile.current) {
            inputFile.current.value = ''
        }
        const characterCount = rv.length

        const fileToSet = {
            id: uuid(),
            uncompressedText: rv,
            characterCount: characterCount,

            fileName: file.name,
            fileSize: file.size,

            setCharacterCount: characterCount,
            setPercentage: 1,
        }
        setFiles((files) => [...files, fileToSet])
        if (last) {
            setLoading(false)
        }
        return false
    }

    const startTraining = async () => {
        if (files.length === 0 || menuState !== PrefixUploaderState.FreeToUse || !remainingSteps || !steps)
            return

        const totalSize = totalFileSizer(files)

        if (totalSize > maxUploadSize) {
            const currMb = Math.round(totalSize / 1000000) + 'MB'
            const maxMb = Math.round(maxUploadSize / 1000000) + 'MB'
            setError('Total file size too large (' + currMb + '), maximum allowed: ' + maxMb)
            return
        }

        setLoading(true)
        try {
            let trainingSet = files
                .reduce((p, c) => p + c.uncompressedText + '<|endoftext|>', '')
                .replace(/\r\n/g, '\n')
                .trim()
            if (trainingSet.endsWith('<|endoftext|><|endoftext|>')) {
                trainingSet = trainingSet.slice(0, -13)
            }
            const data = new TextEncoder().encode(trainingSet)
            const compressed = await new Promise((resolve: (compressed: Uint8Array) => void, reject) => {
                deflate(data, { level: 1 }, (err: FlateError | null, compressed: Uint8Array) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(compressed)
                    }
                })
            })

            const posted = await fetchWithTimeout(
                BackendURLPrefixSubmit,
                {
                    mode: 'cors',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + session.auth_token,
                    },
                    method: 'POST',
                    body: JSON.stringify({
                        data: Buffer.from(compressed).toString('base64'),
                        lr: 0.0001,
                        model: model,
                        steps: Math.floor(selectedSteps),
                        percentage: percent,
                        name: name.trim(),
                        description: description.trim(),
                    }),
                },
                60000
            )
            if (!posted.ok) {
                logError(posted)
                throw await formatErrorResponse(posted)
            }

            setMenuState(PrefixUploaderState.Loading)
            setLoading(false)
        } catch (error: any) {
            setError(`${error}`)
            logError(error, true, 'Something went wrong while uploading the text file:')
            setLoading(false)
            setMenuState(PrefixUploaderState.FreeToUse)
        }
    }

    const deleteCurrentModule = async () => {
        setLoading(true)
        try {
            const posted = await fetchWithTimeout(BackendURLPrefix + '/' + currentlyTraining.id, {
                mode: 'cors',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + session.auth_token,
                },
                method: 'DELETE',
            })
            if (!posted.ok) {
                logError(posted)
                throw await formatErrorResponse(posted)
            }
            setMenuState(PrefixUploaderState.Loading)
            setLoading(false)
        } catch (error: any) {
            setError(`${error}`)
            logError(error, true, 'Something went wrong while deleting the training data:')
            setMenuState(PrefixUploaderState.FreeToUse)
            setLoading(false)
        }
    }

    const updateId = useRef(0)
    const updateFn = async () => {
        if (
            menuStateRef.current !== PrefixUploaderState.FreeToUse &&
            menuStateRef.current !== PrefixUploaderState.TrainingComplete
        ) {
            await checkForUpdates()
            clearTimeout(updateId.current)
            updateId.current = setTimeout(() => updateFn(), 2000) as any
        } else {
            clearTimeout(updateId.current)
            updateId.current = setTimeout(() => updateFn(), 2000) as any
        }
    }
    useEffect(() => {
        updateId.current = setTimeout(() => updateFn(), 0) as any
        return () => {
            clearTimeout(updateId.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const getCurrentPercentage = () => {
        if (!currentlyTraining.data) return '1'
        try {
            const parsed = JSON.parse(currentlyTraining.data)
            return parsed.percentage?.toFixed(1) ?? 1
        } catch (error) {
            logError(error, true, 'error parsing percentage:' + currentlyTraining.data)
            return '1'
        }
    }
    const siteTheme = useRecoilValue(SiteTheme)

    const lossGraph =
        currentlyTraining && currentlyTraining.lossHistory ? (
            <ResultLossProgress ref={chartRef} visible={chartVisible}>
                <LineChart
                    width={chartRef.current?.clientWidth ?? 0}
                    height={300}
                    margin={{ top: 5, right: 5, bottom: 25, left: 5 }}
                    data={
                        currentlyTraining?.lossHistory?.map((loss: number, i: number) => ({
                            loss,
                            step:
                                currentlyTraining.model === normalizeModel(TextGenerationModel.j6bv4)
                                    ? i * 100
                                    : i * 10,
                        })) || []
                    }
                >
                    <Line
                        type="monotone"
                        dataKey="loss"
                        stroke={siteTheme.colors?.textHeadings ?? DEFAULT_THEME.colors.textHeadings}
                        dot={false}
                        strokeWidth={3}
                    />
                    <YAxis
                        dataKey="loss"
                        domain={['auto', 'auto']}
                        tickFormatter={(tick: any) => {
                            return tick
                        }}
                        label={{ value: 'loss', angle: -90, position: 'insideLeft' }}
                    />
                    <XAxis
                        dataKey="step"
                        label={{
                            value: 'step',
                            position: 'bottom',
                            offset: 0,
                        }}
                    />
                </LineChart>
                {currentlyTraining?.lossHistory ? (
                    <>
                        <div>
                            Average Loss:{' '}
                            {(
                                currentlyTraining.lossHistory.reduce((p: number, c: number) => p + c, 0) /
                                currentlyTraining?.lossHistory.length
                            ).toFixed(4)}
                        </div>
                        <div>
                            Last Loss:{' '}
                            {(
                                currentlyTraining.lossHistory[currentlyTraining.lossHistory.length - 1] ?? 0
                            ).toFixed(4)}
                        </div>
                    </>
                ) : (
                    <></>
                )}
            </ResultLossProgress>
        ) : (
            <></>
        )

    const importerClickRef: MutableRefObject<null | (() => boolean)> = useRef(null)

    const modalOuterRef: MutableRefObject<null | HTMLDivElement> = useRef(null)

    return (
        <StyledPrefixModal className="module-trainer" ref={modalOuterRef}>
            <FileImporter
                overlay={FileImporterOverlayType.Absolute}
                overlayParentRef={modalOuterRef}
                button={FileImporterButtonType.None}
                buttonClickRef={importerClickRef}
                allowedFileTypes={[ImportDataType.plainText]}
                onImportFile={importFile}
            />
            <PrefixEditor>
                <PrefixHeader>
                    <div>
                        <ModuleIcon />
                        <h4 style={{ margin: '5px 0 0 0' }}>AI Module Trainer</h4>
                    </div>
                    <div>
                        <PrefixStepsCounter>
                            <div>
                                <div>
                                    Your <AnlaIcon style={{ display: 'inline-block', height: '1rem' }} />{' '}
                                    Anlas:{' '}
                                </div>
                                <div>{remainingSteps}</div>
                            </div>
                            <SubtleButton onClick={() => setPurchaseModalOpen(true)}>Buy More</SubtleButton>
                        </PrefixStepsCounter>
                        <CloseButton
                            aria-label="Close Modal"
                            style={{ top: '5px', right: 0, position: 'absolute' }}
                            onClick={props.onClose}
                        >
                            <div />
                        </CloseButton>
                    </div>
                </PrefixHeader>
                {error.length > 0 ? (
                    <PrefixHeader>
                        <ErrorMessage style={{ backgroundColor: 'transparent' }}>{error}</ErrorMessage>
                    </PrefixHeader>
                ) : null}
                <PrefixInfo>
                    Here you can train your own AI Modules by supplying text and story material to our trainer
                    and clicking Train.{' '}
                    <strong>
                        Modules trained here are intended to be used on the current version of selected model
                        and <i>may</i> not function on future versions.
                    </strong>{' '}
                    We don’t keep <i>any</i> of your uploaded training data saved after you delete it. Each
                    step a Module is trained for costs one Anla.
                </PrefixInfo>
                <PrefixBody>
                    <PrefixUpload>
                        <PrefixUploadSelector>
                            <div>
                                <PrefixDetailHeader>Upload Your Material</PrefixDetailHeader>
                                <div>Supported Types: txt</div>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: '10px',
                                    flexWrap: 'wrap-reverse',
                                    justifyContent: 'end',
                                }}
                            >
                                {currentStory && currentStoryContent && currentStoryText.length > 0 && (
                                    <LightColorButton
                                        aria-label="Add current Story"
                                        disabled={files.some((file) => file.id === currentStory.id)}
                                        onClick={() => {
                                            files.some((file) => file.id === currentStory.id) ||
                                                setFiles((files) => [
                                                    ...files,
                                                    {
                                                        id: currentStory.id,
                                                        fileName: currentStory.title ?? 'New Story',
                                                        characterCount: currentStoryText.length,
                                                        uncompressedText: currentStoryText,
                                                        fileSize: Buffer.byteLength(currentStoryText, 'utf8'),
                                                        setCharacterCount: currentStoryText.length,
                                                        setPercentage: 1,
                                                    },
                                                ])
                                        }}
                                    >
                                        Add current Story
                                    </LightColorButton>
                                )}
                                <LightColorButton
                                    aria-label="Import"
                                    onClick={() => {
                                        if (importerClickRef.current) importerClickRef.current()
                                    }}
                                >
                                    Select File
                                </LightColorButton>
                            </div>
                        </PrefixUploadSelector>
                        <PrefixUploadInfo>
                            <PrefixUpdloadInfoContent>
                                {files.length > 0 ? (
                                    files.map((file, i) => (
                                        <PrefixFileCard key={i}>
                                            <div>
                                                <FileIcon />
                                            </div>
                                            <div style={{ flex: '0 0 40%' }}>{file.fileName}</div>
                                            <div>
                                                {file.fileSize / 1000 > 1000
                                                    ? `${Math.max(file.fileSize / 1000000, 1).toFixed(0)} MB`
                                                    : file.fileSize > 1000
                                                    ? `${Math.max(file.fileSize / 1000, 1).toFixed(0)} KB`
                                                    : `${Math.max(file.fileSize, 1).toFixed(0)} B`}
                                            </div>
                                            <div>
                                                ~
                                                {[file.characterCount / (3.5 * 256)].map((value) =>
                                                    value > 10000
                                                        ? `${Math.max(value / 1000, 1).toFixed(0)}K`
                                                        : `${Math.max(value, 1).toFixed(0)}`
                                                )}{' '}
                                                Steps
                                            </div>
                                            <Delete
                                                onClick={() =>
                                                    setFiles([
                                                        ...files.filter((dfile) => dfile.id !== file.id),
                                                    ])
                                                }
                                            >
                                                <CrossMidIcon />
                                            </Delete>
                                        </PrefixFileCard>
                                    ))
                                ) : (
                                    <PrefixFilePlaceholder>
                                        Select a file to get started!
                                    </PrefixFilePlaceholder>
                                )}
                            </PrefixUpdloadInfoContent>
                        </PrefixUploadInfo>
                    </PrefixUpload>
                    <PrefixDetails>
                        <PrefixDetailsContent>
                            <PrefixDetailsCard>
                                <PrefixDetailHeader>Model</PrefixDetailHeader>
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
                                                    <div>
                                                        {model.description ? (
                                                            <div>{model.description}</div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </PrefixInnerDiv>
                                        ),
                                    }))}
                                    onChange={(e) => e && setModel(e.value)}
                                    value={{
                                        value: selectedOption.str,
                                        description: `${selectedOption.label}`,
                                        label: (
                                            <PrefixInnerDiv selected={false}>
                                                <div>
                                                    <LazyLoadImage
                                                        effect="opacity"
                                                        src={selectedOption.img.src}
                                                    />
                                                </div>
                                                <div>
                                                    <strong>{selectedOption.label}</strong>
                                                </div>
                                            </PrefixInnerDiv>
                                        ),
                                    }}
                                    styles={getDropdownStyle(siteTheme)}
                                    theme={getDropdownTheme(siteTheme, true)}
                                />
                            </PrefixDetailsCard>
                            <PrefixDetailsCard>
                                <PrefixDetailHeader>Module Name</PrefixDetailHeader>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Module Name"
                                        value={name}
                                        maxLength={60}
                                        onChange={(e) => setName(e.target.value)}
                                    ></input>
                                </div>
                            </PrefixDetailsCard>
                            <PrefixDetailsCard style={{ flex: '1 1 auto' }}>
                                <PrefixDetailHeader>Module Description</PrefixDetailHeader>
                                <textarea
                                    style={{ flex: '1 1 auto' }}
                                    placeholder="Module Description"
                                    value={description}
                                    maxLength={250}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </PrefixDetailsCard>
                            <PrefixDetailsCard>
                                <PrefixDetailHeader>Train Module</PrefixDetailHeader>
                                <div>
                                    <PrefixDetailRow>
                                        <div>Files being uploaded:</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {files.length}
                                        </div>
                                    </PrefixDetailRow>
                                    <PrefixDetailRow>
                                        <div>Total # of steps needed to train:</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            ~
                                            {[steps].map((value) =>
                                                value > 10000
                                                    ? `${(value / 1000).toFixed(0)}K`
                                                    : `${value.toFixed(0)}`
                                            )}
                                        </div>
                                    </PrefixDetailRow>
                                    <PrefixDetailRow>
                                        <div>Available remaining Anlas this month:</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {remainingSteps}
                                        </div>
                                    </PrefixDetailRow>
                                    <PrefixDetailRow></PrefixDetailRow>
                                </div>
                            </PrefixDetailsCard>
                            <PrefixDetailsCard>
                                <div>Percent of total steps to train:</div>
                                <StepSlider
                                    style={{ fontSize: '1.3rem' }}
                                    preventDecimal={true}
                                    steps={steps}
                                    disabled={!steps}
                                    min={50}
                                    changeDelay={10}
                                    max={Math.max(50, remainingSteps)}
                                    step={1}
                                    value={selectedSteps}
                                    onChange={(n) => setSelectedSteps(n)}
                                />
                                <Spacer />
                                <InvertedButton
                                    disabled={
                                        menuState !== PrefixUploaderState.FreeToUse ||
                                        !steps ||
                                        !name.trim() ||
                                        !description.trim() ||
                                        !remainingSteps
                                    }
                                    onClick={startTraining}
                                >
                                    {!remainingSteps
                                        ? 'No remaining Steps.'
                                        : !steps
                                        ? 'Please select your training data.'
                                        : !name.trim() || !description.trim()
                                        ? 'Please enter Name and Description.'
                                        : 'Train!'}
                                </InvertedButton>
                            </PrefixDetailsCard>
                        </PrefixDetailsContent>
                    </PrefixDetails>
                    {loading || menuState === PrefixUploaderState.Loading ? (
                        <LoadingOverlay>
                            <Spinner visible={true} style={{ width: '25px', height: '25px' }} />
                        </LoadingOverlay>
                    ) : null}
                    {menuState === PrefixUploaderState.ErrorBlocked && (
                        <ResultOverlay>
                            <ResultQueueInfo
                                style={{
                                    width: '100%',
                                    alignItems: 'center',
                                }}
                            >
                                <ErrorMessage style={{ backgroundColor: 'transparent' }}>
                                    <PrefixHeader>
                                        {'There was an error during module training: ' + error}
                                    </PrefixHeader>
                                </ErrorMessage>
                                {moduleTrainingError && (
                                    <LightColorButton
                                        style={{
                                            maxWidth: 'max-content',
                                            marginBottom: '10px',
                                        }}
                                        onClick={() => {
                                            deleteCurrentModule().then(() => {
                                                setModuleTrainingError(false)
                                            })
                                        }}
                                    >
                                        Discard Failed Module
                                    </LightColorButton>
                                )}
                            </ResultQueueInfo>
                        </ResultOverlay>
                    )}

                    {menuState === PrefixUploaderState.CurrentlyTraining ||
                    menuState === PrefixUploaderState.TrainingComplete ||
                    menuState === PrefixUploaderState.Queued ? (
                        <ResultOverlay className="trainer-result-overlay">
                            {menuState === PrefixUploaderState.Queued ? (
                                <ResultQueueInfo>
                                    <PrefixDetailHeader>
                                        <div>Queued...</div>
                                    </PrefixDetailHeader>
                                    <div>
                                        Waiting for queue. You can continue using NovelAI (or exit NovelAI
                                        entirely) without it affecting your position in queue.
                                    </div>
                                    <Spacer />
                                    <ResultQueueProgress percentage={1} />
                                </ResultQueueInfo>
                            ) : menuState === PrefixUploaderState.CurrentlyTraining ? (
                                <ResultQueueInfo>
                                    {lossGraph}
                                    <PrefixDetailTrain>
                                        <PrefixDetailHeader>
                                            <div>Training...</div>
                                        </PrefixDetailHeader>
                                        <PrefixDetailHeader>
                                            <div>{getCurrentPercentage()}%</div>
                                        </PrefixDetailHeader>
                                    </PrefixDetailTrain>
                                    <div>Currently being processed.</div>
                                    <Spacer />
                                    <ResultQueueProgress percentage={getCurrentPercentage()} />
                                    <ToggleLossButton onClick={() => setChartVisible(!chartVisible)}>
                                        {chartVisible ? '▼ Hide Loss Graph' : '▲ Show Loss Graph'}
                                    </ToggleLossButton>
                                </ResultQueueInfo>
                            ) : (
                                <ResultQueueInfo centered={true}>
                                    {lossGraph}
                                    <PrefixDetailHeader>
                                        <div>All Set!</div>
                                    </PrefixDetailHeader>
                                    <div style={{ textAlign: 'center' }}>
                                        Your module has been imported, but you can also download it here for
                                        the purpose of backup and sharing.
                                        <br />
                                        You will have to delete the current training data in order to train a
                                        new module. After deleting the training data, you won&rsquo;t be able
                                        to download the module again.
                                    </div>
                                    <Spacer />
                                    <FlexRow
                                        style={{
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: 10,
                                        }}
                                    >
                                        <InvertedButton onClick={() => downloadModuleFile(currentlyTraining)}>
                                            Download {`${currentlyTraining.name}.module`}
                                        </InvertedButton>
                                        <WarningButton
                                            style={{ width: 'auto' }}
                                            onConfirm={() => {
                                                deleteCurrentModule()
                                            }}
                                            buttonType={WarningButtonStyle.Danger}
                                            warningColors
                                            label="Delete Training Data"
                                            buttonText="Delete Training Data"
                                            warningText={
                                                <>
                                                    Do you really want to delete the training data?
                                                    <br />
                                                    This cannot be reversed.
                                                </>
                                            }
                                            confirmButtonText="Delete it!"
                                        />
                                    </FlexRow>
                                    <ToggleLossButton onClick={() => setChartVisible(!chartVisible)}>
                                        {chartVisible ? '▼ Hide Loss Graph' : '▲ Show Loss Graph'}
                                    </ToggleLossButton>
                                </ResultQueueInfo>
                            )}
                            {(window as any).debugUI === 1 ? (
                                <SubtleButton
                                    style={{ cursor: 'pointer', color: 'yellow' }}
                                    onClick={() => {
                                        setMenuState(PrefixUploaderState.FreeToUse)
                                    }}
                                >
                                    Dismiss
                                </SubtleButton>
                            ) : null}
                        </ResultOverlay>
                    ) : null}
                </PrefixBody>
            </PrefixEditor>
            {createPortal(
                <Modal
                    type={ModalType.Compact}
                    isOpen={purchaseModalOpen}
                    label={
                        <span>
                            Purchase <AnlaIcon style={{ display: 'inline-block', height: '1rem' }} /> Anlas
                        </span>
                    }
                    shouldCloseOnOverlayClick={true}
                    onRequestClose={() => setPurchaseModalOpen(false)}
                >
                    <Purchase />
                </Modal>,
                document.body
            )}
        </StyledPrefixModal>
    )
}
