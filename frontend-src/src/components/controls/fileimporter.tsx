import React, { useRef, useState, useEffect, MutableRefObject, RefObject, Fragment } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { createPortal } from 'react-dom'
import { MdFileUpload } from 'react-icons/md'
import styled from 'styled-components'

import { toast } from 'react-toastify'
import { ImportDataType } from '../../data/story/storyconverter'
import { GenerationRequestActive, ModalsOpen, SiteTheme, SplashModalOpen } from '../../globals/state'
import { DarkColorButton, SubtleButton } from '../../styles/ui/button'
import { logError } from '../../util/browser'
import { ImportIcon } from '../../styles/ui/icons'
import { StyledStoryExporter } from '../sidebars/infobar/items/storyexporter'
import { FileInfo, processInputFile, useFileInput } from '../controls/fileinput'
import { transparentize } from '../../util/colour'
import { DEFAULT_THEME } from '../../styles/themes/theme'

export const StyledImportOverlay = styled.div<{ visible: boolean; fixed?: boolean }>`
    position: ${(props) => (props.fixed ? 'fixed' : 'absolute')};
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    visibility: ${(props) => (props.visible ? 'visible' : 'hidden')};
    background-color: ${(props) =>
        props.visible ? transparentize(0.5, props.theme.colors.bg0) : 'rgba(0, 0, 0, 0);'};
    transition: background-color 0.08s linear;
    z-index: 12000;
    display: flex;
    justify-content: center;
    align-items: center;
`
export const ImportInfo = styled.div<{ visible: boolean }>`
    background: ${(props) => transparentize(0.4, props.theme.colors.bg0)};
    border-radius: 10px;
    padding: 20px;
    opacity: ${(props) => (props.visible ? 1 : 0)};
    transition: opacity 0.06s linear;
`

export enum FileImporterOverlayType {
    None,
    Fixed,
    Absolute,
}
export enum FileImporterButtonType {
    None,
    Default,
    Direct,
}

export default function FileImporter(props: {
    children?: JSX.Element | JSX.Element[]
    overlay: FileImporterOverlayType
    overlayParentRef?: RefObject<any>
    button: FileImporterButtonType
    buttonClickRef?: MutableRefObject<null | (() => boolean)>
    allowedFileTypes?: ImportDataType[]
    onImportFile: (file: FileInfo, last: boolean) => Promise<boolean>
    onRejectedFile?: (type: ImportDataType) => void
    onAllFilesHandled?: () => void
}): JSX.Element {
    const handleImport = async (file: FileInfo, last: boolean): Promise<boolean> => {
        return await props.onImportFile(file, last)
    }

    const [inputElement, inputClick] = useFileInput({
        onFileImport: handleImport,
        onAllFilesHandled: props.onAllFilesHandled,
        onRejectedFile: props.onRejectedFile,
        multifile: true,
        allowedFileTypes: props.allowedFileTypes,
    })
    if (props.buttonClickRef) props.buttonClickRef.current = inputClick

    return (
        <StyledStoryExporter>
            {props.button === FileImporterButtonType.None ? (
                props.children ? (
                    <SubtleButton
                        style={{ width: '100%' }}
                        onClick={() => {
                            inputClick()
                        }}
                    >
                        {props.children}
                    </SubtleButton>
                ) : null
            ) : props.button === FileImporterButtonType.Direct ? (
                props.children
            ) : (
                <Fragment>
                    <DarkColorButton
                        onClick={() => {
                            inputClick()
                        }}
                    >
                        <ImportIcon />
                        Import File
                    </DarkColorButton>
                    <div>You can also drag a file or paste copied text into the output box to import</div>
                </Fragment>
            )}
            {inputElement}
            {props.overlay === FileImporterOverlayType.None ? (
                <></>
            ) : props.overlay === FileImporterOverlayType.Fixed && typeof document !== 'undefined' ? (
                createPortal(
                    <ImportOverlay
                        fixed
                        overlayParentRef={props.overlayParentRef}
                        handleImport={handleImport}
                    />,
                    document.body
                )
            ) : (
                <ImportOverlay
                    ignoreModals
                    overlayParentRef={props.overlayParentRef}
                    allowedFileTypes={props.allowedFileTypes}
                    handleImport={handleImport}
                    onRejectedFile={props.onRejectedFile}
                    onAllFilesHandled={props.onAllFilesHandled}
                />
            )}
        </StyledStoryExporter>
    )
}

export function ImportOverlay(props: {
    fixed?: boolean
    ignoreModals?: boolean
    overlayParentRef?: RefObject<any>
    allowedFileTypes?: ImportDataType[]
    handleImport: (file: FileInfo, last: boolean) => Promise<boolean>
    onRejectedFile?: (type: ImportDataType) => void
    onAllFilesHandled?: () => void
}): JSX.Element {
    const modalsOpen = useRecoilValue(ModalsOpen)
    const generationRequestActive = useRecoilValue(GenerationRequestActive)
    const siteTheme = useRecoilValue(SiteTheme)

    const setSplashModalOpen = useSetRecoilState(SplashModalOpen)

    const importOverlayRef = useRef(null)
    const [importOverlayVisible, setImportOverlayVisible] = useState(false)
    const lastDragTarget: React.MutableRefObject<EventTarget | null> = useRef(null)

    useEffect(() => {
        const dragEnter = (e: DragEvent) => {
            if (!props.ignoreModals && modalsOpen) return
            if (generationRequestActive) return
            if (!e.dataTransfer?.types.includes('Files')) return
            lastDragTarget.current = e.target
            setImportOverlayVisible(true)
        }
        const dragLeave = (e: DragEvent) => {
            if (e.target !== lastDragTarget.current && e.target !== document) return
            setImportOverlayVisible(false)
        }
        if (props.overlayParentRef) {
            props.overlayParentRef.current?.addEventListener('dragenter', dragEnter)
            props.overlayParentRef.current?.addEventListener('dragleave', dragLeave)
        } else {
            document.addEventListener('dragenter', dragEnter)
            document.addEventListener('dragleave', dragLeave)
        }

        return () => {
            if (props.overlayParentRef) {
                props.overlayParentRef.current?.removeEventListener('dragenter', dragEnter)
                props.overlayParentRef.current?.removeEventListener('dragleave', dragLeave)
            } else {
                document.removeEventListener('dragenter', dragEnter)
                document.removeEventListener('dragleave', dragLeave)
            }
        }
    }, [generationRequestActive, modalsOpen, props.ignoreModals, props.overlayParentRef])

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

        setSplashModalOpen(false)

        const data: Promise<ArrayBuffer>[] = []
        const names: string[] = []
        for (const file of files) {
            names.push(file.name)
            data.push(file.arrayBuffer())
        }

        await Promise.allSettled(data).then(async (results) => {
            let breakLoop = false
            for (const [i, result] of results.entries()) {
                if (result.status !== 'fulfilled') {
                    continue
                }
                const name = names[i]
                try {
                    breakLoop = await processInputFile(
                        result.value,
                        name,
                        files[i].size,
                        i === results.length - 1,
                        {
                            onFileImport: props.handleImport,
                            allowedFileTypes: props.allowedFileTypes,
                            onRejectedFile: props.onRejectedFile,
                        }
                    )
                } catch (error: any) {
                    logError(error, true, 'Something went wrong while importing a file:')
                    toast('Something went wrong while importing a file: ' + error.message ?? error)
                }
                if (breakLoop) break
            }
            if (props.onAllFilesHandled) props.onAllFilesHandled()
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
            fixed={props.fixed}
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
                        color: siteTheme?.colors?.textMain ?? DEFAULT_THEME.colors.textMain,
                    }}
                />
            </ImportInfo>
        </StyledImportOverlay>
    )
}
