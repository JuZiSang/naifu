import { MutableRefObject, useEffect, useMemo, useRef } from 'react'
import { toast } from 'react-toastify'
import { analyse } from 'chardet'

import {
    allFileTypes,
    detectImportDataType,
    getFileTypesForJsonTypes,
    ImportDataType,
    isPng,
    textFromPng,
} from '../../data/story/storyconverter'
import { logError, logWarning } from '../../util/browser'
import { isIOS } from '../../util/compat'

export interface FileInfo {
    type: ImportDataType
    text: string
    name: string
    size: number
    buff: ArrayBuffer
}

interface FileProcessProps {
    onFileImport: (file: FileInfo, last: boolean) => Promise<boolean | void>
    onRejectedFile?: (type: ImportDataType) => void
    allowedFileTypes?: ImportDataType[]
}
interface FileInputProps {
    multifile?: boolean
    onAllFilesHandled?: () => void
}

export function useFileInput(props: FileInputProps & FileProcessProps): [JSX.Element, () => boolean] {
    const clickRef: MutableRefObject<(() => boolean) | null> = useRef(null)

    return [
        <FileInput key="1" {...props} clickRef={clickRef} />,
        () => {
            if (!clickRef.current) {
                return false
            }
            clickRef.current()
            return true
        },
    ]
}

export async function processInputFile(
    data: ArrayBuffer,
    name: string,
    size: number,
    last: boolean,
    props: FileProcessProps
): Promise<boolean> {
    let text
    if (isPng(data)) text = (await textFromPng(data)) ?? ''
    else {
        const encodings = analyse(new Uint8Array(data.slice(0, 4096)))
        // eslint-disable-next-line unicorn/text-encoding-identifier-case
        let encoding = 'utf-8'
        if (encodings.length > 0 && encodings[0].confidence >= 90) {
            encoding = encodings[0].name
        } else if (
            encodings.length > 0 &&
            encodings[0].confidence >= 25 &&
            // eslint-disable-next-line unicorn/text-encoding-identifier-case
            !encodings.some((encoding) => encoding.name.toLowerCase() === 'utf-8')
        ) {
            encoding = encodings[0].name
        }
        let dec
        try {
            dec = new TextDecoder(encoding)
        } catch (error) {
            logWarning(error, false, 'Unsupported encoding')
            dec = new TextDecoder()
        }
        text = dec.decode(data)
    }
    const dataType =
        name.endsWith('.txt') || name.endsWith('.text')
            ? ImportDataType.plainText
            : detectImportDataType(text)
    if (!props.allowedFileTypes || props.allowedFileTypes.includes(dataType))
        return (
            (await props.onFileImport(
                {
                    buff: data,
                    name: name,
                    size: size,
                    text: text,
                    type: dataType,
                },
                last
            )) ?? true
        )
    else {
        if (props.onRejectedFile) props.onRejectedFile(dataType)
        else {
            if (size <= 2 || (text && text.length <= 2)) {
                toast('Unsupported file type. Is this file empty?')
            } else {
                toast('Unsupported file type.')
            }
        }
    }
    return false
}

function FileInput(
    props: FileInputProps & FileProcessProps & { clickRef: MutableRefObject<(() => boolean) | null> }
): JSX.Element {
    const importInputRef: MutableRefObject<HTMLInputElement | null> = useRef(null)
    useEffect(() => {
        props.clickRef.current = () => {
            if (!importInputRef.current) {
                return false
            }
            importInputRef.current.click()
            return true
        }
    })
    const processImport = async (event: any) => {
        const efiles: Array<File> = [...event.target.files]
        if (!efiles) return
        let breakLoop = false
        for (const [i, efile] of efiles.entries()) {
            try {
                await Promise.allSettled([efile.arrayBuffer()]).then(async (results) => {
                    if (results[0].status !== 'fulfilled') {
                        return
                    }
                    const name = efile.name || (importInputRef.current?.value ?? 'unknown')
                    breakLoop = await processInputFile(
                        results[0].value,
                        name,
                        efile.size,
                        i === efiles.length - 1,
                        props
                    )
                })
            } catch (error: any) {
                logError(error, true, 'Something went wrong while importing a file:')
                toast('Something went wrong while importing a file: ' + error.message ?? error)
            }
            if (breakLoop || !props.multifile) break
        }
        if (props.onAllFilesHandled) props.onAllFilesHandled()
        if (importInputRef.current) {
            importInputRef.current.value = ''
        }
    }

    const acceptedFileTypes = useMemo(
        () => (props.allowedFileTypes ? getFileTypesForJsonTypes(props.allowedFileTypes) : allFileTypes),
        [props.allowedFileTypes]
    )

    return (
        <>
            {isIOS ? (
                <input
                    aria-hidden={true}
                    type="file"
                    id="file"
                    ref={importInputRef}
                    onChange={processImport}
                    style={{ display: 'none' }}
                />
            ) : (
                <input
                    aria-hidden={true}
                    type="file"
                    id="file"
                    accept={acceptedFileTypes}
                    multiple={true}
                    ref={importInputRef}
                    onChange={processImport}
                    style={{ display: 'none' }}
                />
            )}
        </>
    )
}
