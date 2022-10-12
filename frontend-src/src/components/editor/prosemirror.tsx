import {
    useRef,
    useImperativeHandle,
    forwardRef,
    CSSProperties,
    useState,
    MutableRefObject,
    useEffect,
    useCallback,
    useMemo,
    UIEvent,
} from 'react'
import { EditorView, EditorProps, DirectEditorProps } from 'prosemirror-view'
import { EditorState, Transaction } from 'prosemirror-state'
import { flushSync } from 'react-dom'

import { logWarning } from '../../util/browser'

type Config = Parameters<typeof EditorState.create>[0]
export interface ProseMirrorHandle {
    view: EditorView | null
    root: HTMLDivElement | null
}
interface PropsBase extends EditorProps {
    state: EditorState
    style?: CSSProperties
    className?: string
    dispatchTransaction?: (transaction: Transaction, state: EditorState) => void
    handleScroll?: (view: EditorView, event: UIEvent<HTMLDivElement>) => void
}
type ProseMirrorProps = PropsBase
export type TransformStateFunction = (state: EditorState) => Transaction | void | undefined
export type TransformState = (transform: TransformStateFunction, flush?: boolean) => EditorState

export const useProseMirror = (config: Config): [EditorState, TransformState] => {
    const [state, setState] = useState(() => EditorState.create(config as any) as EditorState)
    const stateRef = useRef(state)
    const transformState = useCallback((transform, flush = true) => {
        const internalTransformState = (tr: Transaction | void | undefined) => {
            if (!tr) return stateRef.current
            let newState: EditorState
            try {
                newState = stateRef.current.apply(tr)
            } catch (error: any) {
                logWarning(error, false)
                return stateRef.current
            }
            if (flush) {
                flushSync(() => {
                    stateRef.current = newState
                    setState(newState)
                })
            } else {
                stateRef.current = newState
                setState(newState)
            }
            return newState
        }
        return internalTransformState(transform(stateRef.current))
    }, []) as TransformState
    return [state, transformState]
}

export const ProseMirror = forwardRef<ProseMirrorHandle, ProseMirrorProps>(function ProseMirror(
    { state, dispatchTransaction, handleScroll, style, className, ...restProps },
    ref
): JSX.Element {
    const rootRef: MutableRefObject<HTMLDivElement | null> = useRef(null)
    const viewRef: MutableRefObject<EditorView | null> = useRef(null)

    useImperativeHandle(ref, () => ({
        get view() {
            return viewRef.current
        },
        get root() {
            return rootRef.current
        },
    }))

    if (viewRef.current) {
        viewRef.current.updateState(state)
    }

    const dispatchTransactionRef = useRef(dispatchTransaction)
    dispatchTransactionRef.current = dispatchTransaction

    const handleScrollRef = useRef(handleScroll)
    handleScrollRef.current = handleScroll

    const editorProps = useMemo(
        (): Partial<DirectEditorProps> => ({
            ...restProps,
            dispatchTransaction: (transaction) => {
                if (!viewRef.current) {
                    return
                }
                dispatchTransactionRef.current
                    ? dispatchTransactionRef.current(transaction, viewRef.current.state)
                    : viewRef.current.updateState(viewRef.current.state.apply(transaction))
            },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        viewRef.current = new EditorView(rootRef.current!, {
            state,
            ...editorProps,
        } as DirectEditorProps)
        return () => {
            viewRef.current && viewRef.current.destroy()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const view = useMemo(
        (): JSX.Element => (
            <div
                ref={rootRef}
                style={style}
                className={className}
                onScroll={(event) =>
                    viewRef.current &&
                    handleScrollRef.current?.call(handleScrollRef.current, viewRef.current, event)
                }
            />
        ),
        [style, className]
    )
    return view
})
