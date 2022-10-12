import 'reseter.css'

import '../styles/globals.css'

import type { AppProps } from 'next/app'
import { default as Router } from 'next/router'
import Script from 'next/script'
import Head from 'next/head'
import { RecoilRoot, useRecoilValue } from 'recoil'
import { ThemeProvider } from 'styled-components'
import { ReactElement, ReactNode, useEffect, useState } from 'react'
import nProgress from 'nprogress'
import { NextPage } from 'next'
import { MotionConfig } from 'framer-motion'
import isPropValid from '@emotion/is-prop-valid'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import { SessionValue, SiteTheme } from '../globals/state'
import { CustomGlobalStyle, GlobalStyle } from '../styles/global'
import { HotEvent, HotEventSub, subscribeToHotEvent } from '../data/user/hotkeys'
import { CommitHash, Environment, PaddleSandbox, PaddleVendorID } from '../globals/constants'
import { getUserSetting, UserSettings } from '../data/user/settings'
import { memoize } from '../util/util'

type NextPageWithLayout = NextPage & {
    Layout?: (page: ReactElement) => ReactNode
}
type AppPropsWithErrAndLayout = AppProps & {
    err: any
    Component: NextPageWithLayout
}

Router.events.on('routeChangeStart', (route: string) => route.startsWith('/stories?id=') || nProgress.start())
Router.events.on(
    'routeChangeComplete',
    (route: string) => route.startsWith('/stories?id=') || nProgress.done()
)
Router.events.on('routeChangeError', () => nProgress.done())

if (Environment !== 'production') {
    // Silence duplicate recoil key warnings during hot reloads
    // see: https://github.com/facebookexperimental/Recoil/issues/733#issuecomment-925072943
    const mutedConsole = memoize((console: Console) => ({
        ...console,
        warn: (...args: any[]) =>
            args[0]?.includes
                ? args[0]?.includes('Duplicate atom key')
                    ? null
                    : console.warn(...args)
                : console.warn(...args),
    }))
    global.console = mutedConsole(global.console)
}

function AppWithState({ Component, pageProps, err }: AppPropsWithErrAndLayout): JSX.Element {
    const siteTheme = useRecoilValue(SiteTheme)
    const settings = useRecoilValue(SessionValue('settings')) as UserSettings

    const [showBorder, setShowborder] = useState(false)
    const tabBorder = () => {
        setShowborder(true)
        return true
    }
    const checkClick = (e: MouseEvent) => {
        if (e.detail === 0) {
            // keyboard "click" event
        } else {
            // mouse "click" event
            setShowborder(false)
        }
    }
    useEffect(() => {
        subscribeToHotEvent(
            HotEvent.focusForward,
            new HotEventSub('indexTabF', tabBorder, false, false, false)
        )
        subscribeToHotEvent(HotEvent.focusBack, new HotEventSub('indexTabB', tabBorder, false, false, false))
        subscribeToHotEvent(
            HotEvent.preventEvent,
            new HotEventSub('indexPrevent', (e) => {
                e.preventDefault()
                return true
            })
        )
    }, [])
    useEffect(() => {
        document.addEventListener('mousedown', checkClick)
        return () => {
            document.removeEventListener('mousedown', checkClick)
        }
    })

    useEffect(() => {
        if (typeof document === 'undefined') return
        const meta = document.createElement('meta')
        meta.name = 'darkreader'
        meta.content = 'disable'
        const observer = new MutationObserver(() => {
            const metaFake = document.querySelector('meta[content="' + meta.content + '"]')
            if (!metaFake) {
                document.head.append(meta)
            }
            const metaReal = document.querySelector('meta[name="' + meta.name + '"]')
            if (metaReal && (metaReal as HTMLMetaElement).content != meta.content) {
                metaReal.remove()
            }
            for (const style of document.head.querySelectorAll('.darkreader')) {
                style.remove()
            }
        })
        observer.observe(document.head, { attributes: false, childList: true, subtree: false })
        return () => {
            observer.disconnect()
        }
    }, [])

    const ComponentLayout = Component.Layout ?? ((page) => page)
    return (
        <>
            <CustomGlobalStyle global={siteTheme.global ?? ''} />
            <GlobalStyle
                theme={siteTheme}
                fontSize={getUserSetting(settings, 'fontScale')}
                outputFontSize={getUserSetting(settings, 'outputFontScale')}
                paragraphIndent={getUserSetting(settings, 'paragraphIndent')}
                paragraphSpacing={getUserSetting(settings, 'paragraphSpacing')}
                lineSpacing={getUserSetting(settings, 'lineSpacing')}
                editorHighlighting={getUserSetting(settings, 'editorHighlighting')}
                buttonScale={getUserSetting(settings, 'buttonScale')}
                focusBorder={showBorder}
            />
            <ThemeProvider theme={siteTheme}>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                {ComponentLayout(<Component {...pageProps} err={err} />)}
            </ThemeProvider>
        </>
    )
}

function App(props: AppPropsWithErrAndLayout): JSX.Element {
    return (
        <>
            <Head>
                <meta name="referrer" content="origin" />
                <meta charSet="utf8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
                />
                <meta name="theme-color" content="#000000" />
                <meta
                    name="description"
                    // eslint-disable-next-line max-len
                    content="GPT-powered AI Storyteller. Driven by AI, construct unique stories, thrilling tales, seductive romances, or just fool around. Anything goes!"
                />
                <meta
                    name="keywords"
                    content="ai, adventure, writing, novelai, novel ai, anlatan, ai dungeon, aidungeon, openai, \
                        nai, games, computer, videogames, text, textadventure, novel, kurumuz, latitude"
                />
                <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
                <meta httpEquiv="Pragma" content="no-cache" />
                <meta httpEquiv="Expires" content="0" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

                <meta name="darkreader" content="disable" />
            </Head>
            <RecoilRoot>
                <MotionConfig isValidProp={isPropValid}>
                    <DndProvider backend={HTML5Backend}>
                        <AppWithState {...props} />
                    </DndProvider>
                </MotionConfig>
            </RecoilRoot>
        </>
    )
}

export default App
