import { serialize } from 'serializr'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlobalUserContext } from '../../../../globals/globals'
import { CustomModules, Session, ScreenshotModalState } from '../../../../globals/state'

import { DarkColorButton, InvertedButton, LightColorButton } from '../../../../styles/ui/button'
import { storyAsScenario } from '../../../../data/story/scenario'
import { StoryContainer } from '../../../../data/story/storycontainer'
import { downloadTextFile } from '../../../../util/browser'
import { AIModule } from '../../../../data/story/storysettings'
import { FlexCol, FlexRow } from '../../../../styles/ui/layout'
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CopyAltIcon,
    ExportIcon,
    ImageDownIcon,
} from '../../../../styles/ui/icons'
import { deserialize } from '../../../../util/serialization'
import { ThinControlButton } from '../../../../styles/components/conversationcontrols'
import { mix } from '../../../../util/colour'
import { getUserSetting } from '../../../../data/user/settings'
import useDownloadStoryJson from '../../../../hooks/useDownloadStory'

export const StyledStoryExporter = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: left;
    gap: 10px;
    flex-wrap: wrap;
    width: 100%;
`

export function copyToClipboard(text: string): void {
    navigator.clipboard?.writeText(text)
}

export function canCopyImageToClipboard(): boolean {
    let result = navigator.clipboard !== undefined
    // cannot copy image to clipboard on firefox
    if (result && navigator.userAgent.toLowerCase().includes('firefox')) {
        result = result && false
    }
    return result
}

export function copyPngToClipboard(image: Buffer): Promise<void> {
    const blob = new Blob([image], { type: 'image/png' })
    return navigator.clipboard?.write([new ClipboardItem({ 'image/png': blob })])
}

export default function StoryExporter(props: { selectedStory: string }): JSX.Element {
    const session = useRecoilValue(Session)
    const customModules = useRecoilValue(CustomModules)

    const currentStoryMetadata = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)
    const downloadStoryJson = useDownloadStoryJson(props.selectedStory)

    const downloadScenarioJson = () => {
        const scenario = storyAsScenario(props.selectedStory, customModules)
        if (!scenario || !currentStoryMetadata) {
            return
        }
        scenario.author = getUserSetting(session.settings, 'penName') ?? ''
        downloadTextFile(
            scenario.serialize(true),
            `${currentStoryMetadata.title.slice(0, 40)} (${new Date().toISOString()}).scenario`
        )
    }

    const downloadStoryPlainText = () => {
        if (!currentStoryContent || !currentStoryMetadata) {
            return
        }
        downloadTextFile(
            currentStoryContent.getStoryText(),
            `${currentStoryMetadata.title.slice(0, 40)} (${new Date().toISOString()}).txt`
        )
    }

    const copyStoryToClipboard = async () => {
        if (!currentStoryContent || !currentStoryMetadata) {
            return
        }

        let container = StoryContainer.bundle(currentStoryMetadata, currentStoryContent)
        const serialized = container.serialize()
        container = StoryContainer.deserialize(serialized)
        container.metadata.remoteId = undefined
        container.metadata.remoteStoryId = undefined

        if (currentStoryContent.settings.prefix && currentStoryContent.settings.prefix.includes(':')) {
            let aiModule = customModules.find((e: AIModule) => e.id === currentStoryContent.settings.prefix)
            if (aiModule) {
                aiModule = deserialize(AIModule, serialize(AIModule, aiModule))
                aiModule.remoteId = ''
                container.content.settings.aiModule = aiModule
                container.content.settings.aiModule.remoteId = ''
            }
        }

        copyToClipboard(container.serialize())
        toast('Story copied to clipboard')
    }

    const setScreenshotState = useSetRecoilState(ScreenshotModalState)
    const openScreenshotTool = async () => {
        if (!currentStoryContent || !currentStoryMetadata) {
            return
        }

        setScreenshotState({
            open: true,
            start: 0,
            end: currentStoryContent.getStoryText().length,
        })
    }

    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <FlexCol className={'infobar-export'} style={{ gap: '5px' }}>
            <strong>Export Story</strong>
            <FlexRow style={{ alignItems: 'stretch', marginTop: 5 }}>
                <InvertedButton
                    style={{ flex: '1 1 50%' }}
                    centered={true}
                    onClick={() => {
                        downloadStoryJson()
                    }}
                    disabled={currentStoryContent === undefined}
                >
                    <ExportIcon />
                    To File
                </InvertedButton>
                <MenuButton
                    displayToggle={true}
                    onClick={() => {
                        setMenuOpen((o) => !o)
                    }}
                    active={menuOpen}
                >
                    <div>&nbsp;{menuOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}&nbsp;</div>
                </MenuButton>
            </FlexRow>
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        key="a"
                        initial={{
                            opacity: 0,
                            height: 0,
                            marginTop: -5,
                        }}
                        animate={{
                            opacity: 1,
                            height: 'min-content',
                            marginTop: 0,
                        }}
                        exit={{
                            opacity: 0,
                            height: 0,
                            marginTop: -5,
                        }}
                        style={{
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            gap: 5,
                        }}
                    >
                        <FlexRow style={{ gap: '10px' }}>
                            <LightColorButton
                                style={{ flex: '1 1 50%' }}
                                centered={true}
                                onClick={() => {
                                    downloadScenarioJson()
                                }}
                                disabled={currentStoryContent === undefined}
                            >
                                <ExportIcon />
                                As Scenario
                            </LightColorButton>
                        </FlexRow>
                        <FlexRow style={{ gap: '10px' }}>
                            <LightColorButton
                                style={{ flex: '1 1 50%' }}
                                centered={true}
                                onClick={() => {
                                    downloadStoryPlainText()
                                }}
                                disabled={currentStoryContent === undefined}
                            >
                                <ExportIcon />
                                As Plaintext
                            </LightColorButton>
                        </FlexRow>
                        <FlexRow style={{ gap: '10px' }}>
                            <LightColorButton
                                style={{ flex: '1 1 100%' }}
                                centered={true}
                                onClick={() => {
                                    copyStoryToClipboard()
                                }}
                                disabled={currentStoryContent === undefined}
                            >
                                <CopyAltIcon style={{ width: 12 }} />
                                To Clipboard
                            </LightColorButton>
                        </FlexRow>
                        <FlexRow style={{ gap: '10px' }}>
                            <LightColorButton
                                style={{ flex: '1 1 100%' }}
                                centered={true}
                                onClick={() => {
                                    openScreenshotTool()
                                }}
                                // TODO: Re-enable when screenshot tool handles document
                                disabled={currentStoryContent === undefined || !currentStoryContent.story}
                            >
                                <ImageDownIcon />
                                As Image
                            </LightColorButton>
                        </FlexRow>
                    </motion.div>
                )}
            </AnimatePresence>
        </FlexCol>
    )
}

export const MenuButton = styled(ThinControlButton)<{ active?: boolean }>`
    background-color: ${(props) => (props.active ? props.theme.colors.bg2 : props.theme.colors.bg3)};
    margin: 0 !important;
    height: auto;
    &:hover,
    &:focus {
        background: ${(props) =>
            mix(
                0.97,
                props.active ? props.theme.colors.bg2 : props.theme.colors.bg3,
                props.theme.colors.textMain
            )};
    }
`

export function ExportButton(props: { story?: StoryContainer }): JSX.Element {
    const downloadStoryJson = () => {
        if (!props.story) {
            return
        }
        const container = props.story

        downloadTextFile(
            container.serialize(true),
            `${container.metadata.title.slice(0, 40)} (${new Date().toISOString()}).story`
        )
    }

    if (!props.story) {
        return <></>
    }

    return (
        <DarkColorButton
            onClick={() => {
                downloadStoryJson()
            }}
        >
            Export
        </DarkColorButton>
    )
}
