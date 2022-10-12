import styled from 'styled-components'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import React, { useState, useRef, MutableRefObject, useMemo, useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import {
    Session,
    UpdateNotes as UpdateNotesState,
    UpdateNotesVisible,
    UpdateNotesUnread,
    AppUpdateAvailable,
} from '../globals/state'
import { getStorage } from '../data/storage/storage'
import { LargeClose } from '../styles/components/modal'
import { ArrowLeftIcon } from '../styles/ui/icons'
import { transparentize } from '../util/colour'
import { SubtleButton } from '../styles/ui/button'
import { UpdateNote } from '../data/updates/updatenote'
import useRestoreScrollPosition from '../hooks/useRestoreScrollPosition'
import useLoadUpdates from '../hooks/useLoadUpdates'
import { getUserSetting } from '../data/user/settings'
import Modal, { ModalType } from './modals/modal'
import Spinner from './spinner'
import { Pulser } from './pulser'

function importAll(r: __WebpackModuleApi.RequireContext) {
    return r.keys().map((element: any) => r(element))
}
const backgroundImages = importAll(
    // eslint-disable-next-line unicorn/prefer-module
    require.context('../assets/images/changelog/backgrounds/', false)
)
const backgrounds = backgroundImages.map((s: any) => {
    return s.default.src
})

export default function UpdateNotesModal(): JSX.Element {
    const [updateNotesVisible, setUpdateNotesVisible] = useRecoilState(UpdateNotesVisible)
    const setUpdateNotesUnread = useSetRecoilState(UpdateNotesUnread)
    const [session, setSession] = useRecoilState(Session)
    const updateNotes = useRecoilValue(UpdateNotesState)

    const setViewed = () => {
        if (
            session.authenticated &&
            updateNotes.length > 0 &&
            (!getUserSetting(session.settings, 'lastUpdateViewed') ||
                getUserSetting(session.settings, 'lastUpdateViewed') < updateNotes[0].date?.getTime())
        ) {
            setTimeout(() => {
                setSession({
                    ...session,
                    settings: {
                        ...session.settings,
                        lastUpdateViewed: updateNotes[0].date?.getTime(),
                    },
                })
                getStorage(session).saveSettings({
                    ...session.settings,
                    lastUpdateViewed: updateNotes[0].date?.getTime(),
                })
            }, 100)
        }
    }

    return (
        <Modal
            showClose={true}
            type={ModalType.Large}
            isOpen={updateNotesVisible}
            shouldCloseOnOverlayClick={true}
            onRequestClose={() => {
                setUpdateNotesVisible(false)
                setUpdateNotesUnread(false)
                setViewed()
            }}
        >
            <>
                <CloseButton
                    aria-label="Close Modal"
                    onClick={() => {
                        setUpdateNotesVisible(false)
                        setUpdateNotesUnread(false)
                        setViewed()
                    }}
                >
                    <div />
                </CloseButton>

                <UpdateNotesContent />
            </>
        </Modal>
    )
}

export function UpdateNotesContent(props: { fullHeight?: boolean }): JSX.Element {
    const session = useRecoilValue(Session)
    const updateAvailable = useRecoilValue(AppUpdateAvailable)
    const seenUpdateNotes = useRecoilValue(UpdateNotesState)

    const updateNotes = useLoadUpdates(60000)

    const [selectedNoteIndex, setSelectedNoteIndex] = useState<number>(-1)
    const titleRef: MutableRefObject<HTMLInputElement | null> = useRef(null)
    const selectedNote = useMemo(() => updateNotes[selectedNoteIndex], [selectedNoteIndex, updateNotes])

    const y = useSpring(0, { stiffness: 600, damping: 40 })
    const y2 = useTransform(y, (v) => v + 50)
    const opacity = useTransform(y, [0, -20], [1, 0])
    const opacity2 = useTransform(y, [0, -20], [0, 1])

    const [scrolledDistance, setScrolledDistance] = useState(0)
    useEffect(() => {
        setScrolledDistance(0)
    }, [selectedNote])

    const scrollRef: MutableRefObject<null | HTMLDivElement> = useRef(null)
    const storeScroll = useRestoreScrollPosition(scrollRef, 'updateNotesScrollPos', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => storeScroll, [])

    const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const reload = () => {
        setButtonsDisabled(false)
        // preload html to ensure cache busting
        fetch('/stories', {
            cache: 'no-cache',
        })
            .then(() => {
                window.location.reload()
            })
            .catch(() => {
                setButtonsDisabled(false)
            })
    }

    return (
        <UpdateContent fullHeight={props.fullHeight}>
            {selectedNote ? (
                <div
                    style={{
                        transform: `translate(0, ${Math.max(
                            scrolledDistance * -1,
                            -220 + (titleRef.current?.scrollHeight ?? 0)
                        )}px)`,
                    }}
                >
                    <BackgroundImage
                        image={
                            backgrounds[
                                selectedNote.background ??
                                    (updateNotes.length - selectedNoteIndex - 1) % (backgrounds.length - 1)
                            ]
                        }
                    />
                </div>
            ) : (
                <></>
            )}
            <TitleBar ref={titleRef}>
                <SubtleButton aria-label="back" onClick={() => setSelectedNoteIndex(-1)}>
                    {selectedNote ? (
                        <SwappingButton>
                            <ArrowLeftIcon />
                            <div>
                                <motion.div key="titleA" style={{ y, opacity }}>
                                    {'Change Log'}
                                </motion.div>
                                <motion.div key="titleB" style={{ y: y2, opacity: opacity2 }}>
                                    {selectedNote?.title}
                                </motion.div>{' '}
                            </div>
                        </SwappingButton>
                    ) : (
                        <>Change Log</>
                    )}
                </SubtleButton>
                {selectedNote ? <div></div> : <div>Click an entry for more info.</div>}
            </TitleBar>
            {selectedNote ? (
                <>
                    <ExpandedNote
                        onScroll={(e) => {
                            const scrolltop = (e.target as HTMLDivElement).scrollTop
                            setScrolledDistance(scrolltop)
                            if (scrolltop > 10) {
                                y.set(-50)
                            } else {
                                y.set(0)
                            }
                        }}
                    >
                        <div>
                            <motion.div style={{ y: y2, opacity }}>{selectedNote.title}</motion.div>
                            <div>{selectedNote.subtitle}</div>
                        </div>
                        <div>
                            {selectedNote.image ? (
                                <LazyLoadImage src={selectedNote.image} alt={selectedNote.title} />
                            ) : null}
                        </div>
                        <div>
                            {(selectedNote.expandedMessage ?? selectedNote.message).map((el, i) =>
                                el.length === 0 ? <UpdateNotesSpacer key={i} /> : processLine(el, i)
                            )}
                        </div>
                    </ExpandedNote>
                </>
            ) : (
                <UpdateNotesContainer ref={scrollRef}>
                    {updateAvailable ||
                    (seenUpdateNotes.length > 0 && seenUpdateNotes.length !== updateNotes.length) ? (
                        <UpdateReloadRequired disabled={buttonsDisabled} onClick={reload}>
                            <Pulser style={{ display: 'relative', height: '10px', width: '10px' }} /> Reload
                            the page to get the most recent version
                        </UpdateReloadRequired>
                    ) : null}
                    {updateNotes.length > 0 ? (
                        updateNotes.map((note, i) => (
                            <UpdateNotesElement
                                background={
                                    i === 0
                                        ? backgrounds[
                                              note.background ??
                                                  (updateNotes.length - i - 1) % (backgrounds.length - 1)
                                          ]
                                        : undefined
                                }
                                key={i}
                                note={note}
                                onClick={() => {
                                    storeScroll()
                                    setSelectedNoteIndex(i)
                                }}
                                new={
                                    session.authenticated &&
                                    (!getUserSetting(session.settings, 'lastUpdateViewed') ||
                                        getUserSetting(session.settings, 'lastUpdateViewed') <
                                            note.date?.getTime())
                                }
                                requiresReload={
                                    seenUpdateNotes.length > 0 &&
                                    !seenUpdateNotes.some(
                                        (seenNote) => seenNote.date.getTime() === note.date.getTime()
                                    )
                                }
                            />
                        ))
                    ) : (
                        <Spinner
                            visible={true}
                            style={{ width: '20px', height: '20px', margin: '45px auto' }}
                        />
                    )}
                </UpdateNotesContainer>
            )}
        </UpdateContent>
    )
}

interface TextSection {
    text: string
    format: number
}

const states: { character: string; state: number; css: string; single: boolean }[] = [
    { character: '*', state: 0b100, css: 'italic', single: true },
    { character: '*', state: 0b1, css: 'bold', single: false },
    { character: '~', state: 0b10, css: 'strike', single: false },
    { character: '_', state: 0b1000, css: 'underline', single: false },
]

export const processLine = (text: string, id: number): JSX.Element => {
    if (text.startsWith('image:')) {
        return <img key={id} src={text.slice(6)} alt="Update" />
    }
    const doubleIndented = text.startsWith('>>')
    const indented = text.startsWith('>')
    const newText = text.replace(/^>+ */, '')
    const characters = [...newText]
    const sections: TextSection[] = []
    let currentState = 0
    let escape = false
    let workingString = ''
    let last = ''
    let skip = false
    for (const [i, c] of characters.entries()) {
        if (skip) {
            skip = false
            continue
        }
        if (escape) {
            escape = false
            workingString += c
            continue
        }
        if (c === '*' && characters[i + 1] === '*') {
            sections.push({ text: workingString, format: currentState })
            workingString = ''
            currentState = currentState & 0b1 ? currentState & ~0b1 : currentState | 0b1
            skip = true
            continue
        }
        let matched = false
        for (const { character, state, single } of states) {
            if (c === character) {
                matched = true
                if (last === c || single) {
                    last = ''
                    sections.push({ text: workingString, format: currentState })
                    workingString = ''
                    currentState = currentState & state ? currentState & ~state : currentState | state
                    break
                } else {
                    last = c
                    break
                }
            }
        }
        if (matched) continue
        workingString += last
        last = ''
        if (c === '\\') {
            escape = true
            continue
        }
        workingString += c
    }
    sections.push({ text: workingString, format: currentState })

    const spans = []
    for (const [i, section] of sections.entries()) {
        const classes = []
        for (const { state, css } of states) {
            if (section.format & state) {
                classes.push(css)
            }
        }
        const fragments = []

        for (const [i, s] of section.text.split(/(?= )/).entries()) {
            fragments.push(
                /[A-Za-z]\.(net|com|ai|tv|gg)/.test(s) ? (
                    <a key={i} href={/^ ?http/.test(s) ? s.trim() : `https://${s.trim()}`}>
                        {s}
                    </a>
                ) : (
                    <React.Fragment key={i}>{s}</React.Fragment>
                )
            )
        }
        spans.push(
            <span key={i} className={classes.join(' ')}>
                {fragments}
            </span>
        )
    }

    return (
        <UpdateNotesLine key={id} before={doubleIndented ? '  ⬤' : indented ? '' : '⬤'} indented={indented}>
            <div>{spans}</div>
        </UpdateNotesLine>
    )
}

export function UpdateNotesElement(props: {
    note: UpdateNote
    new: boolean
    onClick: () => void
    background?: string
    requiresReload: boolean
}): JSX.Element {
    const [hover, setHover] = useState(false)
    return (
        <motion.div
            onHoverStart={() => {
                setHover(true)
            }}
            onHoverEnd={() => {
                setHover(false)
            }}
        >
            <UpdateNoteRow onClick={props.onClick}>
                <div>
                    <LatestBackground image={props.background ?? ''} />
                    <LatestOverlay hover={hover} />
                </div>
                <div>
                    <div>{props.note.title}</div>
                    <div>
                        &nbsp;
                        <div>{props.requiresReload ? 'Reload Required! ' : props.new ? 'New! ' : ''}</div>
                        <div>{props.note.date.toISOString().slice(0, 10)}</div>
                    </div>
                </div>
                <div>
                    {props.note.message.map((el, i) =>
                        el.length === 0 ? <UpdateNotesSpacer key={i} /> : processLine(el, i)
                    )}
                </div>
            </UpdateNoteRow>
        </motion.div>
    )
}

const CloseButton = styled(LargeClose)`
    position: absolute;
    right: 15px;
    top: 20px;

    > div {
        width: 2rem;
        height: 2rem;
    }
    flex: 0 0 auto;

    z-index: 1;
`

const UpdateContent = styled.div<{ fullHeight?: boolean }>`
    max-width: max(550px, min(600px, 50vw));
    max-height: ${(props) => (props.fullHeight ? 'var(--app-height, 100%)' : 'max(650px, 60%)')};
    width: 100vw;
    height: var(--app-height, 100%);
    background: ${(props) => props.theme.colors.bg2};
    color: ${(props) => props.theme.colors.textMain};
    position: relative;
`

const BackgroundImage = styled.div<{ image: string }>`
    background-image: ${(props) => `linear-gradient(180deg, ${transparentize(
        1,
        props.theme.colors.bg2
    )} 80%, ${props.theme.colors.bg2} 100%),
        linear-gradient(0deg, ${transparentize(0.1, props.theme.colors.bg2)}, ${transparentize(
        0.1,
        props.theme.colors.bg2
    )}), url(${props.image})`};
    position: absolute;
    background-size: cover;
    width: 100%;
    height: 260px;
    top: 0;
    left: 0;
`

const LatestBackground = styled.div<{ image: string }>`
    background-image: ${(props) =>
        `linear-gradient(0deg, ${transparentize(0.1, props.theme.colors.bg2)}, ${transparentize(
            0.1,
            props.theme.colors.bg2
        )}), url(${props.image})`};
    position: absolute;
    background-size: cover;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
`

const LatestOverlay = styled.div<{ hover: boolean }>`
    transition: background ${(props) => props.theme.transitions.interactive};
    background-color: ${(props) =>
        props.hover ? transparentize(0.6, props.theme.colors.bg3) : 'transparent'};
    position: absolute;
    background-size: cover;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
`

const UpdateReloadRequired = styled.button`
    display: flex;
    flex-direction: row;
    align-items: center;
    flex: 0 0 auto;
    padding: 25px 20px 20px 20px;
    text-align: left;
    border: 0;
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
    font-weight: 500;
    cursor: pointer;
    background: transparent;
    color: ${(props) => transparentize(0.3, props.theme.colors.textMain)};
    :hover {
        background-color: ${(props) => transparentize(0.6, props.theme.colors.bg3)};
    }
`

const ExpandedNote = styled.div`
    position: relative;
    background-size: 550px 260px;
    background-repeat: no-repeat;
    background-position: 20% calc(calc(1.5rem + 46px) * -1);
    height: calc(calc(100% - 1.5rem) - 46px);
    padding: 20px 62px 20px 62px;
    overflow-y: auto;
    img {
        max-width: 100%;
    }
    > :nth-child(1) {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        top: -25px;
        position: relative;
        > :nth-child(1) {
            font-size: 1.375rem;
            font-weight: bold;
            font-family: ${(props) => props.theme.fonts.headings};
            color: ${(props) => props.theme.colors.textHeadings};
        }
        > :nth-child(2) {
            margin-top: 10px;
            font-size: 0.875rem;
            font-weight: 600;
            transform: translateY(45px);
        }
    }
    > :nth-child(2) {
        margin-top: 40px;
        display: flex;
        justify-content: space-around;
    }
    > :nth-child(3) {
        font-size: 1rem;
        margin-top: 30px;
    }
    .bold {
        font-weight: 700;
    }
    .italic {
        font-style: oblique;
    }
    .strike {
        text-decoration: line-through;
    }
    .underline {
        text-decoration: underline;
    }
`

const TitleBar = styled.div`
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 26px 59px 20px 20px;
    > :first-child {
        font-weight: bold;
        flex-grow: 1;
        height: 1.5rem;
        color: ${(props) => props.theme.colors.textHeadings};
        display: flex;
        align-items: center;
    }
    > :last-child {
        font-size: 0.875rem;
        font-weight: 600;
        opacity: 0.5;
    }
    @media (max-width: 800px) {
        > :last-child {
            display: none;
        }
    }
`

const SwappingButton = styled(SubtleButton)`
    flex-grow: 1;
    display: flex;
    justify-content: flex-start;
    > :first-child {
        margin-right: 10px;
    }
    > :last-child {
        flex-grow: 1;
        height: 1rem;
        position: relative;
        > * {
            position: absolute;
            line-height: 1rem;
            top: 0;
            left: 0;
        }
        > :first-child {
            color: ${(props) => props.theme.colors.textMain};
        }
    }
`

export const UpdateNotesSpacer = styled.div`
    height: 10px;
    margin-bottom: 0.3rem;
    display: block;
    &::before {
        content: unset !important;
    }
`
const UpdateNotesContainer = styled.div`
    display: flex;
    flex-direction: column;
    overflow: auto;
    overflow: overlay;
    max-width: 980px;
    flex: 1 1 auto;
    height: calc(calc(100% - 1.5rem) - 46px);
    .bold {
        font-weight: 700;
    }
    .italic {
        font-style: oblique;
    }
    .strike {
        text-decoration: line-through;
    }
    .underline {
        text-decoration: underline;
    }
`
const UpdateNotesLine = styled.div<{ before: string; indented: boolean }>`
    margin-top: ${(props) => (props.indented ? '0' : '10px')};
    margin-bottom: 0.25rem;
    margin-left: ${(props) => (props.indented ? '18px' : 0)};
    display: flex;
    &::before {
        content: ${(props) => (props.before.length > 0 ? `'${props.before}'` : 'unset')} !important;
        width: 10px;
        height: 10px;
        transform: scale(0.4);
        position: relative;
        display: inline-table;
        opacity: 0.2;
        margin-right: 5px;
    }
`
const UpdateNoteRow = styled(SubtleButton)`
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    padding: 25px 20px 20px 20px;
    text-align: left;
    border-top: 1px solid ${(props) => props.theme.colors.bg3};
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
    font-weight: 500;
    width: 100%;

    position: relative;

    & > div {
        max-width: 100%;
        img {
            max-width: 100%;
        }
    }
    & > div:nth-child(2) {
    }
    & > div:nth-child(2) {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: row;
        & > div:nth-child(1) {
            color: ${(props) => props.theme.colors.textHeadings};
            font-family: ${(props) => props.theme.fonts.headings};
            font-size: 1.125rem;
            font-weight: 600;
        }
        justify-content: space-between;
        & > div:nth-child(2) {
            display: flex;
            flex-direction: row;
            font-weight: 600;
            font-size: 0.875rem;
            flex-shrink: 0;
            width: fit-content;
            & > div:nth-child(1) {
                margin-right: 12px;
                color: ${(props) => props.theme.colors.textHeadingsOptions[1]};
                word-break: keep-all;
            }
            & > div:nth-child(2) {
                word-break: keep-all;
                opacity: 0.7;
            }
        }
    }
    & > div:nth-child(3) {
        position: relative;
        display: flex;
        flex-direction: column;
        img {
            align-self: center;
        }
    }
    a {
        color: #f5f3c2;
    }

    button ~ & {
        > div:nth-child(2) {
            > div:nth-child(1) {
                color: ${(props) => props.theme.colors.textMain};
                font-size: 1rem;
            }
        }
        > div:nth-child(3) {
            opacity: 0.7;
        }
    }
`
