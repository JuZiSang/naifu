import Head from 'next/head'
import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cssTransition, toast, ToastContainer } from 'react-toastify'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { useRouter } from 'next/router'
import { AnimatePresence, motion } from 'framer-motion'
import { HexAlphaColorPicker, HexColorInput } from 'react-colorful'
import { MdFileUpload, MdHelpOutline } from 'react-icons/md'
import { FaQuestion } from 'react-icons/fa'
import TextareaAutosize from 'react-textarea-autosize'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { ModalsOpen, Session, SiteTheme } from '../globals/state'
import {
    getImageGenerationRequest,
    ImageGenerationModels,
    StableDiffusionSampler,
} from '../data/request/request'
import { LightColorButton, SubtleButton } from '../styles/ui/button'
import { LoadingBar } from '../styles/components/conversation'
import {
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    ClipboardIcon,
    CrossIcon,
    DropperIcon,
    EmptySparklesIcon,
    EraserIcon,
    HistoryIcon,
    Icon,
    ImportIcon,
    PenIcon,
    PenWritingIcon,
    RedoIcon,
    SaveIcon,
    SelectIcon,
    SmallCrossIcon,
    SparklesIcon,
    UndoIcon,
    VariationsIcon,
} from '../styles/ui/icons'
import { getDropdownStyle, getDropdownTheme, Select } from '../components/controls/select'
import { FlexCol, FlexColSpacer, FlexRow, FlexSpaceFull } from '../styles/ui/layout'
import { useWindowSize, useWindowSizeBreakpoint } from '../hooks/useWindowSize'
import { downloadFile, logError } from '../util/browser'
import { MainSettingSliderCard, MinorSettingSliderCard } from '../components/sidebars/common/editorcard'
import Sidebar from '../components/sidebars/common/sidebar'
import {
    canCopyImageToClipboard,
    copyPngToClipboard,
    copyToClipboard,
} from '../components/sidebars/infobar/items/storyexporter'
import { LoadingSpinner } from '../components/loading'
import { CloseButton } from '../components/modals/common'
import useRememberedValue from '../hooks/useRememberedValue'
import Modal, { ModalType } from '../components/modals/modal'
import { useClickOutside } from '../hooks/useClickOutside'
import { mix, transparentize } from '../util/colour'
import { ImportInfo, StyledImportOverlay } from '../components/controls/fileimporter'
import Checkbox from '../components/controls/checkbox'
import { getStorage } from '../data/storage/storage'
import { getUserSetting } from '../data/user/settings'
import { useReload } from '../hooks/useReload'
import {
    BackendURLTagSearch,
} from '../globals/constants'
import Tooltip from '../components/tooltip'
import { WorkerInterface } from '../tokenizer/interface'
import { EncoderType } from '../tokenizer/encoder'
import { isTouchScreenDevice } from '../util/compat'

export const ToastArea = styled.div`
    position: fixed;
    right: 0;
    top: 0;
    width: 100%;
    z-index: 1000;

    .Toastify__toast-container {
        position: absolute;
    }

    .Toastify__toast {
        border-radius: 2px;
    }
    .Toastify__close-button {
        color: ${(props) => props.theme.colors.textMain};
    }

    .Toastify__progress-bar {
        height: 2px;
    }

    --toastify-color-light: ${(props) => props.theme.colors.bg3};
    --toastify-color-progress-light: ${(props) => props.theme.colors.textHeadings};
    --toastify-text-color-light: ${(props) => props.theme.colors.textMain};
    --toastify-font-family: ${(props) => props.theme.fonts.default};
`;

const MOBILE_WIDTH = 900

const fade = cssTransition({
    enter: 'fade-in-right',
    exit: 'fade-out-right',
})

let lastGenerationParams: string = ''

function randomSeed() {
    return Math.floor(Math.random() * 2 ** 32 - 1)
}

const DEFAULT_IMG2IMG_STEPS = 50
const SD_TOKEN_LIMIT = 225

const parsePrompt = (prompt: string[]): string => {
    const tempPrompt = prompt
    const actualPrompt: string[] = []
    const usedForPrepend = Array.from({ length: prompt.length })
    for (const p of tempPrompt) {
        const tempPrompt = p
        const lead = tempPrompt.match(/^~\d*/g)?.[0]
        let prependText = ''
        if (lead) {
            let num = Number.parseInt(lead?.slice(1) ?? '')
            if (Number.isNaN(num)) {
                num = 0
            }
            prependText = actualPrompt[num] ?? ''
            usedForPrepend[num] = true
        }
        const after = tempPrompt.slice(lead?.length ?? 0)
        actualPrompt.push(prependText + after)
    }
    const combinedPrompt = actualPrompt
        .filter((_, i) => {
            return !usedForPrepend[i]
        })
        .join('|')
    return combinedPrompt
}

const maxSamplesForSize = (width: number, height: number, max?: number): number => {
    let limit = 100;
    if (max) return Math.min(limit, max)
    return limit
}

export default function ImageGen(): JSX.Element {
    const router = useRouter()
    return (
        <>
            <Head>
                <title>NAIFU</title>
            </Head>
            <ToastArea>
                <ToastContainer autoClose={10000} />
            </ToastArea>
            <ImageGenContent />
        </>
    )
}

const closestMultiple = (num: number, mult: number): string => {
    const numInt = num
    const floor = Math.floor(numInt / mult) * mult
    const ceil = Math.ceil(numInt / mult) * mult
    const closest = numInt - floor < ceil - numInt ? floor : ceil
    if (Number.isNaN(closest)) return ''
    return (closest <= 0 ? mult : closest).toString()
}

const closestMultipleNum = (num: number, mult: number): number => {
    const numInt = num
    const floor = Math.floor(numInt / mult) * mult
    const ceil = Math.ceil(numInt / mult) * mult
    const closest = numInt - floor < ceil - numInt ? floor : ceil
    if (Number.isNaN(closest)) return 0
    return closest <= 0 ? mult : closest
}

const decimalRegex = /((\d*\.\d*)|(\d+))/g
const intRegex = /(\d+)/g
const negativeRegex = /(-)?(\d+)/g

const changeNumberValue = (
    str: string,
    set: (n: number | undefined) => void,
    decimal?: boolean,
    negative?: boolean
) => {
    let value = str.replace(/[^\d.-]+/g, '')
    const pattern = decimal ? decimalRegex : negative ? negativeRegex : intRegex
    const matches = value.match(pattern)
    if (matches) {
        value = matches[0]
    }
    let num: number | undefined = Number.parseFloat(value)
    if (Number.isNaN(num)) num = undefined
    set(num)
}

interface ImageInfo {
    height: number
    width: number
    data: Buffer
    url: string
    prompt: string[]
    negPrompt: string
    seed: number
    model: ImageGenerationModels
    params: any
    enhanced: boolean
    isVariationOriginal?: boolean
    enhanceOriginal?: string
}

function modelisStableDiffusion(model: ImageGenerationModels) {
    return (
        model === ImageGenerationModels.stableDiffusion ||
        model === ImageGenerationModels.naiDiffusion ||
        model === ImageGenerationModels.safeDiffusion ||
        model === ImageGenerationModels.waifuDiffusion ||
        model === ImageGenerationModels.naiDiffusionFurry
    )
}

function validateParameters(params: any, model: ImageGenerationModels): boolean {
    if (modelisStableDiffusion(model) && (!params.width || !params.height || params.steps > 50)) return false
    return true
}

function paramsAreSame(a: any, b: any): boolean {
    return (
        // SD series params
        (a.width != undefined &&
            b.width !== undefined &&
            a.width === b.width &&
            a.height === b.height &&
            a.scale === b.scale &&
            a.sampler === b.sampler &&
            a.steps === b.steps &&
            a.strength === b.strength &&
            a.noise === b.noise) ||
        // DALL-E mini params
        (a.temperature !== undefined &&
            b.temperature !== undefined &&
            a.temperature === b.temperature &&
            a.top_k === b.top_k &&
            a.supercondition_factor === b.supercondition_factor)
    )
}

function getModelDefaultParams(model: ImageGenerationModels): any {
    switch (model) {
        case ImageGenerationModels.stableDiffusion:
        case ImageGenerationModels.naiDiffusion:
        case ImageGenerationModels.safeDiffusion:
        case ImageGenerationModels.waifuDiffusion:
        case ImageGenerationModels.naiDiffusionFurry:
            return {
                width: 512,
                height: 768,
                scale: 12,
                sampler: StableDiffusionSampler.kEulerAncestral,
                steps: 28,
                seed: undefined,
                n_samples: 1,
                strength: 0.7,
                noise: 0.2,
                module: undefined,
                ucPreset: 0,
                qualityToggle: true,
            }
        case ImageGenerationModels.dalleMini: {
            return {
                temperature: 0.5,
                top_k: 10,
                supercondition_factor: 0.5,
                n_samples: 4,
            }
        }
    }
}

const ImageModels = [
    {
        id: ImageGenerationModels.safeDiffusion,
        name: 'NAI Diffusion Anime (Curated)',
        description: 'Good baseline quality and predictable subject matter.',
    },
    {
        id: ImageGenerationModels.naiDiffusion,
        name: 'NAI Diffusion Anime (Full)',
        description: 'The expanded training set allows for a wider variety of generations.',
    },
/*
    {
        id: ImageGenerationModels.naiDiffusionFurry,
        name: 'NAI Diffusion Furry (Beta)',
        description: 'Beta model for generating furry content.',
    },
    ...(Environment !== 'production'
        ? [
              {
                  id: ImageGenerationModels.stableDiffusion,
                  name: 'Stable Diffusion',
                  description: '',
              },
              {
                  id: ImageGenerationModels.waifuDiffusion,
                  name: 'Waifu Diffusion',
                  description: '',
              },
          ]
        : []),
*/
]

const EffectMagnitudes = [
    {
        strength: 0.2,
        noise: 0,
    },
    {
        strength: 0.4,
        noise: 0,
    },
    {
        strength: 0.5,
        noise: 0,
    },
    {
        strength: 0.6,
        noise: 0,
    },
    {
        strength: 0.6,
        noise: 0,
    },
]

function getModelUcPreset(model: ImageGenerationModels): { name: string; text: string }[] {
    switch (model) {
        case ImageGenerationModels.naiDiffusion:
        case ImageGenerationModels.safeDiffusion:
            return [
                {
                    name: 'Low Quality + Bad Anatomy',
                    // eslint-disable-next-line max-len
                    text: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
                },
                {
                    name: 'Low Quality',
                    // eslint-disable-next-line max-len
                    text: 'lowres, text, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
                },
                {
                    name: 'None',
                    text: 'lowres',
                },
                {
                    name: 'NSFW + Low Quality + Bad Anatomy',
                    // eslint-disable-next-line max-len
                    text: 'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
                },
                {
                    name: 'NSFW + Low Quality',
                    // eslint-disable-next-line max-len
                    text: 'nsfw, lowres, text, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
                },
                {
                    name: 'NSFW',
                    text: 'nsfw, lowres',
                },
            ]
        case ImageGenerationModels.naiDiffusionFurry:
            return [
                {
                    name: 'Low Quality',
                    // eslint-disable-next-line max-len
                    text: 'text, signature, watermark, simple background, toony, dated, low res, line art, flat colors',
                },
                {
                    name: 'None',
                    text: 'low res',
                },
            ]
        default:
            return []
    }
}

const rememberedUc: Map<ImageGenerationModels, number> = new Map()

function getImageFromBuffer(image: Buffer | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.addEventListener('load', () => resolve(img))
        img.addEventListener('error', () => reject(new Error('Failed to load image')))
        img.src = `data:image/png;base64,${image.toString('base64')}`
    })
}

async function fillImageBackground(
    img: string,
    color: string,
    height?: number,
    width?: number,
    convertJpg?: boolean
) {
    const canvas = document.createElement('canvas')
    const image = await getImageFromBuffer(img)
    canvas.width = width || image.width
    canvas.height = height || image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        toast('Could not create canvas context')
        return
    }
    ctx.fillStyle = color
    ctx.fillRect(0, 0, image.width, image.height)
    if (width && height) {
        ctx.drawImage(image, 0, 0, width, height)
    } else {
        ctx.drawImage(image, 0, 0)
    }
    let uri = ''
    try {
        uri = convertJpg ? canvas.toDataURL('image/jpeg', 0.95) : canvas.toDataURL('image/png')
    } catch {
        uri = canvas.toDataURL('image/png')
    }
    return uri.split(',')[1]
}

function ImageGenContent(): JSX.Element {
    const [images, setImages] = useState<ImageInfo[][]>([])
    useEffect(() => {
        // set warning to display if page close is attemped that images are not saved
        const func = (e: any) => {
            if (images.length > 0) {
                e.preventDefault()
                e.returnValue =
                    'Images generated are not saved and you must download any you want to keep. Are you sure you want exit?'
            }
        }
        window.addEventListener('beforeunload', func)
        return () => {
            window.removeEventListener('beforeunload', func)
        }
    }, [images.length])
    const [generating, setGenerating] = useState(false)
    const [selectedImage, setSelectedImage] = useState(0)
    const [session, setSession] = useRecoilState(Session)

    const [params, actualSetParams] = useState<any>(
        getModelDefaultParams(ImageGenerationModels.stableDiffusion)
    )
    const [prompt, setPrompt] = useState([''] as string[])
    const [promptLines, setPromptLines] = useState([1] as number[])
    const [negPrompt, setNegPrompt] = useRememberedValue('imagegen-negativeprompt', '')

    const didMessageNoAccount = useRef(false)
    useEffect(() => {
        if (session.noAccount && !didMessageNoAccount.current) {
            toast('An account is required to generate images.')
            didMessageNoAccount.current = true
        }
    }, [session])

    const setParams = useCallback(
        (newParams: any) => {
            if (JSON.stringify(newParams) !== JSON.stringify(params)) {
                actualSetParams(newParams)
            }
        },
        [params, actualSetParams]
    )

    const windowSize = useWindowSize()

    const imagesContainerRef = useRef<HTMLDivElement>(null)

    const [rows, setRows] = useState(1)
    const [columns, setColumns] = useState(1)
    const [rerollMode, setRerollMode] = useState(false)
    const [imageWidth, setImageWidth] = useState(0)
    const [imageHeight, setImageHeight] = useState(0)

    const [expandedImageWidth, setExpandedImageWidth] = useState(1)
    const [expandedImageHeight, setExpandedImageHeight] = useState(1)

    const [selectedModel, setSelectedModel] = useState<ImageGenerationModels>(
        ImageGenerationModels.safeDiffusion
    )
    const [enhanceBoxVisible, setEnhanceBoxVisible] = useState(false)

    const [enhanceScale, setEnhanceScale] = useState(2)
    const [enhanceStrength, setEnhanceStrength] = useState(EffectMagnitudes[2].strength)
    const [enhanceNoise, setEnhanceNoise] = useState(EffectMagnitudes[2].noise)

    const [expandedImage, setExpandedImage] = useState<number | undefined>(void 0)

    const [showEnhancedExtraSettings, setShowEnhancedExtraSettings] = useRememberedValue(
        'enhancedSettings',
        false
    )

    const [initImage, setInitImage] = useState<Buffer | undefined>(void 0)

    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)

    useEffect(() => {
    }, [
        params,
        selectedModel,
        session,
        enhanceScale,
        images,
        selectedImage,
        expandedImage,
        enhanceStrength,
        enhanceNoise,
    ])
    const fetchVariationsPriceTimeout = useRef(0)

    const [promptTokens, setPromptTokens] = useState<number[]>([])
    const calcPromptTimeout = useRef(0)
    const lastPromptTokensRequest = useRef(0)
    useEffect(() => {
        clearTimeout(calcPromptTimeout.current)
        const requestId = Math.floor(Math.random() * 65000)
        lastPromptTokensRequest.current = requestId
        calcPromptTimeout.current = setTimeout(() => {
            if (!prompt || !prompt[0]) {
                setPromptTokens([])
                return
            }
            const prompts = prompt[0].split('|')
            const worker = new WorkerInterface()
            Promise.all(prompts.map((prompt) => worker.encode(prompt, EncoderType.CLIP)))
                .then((results) => {
                    setPromptTokens(results.map((r) => r.length))
                })
                .catch((error) => {
                    logError(error)
                })
        }, 50) as unknown as number
    }, [prompt])

    const lastPromptTokensGood = useRef(true)
    useEffect(() => {
        if (promptTokens.some((t) => t > SD_TOKEN_LIMIT) && lastPromptTokensGood.current) {
            lastPromptTokensGood.current = false
            toast(
                'Prompt is too long and will be cut off. Using ' +
                    promptTokens +
                    ' out of ' +
                    SD_TOKEN_LIMIT +
                    ' available tokens.'
            )
        } else if (promptTokens.every((t) => t <= SD_TOKEN_LIMIT)) {
            lastPromptTokensGood.current = true
        }
    }, [promptTokens])

    const [negPromptTokens, setNegPromptTokens] = useState(0)
    const calcNegPromptTimeout = useRef(0)
    const lastNegPromptTokensRequest = useRef(0)
    useEffect(() => {
        clearTimeout(calcNegPromptTimeout.current)
        const requestId = Math.floor(Math.random() * 65000)
        lastNegPromptTokensRequest.current = requestId
        calcNegPromptTimeout.current = setTimeout(() => {
            if (!negPrompt) {
                setNegPromptTokens(0)
                return
            }
            const prompts = [negPrompt]
            const worker = new WorkerInterface()
            Promise.all(prompts.map((prompt) => worker.encode(prompt, EncoderType.CLIP)))
                .then((results) => {
                    const length = Math.max(...results.map((r) => r.length))
                    if (requestId !== lastNegPromptTokensRequest.current) return
                    setNegPromptTokens(length)
                })
                .catch((error) => {
                    logError(error)
                })
        }, 50) as unknown as number
    }, [negPrompt])

    const lastNegPromptTokensGood = useRef(true)
    useEffect(() => {
        if (negPromptTokens > SD_TOKEN_LIMIT && lastNegPromptTokensGood.current) {
            lastNegPromptTokensGood.current = false
            toast(
                'Negative prompt is too long and will be cut off. Using ' +
                    negPromptTokens +
                    ' out of ' +
                    SD_TOKEN_LIMIT +
                    ' available tokens.'
            )
        } else if (negPromptTokens <= SD_TOKEN_LIMIT) {
            lastNegPromptTokensGood.current = true
        }
    }, [negPromptTokens])

    const [lastFocusedPrompt, setLastFocusedPrompt] = useState<number | undefined>()
    const [tagSuggestions, setTagSuggestions] = useState<Array<[string, number]> | undefined>()
    const [searchingTags, setSearchingTags] = useState(false)
    const lastTagSearchPrompt = useRef('')
    const lastTagSearchTimeout = useRef(0)
    const lastPromptLength = useRef(0)
    const [suggestionSelectionIndex, setSuggestionSelectionIndex] = useState(-1)
    const lastTagSearchRequest = useRef(0)
    const searchCanceled = useRef(false)

    const performTagSearch = useCallback(
        (prompt: string) => {
            if (session.noAccount) return
            const requestId = Math.floor(Math.random() * 65000)
            lastTagSearchRequest.current = requestId
            fetch(
                BackendURLTagSearch +
                    //`?model=${encodeURIComponent(selectedModel.toString())}&prompt=${encodeURIComponent(
                    `?prompt=${encodeURIComponent(
                        prompt.trim()
                    )}`,
                {
                    mode: 'cors',
                    cache: 'default',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + session.auth_token,
                    },
                    method: 'GET',
                }
            )
                .then((response) => response.json())
                .then((json) => {
                    if (requestId !== lastTagSearchRequest.current || !json.tags) return
                    const tags = json.tags.map((tag: any) => [tag.tag, tag.count])
                    if (!searchCanceled.current) setTagSuggestions(tags)
                })
                .catch((error) => {
                    logError(error)
                })
                .finally(() => {
                    setSearchingTags(false)
                })
        },
        [selectedModel, session]
    )

    const queueDelayedTagSearch = (prompt: string) => {
        if (lastFocusedPrompt === undefined) return
        searchCanceled.current = false
        lastPromptLength.current = prompt.length
        clearTimeout(lastTagSearchTimeout.current)
        lastTagSearchTimeout.current = setTimeout(() => {
            lastTagSearchPrompt.current = prompt
            const element = document.querySelector('#prompt-input-' + lastFocusedPrompt) as HTMLInputElement
            if (!element) return
            const cursorPosition = element.selectionStart ?? 0
            const beforePosition = prompt.slice(0, cursorPosition)
            // prompt text should be everything from last comma to cursor
            let lastComma = beforePosition.lastIndexOf(',')
            if (lastComma === -1) lastComma = 0
            else lastComma += 1
            // if there is a space after the comma, also include that
            if (beforePosition[lastComma] === ' ') lastComma += 1
            const promptText = beforePosition.slice(lastComma)
            if (!promptText || promptText.length < 2 || promptText.length > 20) return
            setSearchingTags(true)
            performTagSearch(promptText)
        }, 500) as unknown as number

        const element = document.querySelector('#prompt-input-' + lastFocusedPrompt) as HTMLInputElement
        if (!element) return
        const cursorPosition = element.selectionStart ?? 0
        const beforePosition = prompt.slice(0, cursorPosition)
        // prompt text should be everything from last comma to cursor
        let lastComma = beforePosition.lastIndexOf(',')
        if (lastComma === -1) lastComma = 0
        else lastComma += 1
        // if there is a space after the comma, also include that
        if (beforePosition[lastComma] === ' ') lastComma += 1
        const promptText = beforePosition.slice(lastComma)
        if (!promptText || promptText.length < 2 || promptText.length > 20) return
        if (tagSuggestions) {
            setSearchingTags(true)
        }
        setTagSuggestions(void 0)
        setSuggestionSelectionIndex(-1)
    }

    const clearTagSearch = useCallback(() => {
        clearTimeout(lastTagSearchTimeout.current)
        setSearchingTags(false)
        setTagSuggestions(void 0)
        setSuggestionSelectionIndex(-1)
        searchCanceled.current = true
    }, [])

    const insertTagToPrompt = useCallback(
        (tag: string, promptid?: number) => {
            if (lastFocusedPrompt === undefined) return
            // insert the tag, inserting the text at the cursor position
            const element = document.querySelector('#prompt-input-' + lastFocusedPrompt) as HTMLInputElement
            if (!element) return
            const cursorPosition = element.selectionStart ?? 0
            // replace text from position to the first comma before it
            const beforePosition = prompt[lastFocusedPrompt].slice(0, cursorPosition)
            // if there is no comma, replace from the beginning
            let lastComma = beforePosition.lastIndexOf(',')
            if (lastComma === -1) lastComma = 0
            else lastComma += 1
            // if there is a space after the comma, also include that
            let addSpace = false
            if (beforePosition === ' ') {
                lastComma += 1
            } else {
                addSpace = lastComma !== 0
            }
            let newPrompt =
                prompt[lastFocusedPrompt].slice(0, lastComma) +
                (addSpace ? ' ' : '') +
                tag +
                prompt[lastFocusedPrompt].slice(cursorPosition)
            if (!prompt[lastFocusedPrompt].slice(cursorPosition)?.trim()) {
                newPrompt += ', '
            }
            setPrompt((v) => {
                return [...v.slice(0, lastFocusedPrompt), newPrompt, ...v.slice(lastFocusedPrompt + 1)]
            })
            if (promptid !== undefined) {
                setTimeout(() => {
                    const input = document.querySelector(`#prompt-input-${promptid}`) as HTMLInputElement
                    if (input) input.focus()
                }, 10)
            }
        },
        [lastFocusedPrompt, prompt]
    )

    useEffect(() => {
        if (imagesContainerRef.current && images[selectedImage]) {
            const rect = imagesContainerRef.current.getBoundingClientRect()
            const rectWidth = rect.width - 40 - (columns - 1) * 20
            const rectHeight = rect.height - 40 - (rows - 1) * 20

            const selectedImages = images[selectedImage]
            if (!selectedImages[0]) return
            if (!rect || !selectedImages) return
            const rectAspectRatio = rectWidth / rectHeight
            const selectedImagesAspectRatio =
                (selectedImages[0].width * columns) / (selectedImages[0].height * rows)
            const singleImageAspectRatio = selectedImages[0].width / selectedImages[0].height
            // Determine whether or not to base the image size on the width or height of the container
            const baseOnWidth = rectAspectRatio < selectedImagesAspectRatio
            if (baseOnWidth) {
                const width = rectWidth
                const imageWidth = width / columns
                setImageWidth(imageWidth)
                setImageHeight(imageWidth / singleImageAspectRatio)
            } else {
                const height = rectHeight
                const imageHeight = height / rows
                setImageHeight(imageHeight)
                setImageWidth(imageHeight * singleImageAspectRatio)
            }

            const expandedBaseOnWidth = rectAspectRatio < singleImageAspectRatio
            if (expandedBaseOnWidth) {
                const expandedWidth = rect.width - 40
                setExpandedImageWidth(expandedWidth)
                setExpandedImageHeight(expandedWidth / singleImageAspectRatio)
            } else {
                const expandedHeight = rect.height - 40
                setExpandedImageHeight(expandedHeight)
                setExpandedImageWidth(expandedHeight * singleImageAspectRatio)
            }
        }
    }, [columns, images, rows, selectedImage, windowSize, prompt.length, promptLines])

    useEffect(() => {
        const rect = imagesContainerRef.current?.getBoundingClientRect()
        const selectedImages = images[selectedImage]

        if (rect && selectedImages?.[0]) {
            const containerAspectRatio = rect.width / rect.height
            const imageWidth = selectedImages[0].width
            const imageHeight = selectedImages[0].height
            // Derive the possible number of layouts based on the number of images
            const possibleLayouts: { columns: number; rows: number }[] = []
            // Find all possible combinations of columns and rows that can fit the images
            for (let columns = 1; columns <= selectedImages.length; columns++) {
                for (let rows = 1; rows <= selectedImages.length; rows++) {
                    if (columns * rows >= selectedImages.length) possibleLayouts.push({ columns, rows })
                }
            }
            // Eliminate layouts with more than one blank space
            const layouts = possibleLayouts.filter((layout) => {
                const blankSpaces = layout.columns * layout.rows - selectedImages.length
                return blankSpaces <= 1
            })
            // Determine which layout is the best fit for the container
            const bestLayout = layouts.reduce(
                (best, layout) => {
                    const layoutAspectRatio = (layout.columns * imageWidth) / (layout.rows * imageHeight)
                    const layoutScore = Math.abs(layoutAspectRatio - containerAspectRatio)
                    // Penalize layouts with more than one blank space
                    if (layoutScore < best.score) {
                        return { layout, score: layoutScore }
                    }
                    return best
                },
                { layout: { columns: 1, rows: 1 }, score: Number.POSITIVE_INFINITY }
            )
            setRows(bestLayout.layout.rows)
            setColumns(bestLayout.layout.columns)
        }
    }, [images, selectedImage, windowSize, prompt.length])

    const downloadImage = (image: ImageInfo) => {
        downloadFile(image.data, `${image.prompt.join('|').slice(0, 180)} s-${image.seed}.png`, 'image/png')
    }

    const spinnerRef = useRef(0)
    const visible = useRef(true)
    const title = useRef('NAIFU')
    useEffect(() => {
        const chars = [...'◰◳◲◱']
        let i = 0
        const update = () => {
            document.title = chars[i] + ' ' + title.current
            i = (i + 1) % chars.length
        }
        clearInterval(spinnerRef.current)
        if (generating) {
            spinnerRef.current = setInterval(update, 25) as unknown as number
        } else {
            document.title = visible.current ? title.current : '✓ ' + title.current
        }
    }, [generating])
    const generatingRef = useRef(generating)
    generatingRef.current = generating
    useEffect(() => {
        const callback = () => {
            visible.current = document.visibilityState === 'visible'
            if (!generatingRef.current) {
                document.title = title.current
            }
        }
        document.addEventListener('visibilitychange', callback)
        return () => document.removeEventListener('visibilitychange', callback)
    }, [])

    const generateImage = async (enhance?: ImageInfo, variations?: ImageInfo) => {
        if (generating) {
            toast('Already generating an image')
            return
        }
        if (session.noAccount) {
            toast('An account is required to generate images.')
            return
        }
        try {
            let tempParams = { ...params }
            let tempPrompt = prompt
            if (modelisStableDiffusion(selectedModel) && tempParams.seed === undefined) {
                tempParams.seed = randomSeed()
            }

            if (enhance && !modelisStableDiffusion(selectedModel)) {
                tempParams = getModelDefaultParams(ImageGenerationModels.stableDiffusion)
            }

            if (enhance) {
                tempParams.width = Math.floor(enhance.width * enhanceScale)
                tempParams.height = Math.floor(enhance.height * enhanceScale)
                tempParams.n_samples = 1
                tempParams.image = enhance.data.toString('base64')
                tempPrompt = enhance.prompt
                tempParams.strength = enhanceStrength
                tempParams.noise = enhanceNoise
            } else if (initImage) {
                tempParams.image = initImage.toString('base64')
            }

            if (variations) {
                tempParams = {
                    ...variations.params,
                    n_samples: maxSamplesForSize(variations.params.width, variations.params.height, 3),
                    image: variations.data.toString('base64'),
                    strength: 0.8,
                    noise: 0.1,
                    steps: 50,
                    seed: Math.floor(Math.random() * 2 ** 32 - 1),
                }
                tempPrompt = variations.prompt
            }

            if (tempParams.image) {
                // use a canvas to put a white background on the image
                tempParams.image = await fillImageBackground(
                    tempParams.image,
                    'white',
                    tempParams.height,
                    tempParams.width,
                    true
                )
                // use always default step count for imig2img
                tempParams.steps = DEFAULT_IMG2IMG_STEPS
            }

            if (!validateParameters(tempParams, selectedModel)) {
                toast('Invalid parameters')
                return
            }

            let combinedPrompt = parsePrompt(tempPrompt)
            const ucPresets = getModelUcPreset(selectedModel)

            if (ucPresets.length > 0) {
                if (modelisStableDiffusion(selectedModel)) {
                    tempParams.uc = ucPresets[tempParams.ucPreset ?? 0].text
                    if (
                        selectedModel !== ImageGenerationModels.safeDiffusion &&
                        tempParams.uc !== ucPresets[ucPresets.length - 1].text &&
                        !combinedPrompt.toLowerCase().includes('nsfw')
                    ) {
                        let nsfw = 'nsfw'
                        if (tempParams.uc !== '') {
                            nsfw = nsfw + ', '
                        }

                        tempParams.uc = nsfw + tempParams.uc
                    }
                }

                if (negPrompt) {
                    if (tempParams.ucPreset === ucPresets.length - 1) {
                        tempParams.uc = ''
                    }
                    if (tempParams.uc !== '') {
                        tempParams.uc = tempParams.uc + ', '
                    }
                    tempParams.uc = tempParams.uc + negPrompt
                }
            }

            if (tempParams.qualityToggle) {
                combinedPrompt = 'masterpiece, best quality, ' + combinedPrompt
                delete tempParams.qualityToggle
            }

            const paramString = JSON.stringify({
                prompt: combinedPrompt,
                model: selectedModel,
                ...tempParams,
            })
            if (paramString === lastGenerationParams) {
                toast('Identical parameters to last generation')
                return
            }

            tempParams.n_samples = maxSamplesForSize(
                tempParams.width,
                tempParams.height,
                tempParams.n_samples
            )

            const request = getImageGenerationRequest(session, combinedPrompt, selectedModel, {
                ...tempParams,
            })
            setGenerating(true)
            const newImages: ImageInfo[] = []
            request.requestStream(
                async (buffer: Buffer, id: string) => {
                    const numId = Number.parseInt(id, 0) - 1
                    const url = URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }))
                    setSelectedImage(0)
                    newImages[numId] = {
                        data: buffer,
                        url: url,
                        prompt: prompt,
                        negPrompt: negPrompt,
                        height: tempParams.height ?? 256,
                        width: tempParams.width ?? 256,
                        seed: tempParams.seed + numId,
                        model: selectedModel,
                        params: { ...tempParams },
                        enhanced: enhance ? true : false,
                        enhanceOriginal: enhance?.url ?? undefined,
                    }
                },
                (error: any) => {
                    setGenerating(false)
                    toast(error.message);
                },
                () => {
                    setGenerating(false)
                    if (newImages.length > 0) {
                        if (variations) {
                            // if it's a variation, add the original image in the beginning
                            setImages([
                                [{ ...variations, isVariationOriginal: true }, ...newImages],
                                ...images,
                            ])
                        } else {
                            setImages([newImages, ...images])
                        }
                        lastGenerationParams = paramString
                    }
                }
            )
        } catch (error: any) {
            toast('Error generating image: ' + error.message ?? error)
            setGenerating(false)
            return
        }
    }

    const [rerollImageInfo, setRerollImageInfo] = useState<ImageInfo | undefined>()

    const rerollImage = async (
        image: ImageInfo,
        masks: { seed: number; mask: Buffer }[]
    ): Promise<{
        images: ImageInfo[]
        seeds: number[]
    }> => {
        if (generating) {
            toast('Already generating an image')
            throw 'Already generating an image'
        }
        return new Promise<{ images: ImageInfo[]; seeds: number[] }>((resolve, reject) => {
            try {
                const tempParams = {
                    ...image.params,
                    seed: image.seed,
                    n_samples: 1,
                    masks: masks.map((m) => {
                        return {
                            seed: m.seed,
                            mask: m.mask.toString('base64'),
                        }
                    }),
                }
                const combinedPrompt = parsePrompt(image.prompt)

                const paramString = JSON.stringify({
                    prompt: combinedPrompt,
                    model: selectedModel,
                    ...tempParams,
                })
                if (paramString === lastGenerationParams) {
                    toast('Identical parameters to last generation')
                    reject()
                    return
                }

                const request = getImageGenerationRequest(session, combinedPrompt, selectedModel, {
                    ...tempParams,
                })
                setGenerating(true)
                const newImages: ImageInfo[] = []
                request.requestStream(
                    async (buffer: Buffer, id: string) => {
                        const numId = Number.parseInt(id, 0) - 1
                        const url = URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }))
                        setSelectedImage(0)
                        newImages[numId] = {
                            data: buffer,
                            url: url,
                            prompt: prompt,
                            negPrompt: negPrompt,
                            height: tempParams.height ?? 256,
                            width: tempParams.width ?? 256,
                            seed: tempParams.seed + numId,
                            model: selectedModel,
                            params: { ...tempParams },
                            enhanced: image ? true : false,
                        }
                    },
                    (error: any) => {
                        setGenerating(false)
                        toast(error.message ?? error)
                    },
                    () => {
                        setGenerating(false)
                        if (newImages.length > 0) {
                            setImages([newImages, ...images])
                            setRerollImageInfo(newImages[0])
                            lastGenerationParams = paramString
                        }
                        resolve({ images: newImages, seeds: masks.map((m) => m.seed) })
                    }
                )
            } catch {
                toast('Error generating image')
                setGenerating(false)
                reject()
                return
            }
        })
    }

    const [shownHover, setShownHover] = useState<number | undefined>(void 0)
    const siteTheme = useRecoilValue(SiteTheme)

    const [historyVisible, setHistoryVisible] = useState(false)
    const sideBarWindowSize = useWindowSizeBreakpoint(MOBILE_WIDTH, 0)

    useEffect(() => {
        if (
            sideBarWindowSize.width > MOBILE_WIDTH &&
            (!sideBarWindowSize.prevWidth || sideBarWindowSize.prevWidth <= MOBILE_WIDTH)
        ) {
            setHistoryVisible(true)
        }
        if (
            sideBarWindowSize.width <= MOBILE_WIDTH &&
            (!sideBarWindowSize.prevWidth || sideBarWindowSize.prevWidth > MOBILE_WIDTH)
        ) {
            setHistoryVisible(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sideBarWindowSize.width])

    useEffect(() => {
        // scroll historyContainer to bottom when images change
        const historyContainer = document.querySelector('#historyContainer')
        if (historyContainer && historyVisible)
            (historyContainer.lastChild as HTMLElement)?.scrollIntoView({ behavior: 'smooth' })
        setExpandedImage(void 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [images])

    const modelSelect = (
        <Select
            menuPlacement="auto"
            isSearchable={false}
            aria-label="Select the Model"
            maxMenuHeight={420}
            options={ImageModels.map((m) => {
                return {
                    value: m.id,
                    description: m.name,
                    label: (
                        <>
                            <ModelTitle style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                {m.name}
                            </ModelTitle>
                            <div style={{ fontSize: '0.875rem' }}>{m.description}</div>
                        </>
                    ),
                }
            })}
            onChange={(e) => {
                if (e !== null) {
                    const bothModelsAreOfSameType =
                        modelisStableDiffusion(selectedModel) === modelisStableDiffusion(e.value) ||
                        selectedModel == e.value
                    rememberedUc.set(selectedModel, params.ucPreset)
                    setSelectedModel(e.value)
                    if (!bothModelsAreOfSameType) setParams(getModelDefaultParams(e.value))
                    if (bothModelsAreOfSameType) {
                        setParams({
                            ...params,
                            ucPreset: rememberedUc.get(e.value) ?? 0,
                        })
                    }
                }
            }}
            value={{
                value: selectedModel,
                description: `${ImageModels.find(({ id }) => id === selectedModel)?.name ?? 'Unknown'} `,
                label: (
                    <>
                        <ModelTitle style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                            {ImageModels.find(({ id }) => id === selectedModel)?.name ?? 'Unknown'}
                        </ModelTitle>
                        <div style={{ fontSize: '0.875rem', whiteSpace: 'normal' }}>
                            {ImageModels.find(({ id }) => id === selectedModel)?.description ?? 'Unknown'}
                        </div>
                    </>
                ),
            }}
            styles={{
                ...getDropdownStyle(siteTheme),
                valueContainer: (p, s) => ({
                    ...getDropdownStyle(siteTheme).valueContainer(p, s),
                    padding: '18px 20px 14px 20px',
                }),
            }}
            theme={getDropdownTheme(siteTheme)}
        />
    )

    useEffect(() => {
        setEnhanceBoxVisible(false)
    }, [selectedImage])

    const validEnhanceSizes = useMemo(() => {
        const width = images[selectedImage]?.[0]?.width ?? 0
        const height = images[selectedImage]?.[0]?.height ?? 0
        return [2, 1.5, 1].filter((s) => {
            // Check that pixels does not exceed max pixels and resulting sizes are divisible by 64
            return width * s * height * s <= 1024 * 1024 && (width * s) % 64 === 0 && (height * s) % 64 === 0
        })
    }, [images, selectedImage])

    useEffect(() => {
        setEnhanceScale(() => {
            return validEnhanceSizes[0]
        })
    }, [validEnhanceSizes])

    const [magnitude, setMagnitude] = useState(3)

    const enhanceBox = (
        <EnhanceBox
            onClick={(e) => {
                e.stopPropagation()
            }}
        >
            <CloseButton
                onClick={() => setEnhanceBoxVisible(false)}
                style={{
                    top: 5,
                    right: 5,
                }}
            >
                <div />
            </CloseButton>
            <EnhanceTitle>
                <SparklesIcon /> Enhance Image
            </EnhanceTitle>
            <SubtleButton
                style={{
                    opacity: 0.5,
                    fontSize: '0.875rem',
                }}
                onClick={() => {
                    setShowEnhancedExtraSettings(!showEnhancedExtraSettings)
                }}
            >
                {showEnhancedExtraSettings ? 'Hide' : 'Show'} individual settings
            </SubtleButton>
            {showEnhancedExtraSettings && (
                <FlexRow style={{ gap: 20 }}>
                    <div style={{ flex: '1' }}>
                        <MainSettingSliderCard
                            title={'Strength'}
                            value={enhanceStrength}
                            onChange={(e) => {
                                setEnhanceStrength(e)
                            }}
                            min={0}
                            max={0.99}
                            step={0.01}
                            style={{ margin: 0 }}
                            simple={true}
                        />
                    </div>
                    <div style={{ flex: '1' }}>
                        <MainSettingSliderCard
                            title={'Noise'}
                            value={enhanceNoise}
                            onChange={(e) => {
                                setEnhanceNoise(e)
                            }}
                            min={0}
                            max={0.99}
                            step={0.01}
                            style={{ margin: 0 }}
                            simple={true}
                        />
                    </div>
                </FlexRow>
            )}
            {!showEnhancedExtraSettings && (
                <MainSettingSliderCard
                    title={'Magnitude'}
                    value={magnitude}
                    onChange={(e) => {
                        setMagnitude(e)
                        setEnhanceStrength(EffectMagnitudes[e - 1].strength)
                        setEnhanceNoise(EffectMagnitudes[e - 1].noise)
                    }}
                    min={1}
                    max={5}
                    step={1}
                    style={{ margin: 0 }}
                    simple={true}
                />
            )}
            <FlexRow
                style={{
                    alignItems: 'flex-end',
                    gap: '20px',
                }}
            >
                <InputLabel
                    style={{
                        minWidth: '150px',
                        flex: '2',
                    }}
                >
                    <Title>Upscale Amount</Title>
                    <Select
                        isSearchable={false}
                        aria-label="Select a Resolution"
                        maxMenuHeight={420}
                        menuPlacement="top"
                        isDisabled={validEnhanceSizes.length <= 1}
                        options={validEnhanceSizes.map((scale) => {
                            return {
                                value: scale,
                                description: `x${scale}`,
                                label: <>{`x${scale}`}</>,
                            }
                        })}
                        onChange={(e) => {
                            if (e !== null) {
                                setEnhanceScale(e.value)
                            }
                        }}
                        value={{
                            value: enhanceScale,
                            description: `${enhanceScale}x`,
                            label: <>{`${enhanceScale}x`}</>,
                        }}
                        styles={getDropdownStyle(siteTheme)}
                        theme={getDropdownTheme(siteTheme)}
                    />
                </InputLabel>
                <EnhanceButton
                    disabled={
                        generating ||
                        prompt.some((p) => !p) ||
                        !validateParameters(params, selectedModel)
                    }
                    onClick={() => {
                        setEnhanceBoxVisible(false)
                        setExpandedImage(void 0)
                        generateImage(images[selectedImage][expandedImage ?? 0])
                    }}
                >
                    <span>Enhance!</span>
                </EnhanceButton>
            </FlexRow>
        </EnhanceBox>
    )

    const previewHeight = params.width > params.height ? 100 * (params.height / params.width) : 100
    const previewWidth = params.width > params.height ? 100 : 100 * (params.width / params.height)
    const [showCanvas, setShowCanvas] = useState(false)

    const initImageInputRef = useRef<HTMLInputElement>(null)
    const [initThumbnail, setInitThumbnail] = useState<string | undefined>(void 0)
    // update thumbnail when init image is set
    useEffect(() => {
        if (initImage) {
            // create blob url for thumbnail
            const thumbnail = URL.createObjectURL(new Blob([initImage], { type: 'image/png' }))
            setInitThumbnail(thumbnail)
        }
    }, [initImage])

    const setBestSizeForInitImage = (image: Buffer) => {
        // initImage is a Buffer
        const img = new Image()
        img.src = URL.createObjectURL(new Blob([image], { type: 'image/png' }))
        img.addEventListener('load', () => {
            const width = img.width
            const height = img.height
            const aspectRatio = width / height

            // if current size has the same aspect ratio as the init image and not smaller than the init image, use it
            if (
                params.width / params.height === aspectRatio &&
                width <= params.width &&
                height <= params.height
            ) {
                // use current size
                return
            }

            // if width and height produce a valid size, use it
            if (width % 64 === 0 && height % 64 === 0 && width * height <= 1024 * 1024) {
                setParams({ ...params, width, height })
                return
            }
            // otherwise, set lower size as 512 and use aspect ratio to the other dimension
            if (aspectRatio > 1) {
                const newHeight = 512
                let newWidth = Math.floor(newHeight * aspectRatio)
                // if new width is not a multiple of 64, set it to the closet multiple of 64
                if (newWidth % 64 !== 0) {
                    newWidth = closestMultipleNum(newWidth, 64)
                }
                // check that image is not too large
                if (newWidth * newHeight <= 1024 * 1024) {
                    setParams({ ...params, width: newWidth, height: newHeight })
                    return
                }
            } else {
                const newWidth = 512
                let newHeight = Math.floor(newWidth / aspectRatio)
                // if new height is not a multiple of 64, set it to the closet multiple of 64
                if (newHeight % 64 !== 0) {
                    newHeight = closestMultipleNum(newHeight, 64)
                }
                // check that image is not too large
                if (newWidth * newHeight <= 1024 * 1024) {
                    setParams({ ...params, width: newWidth, height: newHeight })
                    return
                }
            }
            // if that fails set the higher size as 1024 and use aspect ratio to the other dimension
            if (aspectRatio > 1) {
                const newHeight = 1024
                let newWidth = Math.floor(newHeight * aspectRatio)
                // if new width is not a multiple of 64, set it to the closet multiple of 64
                if (newWidth % 64 !== 0) {
                    newWidth = closestMultipleNum(newWidth, 64)
                }
                // check that image is not too large
                if (newWidth * newHeight <= 1024 * 1024) {
                    setParams({ ...params, width: newWidth, height: newHeight })
                    return
                }
            } else {
                const newWidth = 1024
                let newHeight = Math.floor(newWidth / aspectRatio)
                // if new height is not a multiple of 64, set it to the closet multiple of 64
                if (newHeight % 64 !== 0) {
                    newHeight = closestMultipleNum(newHeight, 64)
                }
                // check that image is not too large
                if (newWidth * newHeight <= 1024 * 1024) {
                    setParams({ ...params, width: newWidth, height: newHeight })
                    return
                }
            }
            // if all else fails, set the size to 512x512
            setParams({ ...params, width: 512, height: 512 })
        })
    }

    const initImageDisplay = (
        <InitImageDisplay>
            <SubtleButton
                style={{
                    backgroundImage: `url(${initThumbnail})`,
                    backgroundSize: `${previewWidth}% ${previewHeight}%`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    position: 'relative',
                }}
                onClick={() => {
                    if (window.innerWidth > MOBILE_WIDTH) {
                        setShowCanvas(true)
                    }
                }}
            />
            <RemoveInitImageButton
                aria-label="Remove Init Image"
                style={{
                    padding: '4px 4px',
                    margin: '2px',
                    top: '0px',
                    right: '0px',
                    position: 'absolute',
                    borderRadius: 3,
                    width: 'auto',
                    height: 'auto',
                }}
                onClick={() => {
                    setInitImage(void 0)
                    if (initImageInputRef.current) {
                        initImageInputRef.current.value = ''
                    }
                }}
            >
                <SmallCrossIcon
                    style={{
                        height: 15,
                        width: 15,
                        padding: '2px 4px',
                    }}
                />
            </RemoveInitImageButton>
            <div
                style={{
                    position: 'absolute',
                    fontSize: '0.875rem',
                    bottom: -25,
                    opacity: 0.8,
                }}
            >
                <SubtleButton
                    onClick={() => {
                        if (window.innerWidth > MOBILE_WIDTH) {
                            setShowCanvas(true)
                        }
                    }}
                >
                    Edit Image
                </SubtleButton>
            </div>
        </InitImageDisplay>
    )
    const initImageDisplayMobile = (
        <InitImageDisplay>
            <SubtleButton
                style={{
                    backgroundImage: `url(${initThumbnail})`,
                    backgroundSize: `${previewWidth}% ${previewHeight}%`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    position: 'relative',
                }}
                onClick={() => {
                    setInitImage(void 0)
                    if (initImageInputRef.current) {
                        initImageInputRef.current.value = ''
                    }
                }}
            >
                <SmallCrossIcon
                    style={{
                        height: 15,
                        width: 15,
                        padding: '2px 4px',
                    }}
                />
            </SubtleButton>
            <div style={{ flex: '0 1 10px' }} />
            <ImportImageButton
                style={{ whiteSpace: 'pre', fontSize: '0.875rem', opacity: 0.8, width: 'max-content' }}
                onClick={() => {
                    setShowCanvas(true)
                }}
            >
                Edit Image
            </ImportImageButton>
        </InitImageDisplay>
    )

    const saveButtonGroup = (img: ImageInfo) => {
        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    alignSelf: 'center',
                    margin: '10px',
                    display: 'flex',
                    gap: '10px',
                }}
            >
                {canCopyImageToClipboard() && (
                    <OverlayButton
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!img.data) return
                            copyPngToClipboard(img.data)
                                .then(() => {
                                    toast('Image copied to clipboard')
                                })
                                .catch((error) => {
                                    toast('Error copying image to clipboard: ' + error)
                                })
                        }}
                    >
                        <ClipboardIcon style={{ width: 16, height: 16 }} />
                    </OverlayButton>
                )}
                <OverlayButton
                    onClick={(e) => {
                        e.stopPropagation()
                        if (!img.data) return

                        downloadImage(img)
                    }}
                >
                    <SaveIcon style={{ width: 16, height: 16 }} />
                </OverlayButton>
            </div>
        )
    }

    const topButtonGroup = (img: ImageInfo, i: number) => {
        return (
            <TopButtonContainer>
                {/*
                <HideMobile>
                    <CanvasControlButton
                        aria-label="Masked Reroll"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!img.data) return
                            setRerollImageInfo(img)
                            setRerollMode(true)
                            setShowCanvas(true)
                        }}
                    >
                        <GiPerspectiveDiceSixFacesRandom style={{ width: 16, height: 16 }} /> Masked Reroll
                    </CanvasControlButton>
                </HideMobile>
                */}
                <CanvasControlButton
                    aria-label="Edit image"
                    onClick={(e) => {
                        e.stopPropagation()
                        if (!img.data) return
                        setInitImage(img.data)
                        setShowCanvas(true)
                    }}
                >
                    <PenIcon style={{ width: 16, height: 16 }} />
                    <HideMobileInline> Edit Image</HideMobileInline>
                </CanvasControlButton>
                <CanvasControlButton
                    disabled={generating}
                    style={{
                        lineHeight: '0',
                    }}
                    aria-label="Generate Variations"
                    onClick={(e) => {
                        e.stopPropagation()
                        generateImage(undefined, img)
                    }}
                >
                    <VariationsIcon style={{ width: 16, height: 16 }} />
                    <HideMobileInline> Variations</HideMobileInline>
                </CanvasControlButton>
                <CanvasControlButton
                    aria-label="Enhance Image"
                    onClick={(e) => {
                        e.stopPropagation()
                        if (!img.data) return
                        if (images[selectedImage].length !== 1) {
                            setExpandedImage(i)
                            setEnhanceBoxVisible(true)
                        } else {
                            setEnhanceBoxVisible(!enhanceBoxVisible)
                        }
                    }}
                >
                    <SparklesIcon style={{ width: 16, height: 16 }} />
                    <HideMobileInline> Enhance</HideMobileInline>
                </CanvasControlButton>
            </TopButtonContainer>
        )
    }

    const specialButtonGroup = (img: ImageInfo, i: number) => {
        return (
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    margin: '10px',
                    display: 'flex',
                    gap: '10px',
                }}
            >
                {/*
                <HideMobile>
                    <OverlayButton
                        aria-label="Masked Reroll"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!img.data) return
                            setRerollImageInfo(img)
                            setRerollMode(true)
                            setShowCanvas(true)
                        }}
                    >
                        <GiPerspectiveDiceSixFacesRandom style={{ width: 16, height: 16 }} />
                    </OverlayButton>
                </HideMobile>
                */}
                <Tooltip tooltip={`Edit Image`} delay={0}>
                    <OverlayButton
                        aria-label="Edit image"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!img.data) return
                            setInitImage(img.data)
                            setShowCanvas(true)
                        }}
                    >
                        <PenIcon style={{ width: 16, height: 16 }} />
                    </OverlayButton>
                </Tooltip>
                <Tooltip
                    tooltip={`Generate Variations`}
                    delay={0}
                >
                    <OverlayButton
                        disabled={generating}
                        style={{
                            lineHeight: '0',
                        }}
                        aria-label="Generate Variations"
                        onClick={(e) => {
                            e.stopPropagation()
                            generateImage(undefined, img)
                        }}
                    >
                        <VariationsIcon style={{ width: 16, height: 16 }} />
                    </OverlayButton>
                </Tooltip>
                <Tooltip tooltip={`Enhance Image`} delay={0}>
                    <OverlayButton
                        aria-label="Enhance Image"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!img.data) return
                            if (images[selectedImage].length !== 1) {
                                setExpandedImage(i)
                                setEnhanceBoxVisible(true)
                            } else {
                                setEnhanceBoxVisible(!enhanceBoxVisible)
                            }
                        }}
                    >
                        <SparklesIcon style={{ width: 16, height: 16 }} />
                    </OverlayButton>
                </Tooltip>
            </div>
        )
    }

    const [showOld, setShowOld] = useState<number>()

    useEffect(() => {
        setShowOld(void 0)
    }, [selectedImage, images])

    const seedButtonGroup = (img: ImageInfo, i: number) => {
        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    margin: '10px',
                    display: 'flex',
                    gap: '10px',
                }}
            >
                <OverlayButton
                    onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(img.seed.toString())
                        toast('Seed copied to clipboard')
                    }}
                >
                    {img.seed}
                </OverlayButton>
                {img.enhanceOriginal && (
                    <OverlayButton
                        onMouseDown={(e) => {
                            e.stopPropagation()
                            setShowOld(i)
                            const remove = () => {
                                setShowOld(void 0)
                                window.document.removeEventListener('mouseup', remove)
                            }
                            window.document.addEventListener('mouseup', remove)
                        }}
                    >
                        {showOld === i ? (
                            <>
                                <EmptySparklesIcon style={{ width: 16, height: 16 }} /> OLD
                            </>
                        ) : (
                            <>
                                <SparklesIcon style={{ width: 16, height: 16 }} /> NEW
                            </>
                        )}
                    </OverlayButton>
                )}
            </div>
        )
    }

    const [downloadingImages, setDownloadingImages] = useState(false)
    const downloadAllImages = () => {
        const zip = new JSZip()
        // count the images to be download
        const imageCount = images.reduce((acc, image) => {
            return acc + image.length
        }, 0)
        const dupeNames: any = {}
        toast(`Downloading ${imageCount} images...`)
        images.forEach((image, i) => {
            image.forEach((img, j) => {
                if (img.isVariationOriginal) return
                let name = `${img.prompt.join('|').slice(0, 180)} s-${img.seed}.png`
                if (dupeNames[name]) {
                    name = `${img.prompt.join('|').slice(0, 180)} s-${img.seed} (${dupeNames[name]++}).png`
                } else {
                    dupeNames[name] = 1
                }
                zip.file(name, img.data)
            })
        })
        setDownloadingImages(true)
        zip.generateAsync({
            type: 'blob',
        }).then(function (content) {
            saveAs(content, 'images.zip')
            setDownloadingImages(false)
            toast('Images downloaded')
        })
    }

    const clearTagSearchTimeout = useRef(0)

    return (
        <PageContainer>
            <PageLeft>
                {showCanvas && (
                    <Canvas
                        width={params.width}
                        height={params.height}
                        image={initImage}
                        close={(image) => {
                            setShowCanvas(false)
                            setRerollMode(false)
                            setRerollImageInfo(void 0)
                            if (image) setInitImage(image)
                            if (image) setBestSizeForInitImage(image)
                        }}
                        rerollMode={rerollMode}
                        rerollImage={rerollImageInfo}
                        rerollGenerate={(image, masks) => {
                            return rerollImage(image, masks)
                        }}
                    />
                )}
                {!showCanvas && (
                    <GenerationContainer>
                        <GenerationContainerCol>
                            <MainTopper>
                                <MainTopperInnerRight>
                                    {!initImage && (
                                        <>
                                            <HideMobileInline
                                                style={{
                                                    lineHeight: '1.2rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <ImportImageButton
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        width: 'max-content',
                                                        marginRight: '20px',
                                                    }}
                                                    onClick={() => {
                                                        setShowCanvas(!showCanvas)
                                                    }}
                                                >
                                                    <PenIcon
                                                        style={{
                                                            height: 16,
                                                            width: 16,
                                                            marginRight: 5,
                                                        }}
                                                    />{' '}
                                                    Paint New Image
                                                </ImportImageButton>
                                                <ImportImageButton
                                                    onClick={() => {
                                                        if (initImageInputRef.current) {
                                                            initImageInputRef.current.click()
                                                        }
                                                    }}
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        width: 'max-content',
                                                    }}
                                                >
                                                    <ImportIcon
                                                        style={{
                                                            height: 13,
                                                            width: 13,
                                                            marginRight: 5,
                                                        }}
                                                    />{' '}
                                                    Upload Image
                                                </ImportImageButton>
                                            </HideMobileInline>
                                        </>
                                    )}
                                    <HideMobileInline
                                        style={{
                                            lineHeight: '1.2rem',
                                        }}
                                    >
                                        <OpenHistoryButton
                                            style={{ marginLeft: '20px' }}
                                            onClick={() => setHistoryVisible(true)}
                                        >
                                            <HistoryIcon />
                                        </OpenHistoryButton>
                                        <FlexSpaceFull />
                                        <ImportImageLink
                                            href="//docs.novelai.net"
                                            target="_blank"
                                            style={{
                                                fontSize: '0.875rem',
                                                opacity: 0.8,
                                                width: 'max-content',
                                                padding: '0 0 0 10px',
                                            }}
                                        >
                                            <FaQuestion />
                                        </ImportImageLink>
                                    </HideMobileInline>
                                </MainTopperInnerRight>
                            </MainTopper>
                            <PromptImageContainer>
                                <PromptContainer>
                                    <HideMobile>{initImage && initImageDisplay}</HideMobile>
                                    <div style={{ flex: 10, alignSelf: 'stretch' }}>
                                        <HideNonMobile>
                                            <FlexRow style={{}}>
                                                <FlexSpaceFull />

                                                <div style={{ flex: '0 1 20px' }} />
                                                {initImage ? (
                                                    initImageDisplayMobile
                                                ) : (
                                                    <Fragment>
                                                        <ImportImageButton
                                                            style={{
                                                                fontSize: '0.875rem',
                                                                opacity: 0.8,
                                                                width: 'max-content',
                                                                marginRight: '20px',
                                                            }}
                                                            onClick={() => {
                                                                setShowCanvas(!showCanvas)
                                                            }}
                                                        >
                                                            Paint
                                                        </ImportImageButton>
                                                        <ImportImageButton
                                                            onClick={() => {
                                                                if (initImageInputRef.current) {
                                                                    initImageInputRef.current.click()
                                                                }
                                                            }}
                                                            style={{
                                                                fontSize: '0.875rem',
                                                                opacity: 0.8,
                                                                width: 'max-content',
                                                            }}
                                                        >
                                                            Upload
                                                        </ImportImageButton>
                                                        <div style={{ flex: '0 1 20px' }} />
                                                    </Fragment>
                                                )}
                                                <OpenHistoryButton
                                                    style={{ height: 32 }}
                                                    onClick={() => setHistoryVisible(true)}
                                                >
                                                    <HistoryIcon />
                                                </OpenHistoryButton>
                                            </FlexRow>
                                        </HideNonMobile>

                                        <InputLabel>
                                            <FlexRow
                                                style={{
                                                    alignItems: 'flex-end',
                                                    justifyContent: 'flex-end',
                                                    flexWrap: 'wrap',
                                                    rowGap: 20,
                                                }}
                                            >
                                                <input
                                                    style={{
                                                        display: 'none',
                                                    }}
                                                    accept="image/png, image/jpeg"
                                                    type={'file'}
                                                    ref={initImageInputRef}
                                                    onChange={async (e) => {
                                                        if (e.target.files?.[0]) {
                                                            const buffer = Buffer.from(
                                                                new Uint8Array(
                                                                    await e.target.files[0].arrayBuffer()
                                                                )
                                                            )
                                                            setInitImage(buffer)
                                                            setBestSizeForInitImage(buffer)
                                                        }
                                                    }}
                                                />
                                                <ImageGenImportOverlay
                                                    onFileImport={(image) => {
                                                        setInitImage(image)
                                                        setBestSizeForInitImage(image)
                                                    }}
                                                />
                                            </FlexRow>
                                            {prompt.map((p, promptid) => {
                                                const commonPromptProps: any = {
                                                    style: {
                                                        width: '100%',
                                                        borderRadius: '3px 0 0 3px',
                                                    },
                                                    id: `prompt-input-${promptid}`,
                                                    placeholder: 'Enter your prompt here.',
                                                    autoComplete: 'off',
                                                    value: p,
                                                    onChange: (e: any) => {
                                                        if (
                                                            e.target.value.length !== lastPromptLength.current
                                                        ) {
                                                            if (!e.target.value.endsWith(' ')) {
                                                                queueDelayedTagSearch(e.target.value)
                                                            }
                                                        } else {
                                                            clearTagSearch()
                                                        }
                                                        lastPromptLength.current = e.target.value.length
                                                        setPrompt([
                                                            ...prompt.slice(0, promptid),
                                                            e.target.value,
                                                            ...prompt.slice(promptid + 1),
                                                        ])
                                                    },
                                                    onFocus: () => {
                                                        clearTimeout(clearTagSearchTimeout.current)
                                                        setLastFocusedPrompt(promptid)
                                                    },
                                                    onBlur: () => {
                                                        clearTimeout(clearTagSearchTimeout.current)
                                                        clearTagSearchTimeout.current = setTimeout(() => {
                                                            clearTagSearch()
                                                        }, 50) as unknown as number
                                                    },
                                                    onKeyDown: (e: any) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                        }
                                                        if (
                                                            e.key === 'Enter' &&
                                                            suggestionSelectionIndex === -1
                                                        ) {
                                                            if (
                                                                (e.ctrlKey || e.metaKey) &&
                                                                e.shiftKey &&
                                                                prompt.length < 10
                                                            ) {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setPrompt([
                                                                    ...prompt.slice(0, promptid + 1),
                                                                    '',
                                                                    ...prompt.slice(promptid + 1),
                                                                ])
                                                                setTimeout(() => {
                                                                    const input = document.querySelector(
                                                                        `#prompt-input-${promptid + 1}`
                                                                    ) as HTMLInputElement
                                                                    if (input) input.focus()
                                                                }, 100)
                                                            } else if (e.shiftKey) {
                                                                setTimeout(() => {
                                                                    if ((promptLines[promptid] ?? 1) === 1) {
                                                                        const input = document.querySelector(
                                                                            `#prompt-input-${promptid}`
                                                                        ) as HTMLInputElement
                                                                        if (input) input.focus()
                                                                    }
                                                                }, 100)

                                                                setPromptLines((v) => ({
                                                                    ...v,
                                                                    [promptid]: Math.min(
                                                                        (promptLines[promptid] ?? 1) + 2,
                                                                        9
                                                                    ),
                                                                }))
                                                            } else {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                clearTagSearch()
                                                                generateImage()
                                                            }
                                                        } else if (e.key === 'Backspace' && e.shiftKey) {
                                                            e.preventDefault()
                                                            if ((promptLines[promptid] ?? 1) === 3) {
                                                                setTimeout(() => {
                                                                    const input = document.querySelector(
                                                                        `#prompt-input-${promptid}`
                                                                    ) as HTMLInputElement
                                                                    if (input) input.focus()
                                                                }, 100)
                                                            }
                                                            setPromptLines((v) => ({
                                                                ...v,
                                                                [promptid]: (promptLines[promptid] ?? 1) - 2,
                                                            }))
                                                        } else if (
                                                            e.key === 'Backspace' &&
                                                            prompt.length > 1 &&
                                                            prompt[promptid].length === 0
                                                        ) {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setPrompt([
                                                                ...prompt.slice(0, promptid),
                                                                ...prompt.slice(promptid + 1),
                                                            ])
                                                            if (promptid === prompt.length - 1) {
                                                                setTimeout(() => {
                                                                    const input = document.querySelector(
                                                                        `#prompt-input-${prompt.length - 2}`
                                                                    ) as HTMLInputElement
                                                                    if (input) input.focus()
                                                                }, 100)
                                                            }
                                                        } else {
                                                            if (
                                                                e.key === 'ArrowUp' ||
                                                                e.key === 'ArrowDown'
                                                            ) {
                                                                if (!tagSuggestions) return
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setSuggestionSelectionIndex(
                                                                    (suggestionSelectionIndex) => {
                                                                        // value is -1 when there is no selection.
                                                                        // should loop at ends
                                                                        if (suggestionSelectionIndex === -1) {
                                                                            return e.key === 'ArrowUp'
                                                                                ? tagSuggestions.length - 1
                                                                                : 0
                                                                        } else {
                                                                            return e.key === 'ArrowUp'
                                                                                ? (suggestionSelectionIndex +
                                                                                      tagSuggestions.length -
                                                                                      1) %
                                                                                      tagSuggestions.length
                                                                                : (suggestionSelectionIndex +
                                                                                      1) %
                                                                                      tagSuggestions.length
                                                                        }
                                                                    }
                                                                )
                                                            } else if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                            }

                                                            if (
                                                                e.key === 'Enter' &&
                                                                suggestionSelectionIndex >= 0
                                                            ) {
                                                                if (!tagSuggestions) return
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                insertTagToPrompt(
                                                                    tagSuggestions[
                                                                        suggestionSelectionIndex
                                                                    ][0],
                                                                    promptid
                                                                )
                                                                clearTagSearch()
                                                            }

                                                            const clearTagKeys = [
                                                                'Escape',
                                                                'Backspace',
                                                                'ArrowRight',
                                                                'ArrowLeft',
                                                                ',',
                                                                ':',
                                                                '|',
                                                            ]
                                                            if (clearTagKeys.includes(e.key)) {
                                                                clearTagSearch()
                                                            }
                                                        }
                                                    },
                                                }
                                                return (
                                                    <div
                                                        key={promptid}
                                                        style={{
                                                            display: 'flex',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {promptLines[promptid] > 1 ? (
                                                            <LargeInput
                                                                minRows={promptLines[promptid] ?? 1}
                                                                maxRows={promptLines[promptid] ?? 1}
                                                                {...commonPromptProps}
                                                            />
                                                        ) : (
                                                            <Input type="text" {...commonPromptProps} />
                                                        )}
                                                        <Tooltip
                                                            tooltip={
                                                                (promptTokens[promptid] || 0) +
                                                                ' tokens out of ' +
                                                                SD_TOKEN_LIMIT +
                                                                ' tokens used'
                                                            }
                                                            delay={0}
                                                        >
                                                            <TokenLimitBarOuter>
                                                                <TokenLimitBarInner
                                                                    warn={
                                                                        (promptTokens[promptid] ?? 0) >
                                                                        SD_TOKEN_LIMIT
                                                                    }
                                                                    style={{
                                                                        height: `${
                                                                            ((promptTokens[promptid] ?? 0) /
                                                                                SD_TOKEN_LIMIT) *
                                                                            100
                                                                        }%`,
                                                                    }}
                                                                />
                                                            </TokenLimitBarOuter>
                                                        </Tooltip>
                                                        <AnimatePresence>
                                                            {(tagSuggestions || searchingTags) &&
                                                                lastFocusedPrompt === promptid && (
                                                                    <PromptSuggestionContainer
                                                                        initial={{
                                                                            opacity: 0,
                                                                            translateY: 16,
                                                                        }}
                                                                        animate={{
                                                                            opacity: 1,
                                                                            translateY: 0,
                                                                        }}
                                                                        exit={{ opacity: 0, translateY: 16 }}
                                                                        transition={{
                                                                            duration: 0.2,
                                                                            ease: 'easeInOut',
                                                                        }}
                                                                        key="promptsuggestioncontainer"
                                                                        onPointerDown={() => {
                                                                            setTimeout(() => {
                                                                                clearTimeout(
                                                                                    clearTagSearchTimeout.current
                                                                                )
                                                                                const input =
                                                                                    document.querySelector(
                                                                                        `#prompt-input-${promptid}`
                                                                                    ) as HTMLInputElement
                                                                                if (input) input.focus()
                                                                            }, 0)
                                                                        }}
                                                                    >
                                                                        <PromptSuggestionHeader>
                                                                            Did you mean?
                                                                            <CloseButton
                                                                                onClick={() => {
                                                                                    clearTagSearch()
                                                                                }}
                                                                                style={{
                                                                                    top: 10,
                                                                                    right: 12,
                                                                                }}
                                                                            >
                                                                                <div
                                                                                    style={{
                                                                                        width: '1rem',
                                                                                        height: '1rem',
                                                                                    }}
                                                                                />
                                                                            </CloseButton>
                                                                        </PromptSuggestionHeader>
                                                                        {searchingTags && (
                                                                            <LoadingSpinner
                                                                                style={{
                                                                                    margin: '20px auto 0 auto',
                                                                                }}
                                                                                visible={true}
                                                                            />
                                                                        )}
                                                                        {tagSuggestions?.length === 0 &&
                                                                            !searchingTags && (
                                                                                <PromptSuggestionList>
                                                                                    <div
                                                                                        style={{ padding: 4 }}
                                                                                    >
                                                                                        No tags found.
                                                                                    </div>
                                                                                </PromptSuggestionList>
                                                                            )}
                                                                        <PromptSuggestionList>
                                                                            {(tagSuggestions ?? []).map(
                                                                                ([tag, count], i) => (
                                                                                    <PromptSuggestionItem
                                                                                        key={i}
                                                                                        selected={
                                                                                            suggestionSelectionIndex ===
                                                                                            i
                                                                                        }
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            insertTagToPrompt(
                                                                                                tag,
                                                                                                promptid
                                                                                            )
                                                                                            clearTagSearch()
                                                                                        }}
                                                                                    >
                                                                                        <span>{tag}</span>
                                                                                        <SuggestionBullet
                                                                                            count={count}
                                                                                        />
                                                                                    </PromptSuggestionItem>
                                                                                )
                                                                            )}
                                                                        </PromptSuggestionList>
                                                                    </PromptSuggestionContainer>
                                                                )}
                                                        </AnimatePresence>
                                                    </div>
                                                )
                                            })}
                                        </InputLabel>
                                        <LoadingBar
                                            visible={generating}
                                            style={{ width: '100%', zIndex: 1 }}
                                        />
                                    </div>
                                    <ButtonContainer>
                                        <GenerateButton
                                            onClick={() => generateImage()}
                                            disabled={generating || prompt.some((p) => !p)}
                                        >
                                            <span>Generate</span>
                                        </GenerateButton>
                                    </ButtonContainer>
                                </PromptContainer>
                                <ImagesContainer ref={imagesContainerRef}>
                                    <>
                                        <ImageGrid
                                            maxWidth={
                                                imageWidth
                                                    ? imageWidth * columns + (columns - 1) * 20
                                                    : undefined
                                            }
                                        >
                                            {images[selectedImage]?.map((img, i) => (
                                                <ImageContainer
                                                    key={i}
                                                    style={{
                                                        width: imageWidth,
                                                        height: imageHeight,
                                                        cursor:
                                                            images[selectedImage]?.length > 1
                                                                ? 'pointer'
                                                                : 'default',
                                                        marginTop:
                                                            images[selectedImage]?.length === 1 ? 54 : 0,
                                                    }}
                                                    onMouseEnter={() => setShownHover(i)}
                                                    onMouseLeave={() => setShownHover(void 0)}
                                                    onClick={() => {
                                                        if (images[selectedImage].length > 1)
                                                            setExpandedImage(i)
                                                    }}
                                                >
                                                    <img
                                                        src={showOld === i ? img.enhanceOriginal : img.url}
                                                        alt={img.prompt.join('|')}
                                                    />
                                                    {(shownHover === i ||
                                                        images[selectedImage].length === 1) && (
                                                        <>
                                                            {images[selectedImage].length === 1 &&
                                                                img &&
                                                                topButtonGroup(img, 0)}

                                                            {images[selectedImage].length !== 1 &&
                                                                specialButtonGroup(img, i)}
                                                            {saveButtonGroup(img)}

                                                            {images[selectedImage].length === 1 &&
                                                                seedButtonGroup(img, i)}
                                                        </>
                                                    )}
                                                    {img.isVariationOriginal && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                margin: '10px',
                                                                display: 'flex',
                                                                gap: '10px',
                                                            }}
                                                        >
                                                            <FakeOverLayButton
                                                                onClick={() => {
                                                                    setExpandedImage(void 0)
                                                                }}
                                                            >
                                                                <div>ORIGINAL</div>
                                                            </FakeOverLayButton>
                                                        </div>
                                                    )}

                                                    {enhanceBoxVisible &&
                                                        images[selectedImage].length === 1 &&
                                                        enhanceBox}
                                                </ImageContainer>
                                            ))}
                                            {(images[selectedImage]?.length ?? 0) > 0 ? null : (
                                                <ImagesGridPlaceholder>
                                                    <svg
                                                        width="58"
                                                        height="48"
                                                        viewBox="0 0 58 48"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            // eslint-disable-next-line max-len
                                                            d="M58 45.0403V2C58 0.895431 57.1046 0 56 0H2.00022C0.895652 0 0.000223091 0.895426 0.000216249 1.99999L1.23893e-05 34.9091C5.5469e-06 36.0137 0.895435 36.9091 2.00001 36.9091H46.6261C47.1566 36.9091 47.6653 37.1198 48.0403 37.4949L56.2929 45.7474C56.9229 46.3774 58 45.9312 58 45.0403Z"
                                                            fill={siteTheme.colors.bg3}
                                                        />
                                                        <circle
                                                            cx="13.1818"
                                                            cy="18.4546"
                                                            r="5.27273"
                                                            fill={siteTheme.colors.bg1}
                                                        />
                                                        <circle
                                                            cx="29"
                                                            cy="18.4546"
                                                            r="5.27273"
                                                            fill={siteTheme.colors.bg1}
                                                        />
                                                        <circle
                                                            cx="44.8181"
                                                            cy="18.4546"
                                                            r="5.27273"
                                                            fill={siteTheme.colors.bg1}
                                                        />
                                                    </svg>
                                                </ImagesGridPlaceholder>
                                            )}
                                        </ImageGrid>
                                        <AnimatePresence>
                                            {expandedImage !== undefined &&
                                                images[selectedImage]?.[expandedImage] && (
                                                    <ExpandedImageContainer
                                                        key={'expanded-image'}
                                                        initial={{ opacity: 0 }}
                                                        animate={{
                                                            opacity: 1,
                                                            transition: { ease: 'easeInOut', duration: 0.1 },
                                                        }}
                                                        exit={{
                                                            opacity: 0,
                                                            transition: { ease: 'easeOut', duration: 0.1 },
                                                        }}
                                                    >
                                                        <ImageContainer
                                                            style={{
                                                                width: expandedImageWidth,
                                                                height: expandedImageHeight,
                                                                marginTop: '54px',
                                                            }}
                                                            onClick={() => setExpandedImage(void 0)}
                                                        >
                                                            <img
                                                                src={
                                                                    showOld === expandedImage
                                                                        ? images[selectedImage][expandedImage]
                                                                              .enhanceOriginal
                                                                        : images[selectedImage][expandedImage]
                                                                              .url
                                                                }
                                                                alt={images[selectedImage][
                                                                    expandedImage
                                                                ].prompt.join('|')}
                                                            />
                                                            {images[selectedImage][expandedImage] &&
                                                                topButtonGroup(
                                                                    images[selectedImage][expandedImage],
                                                                    expandedImage
                                                                )}

                                                            <div
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    margin: '10px',
                                                                    display: 'flex',
                                                                    gap: '10px',
                                                                }}
                                                            >
                                                                <OverlayButton
                                                                    onClick={() => {
                                                                        setExpandedImage(void 0)
                                                                    }}
                                                                >
                                                                    <CrossIcon
                                                                        style={{ width: 16, height: 16 }}
                                                                    />
                                                                </OverlayButton>
                                                            </div>
                                                            {seedButtonGroup(
                                                                images[selectedImage][expandedImage],
                                                                expandedImage
                                                            )}
                                                            {saveButtonGroup(
                                                                images[selectedImage][expandedImage]
                                                            )}
                                                            {enhanceBoxVisible && enhanceBox}
                                                        </ImageContainer>
                                                    </ExpandedImageContainer>
                                                )}
                                        </AnimatePresence>
                                    </>
                                </ImagesContainer>
                            </PromptImageContainer>
                        </GenerationContainerCol>
                        <GenerationOptions
                            params={params}
                            setParams={setParams}
                            model={selectedModel}
                            initImage={initImage}
                            setInitImage={setInitImage}
                            negPrompt={negPrompt}
                            setNegPrompt={setNegPrompt}
                            negPromptTokens={negPromptTokens}
                            generateImage={() => generateImage()}
                        >
                            <ModelSelectContainer>{/*modelSelect*/}</ModelSelectContainer>
                        </GenerationOptions>
                    </GenerationContainer>
                )}
            </PageLeft>
            {!showCanvas && (
                <Sidebar
                    left={false}
                    open={historyVisible}
                    setOpen={setHistoryVisible}
                    breakpointDesktop={`${MOBILE_WIDTH}px`}
                    breakpointMobile={`${MOBILE_WIDTH}px`}
                    overlayPoint={MOBILE_WIDTH}
                    noDragPoint={MOBILE_WIDTH}
                    initialOffset={140}
                    style={{ overflowX: 'hidden' }}
                >
                    <HistoryBar id="historyContainer">
                        <div
                            style={{
                                display: 'flex',
                                width: '100%',
                                justifyContent: 'center',
                                padding: '0 30px',
                            }}
                        >
                            <CloseHistoryButton
                                onClick={() => setHistoryVisible(false)}
                                style={{ marginRight: 'auto' }}
                            >
                                <CrossIcon style={{ width: 14, height: 14 }} />
                            </CloseHistoryButton>
                            <Title style={{ opacity: 0.5, flex: ' 0 0 auto' }}>
                                History
                                <Tooltip
                                    delay={1}
                                    tooltip={''}
                                    elementTooltip={
                                        <>
                                            Ctrl+Click on an image to set your settings to the ones used to
                                            generate it (except for any init image).
                                        </>
                                    }
                                >
                                    <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                                </Tooltip>
                            </Title>
                        </div>

                        <HistoryImages>
                            {images.map((img, i) => {
                                return (
                                    <HistoryButton
                                        key={i}
                                        onClick={(e) => {
                                            let newParams
                                            let newPrompt
                                            let newNegPrompt
                                            if (e.ctrlKey || e.metaKey) {
                                                setSelectedModel(images[i][0].model)
                                                newParams = {
                                                    ...images[i][0].params,
                                                    image: params.image,
                                                }
                                                newParams.seed = params.seed
                                                newPrompt = [...images[i][0].prompt]
                                                newNegPrompt = images[i][0].negPrompt
                                            }
                                            if (e.shiftKey) {
                                                if (!newParams) {
                                                    newParams = {
                                                        ...params,
                                                    }
                                                }
                                                newParams.seed = images[i][0].seed
                                            }
                                            if (!newParams) {
                                                setSelectedImage(i)
                                                setExpandedImage(void 0)
                                            } else {
                                                setParams(newParams)
                                            }
                                            if (newPrompt) {
                                                setPrompt(newPrompt)
                                            }
                                            if (newNegPrompt) {
                                                setNegPrompt(newNegPrompt)
                                            }

                                            if (windowSize.width < MOBILE_WIDTH) setHistoryVisible(false)
                                        }}
                                        selected={selectedImage === i}
                                        img={img[0]?.url}
                                    >
                                        {img.length > 1 && <OverlayNumber>x{img.length}</OverlayNumber>}
                                        {img.length === 1 && img[0].enhanced && (
                                            <OverlayNumber>
                                                <SparklesIcon
                                                    style={{
                                                        height: 15,
                                                        width: 15,
                                                    }}
                                                />
                                            </OverlayNumber>
                                        )}
                                    </HistoryButton>
                                )
                            })}
                        </HistoryImages>
                        <SubtleButton
                            disabled={images.length === 0}
                            style={{
                                opacity: 0.4,
                                fontSize: '0.8rem',
                                fontWeight: 400,
                            }}
                            onClick={() => {
                                // Confirm dialog to ask to download zip of all images
                                if (
                                    !downloadingImages &&
                                    images.length > 0 &&
                                    window.confirm(
                                        // eslint-disable-next-line max-len
                                        'Download all images? This could take a while, or fail entirely, with large numbers of images.'
                                    )
                                ) {
                                    downloadAllImages()
                                }
                            }}
                        >
                            {!downloadingImages ? (
                                'Download ZIP'
                            ) : (
                                <span>
                                    Downloading...
                                </span>
                            )}
                        </SubtleButton>
                    </HistoryBar>
                </Sidebar>
            )}
        </PageContainer>
    )
}

const PageContainer = styled.div`
    display: flex;
    width: 100%;
    height: 100%;
    background-color: ${(props) => props.theme.colors.bg2};

    overflow-x: hidden;
    @media (max-width: ${MOBILE_WIDTH}px) {
        overflow-y: auto;
        overflow-x: hidden;
    }
`

const HistoryBar = styled.div`
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    width: 140px;
    height: 100%;
    align-items: center;
    gap: 10px;
    padding: 20px 0;
    border-left: 1px solid ${(props) => props.theme.colors.bg3};
    background: ${(props) => props.theme.colors.bg2};
    @media (max-width: ${MOBILE_WIDTH}px) {
    }
`

const HistoryImages = styled.div`
    display: grid;
    grid-template-columns: autofit;
    padding-left: 10px;
    overflow-y: scroll;
    flex-direction: column-reverse;
    gap: 10px;
    align-items: flex-start;
    justify-content: flex-start;
    grid-auto-flow: dense;
`

const PageLeft = styled.div`
    flex: 1 1 0;
    height: 100%;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;

    @media (max-width: ${MOBILE_WIDTH}px) {
        gap: 0;
    }
`

const ModelSelectContainer = styled.div`
    width: 280px;
    max-width: 100%;
    display: flex;
    align-items: center;
    padding: 0 1px 20px 1px;
`

const GenerationContainer = styled.div`
    max-width: 1590;
    display: flex;
    flex: 1 1 0;
    max-width: 1590;
    padding: 0;
    gap: 20px;

    @media (max-width: ${MOBILE_WIDTH}px) {
        flex-direction: column;
        padding: 0;
        align-items: stretch;
    }
`

const GenerationContainerCol = styled(FlexCol)`
    flex: 1 1 auto;
    width: auto;
    min-height: calc(100vh - 60px);
    min-height: 100svh;
    overflow: hidden;
`

const OptionsContainer = styled.div`
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    width: 280px;
    overflow-y: auto;
    max-height: 100vh;
    max-height: 100svh;
    overflow-x: hidden;
    align-items: center;
    padding-right: 20px;

    @media (max-width: ${MOBILE_WIDTH}px) {
        width: 100%;
        padding-bottom: 50px;
        max-height: unset;
        overflow: unset;
        border-left: none;

        padding-right: 0px;
    }
`

const PromptImageContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    width: 100%;
    max-width: 100vw;
    gap: 20px;
    padding: 10px 20px 20px 20px;
    background-color: ${(props) => props.theme.colors.bg1};

    @media (max-width: ${MOBILE_WIDTH}px) {
        min-height: 400px;
        flex-direction: column-reverse;
        align-items: stretch;
        padding-top: 40px;
    }
`

const PromptContainer = styled.div`
    display: flex;
    flex: 0 0 auto;
    align-items: start;

    @media (max-width: ${MOBILE_WIDTH}px) {
        flex-direction: column;
        width: 100%;
        margin-top: 0;
    }
`

const PromptSuggestionContainer = styled(motion.div)`
    position: absolute;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: 'flex-start';
    justify-content: space-between;
    left: 0;
    top: 100%;
    width: auto;
    max-width: 100%;
    min-width: 250px;
    background: ${(props) => props.theme.colors.bg2};
    border: 1px solid ${(props) => props.theme.colors.bg3};
    border-radius: 3px;

    @media (max-width: ${MOBILE_WIDTH}px) {
        top: unset;
        bottom: 100%;
    }
`
const PromptSuggestionHeader = styled.div`
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
    padding: 10px 12px 8px;
    font-size: 0.875rem;
    opacity: 0.8;
`
const PromptSuggestionList = styled(FlexCol)`
    padding: 8px;
    @media (max-width: ${MOBILE_WIDTH}px) {
        display: flex;
        flex-direction: column-reverse;
    }
    font-size: 0.875rem;
`
const PromptSuggestionItem = styled.div<{ selected?: boolean }>`
    cursor: pointer;
    padding: 4px;
    width: 100%;
    border-radius: 3px;
    background: ${(props) => (props.selected ? props.theme.colors.bg1 : 'transparent')};
    &:hover {
        background: ${(props) => props.theme.colors.bg1};
    }
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    & > :last-child {
        opacity: 0.5;
    }
`

const ImagesContainer = styled.div`
    flex: 1 1 0;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    @media (max-width: ${MOBILE_WIDTH}px) {
        margin: -20px;
        width: calc(100% + 40px);
    }
`

const ImageGrid = styled.div<{ maxWidth?: number }>`
    position: absolute;
    display: flex;
    flex-wrap: wrap;
    max-width: ${(props) => (props.maxWidth ? props.maxWidth + 5 : 'fit-content')}px;
    gap: 20px;
`

const TopButtonContainer = styled.div`
    position: absolute;
    top: -64px;
    margin: 10px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    @media (max-width: ${MOBILE_WIDTH}px) {
        /* width: 100%; */
    }
    width: max-content;
`

const ImageContainer = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: column;
    > img {
        height: 100%;
        width: 100%;
        border-radius: 3px;
        overflow: hidden;
    }
    overflow: visible;
    cursor: pointer;
    @media (max-width: ${MOBILE_WIDTH}px) {
        margin-bottom: 10px;
    }
`

const ImagesGridPlaceholder = styled.div`
    height: 100px;
    width: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0.5;
`

const ExpandedImageContainer = styled(motion.div)`
    position: absolute;
    height: 100%;
    width: 100%;
    background-color: ${(props) => props.theme.colors.bg1};

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`

const HistoryButton = styled(SubtleButton)<{ selected: boolean; img: string }>`
    border: ${(props) =>
        props.selected ? `2px solid ${props.theme.colors.textHeadings}` : `2px solid transparent`};
    border-radius: 3px;
    background-color: ${(props) => props.theme.colors.bg0};
    background-image: url(${(props) => props.img});
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    width: 80px;
    height: 80px;
    flex: 0 0 auto;
    position: relative;
`

const ImportImageButton = styled(SubtleButton)`
    white-space: pre;
    display: flex;
    align-items: center;
    flex-grow: 0;
    min-height: 1.5rem;
    ${Icon} {
        transition: background-color ease-out 0.2s;
    }
    &:hover {
        color: ${(props) => props.theme.colors.textHeadings};
        ${Icon} {
            background-color: ${(props) => props.theme.colors.textHeadings};
        }
    }
`

const ImportImageLink = styled.a`
    white-space: pre;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0px;
    text-align: left;
    flex-grow: 0;
    display: flex;
    align-items: center;
    &:active {
        outline: 1px solid rgba(255, 255, 255, 0.2);
    }
    ${Icon} {
        transition: background-color ease-out 0.2s;
    }
    &:hover {
        color: ${(props) => props.theme.colors.textHeadings};
        ${Icon} {
            background-color: ${(props) => props.theme.colors.textHeadings};
        }
    }
`

const OverlayButton = styled(SubtleButton)`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 40px;
    min-width: 40px;
    padding: 12px;
    background: ${(props) => props.theme.colors.bg2};
    opacity: 0.8;
    border-radius: 3px;
    &:active {
        opacity: 1;
    }
    &:hover {
        > div {
            background-color: ${(props) => props.theme.colors.textHeadings};
        }
        color: ${(props) => props.theme.colors.textHeadings};
    }
    line-height: 0;
    gap: 10px;
`

const FakeOverLayButton = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 40px;
    min-width: 40px;
    font-weight: 600;
    padding: 12px;
    background: ${(props) => props.theme.colors.bg2};
    opacity: 0.8;
    border-radius: 3px;
    line-height: 0;
    gap: 10px;
`

const OverlayNumber = styled.div`
    width: 28px;
    height: 28px;
    background-color: ${(props) => transparentize(0.3, props.theme.colors.bg2)};
    border-radius: 3px;
    font-weight: 700;
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    bottom: 5px;
    right: 5px;
`

const ModelTitle = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
`

const OpenHistoryButton = styled(SubtleButton)`
    padding-right: 10px;

    @media (min-width: ${MOBILE_WIDTH + 1}px) {
        display: none;
    }
`

const CloseHistoryButton = styled(SubtleButton)`
    display: none;
    @media (max-width: ${MOBILE_WIDTH}px) {
        display: block;
    }
`

const MobileModelSelect = styled.div`
    display: none;
    max-width: 500px;
    width: 100%;
    padding: 0px 20px;
    @media (max-width: ${MOBILE_WIDTH}px) {
        display: block;
    }
`

const StepContainer = styled.div`
    border: 1px solid ${(props) => props.theme.colors.bg3};
    border-radius: 3px;
    display: flex;
    flex-direction: row;
    font-weight: 600;
    font-size: 14px;
    > div {
        display: flex;
        align-items: center;
        margin: 10px 15px;
        > span {
            font-family: ${(props) => props.theme.fonts.headings};
            margin-left: 6px;
            color: ${(props) => props.theme.colors.textHeadings};
            position: relative;
            top: 0.05rem;
        }
        > div {
            cursor: default;
            margin-left: 5px;
            background-color: ${(props) => props.theme.colors.textHeadings};
        }
    }
    > button {
        padding: 12px 16px;
        ${Icon} {
            transition: background-color ease-out 0.2s;
        }
        &:hover {
            color: ${(props) => props.theme.colors.textHeadings};
            ${Icon} {
                background-color: ${(props) => props.theme.colors.textHeadings};
            }
        }
    }
`

const resolutions: { name: string; width: number; height: number; category: string }[] = [
    { name: 'Portrait', width: 512, height: 768, category: 'Normal' },
    { name: 'Landscape', width: 768, height: 512, category: 'Normal' },
    { name: 'Square', width: 640, height: 640, category: 'Normal' },
    { name: 'Portrait', width: 384, height: 640, category: 'Small' },
    { name: 'Landscape', width: 640, height: 384, category: 'Small' },
    { name: 'Square', width: 512, height: 512, category: 'Small' },
    { name: 'Portrait', width: 512, height: 1024, category: 'Large' },
    { name: 'Landscape', width: 1024, height: 512, category: 'Large' },
    { name: 'Square', width: 1024, height: 1024, category: 'Large' },
    { name: 'Custom', width: 0, height: 0, category: 'Custom' },
]

const groupedResolutions: { name: string; resolutions: { name: string; width: number; height: number }[] }[] =
    resolutions.reduce((acc, res) => {
        let group = acc.find((g) => g.name === res.category)
        if (!group) {
            group = { name: res.category, resolutions: [] }
            acc.push(group)
        }
        group.resolutions.push({ name: res.name, width: res.width, height: res.height })
        return acc
    }, [] as { name: string; resolutions: { name: string; width: number; height: number }[] }[])

const samplingOptions: { label: string; options: { name: string; value: string }[] }[] = [
    {
        label: 'Recommended',
        options: [
            { name: 'K Euler Ancestral', value: StableDiffusionSampler.kEulerAncestral },
            { name: 'K Euler', value: StableDiffusionSampler.kEuler },
            { name: 'K LMS', value: StableDiffusionSampler.kLms },
        ],
    },
    {
        label: 'Other',
        options: [
            { name: 'PLMS', value: StableDiffusionSampler.plms },
            { name: 'DDIM', value: StableDiffusionSampler.ddim },
        ],
    },
]

function GenerationOptions(props: {
    model: ImageGenerationModels
    params: any
    setParams: React.Dispatch<React.SetStateAction<any>>
    children?: JSX.Element | JSX.Element[]
    initImage: Buffer | undefined
    setInitImage: React.Dispatch<React.SetStateAction<Buffer | undefined>>
    negPrompt: string
    setNegPrompt: (s: string) => void
    negPromptTokens: number
    generateImage: () => void
}): JSX.Element {
    const [selectedResolution, setSelectedResolution] = useState(0)
    const siteTheme = useRecoilValue(SiteTheme)

    useEffect(() => {
        if (props.params.width && props.params.height) {
            const found = resolutions.findIndex(
                (res) => res.width === props.params.width && res.height == props.params.height
            )
            setSelectedResolution(found < 0 ? resolutions.length - 1 : found)
        }
    }, [props.params.width, props.params.height])

    const selectText = {
        onMouseDown: (e: any) => {
            if (e.target !== document.activeElement) {
                e.preventDefault()
                ;(e.target as HTMLInputElement).select()
            }
        },
    }

    let resolutionIndex = 0
    const ucPresets = getModelUcPreset(props.model)

    const stableDiffusionSettings = (
        <>
            <BorderBox>
                <FlexRow>
                    <Title>Image Resolution</Title>
                    <Title style={{ opacity: 0.5 }}>[w x h]</Title>
                </FlexRow>
                <Select
                    isSearchable={false}
                    aria-label="Select a Resolution"
                    maxMenuHeight={420}
                    options={groupedResolutions.map((group) => ({
                        label: group.name,
                        options: group.resolutions.map((re, i) => {
                            return {
                                value: resolutionIndex++,
                                description:
                                    re.name === 'Custom' ? re.name : `${re.name} (${re.width}x${re.height})`,
                                label: (
                                    <>
                                        {re.name === 'Custom'
                                            ? re.name
                                            : `${re.name} (${re.width}x${re.height})`}
                                    </>
                                ),
                            }
                        }),
                    }))}
                    onChange={(e) => {
                        if (e !== null) {
                            setSelectedResolution(e.value)
                            if (e.value !== resolutions.length - 1) {
                                props.setParams({
                                    ...props.params,
                                    width: resolutions[e.value].width,
                                    height: resolutions[e.value].height,
                                })
                            }
                        }
                    }}
                    value={{
                        value: selectedResolution,
                        description: `${resolutions[selectedResolution].name} (${resolutions[selectedResolution].category})`,
                        label: (
                            <>{`${resolutions[selectedResolution].name} (${resolutions[selectedResolution].category})`}</>
                        ),
                    }}
                    styles={getDropdownStyle(siteTheme)}
                    theme={getDropdownTheme(siteTheme)}
                />
                <FlexRow>
                    <Input
                        type="number"
                        style={{ opacity: selectedResolution !== resolutions.length - 1 ? 0.5 : 1 }}
                        value={props.params.width ?? ''}
                        onChange={(e) => {
                            setSelectedResolution(resolutions.length - 1)
                            changeNumberValue(e.target.value, (s) =>
                                props.setParams({ ...props.params, width: s })
                            )
                        }}
                        onBlur={() =>
                            changeNumberValue(closestMultiple(props.params.width, 64), (s) =>
                                props.setParams({ ...props.params, width: s || 64 })
                            )
                        }
                        {...selectText}
                    />
                    <SubtleButton
                        onClick={() => {
                            const width = props.params.width
                            const height = props.params.height
                            setSelectedResolution(resolutions.length - 1)
                            props.setParams({ ...props.params, width: height, height: width })
                        }}
                    >
                        <CrossIcon
                            style={{
                                height: 15,
                                width: 15,
                                margin: '18px',
                                flex: '0 0 auto',
                            }}
                        />
                    </SubtleButton>
                    <Input
                        type="number"
                        style={{ opacity: selectedResolution !== resolutions.length - 1 ? 0.5 : 1 }}
                        value={props.params.height ?? ''}
                        onChange={(e) => {
                            setSelectedResolution(resolutions.length - 1)
                            changeNumberValue(e.target.value, (s) =>
                                props.setParams({ ...props.params, height: s })
                            )
                        }}
                        onBlur={() =>
                            changeNumberValue(closestMultiple(props.params.height, 64), (s) =>
                                props.setParams({ ...props.params, height: s || 64 })
                            )
                        }
                        {...selectText}
                    />
                </FlexRow>
                <InputLabel
                    style={{
                        opacity: maxSamplesForSize(props.params.width, props.params.height) === 1 ? 0.5 : 1,
                    }}
                >
                    <MainSettingSliderCard
                        title={'Number of Images: '}
                        min={1}
                        max={10}
                        step={1}
                        style={{ margin: 0 }}
                        value={Math.min(
                            maxSamplesForSize(props.params.width, props.params.height),
                            props.params.n_samples || 1
                        )}
                        onChange={(e) =>
                            changeNumberValue(e.toString(), (s) =>
                                props.setParams({ ...props.params, n_samples: s })
                            )
                        }
                        simple={true}
                    />
                </InputLabel>
            </BorderBox>
            {props.initImage && (
                <Fragment>
                    <FlexColSpacer min={20} max={20} />
                    <BorderBox>
                        <>
                            <Title style={{ opacity: 0.7 }}>
                                Uploaded Image Settings{' '}
                                <Tooltip
                                    delay={1}
                                    tooltip={''}
                                    elementTooltip={
                                        <>
                                            <strong>Strength: </strong>Controls how much the uploaded image
                                            will be changed. Lower Strength will generate an image closer to
                                            the original.
                                            <br />
                                            <br />
                                            <strong>Noise: </strong>Higher noise will increase the detail
                                            added to the uploaded image, but causes artifacts if too high.
                                            <br />
                                            In general, noise should always be a lower number than Strength.
                                        </>
                                    }
                                >
                                    <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                                </Tooltip>
                            </Title>
                            <div style={{ flex: '1' }}>
                                <MainSettingSliderCard
                                    title={'Strength: '}
                                    value={props.params.strength ?? ''}
                                    onChange={(e) => {
                                        props.setParams({ ...props.params, strength: e })
                                    }}
                                    min={0}
                                    max={0.99}
                                    step={0.01}
                                    style={{ margin: 0 }}
                                    simple={true}
                                />
                            </div>
                            <div style={{ flex: '1' }}>
                                <MainSettingSliderCard
                                    title={'Noise: '}
                                    value={props.params.noise ?? ''}
                                    onChange={(e) => {
                                        props.setParams({ ...props.params, noise: e })
                                    }}
                                    min={0}
                                    max={0.99}
                                    step={0.01}
                                    style={{ margin: 0 }}
                                    simple={true}
                                />
                            </div>
                        </>
                    </BorderBox>
                </Fragment>
            )}
            <FlexColSpacer min={20} max={20} />
            <BorderBox style={{ gap: '20px' }}>
                <Title style={{ opacity: 0.7 }}>
                    Model-Specific Settings
                    <Tooltip
                        delay={1}
                        tooltip={''}
                        elementTooltip={
                            <>
                                <strong>Steps: </strong>The number of iterations to refine the image for.
                                <br />
                                <br />
                                <strong>Scale: </strong>At high scale the prompt will be followed more
                                closely, with finer detail and sharpness. Low scale often results in greater
                                creative freedom, but reduced definition.
                            </>
                        }
                    >
                        <MdHelpOutline style={{ opacity: 0.3, marginLeft: '0.3rem' }} />
                    </Tooltip>
                </Title>
                {/*
                <Title>Module</Title>
                <Select
                    custom={true}
                    aria-label="Select a Module"
                    maxMenuHeight={420}
                    menuPlacement="top"
                    options={[undefined].map((m) => {
                        return {
                            value: m ?? undefined,
                            description: `${m ?? 'No Module'}`,
                            label: <>{`${m ?? 'No Module'}`}</>,
                        }
                    })}
                    onChange={(e) => {
                        if (e !== null) {
                            props.setParam  s({ ...props.params, module: e.value })
                        }
                    }}
                    value={{
                        value: props.params.module ?? 'No Module',
                        description: `${props.params.module ?? 'No Module'}`,
                        label: <>{`${props.params.module ?? 'No Module'}`}</>,
                    }}
                    styles={getDropdownStyle(siteTheme)}
                    theme={getDropdownTheme(siteTheme)}
                />
                */}
                <FlexRow grow={false}>
                    <InputLabel>
                        <Title>Steps</Title>
                        <Input
                            type="number"
                            disabled={!!props.initImage}
                            value={props.initImage ? DEFAULT_IMG2IMG_STEPS : props.params.steps ?? ''}
                            onChange={(e) =>
                                changeNumberValue(e.target.value, (s) =>
                                    props.setParams({
                                        ...props.params,
                                        steps: s,
                                    })
                                )
                            }
                            onBlur={() => {
                                props.setParams({
                                    ...props.params,
                                    steps: Math.max(1, Math.min(props.params.steps ?? 28, 50)),
                                })
                            }}
                            {...selectText}
                        />
                    </InputLabel>
                    <div style={{ width: 20 }} />
                    <InputLabel>
                        <Title>Scale</Title>
                        <Input
                            type="number"
                            min={1.1}
                            step={0.1}
                            max={100}
                            value={props.params.scale ?? ''}
                            onChange={(e) =>
                                changeNumberValue(
                                    e.target.value,
                                    (s) =>
                                        props.setParams({
                                            ...props.params,
                                            scale: s,
                                        }),
                                    true
                                )
                            }
                            onBlur={() => {
                                props.setParams({
                                    ...props.params,
                                    scale: Math.max(1.1, Math.min(props.params.scale ?? 12, 100)),
                                })
                            }}
                            {...selectText}
                        />
                    </InputLabel>
                </FlexRow>
                <InputLabel>
                    <Title>Seed</Title>
                    <Input
                        type="number"
                        placeholder="Enter your image seed here."
                        value={props.params.seed ?? ''}
                        onChange={(e) => {
                            changeNumberValue(e.target.value, (s) =>
                                props.setParams({ ...props.params, seed: s })
                            )
                        }}
                        {...selectText}
                    />
                </InputLabel>
                <Checkbox
                    label={'Add Quality Tags'}
                    checkedText={'Tags to increase quality with be prepended to the prompt.'}
                    uncheckedText={'The prompt will be used unmodified.'}
                    value={props.params.qualityToggle}
                    setValue={(b) => {
                        props.setParams({ ...props.params, qualityToggle: b })
                    }}
                    alternate
                />
                <InputLabel>
                    <Title>Undesired Content</Title>
                    {ucPresets.length > 0 && (
                        <Select
                            menuPlacement="auto"
                            isSearchable={false}
                            aria-label="Select a preset"
                            maxMenuHeight={420}
                            minMenuHeight={300}
                            options={ucPresets.map(({ name }, i) => ({
                                value: i,
                                description: `${name}`,
                                label: <>{`${name}`}</>,
                            }))}
                            onChange={(e) => {
                                if (e !== null) {
                                    props.setParams({ ...props.params, ucPreset: e.value })
                                }
                            }}
                            value={{
                                value: props.params.ucPreset,
                                description: `${ucPresets[props.params.ucPreset ?? 0].name}`,
                                label: <>{ucPresets[props.params.ucPreset ?? 0].name}</>,
                            }}
                            styles={getDropdownStyle(siteTheme)}
                            theme={getDropdownTheme(siteTheme)}
                        />
                    )}
                    <LargeInput
                        minRows={2}
                        maxRows={6}
                        placeholder="Anything in here is added to the preset selected above."
                        value={props.negPrompt ?? ''}
                        warn={props.negPromptTokens > SD_TOKEN_LIMIT}
                        onChange={(e) => {
                            props.setNegPrompt((e.target.value || '').replace(/(\n|\r)/g, ''))
                        }}
                        onInput={(e) => {
                            if (e.target instanceof HTMLTextAreaElement)
                                props.setNegPrompt((e.target.value || '').replace(/(\n|\r)/g, ''))
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                if (props.generateImage) props.generateImage()
                            }
                        }}
                        {...selectText}
                    />
                </InputLabel>
                <InputLabel>
                    <Title>Advanced: Sampling</Title>
                    <Select
                        menuPlacement="auto"
                        isSearchable={false}
                        aria-label="Select a sampler"
                        maxMenuHeight={420}
                        minMenuHeight={300}
                        options={samplingOptions.map(({ label, options }) => ({
                            label,
                            options: options.map((sampler) => ({
                                value: sampler.value,
                                description: `${sampler.value}`,
                                label: <>{`${sampler.value}`}</>,
                            })),
                        }))}
                        onChange={(e) => {
                            if (e !== null) {
                                props.setParams({
                                    ...props.params,
                                    sampler: e.value,
                                })
                            }
                        }}
                        value={{
                            value: props.params.sampler,
                            description: `${props.params.sampler}`,
                            label: <>{props.params.sampler}</>,
                        }}
                        styles={getDropdownStyle(siteTheme)}
                        theme={getDropdownTheme(siteTheme)}
                    />
                </InputLabel>
            </BorderBox>
        </>
    )

    const dalleMiniSettings = (
        <>
            <BorderBox>
                <FlexRow>
                    <Title>Image Resolution</Title>
                    <Title style={{ opacity: 0.5 }}>[w x h]</Title>
                </FlexRow>
                <Select
                    isSearchable={false}
                    aria-label="Select a Resolution"
                    maxMenuHeight={420}
                    isDisabled={true}
                    options={[{ name: 'Default', height: 256, width: 256 }].map((re, i) => {
                        return {
                            value: i,
                            description: `${re.name} (${re.width}x${re.height})`,
                            label: <>{`${re.name} (${re.width}x${re.height})`}</>,
                        }
                    })}
                    onChange={(e) => {
                        if (e !== null) {
                            setSelectedResolution(e.value)
                            if (e.value !== resolutions.length - 1) {
                                props.setParams({
                                    ...props.params,
                                    width: resolutions[e.value].width,
                                    height: resolutions[e.value].height,
                                })
                            }
                        }
                    }}
                    value={{
                        value: 0,
                        description: `Default`,
                        label: <>{`Default`}</>,
                    }}
                    styles={getDropdownStyle(siteTheme)}
                    theme={getDropdownTheme(siteTheme)}
                />
                <FlexRow>
                    <Input type="number" disabled={true} value={256} />
                    <CrossIcon
                        style={{
                            height: 15,
                            width: 15,
                            margin: '18px',
                            flex: '0 0 auto',
                            cursor: 'default',
                            opacity: 0.7,
                        }}
                    />
                    <Input type="number" disabled={true} value={256} />
                </FlexRow>
            </BorderBox>
            <div style={{ height: 20 }} />
            <BorderBox style={{ gap: '20px' }}>
                <Title style={{ opacity: 0.7 }}>Model-Specific Settings</Title>
                <MainSettingSliderCard
                    title={'Temperature'}
                    value={props.params.temperature ?? ''}
                    onChange={(e) => {
                        props.setParams({ ...props.params, temperature: e })
                    }}
                    min={0}
                    max={1}
                    step={0.01}
                    style={{ margin: 0 }}
                    simple={true}
                />
                <InputLabel>
                    <Title>Top K</Title>
                    <Input
                        type="number"
                        value={props.params.top_k ?? ''}
                        onChange={(e) =>
                            changeNumberValue(e.target.value, (s) =>
                                props.setParams({ ...props.params, top_k: s })
                            )
                        }
                        {...selectText}
                    />
                </InputLabel>

                <InputLabel>
                    <Title>Supercondition Factor</Title>
                    <Input
                        type="number"
                        value={props.params.supercondition_factor ?? ''}
                        onChange={(e) =>
                            changeNumberValue(e.target.value, (s) =>
                                props.setParams({ ...props.params, supercondition_factor: s })
                            )
                        }
                        {...selectText}
                    />
                </InputLabel>
            </BorderBox>
        </>
    )

    return (
        <OptionsContainer>
            <Title
                style={{
                    opacity: 0.5,
                    padding: 20,
                }}
            >
                Settings
            </Title>
            {props.children}
            {modelisStableDiffusion(props.model) && stableDiffusionSettings}
            {props.model === ImageGenerationModels.dalleMini && dalleMiniSettings}
        </OptionsContainer>
    )
}

const BorderBox = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    padding: 20px;
    gap: 10px;
    width: 100%;
`

const Title = styled.div`
    font-size: 0.875rem;
    flex: 0 0 auto;
    word-break: keep-all;
`

const Input = styled.input<{ warn?: boolean }>`
    height: 44px;
    padding: 10px 20px;
    border: 1px solid ${(props) => (props.warn ? props.theme.colors.warning : props.theme.colors.bg3)};
    border-radius: 3px;
    &:disabled {
        opacity: 0.5;
    }
`

const LargeInput = styled(TextareaAutosize)<{ warn?: boolean }>`
    padding: 12px 20px;
    border: 1px solid ${(props) => (props.warn ? props.theme.colors.warning : props.theme.colors.bg3)};
    border-radius: 3px;
    &:disabled {
        opacity: 0.5;
    }
`

const InputLabel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    * {
        font-weight: normal !important;
    }
`

const ButtonContainer = styled.div`
    flex: 2;
    display: flex;
    gap: 10px;
    margin-left: 20px;
    margin-top: 10px;
    @media (max-width: ${MOBILE_WIDTH}px) {
        margin: 10px 0;
        flex: 0 0 auto;
        width: 100%;
        height: 44px;
    }
    @media (min-width: ${MOBILE_WIDTH}px) {
        max-width: 300px;
    }
`

const GenerateButton = styled.button`
    background-color: ${(props) => props.theme.colors.bg1};
    color: ${(props) => props.theme.colors.textHeadings};
    height: 44px;
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    font-weight: 700;
    flex: .1 0 auto;
    border: 1px solid ${(props) => props.theme.colors.textHeadings};
    &:disabled {
        color: ${(props) => props.theme.colors.textHeadings};
        opacity: 0.5;
    }
    &:hover {
        background-color: ${(props) => props.theme.colors.textHeadings};
        color: ${(props) => props.theme.colors.bg1};
    }
    &:active {
        transform: scale(0.98);
    }
    transition: color 100ms, background-color 100ms, transform 150ms;

    align-self: flex-end;

    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-left: 20px;
    padding-right: 20px;
    gap: 10px;

    & > span:nth-child(2) {
        font-size: 0.875rem;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        padding: 1px 10px;
        color: ${(props) => props.theme.colors.bg1};
        background-color: ${(props) => props.theme.colors.textHeadings};
        border-radius: 3px;
        font-weight: 600;
        transition: color 100ms, background-color 100ms, transform 150ms;
        ${Icon} {
            margin-left: 3px;
            background-color: ${(props) => props.theme.colors.bg1};
            transition: background-color 100ms, background-color 100ms, transform 150ms;
        }
    }
    &:hover {
        & > span:nth-child(2) {
            color: ${(props) => props.theme.colors.textHeadings};
            background-color: ${(props) => props.theme.colors.bg1};
            ${Icon} {
                background-color: ${(props) => props.theme.colors.textHeadings};
            }
        }
    }

    & > * {
        white-space: pre;
        word-break: keep-all;
    }
`

const EnhanceButton = styled.button`
    background-color: ${(props) => props.theme.colors.bg1};
    color: ${(props) => props.theme.colors.textHeadings};
    height: 44px;
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    font-weight: 700;
    flex: 3 0 auto;
    border: 1px solid ${(props) => props.theme.colors.textHeadings};
    &:disabled {
        color: ${(props) => props.theme.colors.textHeadings};
        opacity: 0.5;
    }
    &:hover {
        background-color: ${(props) => props.theme.colors.textHeadings};
        color: ${(props) => props.theme.colors.bg1};
    }
    &:active {
        transform: scale(0.98);
    }
    transition: color 100ms, background-color 100ms, transform 150ms;

    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-left: 20px;
    padding-right: 20px;

    & > span:nth-child(2) {
        font-size: 0.875rem;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        padding: 1px 10px;
        color: ${(props) => props.theme.colors.bg1};
        background-color: ${(props) => props.theme.colors.textHeadings};
        border-radius: 3px;
        font-weight: 600;
        transition: color 100ms, background-color 100ms, transform 150ms;
        ${Icon} {
            margin-left: 3px;
            background-color: ${(props) => props.theme.colors.bg1};
            transition: background-color 100ms, background-color 100ms, transform 150ms;
        }
    }
    &:hover {
        & > span:nth-child(2) {
            color: ${(props) => props.theme.colors.textHeadings};
            background-color: ${(props) => props.theme.colors.bg1};
            ${Icon} {
                background-color: ${(props) => props.theme.colors.textHeadings};
            }
        }
    }
`

const SaveAllButton = styled.button`
    background-color: ${(props) => props.theme.colors.bg3};
    flex: 0 0 auto;
    cursor: pointer;
    height: 44px;
    width: 60px;
    align-self: flex-end;
    border-radius: 3px;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 0 0 auto;
    &:disabled {
        color: ${(props) => props.theme.colors.bg2};
        opacity: 0.5;
    }
`

const RemoveInitImageButton = styled(SubtleButton)`
    background-color: ${(props) => transparentize(0.2, props.theme.colors.bg2)};
`

const EnhanceBox = styled.div`
    display: flex;
    flex-direction: column;
    padding: 20px;
    position: absolute;
    bottom: 20px;
    left: 20px;
    min-width: 300px;
    width: calc(100% - 40px);

    background-color: ${(props) => props.theme.colors.bg1};
    border-radius: 3px;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    gap: 10px;
`

const EnhanceTitle = styled.div`
    display: flex;
    gap: 10px;
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textHeadings};
    div {
        background-color: ${(props) => props.theme.colors.textHeadings};
    }
`
function getCursorPosition(
    canvas: HTMLCanvasElement,
    event: MouseEvent,
    canvasScaleFactor?: number
): [number, number] {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    // Canvas is stretched to fill the window, so we need to scale the coordinates appropriately.
    const internalWidth = canvas.width / (canvasScaleFactor ?? 1)
    const internalHeight = canvas.height / (canvasScaleFactor ?? 1)

    return [Math.floor(x * (internalWidth / rect.width)), Math.floor(y * (internalHeight / rect.height))]
}

enum DrawMode {
    None,
    Draw,
    Erase,
    Select,
    ColorPicker,
}

function getDrawModeName(mode: DrawMode): string {
    switch (mode) {
        case DrawMode.None:
            return 'None'
        case DrawMode.Draw:
            return 'Draw'
        case DrawMode.Erase:
            return 'Erase'
        case DrawMode.Select:
            return 'Select'
        case DrawMode.ColorPicker:
            return 'Color Picker'
    }
}

interface Selection {
    xAnchor: number
    yAnchor: number
    x: number
    y: number
}

let drawing = false
let selecting = false
let draggingSelection = false
let selectionToClear: Selection | null = null
let selection: Selection | null = null

let _drawMode = DrawMode.Draw

let lastCursorPos: undefined | [number, number]

let fpsInterval: number = 0
let now: number = 0
let then: number = 0
let elapsed: number = 0

// initialize the timer variables and start the animation

function startAnimating(fps: number) {
    fpsInterval = 1000 / fps
    then = Date.now()
    drawLoop()
}

interface RerollLayer {
    maskCanvasRef: HTMLCanvasElement
    seed?: number
    lastSeed?: number
    color: string
}

let canvas: HTMLCanvasElement | null = null
let underCanvas: HTMLCanvasElement | null = null
let _rerollLayers: RerollLayer[] = []
let _selectedLayer: number | undefined
const ERASE_COLOR = 'rgba(255, 255, 255, 1)'
let _penColor = 'rgba(0, 0, 0, 1)'
let _penAlpha = 1.0
let _penSize = 30
let _penPressure = 1
let drawBlocked = false // prevent drawing while selecting color
let canvasHistory: ImageData[] = []
let canvasHistoryIndex = -1

function backCanvasHistory() {
    selection = null
    selectionToClear = null

    if (canvasHistoryIndex > 0) {
        canvasHistoryIndex--
        const canvasData = canvasHistory[canvasHistoryIndex]
        const canvas = document.createElement('canvas')
        canvas.width = canvasData.width
        canvas.height = canvasData.height
        const ctx = canvas.getContext('2d')
        if (ctx && underCanvas) {
            ctx.putImageData(canvasData, 0, 0)
            const underCtx = underCanvas.getContext('2d')
            if (underCtx) {
                underCtx.clearRect(0, 0, underCanvas.width, underCanvas.height)
                underCtx.drawImage(canvas, 0, 0)
            }
        }
    }
}

function forwardCanvasHistory() {
    selection = null
    selectionToClear = null

    if (canvasHistoryIndex < canvasHistory.length - 1) {
        canvasHistoryIndex++
        const canvasData = canvasHistory[canvasHistoryIndex]
        const canvas = document.createElement('canvas')
        canvas.width = canvasData.width
        canvas.height = canvasData.height
        const ctx = canvas.getContext('2d')
        if (ctx && underCanvas) {
            ctx.putImageData(canvasData, 0, 0)
            const underCtx = underCanvas.getContext('2d')
            if (underCtx) {
                underCtx.clearRect(0, 0, underCanvas.width, underCanvas.height)
                underCtx.drawImage(canvas, 0, 0)
            }
        }
    }
}

function addCanvasHistory() {
    if (!underCanvas) return
    const ctx = underCanvas?.getContext('2d')
    if (!ctx) return
    const canvasData = ctx.getImageData(0, 0, underCanvas.width, underCanvas.height)
    canvasHistory = canvasHistory.slice(0, canvasHistoryIndex + 1)
    canvasHistory.push(canvasData)
    canvasHistoryIndex++
    if (canvasHistory.length > 50) {
        canvasHistory.shift()
    }
    canvasHistoryIndex = canvasHistory.length - 1
}

const drawLoop = () => {
    window.requestAnimationFrame(drawLoop)
    now = Date.now()
    elapsed = now - then

    // if enough time has elapsed, draw the next frame

    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval)

        const PEN_SIZE = _penSize * _penPressure

        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx || !underCanvas) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(underCanvas, 0, 0)

        // draw dotted line around current selection
        if (selection && !draggingSelection) {
            const { xAnchor, yAnchor, x, y } = selection
            ctx.beginPath()
            ctx.moveTo(xAnchor, yAnchor)
            ctx.lineTo(x, yAnchor)
            ctx.lineTo(x, y)
            ctx.lineTo(xAnchor, y)
            ctx.lineTo(xAnchor, yAnchor)
            ctx.strokeStyle = '#000'
            ctx.lineWidth = 1
            ctx.setLineDash([5, 5])
            ctx.stroke()
            ctx.closePath()
        }
        // if using the draw or erase tool, draw a cursor based on pen size
        if ((_drawMode === DrawMode.Draw || _drawMode === DrawMode.Erase) && lastCursorPos) {
            const [x, y] = lastCursorPos

            if (_rerollLayers.length > 0) {
                const data = ctx.getImageData(
                    x - Math.floor(PEN_SIZE / 2),
                    y - Math.floor(PEN_SIZE / 2),
                    PEN_SIZE,
                    PEN_SIZE
                )
                // scale the image up 8x
                const scaledData = ctx.createImageData(data.width * 8, data.height * 8)
                for (let i = 0; i < scaledData.data.length; i += 4) {
                    scaledData.data[i] = data.data[i]
                    scaledData.data[i + 1] = data.data[i + 1]
                    scaledData.data[i + 2] = data.data[i + 2]
                    scaledData.data[i + 3] = data.data[i + 3]
                }
                // draw border at edges of the data
                for (let i = 0; i < scaledData.data.length; i += 4) {
                    if (
                        i % (scaledData.width * 4) < 4 ||
                        i % (scaledData.width * 4) >= scaledData.width * 4 - 4
                    ) {
                        scaledData.data[i] = 0
                        scaledData.data[i + 1] = 0
                        scaledData.data[i + 2] = 0
                        scaledData.data[i + 3] = 155
                    }
                    if (i < 4 || i >= scaledData.data.length - 4) {
                        scaledData.data[i] = 0
                        scaledData.data[i + 1] = 0
                        scaledData.data[i + 2] = 0
                        scaledData.data[i + 3] = 155
                    }
                    // top and bottom edge
                    if (i < scaledData.width * 4 || i >= scaledData.data.length - scaledData.width * 4) {
                        scaledData.data[i] = 0
                        scaledData.data[i + 1] = 0
                        scaledData.data[i + 2] = 0
                        scaledData.data[i + 3] = 155
                    }
                    if (
                        i % (scaledData.width * 4) < 4 ||
                        i % (scaledData.width * 4) >= scaledData.width * 4 - 4
                    ) {
                        scaledData.data[i] = 0
                        scaledData.data[i + 1] = 0
                        scaledData.data[i + 2] = 0
                        scaledData.data[i + 3] = 155
                    }
                }

                ctx.putImageData(
                    scaledData,
                    (x - Math.floor(PEN_SIZE / 2)) * 8,
                    (y - Math.floor(PEN_SIZE / 2)) * 8
                )
            } else {
                ctx.beginPath()
                ctx.strokeStyle = '#000'
                ctx.lineWidth = 1
                ctx.arc(x, y, PEN_SIZE / 2, 0, 2 * Math.PI)
                // no fill, just a stroke
                ctx.stroke()

                ctx.closePath()
            }
        }

        ctx.globalAlpha = 0.5
        ctx.imageSmoothingEnabled = false
        for (const layer of _rerollLayers) {
            ctx.drawImage(layer.maskCanvasRef, 0, 0, canvas.width, canvas.height)
        }
        ctx.imageSmoothingEnabled = true
        ctx.globalAlpha = 1

        // fill selection section with white, transpose selection to new location
        if (
            selection &&
            selectionToClear &&
            selection.xAnchor !== selection.x &&
            selection.yAnchor !== selection.y &&
            // don't draw if selection and selectionToClear are the same
            !(
                selection.x === selectionToClear.x &&
                selection.y === selectionToClear.y &&
                selection.xAnchor === selectionToClear.xAnchor &&
                selection.yAnchor === selectionToClear.yAnchor
            )
        ) {
            const oMinX = Math.min(selectionToClear.xAnchor, selectionToClear.x)
            const oMinY = Math.min(selectionToClear.yAnchor, selectionToClear.y)
            const oMaxX = Math.max(selectionToClear.xAnchor, selectionToClear.x)
            const oMaxY = Math.max(selectionToClear.yAnchor, selectionToClear.y)
            const nMinX = Math.min(selection.xAnchor, selection.x)
            const nMinY = Math.min(selection.yAnchor, selection.y)
            const nMaxX = Math.max(selection.xAnchor, selection.x)
            const nMaxY = Math.max(selection.yAnchor, selection.y)
            // create temp canvas to hold selection while clearing
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = nMaxX - nMinX
            tempCanvas.height = nMaxY - nMinY
            const tempCtx = tempCanvas.getContext('2d')
            if (!tempCtx) return
            tempCtx.drawImage(
                underCanvas,
                oMinX,
                oMinY,
                oMaxX - oMinX + 2,
                oMaxY - oMinY + 2,
                0,
                0,
                oMaxX - oMinX + 2,
                oMaxY - oMinY + 2
            )
            // clear selection area
            ctx.clearRect(oMinX + 1, oMinY + 1, oMaxX - oMinX - 2, oMaxY - oMinY - 2)
            // draw to new location
            ctx.drawImage(tempCanvas, nMinX, nMinY, nMaxX - nMinX, nMaxY - nMinY)
        }
    }
}

const RerollMaskColors = [
    'rgba(140, 0, 129, 1)',
    'rgba(0, 49, 173, 1)',
    'rgba(0, 153, 48, 1)',
    'rgba(184, 0, 0, 1)',
    'rgba(0, 163, 163, 1)',
]

let _pressureSensitivity = isTouchScreenDevice

function Canvas(props: {
    image?: Buffer
    height?: number
    width?: number
    close: (image?: Buffer) => void
    rerollMode: boolean
    rerollImage?: ImageInfo
    rerollGenerate: (
        image: ImageInfo,
        masks: { seed: number; mask: Buffer }[]
    ) => Promise<{ images: ImageInfo[]; seeds: number[] }>
}) {
    const [canvasSize, setCanvasSize] = useState([0, 0])
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const underCanvasRef = useRef<HTMLCanvasElement>(null)
    const [canvasInternalSize, setCanvasInternalSize] = useState([1024, 1024])
    const preventDoubleStartRef = useRef<boolean>(false)
    const [rerollImage, setRerollImage] = useState<ImageInfo | undefined>(props.rerollImage)
    const [pressureSensitivity, setPressureSensitivity] = useState(_pressureSensitivity)

    // Set up canvas paint loop
    const [penColor, setPenColor] = useState(_penColor)
    const changePenColor = (color: string) => {
        setPenColor(color)
        _penColor = color
        _penAlpha = alphaFromRgba(color)
    }
    const [penSize, setPenSize] = useState(_penSize)
    const changePenSize = (size: number) => {
        size = Math.min(500, size)
        size = Math.max(1, size)
        setPenSize(size)
        _penSize = size
    }
    const [drawMode, setDrawMode] = useState(_drawMode)
    const changeDrawMode = (mode: DrawMode) => {
        setDrawMode(mode)
        _drawMode = mode
        selection = null
        selectionToClear = null
    }
    const [displayCanvas, setDisplayCanvas] = useState(false)
    const [rerollLayers, setRerollLayers] = useState<RerollLayer[]>([])
    const changeRerollLayers = (newRerollLayers: RerollLayer[]) => {
        setRerollLayers(newRerollLayers)
        _rerollLayers = newRerollLayers
    }
    const [selectedLayer, setSelectedLayer] = useState(0)
    const changeSelectedLayer = (newSelectedLayer: number) => {
        setSelectedLayer(newSelectedLayer)
        _selectedLayer = newSelectedLayer
    }

    const updateLayers = useReload()

    const setCanvasSizes = (width: number, height: number) => {
        const canvas = canvasRef.current
        const underCanvas = underCanvasRef.current
        if (!canvas || !underCanvas) return
        canvas.width = width
        canvas.height = height
        underCanvas.width = width
        underCanvas.height = height
        setCanvasInternalSize([width, height])
    }
    useLayoutEffect(() => {
        if (preventDoubleStartRef.current) return
        // Perform canvas opening setup
        startAnimating(30)
        preventDoubleStartRef.current = true
        canvas = document.querySelector('#canvas')
        underCanvas = document.querySelector('#under-canvas')
        setTimeout(() => {
            setDisplayCanvas(true)
        }, 100)
        // on first load fill canvas with image from props
        if (props.rerollMode && props.rerollImage) {
            const width = props.rerollImage.width
            const height = props.rerollImage.height
            setCanvasSizes(width, height)
            const newCanvas = document.createElement('canvas')
            newCanvas.width = width / 8
            newCanvas.height = height / 8
            changeRerollLayers([
                {
                    maskCanvasRef: newCanvas,
                    color: RerollMaskColors[0],
                },
            ])
            setSelectedLayer(0)
            changePenSize(5)
        }
        if (!props.image) {
            setCanvasSizes(props.width ?? 1024, props.height ?? 1024)
            return
        }
        if (!canvas || !underCanvas) return
        const ctxUnder = underCanvas.getContext('2d')
        if (!ctxUnder) return
        // convert buffer
        const image = new Image()
        image.src = `data:image/png;base64,${props.image.toString('base64')}`
        image.addEventListener('load', () => {
            // set canvas size to image size
            if (!canvas || !underCanvas) return
            setCanvasSizes(image.width, image.height)
            ctxUnder.drawImage(image, 0, 0)
            addCanvasHistory()
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useLayoutEffect(() => {
        const canvas = canvasRef.current
        const drawCanvas = props.rerollMode
            ? rerollLayers[selectedLayer]?.maskCanvasRef ?? underCanvasRef.current
            : underCanvasRef.current
        if (!canvas || !drawCanvas) return

        const mouseDown = (e: any) => {
            if (drawBlocked) return
            // if outside of canvas, do nothing
            const [x, y] = getCursorPosition(canvas, e, props.rerollMode ? 8 : 1)
            if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) {
                return
            }

            _penPressure = _pressureSensitivity ? e.pressure ?? 1 : 1

            const PEN_SIZE = _penSize * _penPressure
            const PEN_ALPHA = _penAlpha * _penPressure

            switch (_drawMode) {
                case DrawMode.Erase:
                case DrawMode.Draw: {
                    drawing = true
                    // draw circle on canvas
                    const ctx = drawCanvas.getContext('2d')
                    if (!ctx) break
                    ctx.beginPath()
                    ctx.globalAlpha = PEN_ALPHA
                    ctx.globalCompositeOperation =
                        _drawMode === DrawMode.Erase ? 'destination-out' : 'source-over'
                    ctx.fillStyle = _penColor
                    if (props.rerollMode) {
                        // draw by getData to avoid transparency
                        const data = ctx.getImageData(
                            x - Math.floor(PEN_SIZE / 2),
                            y - Math.floor(PEN_SIZE / 2),
                            PEN_SIZE,
                            PEN_SIZE
                        )
                        const dataLength = data.data.length
                        for (let i = 0; i < dataLength; i += 4) {
                            data.data[i] = 0
                            data.data[i + 1] = 0
                            data.data[i + 2] = 0
                            data.data[i + 3] = _drawMode === DrawMode.Erase ? 0 : 255
                        }
                        ctx.putImageData(data, x - Math.floor(PEN_SIZE / 2), y - Math.floor(PEN_SIZE / 2))
                    } else {
                        ctx.arc(x, y, PEN_SIZE / 2, 0, Math.PI * 2)
                        ctx.fill()
                    }
                    ctx.globalCompositeOperation = 'source-over'
                    ctx.globalAlpha = 1.0
                    ctx.closePath()
                    break
                }
                case DrawMode.Select: {
                    if (selection) {
                        const maxX = Math.max(selection.xAnchor, selection.x)
                        const minX = Math.min(selection.xAnchor, selection.x)
                        const maxY = Math.max(selection.yAnchor, selection.y)
                        const minY = Math.min(selection.yAnchor, selection.y)
                        // if within the current selection
                        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                            draggingSelection = true
                            lastCursorPos = [x, y]
                            break
                        } else if (selectionToClear) {
                            // finish drag
                            draggingSelection = false
                            const ctx = drawCanvas.getContext('2d')
                            if (!ctx) break
                            const oMinX = Math.min(selectionToClear.xAnchor, selectionToClear.x)
                            const oMinY = Math.min(selectionToClear.yAnchor, selectionToClear.y)
                            const oMaxX = Math.max(selectionToClear.xAnchor, selectionToClear.x)
                            const oMaxY = Math.max(selectionToClear.yAnchor, selectionToClear.y)
                            const nMinX = Math.min(selection.xAnchor, selection.x)
                            const nMinY = Math.min(selection.yAnchor, selection.y)
                            const nMaxX = Math.max(selection.xAnchor, selection.x)
                            const nMaxY = Math.max(selection.yAnchor, selection.y)
                            // create temp canvas to hold selection while clearing
                            const tempCanvas = document.createElement('canvas')
                            tempCanvas.width = nMaxX - nMinX
                            tempCanvas.height = nMaxY - nMinY
                            const tempCtx = tempCanvas.getContext('2d')
                            if (!tempCtx) break
                            tempCtx.drawImage(
                                drawCanvas,
                                oMinX,
                                oMinY,
                                oMaxX - oMinX + 2,
                                oMaxY - oMinY + 2,
                                0,
                                0,
                                oMaxX - oMinX + 2,
                                oMaxY - oMinY + 2
                            )
                            // clear selection area
                            ctx.clearRect(oMinX + 1, oMinY + 1, oMaxX - oMinX - 2, oMaxY - oMinY - 2)
                            // draw to new location
                            ctx.drawImage(tempCanvas, nMinX, nMinY, nMaxX - nMinX, nMaxY - nMinY)
                            selection = null
                            selectionToClear = null
                            addCanvasHistory()
                        }
                    }
                    selecting = true

                    selection = { xAnchor: x, yAnchor: y, x: x, y: y }
                    selectionToClear = { xAnchor: x, yAnchor: y, x: x, y: y }
                    break
                }
                case DrawMode.ColorPicker: {
                    const ctx = drawCanvas.getContext('2d')
                    if (!ctx) break
                    const imageData = ctx.getImageData(x, y, 1, 1)
                    const { data } = imageData
                    const color = `rgba(${data[0]}, ${data[1]}, ${data[2]}, 1)`
                    changePenColor(color)
                    changeDrawMode(DrawMode.Draw)
                    break
                }
            }
            lastCursorPos = [x, y]
        }
        const mouseUp = (e: any) => {
            const [x, y] = getCursorPosition(canvas, e, props.rerollMode ? 8 : 1)
            _penPressure = 1
            switch (_drawMode) {
                case DrawMode.Erase:
                case DrawMode.Draw: {
                    if (drawing) {
                        addCanvasHistory()
                    }
                    drawing = false
                    break
                }
                case DrawMode.Select: {
                    if (draggingSelection) {
                        draggingSelection = false
                    } else if (selecting) {
                        selecting = false
                        const ctx = drawCanvas.getContext('2d')
                        if (!ctx || !selection) break
                        if (selection.x === selection.xAnchor || selection.y === selection.yAnchor) {
                            selection = null
                            selectionToClear = null
                            break
                        }
                    }
                }
            }
            lastCursorPos = [x, y]
            updateLayers()
        }
        const mouseMove = (e: any) => {
            let [x, y] = getCursorPosition(canvas, e, props.rerollMode ? 8 : 1)
            // if outside of canvas limit x and y to canvas bounds
            if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) {
                x = x < 0 ? 0 : x > canvas.width ? canvas.width : x
                y = y < 0 ? 0 : y > canvas.height ? canvas.height : y
            }

            _penPressure = _pressureSensitivity ? e.pressure || 1 : 1

            const PEN_SIZE = _penSize * _penPressure
            const PEN_ALPHA = _penAlpha * _penPressure

            switch (_drawMode) {
                case DrawMode.Erase:
                case DrawMode.Draw: {
                    if (!drawing) break
                    // draw circle on canvas
                    const ctx = drawCanvas.getContext('2d')
                    if (!ctx) break
                    ctx.globalCompositeOperation =
                        _drawMode === DrawMode.Erase ? 'destination-out' : 'source-over'
                    ctx.fillStyle = _penColor
                    ctx.strokeStyle = _penColor
                    ctx.globalAlpha = PEN_ALPHA
                    if (props.rerollMode) {
                        // draw by getData to avoid transparency
                        // connecting line not drawn, since I can't figure out how to draw a pixel perfect line
                        const data = ctx.getImageData(
                            x - Math.floor(PEN_SIZE / 2),
                            y - Math.floor(PEN_SIZE / 2),
                            PEN_SIZE,
                            PEN_SIZE
                        )
                        const dataLength = data.data.length
                        for (let i = 0; i < dataLength; i += 4) {
                            data.data[i] = 0
                            data.data[i + 1] = 0
                            data.data[i + 2] = 0
                            data.data[i + 3] = _drawMode === DrawMode.Erase ? 0 : 255
                        }
                        ctx.putImageData(data, x - Math.floor(PEN_SIZE / 2), y - Math.floor(PEN_SIZE / 2))
                    } else {
                        if (lastCursorPos) {
                            ctx.beginPath()
                            ctx.moveTo(lastCursorPos[0], lastCursorPos[1])
                            ctx.lineWidth = PEN_SIZE
                            ctx.lineTo(x, y)
                            ctx.stroke()
                            ctx.closePath()
                        }
                        ctx.beginPath()
                        ctx.arc(x, y, PEN_SIZE / 2, 0, 2 * Math.PI)
                        ctx.fill()
                        ctx.closePath()
                    }
                    ctx.globalAlpha = 1.0
                    ctx.globalCompositeOperation = 'source-over'
                    break
                }
                case DrawMode.Select: {
                    if (draggingSelection) {
                        if (lastCursorPos && selection) {
                            const xDiff = x - lastCursorPos[0]
                            const yDiff = y - lastCursorPos[1]
                            selection = {
                                xAnchor: selection.xAnchor + xDiff,
                                yAnchor: selection.yAnchor + yDiff,
                                x: selection.x + xDiff,
                                y: selection.y + yDiff,
                            }
                        }
                        break
                    }
                    if (!selecting) break
                    selection = {
                        xAnchor: selection?.xAnchor ?? 0,
                        yAnchor: selection?.yAnchor ?? 0,
                        x: x,
                        y: y,
                    }
                    selectionToClear = {
                        xAnchor: selection?.xAnchor ?? 0,
                        yAnchor: selection?.yAnchor ?? 0,
                        x: x,
                        y: y,
                    }
                }
            }
            lastCursorPos = [x, y]
        }

        const bKeyDown = (e: any) => {
            if (e.key === 'b') changeDrawMode(DrawMode.Draw)
        }

        const eKeyDown = (e: any) => {
            if (e.key === 'e') changeDrawMode(DrawMode.Erase)
        }

        const sKeyDown = (e: any) => {
            if (e.key === 's' && !props.rerollMode) changeDrawMode(DrawMode.Select)
        }

        const cKeyDown = (e: any) => {
            if (e.key === 'c' && !props.rerollMode) changeDrawMode(DrawMode.ColorPicker)
        }

        const zKeyDown = (e: any) => {
            if (e.key === 'z' && !props.rerollMode && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                backCanvasHistory()
            }
        }

        const yKeyDown = (e: any) => {
            if (e.key === 'y' && !props.rerollMode && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                forwardCanvasHistory()
            }
        }

        window.addEventListener('pointerdown', mouseDown)
        window.addEventListener('pointerup', mouseUp)
        window.addEventListener('pointermove', mouseMove)
        window.addEventListener('keydown', bKeyDown)
        window.addEventListener('keydown', eKeyDown)
        window.addEventListener('keydown', sKeyDown)
        window.addEventListener('keydown', cKeyDown)
        window.addEventListener('keydown', zKeyDown)
        window.addEventListener('keydown', yKeyDown)
        return () => {
            window.removeEventListener('pointerdown', mouseDown)
            window.removeEventListener('pointerup', mouseUp)
            window.removeEventListener('pointermove', mouseMove)
            window.removeEventListener('keydown', bKeyDown)
            window.removeEventListener('keydown', eKeyDown)
            window.removeEventListener('keydown', sKeyDown)
            window.removeEventListener('keydown', cKeyDown)
            window.removeEventListener('keydown', zKeyDown)
            window.removeEventListener('keydown', yKeyDown)
        }
    }, [props.rerollMode, rerollLayers, selectedLayer])

    const containerRef = useRef<HTMLDivElement>(null)

    const windowSize = useWindowSize()

    useLayoutEffect(() => {
        if (!containerRef.current) return
        const { width, height } = containerRef.current.getBoundingClientRect()
        const containerAspectRatio = width / height
        const canvasAspectRatio = canvasInternalSize[0] / canvasInternalSize[1]
        const expandedBaseOnWidth = containerAspectRatio < canvasAspectRatio
        if (expandedBaseOnWidth) {
            const expandedWidth = width
            const expandedHeight = expandedWidth / canvasAspectRatio
            setCanvasSize([expandedWidth, expandedHeight])
        } else {
            const expandedHeight = height
            const expandedWidth = expandedHeight * canvasAspectRatio
            setCanvasSize([expandedWidth, expandedHeight])
        }
    }, [containerRef, windowSize.width, windowSize.height, canvasInternalSize])

    const [widthInput, setWidthInput] = useState<number | undefined>(canvasInternalSize[0])
    const [heightInput, setHeightInput] = useState<number | undefined>(canvasInternalSize[1])
    const [topInput, setTopInput] = useState<number | undefined>(0)
    const [leftInput, setLeftInput] = useState<number | undefined>(0)
    const [rightInput, setRightInput] = useState<number | undefined>(0)
    const [bottomInput, setBottomInput] = useState<number | undefined>(0)

    const changeCanvasDimensions = (top: number, left: number, right: number, bottom: number) => {
        const canvas = canvasRef.current
        const underCanvas = underCanvasRef.current
        if (!canvas || !underCanvas) return
        const [width, height] = canvasInternalSize
        const newWidth = width + right + left
        const newHeight = height + bottom + top
        if (newWidth < 128 || newHeight < 128) {
            toast('Canvas dimensions must be at least 128x128')
            return
        }
        // transfer old canvas content to new canvas
        // canvas should be shifted according to the top and left values
        const ctx = underCanvas.getContext('2d')
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = width
        tempCanvas.height = height
        const tempCtx = tempCanvas.getContext('2d')
        if (!ctx || !tempCtx) return
        tempCtx.drawImage(underCanvas, 0, 0, width, height, 0, 0, width, height)
        underCanvas.width = newWidth
        underCanvas.height = newHeight
        ctx.drawImage(
            tempCanvas,
            Math.max(0, -left),
            Math.max(0, -top),
            newWidth,
            newHeight,
            Math.max(0, left),
            Math.max(0, top),
            newWidth,
            newHeight
        )
        canvas.width = newWidth
        canvas.height = newHeight
        setCanvasInternalSize([newWidth, newHeight])
        setWidthInput(newWidth)
        setHeightInput(newHeight)
        setTopInput(0)
        setLeftInput(0)
        setRightInput(0)
        setBottomInput(0)
    }

    const [resizeModalOpen, setResizeModalOpen] = useState(false)

    useEffect(() => {
        drawBlocked = resizeModalOpen
    }, [resizeModalOpen])

    const selectText = {
        onMouseDown: (e: any) => {
            if (e.target !== document.activeElement) {
                e.preventDefault()
                ;(e.target as HTMLInputElement).select()
            }
        },
    }

    const setSizeFromDirections = (
        top: number | undefined,
        left: number | undefined,
        bottom: number | undefined,
        right: number | undefined
    ) => {
        if (top === undefined || left === undefined || bottom === undefined || right === undefined) return
        setWidthInput(canvasInternalSize[0] + right + left)
        setHeightInput(canvasInternalSize[1] + bottom + top)
    }

    const setDirectionsFromSize = (width: number | undefined, height: number | undefined) => {
        if (width === undefined || height === undefined) return
        setTopInput(0)
        setLeftInput(0)
        setRightInput(width - canvasInternalSize[0])
        setBottomInput(height - canvasInternalSize[1])
    }

    const cropToMultipleOf = (value: number) => {
        if (widthInput === undefined || heightInput === undefined) return
        const width = canvasInternalSize[0]
        const height = canvasInternalSize[1]
        const newWidth = Math.floor(width / value) * value
        const newHeight = Math.floor(height / value) * value
        const heightDiff = newHeight - height
        const widthDiff = newWidth - width
        const left = Math.floor(widthDiff / 2)
        const top = Math.floor(heightDiff / 2)
        const right = Math.ceil(widthDiff / 2)
        const bottom = Math.ceil(heightDiff / 2)
        setLeftInput(left)
        setTopInput(top)
        setRightInput(right)
        setBottomInput(bottom)
        setSizeFromDirections(top, left, bottom, right)
    }

    useEffect(() => {
        if (!resizeModalOpen) return
        // reset values when modal is opened
        setWidthInput(canvasInternalSize[0])
        setHeightInput(canvasInternalSize[1])
        setTopInput(0)
        setLeftInput(0)
        setRightInput(0)
        setBottomInput(0)
    }, [canvasInternalSize, resizeModalOpen])

    const [generating, setGenerating] = useState(false)

    return (
        <div
            style={{
                display: 'flex',
                height: '100%',
                width: '100%',
            }}
        >
            <CanvasContainer>
                <div
                    style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        marginBottom: '5px',
                    }}
                >
                    <span
                        style={{
                            opacity: 0.5,
                        }}
                    >
                        Selected:{' '}
                    </span>
                    <Highlight>{getDrawModeName(drawMode)}</Highlight>
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        minHeight: '44px',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                    }}
                >
                    <CanvasControlButton
                        selected={drawMode === DrawMode.Draw}
                        onClick={() => {
                            changeDrawMode(DrawMode.Draw)
                        }}
                    >
                        <PenIcon />
                    </CanvasControlButton>
                    <CanvasControlButton
                        selected={drawMode === DrawMode.Erase}
                        onClick={() => {
                            changeDrawMode(DrawMode.Erase)
                        }}
                    >
                        <EraserIcon />
                    </CanvasControlButton>
                    {!props.rerollMode && (
                        <>
                            <CanvasControlButton
                                selected={drawMode === DrawMode.Select}
                                onClick={() => {
                                    changeDrawMode(DrawMode.Select)
                                }}
                            >
                                <SelectIcon />
                            </CanvasControlButton>
                            <CanvasControlButton
                                selected={drawMode === DrawMode.ColorPicker}
                                onClick={() => {
                                    changeDrawMode(DrawMode.ColorPicker)
                                }}
                            >
                                <DropperIcon />
                            </CanvasControlButton>
                            <ColorPicker
                                color={penColor}
                                onChange={(e: string) => {
                                    changePenColor(e)
                                    setDrawMode(DrawMode.Draw)
                                }}
                            />
                        </>
                    )}
                    <MinorSettingSliderCard
                        title="Pen Size"
                        min={props.rerollMode ? 1 : 5}
                        max={props.rerollMode ? 20 : 100}
                        step={props.rerollMode ? 1 : 5}
                        value={penSize}
                        uncapMax={true}
                        uncapMin={true}
                        onChange={(e: number) => {
                            changePenSize(e)
                        }}
                        style={{
                            margin: 0,
                        }}
                    />
                    <Tooltip tooltip={'Pressure Sensitivity'} delay={0}>
                        <CanvasControlButton
                            selected={pressureSensitivity}
                            onClick={() => {
                                setPressureSensitivity(!pressureSensitivity)
                                _pressureSensitivity = !pressureSensitivity
                            }}
                        >
                            <PenWritingIcon />
                        </CanvasControlButton>
                    </Tooltip>
                    <FlexSpaceFull />
                    {!props.rerollMode && (
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '10px',
                            }}
                        >
                            <CanvasControlButton
                                style={{
                                    border: 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                                onClick={() => {
                                    setResizeModalOpen(true)
                                }}
                            >
                                Resize Canvas
                            </CanvasControlButton>
                            <CanvasControlButton
                                style={{
                                    justifyContent: 'center',
                                    minWidth: '80px',
                                }}
                                onClick={() => {
                                    backCanvasHistory()
                                }}
                            >
                                <UndoIcon />
                            </CanvasControlButton>
                            <CanvasControlButton
                                style={{
                                    justifyContent: 'center',
                                    minWidth: '80px',
                                }}
                                onClick={() => {
                                    forwardCanvasHistory()
                                }}
                            >
                                <RedoIcon />
                            </CanvasControlButton>
                            <CanvasControlButton
                                aria-label="Download Canvas as PNG"
                                style={{
                                    justifyContent: 'center',
                                    minWidth: '80px',
                                }}
                                onClick={() => {
                                    const canvas = canvasRef.current
                                    if (!canvas) return
                                    const image = canvas.toDataURL('image/png')
                                    const link = document.createElement('a')
                                    link.download = 'canvas.png'
                                    link.href = image
                                    link.target = '_blank'
                                    link.click()
                                }}
                            >
                                <SaveIcon />
                            </CanvasControlButton>

                            <SaveButton
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    minWidth: '120px',
                                    padding: '10px',
                                }}
                                onClick={() => {
                                    if (!underCanvasRef.current) return null
                                    const ctx = underCanvasRef.current.getContext('2d')
                                    if (!ctx) return null
                                    const uri = underCanvasRef.current.toDataURL('image/png')
                                    props.close(Buffer.from(uri.split(',')[1], 'base64'))
                                }}
                            >
                                Save
                            </SaveButton>
                            <CancelButton
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    minWidth: '100px',
                                    padding: '10px',
                                }}
                                onClick={() => {
                                    props.close()
                                }}
                            >
                                Cancel
                            </CancelButton>
                        </div>
                    )}
                    {props.rerollMode && (
                        <>
                            <CanvasControlButton
                                disabled={generating}
                                style={{
                                    minWidth: '80px',
                                }}
                                onClick={async () => {
                                    const masks: {
                                        mask: Buffer
                                        seed: number
                                    }[] = []
                                    for (const layer of rerollLayers) {
                                        // get image from canvas
                                        const canvas = layer.maskCanvasRef
                                        const tempCanvas = document.createElement('canvas')
                                        // place as white on a black background
                                        tempCanvas.width = canvas.width
                                        tempCanvas.height = canvas.height
                                        const tempCtx = tempCanvas.getContext('2d')
                                        if (!tempCtx) continue
                                        tempCtx.fillStyle = '#fff'
                                        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
                                        tempCtx.drawImage(canvas, 0, 0)
                                        // invert the colors of the image
                                        tempCtx.filter = 'invert(1)'
                                        tempCtx.drawImage(tempCanvas, 0, 0)
                                        if (!canvas) continue
                                        const image = tempCanvas.toDataURL('image/png')
                                        masks.push({
                                            mask: Buffer.from(image.split(',')[1], 'base64'),
                                            seed: layer.seed ?? randomSeed(),
                                        })
                                    }
                                    if (!rerollImage) return
                                    setGenerating(true)
                                    props
                                        .rerollGenerate(rerollImage, masks)
                                        .then(({ images, seeds }) => {
                                            const image = images[0]
                                            if (!image) {
                                                toast('No image generated')
                                            } else {
                                                setRerollImage(image)
                                                changeRerollLayers(
                                                    rerollLayers.map((layer, i) => {
                                                        return {
                                                            ...layer,
                                                            lastSeed:
                                                                seeds[i] !== layer.seed
                                                                    ? seeds[i]
                                                                    : undefined,
                                                        }
                                                    })
                                                )
                                            }
                                            setGenerating(false)
                                        })
                                        .catch((error) => {
                                            setGenerating(false)
                                            toast(
                                                (error?.message ?? error).replace(/training steps/g, 'Anlas')
                                            )
                                        })
                                }}
                            >
                                Reroll
                            </CanvasControlButton>
                            <SaveButton
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    minWidth: '120px',
                                    padding: '10px',
                                }}
                                onClick={() => {
                                    props.close()
                                }}
                            >
                                Done
                            </SaveButton>
                        </>
                    )}
                    <Modal
                        isOpen={resizeModalOpen}
                        onRequestClose={() => setResizeModalOpen(false)}
                        shouldCloseOnOverlayClick={true}
                        type={ModalType.Large}
                    >
                        <ResizeContainer>
                            <CloseButton onClick={() => setResizeModalOpen(false)}>
                                <div />
                            </CloseButton>
                            <div
                                style={{
                                    fontSize: '1.275rem',
                                }}
                            >
                                Resize Canvas
                            </div>
                            <FlexColSpacer min={20} max={20} />
                            <FlexRow>
                                <Title>
                                    Change Size
                                    <span style={{ opacity: 0.5 }}> [w x h]</span>
                                </Title>
                                <SubtleButton
                                    style={{
                                        opacity: 0.9,
                                        fontSize: '0.875rem',
                                    }}
                                    onClick={() => {
                                        cropToMultipleOf(64)
                                    }}
                                >
                                    Crop to closest valid generation size
                                </SubtleButton>
                            </FlexRow>
                            <FlexRow>
                                <Input
                                    type="number"
                                    value={widthInput ?? ''}
                                    onChange={(e) => {
                                        changeNumberValue(
                                            e.target.value,
                                            (s) => setWidthInput(s),
                                            false,
                                            true
                                        )
                                    }}
                                    onBlur={() => {
                                        setDirectionsFromSize(widthInput, heightInput)
                                    }}
                                    {...selectText}
                                />
                                <SubtleButton
                                    onClick={() => {
                                        const width = widthInput
                                        const height = heightInput
                                        setWidthInput(height)
                                        setHeightInput(width)
                                    }}
                                >
                                    <CrossIcon
                                        style={{
                                            height: 15,
                                            width: 15,
                                            margin: '18px',
                                            flex: '0 0 auto',
                                        }}
                                    />
                                </SubtleButton>
                                <Input
                                    type="number"
                                    value={heightInput ?? ''}
                                    onChange={(e) => {
                                        changeNumberValue(
                                            e.target.value,
                                            (s) => setHeightInput(s),
                                            false,
                                            true
                                        )
                                    }}
                                    onBlur={() => {
                                        setDirectionsFromSize(widthInput, heightInput)
                                    }}
                                    {...selectText}
                                />
                            </FlexRow>
                            <FlexColSpacer min={10} max={10} />
                            <Title
                                style={{
                                    opacity: 0.5,
                                }}
                            >
                                or
                            </Title>
                            <FlexColSpacer min={10} max={10} />
                            <Title>Shift Edges</Title>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}
                            >
                                <Input
                                    style={{ maxWidth: 100 }}
                                    type="number"
                                    value={topInput ?? ''}
                                    onChange={(e) => {
                                        changeNumberValue(e.target.value, (s) => setTopInput(s), false, true)
                                    }}
                                    onBlur={() => {
                                        setSizeFromDirections(topInput, leftInput, bottomInput, rightInput)
                                    }}
                                    {...selectText}
                                />
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Input
                                    style={{ maxWidth: 100 }}
                                    type="number"
                                    value={leftInput ?? ''}
                                    onChange={(e) => {
                                        changeNumberValue(e.target.value, (s) => setLeftInput(s), false, true)
                                    }}
                                    onBlur={() => {
                                        setSizeFromDirections(topInput, leftInput, bottomInput, rightInput)
                                    }}
                                    {...selectText}
                                />
                                <div>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr',
                                            gridTemplateRows: '1fr 1fr 1 fr',
                                            alignItems: 'center',
                                            justifyItems: 'center',
                                        }}
                                    >
                                        <Filler />
                                        <ArrowUpIcon
                                            style={{
                                                cursor: 'default',
                                            }}
                                        />
                                        <Filler />
                                        <ArrowLeftIcon
                                            style={{
                                                cursor: 'default',
                                            }}
                                        />
                                        <PageIcon />
                                        <ArrowRightIcon
                                            style={{
                                                cursor: 'default',
                                            }}
                                        />
                                        <Filler />
                                        <ArrowDownIcon
                                            style={{
                                                cursor: 'default',
                                            }}
                                        />
                                        <Filler />
                                    </div>
                                </div>
                                <Input
                                    style={{ maxWidth: 100 }}
                                    type="number"
                                    value={rightInput ?? ''}
                                    onChange={(e) => {
                                        changeNumberValue(
                                            e.target.value,
                                            (s) => setRightInput(s),
                                            false,
                                            true
                                        )
                                    }}
                                    onBlur={() => {
                                        setSizeFromDirections(topInput, leftInput, bottomInput, rightInput)
                                    }}
                                    {...selectText}
                                />
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}
                            >
                                <Input
                                    style={{ maxWidth: 100 }}
                                    type="number"
                                    value={bottomInput ?? ''}
                                    onChange={(e) => {
                                        changeNumberValue(
                                            e.target.value,
                                            (s) => setBottomInput(s),
                                            false,
                                            true
                                        )
                                    }}
                                    onBlur={() => {
                                        setSizeFromDirections(topInput, leftInput, bottomInput, rightInput)
                                    }}
                                    {...selectText}
                                />
                            </div>
                            <LightColorButton
                                style={{ marginLeft: 'auto' }}
                                onClick={() => {
                                    if (
                                        topInput === undefined ||
                                        leftInput === undefined ||
                                        bottomInput === undefined ||
                                        rightInput === undefined
                                    ) {
                                        return
                                    }
                                    changeCanvasDimensions(topInput, leftInput, rightInput, bottomInput)
                                    setResizeModalOpen(false)
                                }}
                            >
                                Resize
                            </LightColorButton>
                        </ResizeContainer>
                    </Modal>
                </div>

                <div
                    ref={containerRef}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: '1 1 0',
                        position: 'relative',
                        width: '100%',
                    }}
                >
                    <div
                        style={{
                            display: displayCanvas ? 'block' : 'none',
                            position: 'absolute',
                            border: '1px solid #000',
                            backgroundColor: '#fff',
                            width: canvasSize[0],
                            height: canvasSize[1],
                            userSelect: 'none',
                            backgroundImage: props.rerollImage
                                ? `url(${props.rerollImage?.url})`
                                : // eslint-disable-next-line max-len
                                  `linear-gradient(45deg, #A0A0A0 25%, transparent 25%), linear-gradient(-45deg, #A0A0A0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #A0A0A0 75%), linear-gradient(-45deg, transparent 75%, #A0A0A0 75%)`,
                            backgroundSize: props.rerollImage?.url ? '100%' : '30px 30px',
                            backgroundPosition: '0 0, 0 15px, 15px -15px, -15px 0px',
                        }}
                    >
                        <canvas
                            id="canvas"
                            ref={canvasRef}
                            draggable={false}
                            style={{
                                height: canvasSize[1],
                                width: canvasSize[0],
                                touchAction: 'none',
                            }}
                            height="1024"
                            width="1024"
                        />
                        <canvas
                            id="under-canvas"
                            ref={underCanvasRef}
                            style={{ display: 'none', backgroundColor: '#fff', touchAction: 'none' }}
                            height="1024"
                            width="1024"
                        />
                    </div>
                </div>
            </CanvasContainer>
            {/* <div
                style={{
                    padding: 20,
                    width: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }}
            >
                {rerollLayers.map((layer, index) => (
                    <BorderBox key={index}>
                        <div
                            style={{
                                alignItems: 'center',
                                gap: 10,
                                display: 'flex',
                                flexDirection: 'row',
                            }}
                        >
                            <SubtleButton
                                onClick={() => {
                                    setSelectedLayer(index)
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                Layer {index + 1}
                                <img
                                    src={layer.maskCanvasRef.toDataURL()}
                                    alt="mask"
                                    style={{
                                        marginLeft: '20px',
                                        maxWidth: 100,
                                        maxHeight: 100,
                                        backgroundColor: 'white',
                                        border: '1px solid black',
                                    }}
                                />
                            </SubtleButton>
                            <SubtleButton
                                disabled={index === 0}
                                style={{
                                    padding: '10px',
                                    marginLeft: 'auto',
                                }}
                                key={index}
                                onClick={() => {
                                    // remove masked reroll layer
                                    if (rerollLayers.length > 1) {
                                        changeRerollLayers(rerollLayers.filter((_, i) => i !== index))
                                        if (index >= selectedLayer) {
                                            setSelectedLayer(selectedLayer - 1)
                                        }
                                    }
                                }}
                            >
                                <DeleteIcon />
                            </SubtleButton>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                            }}
                        >
                            <Input
                                style={{ flex: '1 1 0' }}
                                type="number"
                                value={layer.seed ?? ''}
                                onChange={(e) => {
                                    changeNumberValue(e.target.value, (s) =>
                                        changeRerollLayers(
                                            rerollLayers.map((l, i) => {
                                                if (i === index) {
                                                    return { ...l, seed: s }
                                                }
                                                return l
                                            })
                                        )
                                    )
                                }}
                                {...selectText}
                            />
                            {layer.lastSeed && (
                                <div
                                    style={{
                                        flex: '1 1 0',
                                        fontSize: '0.875rem',
                                        paddingLeft: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                    }}
                                >
                                    <Title style={{ opacity: 0.5 }}>Last Seed</Title>
                                    <SubtleButton
                                        onClick={() => {
                                            changeRerollLayers(
                                                rerollLayers.map((l, i) => {
                                                    if (i === index) {
                                                        return { ...l, seed: l.lastSeed, lastSeed: undefined }
                                                    }
                                                    return l
                                                })
                                            )
                                        }}
                                    >
                                        {layer.lastSeed}
                                    </SubtleButton>
                                </div>
                            )}
                        </div>
                    </BorderBox>
                ))}

                <CanvasControlButton
                    style={{
                        display: 'flex',
                        width: '100%',
                    }}
                    onClick={() => {
                        // add masked reroll layer
                        const canvas = document.createElement('canvas')
                        canvas.width = canvasInternalSize[0] / 8
                        canvas.height = canvasInternalSize[1] / 8
                        changeRerollLayers([
                            ...rerollLayers,
                            {
                                maskCanvasRef: canvas,
                                color: RerollMaskColors[rerollLayers.length % RerollMaskColors.length],
                            },
                        ])
                        setSelectedLayer(rerollLayers.length)
                    }}
                >
                    <PlusIcon /> Add Layer
                </CanvasControlButton>
            </div> */}
        </div>
    )
}

const SaveButton = styled(LightColorButton)`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    line-height: 0px;
    background-color: ${(props) => props.theme.colors.textHeadings};
    color: ${(props) => props.theme.colors.bg2};
    border-radius: 3px;
    font-weight: 600;
    &:hover {
        background-color: ${(props) => props.theme.colors.textHeadings};
    }
    &:disabled {
        color: ${(props) => props.theme.colors.bg2};
    }
`

const CancelButton = styled(SubtleButton)`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    line-height: 0px;
    color: ${(props) => props.theme.colors.warning};
`

const CanvasContainer = styled.div`
    background-color: ${(props) => props.theme.colors.bg1};
    padding: 20px 20px 20px 20px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
`

function rgbaToHex(rgba: string) {
    // rgba(255,0,0,1) -> #ff0000FF
    const [, r, g, b, a] = rgba.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+(?:\.\d*)?)?\s*\)$/) || []
    let sa = (Number.parseFloat(a ?? '1') * 255).toString(16)
    if (sa.length < 2) sa = '0' + sa
    return (
        '#' +
        ((1 << 24) + (Number.parseInt(r) << 16) + (Number.parseInt(g) << 8) + Number.parseInt(b))
            .toString(16)
            .slice(1) +
        sa
    )
}

function alphaFromRgba(rgba: string) {
    const a = (rgba.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+(?:\.\d*)?)?\s*\)$/) || [])[4]
    return Number.parseFloat(a ?? '1')
}

function hexToRgba(hex: string): string {
    const result = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{1,2})?$/i.exec(hex)
    if (!result) {
        throw 'Invalid hex color: ' + hex
    }
    const r = Number.parseInt(result[1], 16)
    const g = Number.parseInt(result[2], 16)
    const b = Number.parseInt(result[3], 16)
    const a = (typeof result[4] !== undefined ? Number.parseInt(result[4] ?? 'FF', 16) : 255) / 255.0
    return `rgba(${r}, ${g}, ${b}, ${a})`
}

function ColorPicker(props: { color: string; onChange: (color: string) => void }): JSX.Element {
    const [showColorPicker, setShowColorPicker] = useState(false)
    const pickerRef = useRef<HTMLDivElement>(null)

    const close = useCallback(() => {
        setShowColorPicker(false)
    }, [])
    useClickOutside(pickerRef, close)

    useEffect(() => {
        drawBlocked = showColorPicker
    }, [showColorPicker])
    const [color, setColor] = useState(rgbaToHex(props.color))
    const timeout = useRef(0)
    const changeColor = (color: string) => {
        setColor(color)
        clearTimeout(timeout.current)
        timeout.current = setTimeout(() => props.onChange(hexToRgba(color)), 20) as unknown as number
    }

    useEffect(() => {
        setColor(rgbaToHex(props.color))
    }, [props.color])

    return (
        <div
            style={{
                position: 'relative',
            }}
        >
            <ColorPickerButton
                style={{
                    backgroundColor: color,
                }}
                onClick={() => {
                    setShowColorPicker(true)
                }}
            />
            {showColorPicker && (
                <PopupColorPickerLeft ref={pickerRef}>
                    <StyledHexColorPicker
                        color={color}
                        onChange={(e: string) => {
                            changeColor(e)
                        }}
                    />
                    <StyledHexInputColor
                        color={color}
                        onChange={(e: string) => {
                            changeColor(e)
                        }}
                    />
                </PopupColorPickerLeft>
            )}
        </div>
    )
}

const ColorPickerButton = styled(SubtleButton)`
    width: 58px;
    height: 44px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 3px;
`

const StyledHexColorPicker = styled(HexAlphaColorPicker)`
    width: 50px;
    .react-colorful__saturation {
        border-radius: 5px 5px 0 0;
    }
    .react-colorful__last-control {
        border-radius: 0;
    }
`

const StyledHexInputColor = styled(HexColorInput)`
    border-radius: 0 0 5px 5px;
`

const PopupColorPickerLeft = styled.div`
    position: absolute;
    z-index: 1;
    @media (max-width: 550px) {
        right: 0;
        left: unset;
    }
    @media (max-width: 375px) {
        left: 0;
        right: unset;
    }
`

const ResizeContainer = styled.div`
    background-color: ${(props) => props.theme.colors.bg2};
    padding: 20px 20px 20px 20px;
`

const PageIcon = styled.div`
    background-color: ${(props) => props.theme.colors.textMain};
    width: 30px;
    height: 30px;
`

const Filler = styled.div`
    width: 30px;
    height: 30px;
`

const CanvasControlButton = styled(SubtleButton)<{ selected?: boolean }>`
    padding: 8px;
    height: 44px;
    min-width: 58px;
    padding: 10px 20px;
    width: max-content;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background-color: ${(props) =>
        props.selected ? props.theme.colors.textHeadings : props.theme.colors.bg2};
    color: ${(props) => (props.selected ? props.theme.colors.bg0 : props.theme.colors.textMain)};
    border: solid 1px
        ${(props) => (props.selected ? props.theme.colors.textHeadings : props.theme.colors.bg3)};
    border-radius: 3px;
    > div {
        width: 18px;
        height: 18px;
        background-color: ${(props) =>
            props.selected ? props.theme.colors.bg0 : props.theme.colors.textMain};
    }
    &:hover {
        color: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.textHeadings)};
        > div {
            background-color: ${(props) =>
                props.selected ? props.theme.colors.bg0 : props.theme.colors.textHeadings};
        }
    }

    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-left: 20px;
    padding-right: 20px;

    & > span:nth-child(3) {
        font-size: 0.875rem;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        padding: 1px 10px;
        color: ${(props) => props.theme.colors.bg1};
        background-color: ${(props) => props.theme.colors.textHeadings};
        border-radius: 3px;
        font-weight: 600;
        transition: color 100ms, background-color 100ms, transform 150ms;
        line-height: 1.25rem;
        > ${Icon} {
            margin-left: 3px;
            background-color: ${(props) => props.theme.colors.bg1};
        }
    }
`

function ImageGenImportOverlay(props: { onFileImport: (file: Buffer) => void }) {
    const modalsOpen = useRecoilValue(ModalsOpen)
    const siteTheme = useRecoilValue(SiteTheme)

    const importOverlayRef = useRef(null)
    const [importOverlayVisible, setImportOverlayVisible] = useState(false)
    const lastDragTarget: React.MutableRefObject<EventTarget | null> = useRef(null)

    useEffect(() => {
        const dragEnter = (e: DragEvent) => {
            if (modalsOpen) return
            if (!e.dataTransfer?.types.includes('Files')) return
            lastDragTarget.current = e.target
            setImportOverlayVisible(true)
        }
        const dragLeave = (e: DragEvent) => {
            if (e.target !== lastDragTarget.current && e.target !== document) return
            setImportOverlayVisible(false)
        }
        document.addEventListener('dragenter', dragEnter)
        document.addEventListener('dragleave', dragLeave)

        return () => {
            document.removeEventListener('dragenter', dragEnter)
            document.removeEventListener('dragleave', dragLeave)
        }
    }, [modalsOpen])

    const handleDragOver = (event: React.DragEvent) => {
        event.stopPropagation()
        event.preventDefault()
    }

    const handleDrop = async (event: React.DragEvent) => {
        const files = event.dataTransfer.files

        setImportOverlayVisible(false)

        if (files.length === 0) {
            return
        }
        event.preventDefault()
        event.stopPropagation()

        const data: Promise<ArrayBuffer>[] = []
        const names: string[] = []
        for (const file of files) {
            names.push(file.name)
            data.push(file.arrayBuffer())
        }

        await Promise.allSettled(data)
            .then(async (results) => {
                const result = results[0]
                if (result.status === 'fulfilled') {
                    const buffer = Buffer.from(result.value)
                    props.onFileImport(buffer)
                } else {
                    toast('Something went wrong while importing a file.')
                }
            })
            .catch((error) => {
                toast('Something went wrong while importing a file: ' + error.message ?? error)
            })
    }

    const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setImportOverlayVisible(false)
        event.preventDefault()
        event.stopPropagation()
    }

    return (
        <StyledImportOverlay
            visible={importOverlayVisible}
            fixed={true}
            ref={importOverlayRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClick}
        >
            <ImportInfo visible={importOverlayVisible}>
                <MdFileUpload
                    style={{
                        width: '50px',
                        height: '50px',
                        color: siteTheme.colors.textMain,
                    }}
                />
            </ImportInfo>
        </StyledImportOverlay>
    )
}

const HideMobile = styled.div`
    @media (max-width: ${MOBILE_WIDTH}px) {
        display: none !important;
    }
`
const HideMobileInline = styled.span`
    @media (max-width: ${MOBILE_WIDTH}px) {
        display: none !important;
    }
`

const HideNonMobile = styled.div`
    @media (min-width: ${MOBILE_WIDTH}px) {
        display: none !important;
    }
`

const Highlight = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
`

const InitImageDisplay = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 20px;
    max-width: max-content;
    > button {
        width: 74px;
        height: 74px;
    }
    @media (max-width: ${MOBILE_WIDTH}px) {
        > button {
            width: 32px;
            height: 32px;
        }
        flex-direction: row;
    }
`

const MainTopper = styled.div`
    display: flex;
    flex-direction: row;
    background-color: ${(props) => props.theme.colors.bg1};
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
    width: 100%;
`

const MainTopperInnerLeft = styled.div`
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 11px 20px;
    border-right: 1px solid ${(props) => props.theme.colors.bg3};
`

const MainTopperInnerRight = styled.div`
    flex: 1 1 0;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 11px 20px;
`

const LicenseModalContainer = styled.div`
    padding: 20px;
    background: ${(props) => props.theme.colors.bg2};
    display: flex;
    flex-direction: column;
`
const LicenseTitle = styled.div`
    font-size: 1.275rem;
    font-weight: 600;
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textHeadings};
    margin-bottom: 10px;
`

const LicenseText = styled.div`
    background-color: ${(props) => props.theme.colors.bg1};
    padding: 20px;
    white-space: pre-wrap;
    overflow-y: auto;
`

const TokenLimitBarOuter = styled.div`
    height: 100%;
    width: 8px;
    background-color: ${(props) => props.theme.colors.bg0};
    border: 1px solid ${(props) => props.theme.colors.bg3};
    border-left: none;
    border-radius: 0 3px 3px 0;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
`

const TokenLimitBarInner = styled.div<{ warn: boolean }>`
    width: 100%;
    background-color: ${(props) => (props.warn ? props.theme.colors.warning : props.theme.colors.textMain)};
    max-height: 100%;
`

const SuggestionBullet = styled.div<{ count: number }>`
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 50%;
    // min is 10,000, max is 100,000
    background-color: ${(props) => {
        const countPercent = Math.min(props.count, 10000) / 10000
        return mix(countPercent, props.theme.colors.textMain, props.theme.colors.bg2)
    }};
`

const Hightlight = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
`
