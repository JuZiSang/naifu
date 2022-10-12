import { useSetRecoilState } from 'recoil'
import * as Sentry from '@sentry/nextjs'

import { getStorage } from '../data/storage/storage'
import { StoryMetadata } from '../data/story/storycontainer'
import { User } from '../data/user/user'
import { GlobalUserContext } from '../globals/globals'
import {
    CustomModules,
    Session,
    SiteTheme,
    Stories,
    StoryShelves,
    ThemePreview,
    UserPresets,
} from '../globals/state'
import { Dark } from '../styles/themes/dark'
import { googleFonts } from '../styles/themes/theme'
import { setLocalStorage } from '../util/storage'
import { logError } from '../util/browser'
import WebFont from '../data/webfontloader'

export function useUserSetup(): (user: User, remember?: boolean) => Promise<void> {
    const setSession = useSetRecoilState(Session)
    const setStories = useSetRecoilState(Stories)
    const setShelves = useSetRecoilState(StoryShelves)
    const setTheme = useSetRecoilState(SiteTheme)
    const setPresets = useSetRecoilState(UserPresets)
    const setModules = useSetRecoilState(CustomModules)
    const setThemePreview = useSetRecoilState(ThemePreview)

    return async (user: User, remember: boolean = false) => {
        const storage = getStorage(user)
        let stories = await storage.getStories()
        stories = stories.filter((story) => {
            if (!story) {
                logError('expected story, got undefined')
                return false
            }
            return true
        })
        for (const story of stories) {
            GlobalUserContext.stories.set(story.id, story)
        }
        setStories(stories.map((story: StoryMetadata) => story.id))

        if (!user.noAccount) {
            const getShelves = async () => {
                let shelves = await storage.getStoryShelves()
                shelves = shelves.filter((shelf) => {
                    if (!shelf) {
                        logError('expected story, got undefined')
                        return false
                    }
                    return true
                })
                for (const shelf of shelves) {
                    GlobalUserContext.shelves.set(shelf.id, shelf)
                }
                return shelves
            }
            const getPresets = async () => {
                let presets = await storage.getPresets()
                presets = presets.filter((preset) => {
                    if (!preset) {
                        logError('expected preset, got undefined')
                        return false
                    }
                    return true
                })
                return presets
            }
            const getModules = async () => {
                let modules = await storage.getModules()
                modules = modules.filter((preset) => {
                    if (!preset) {
                        logError('expected preset, got undefined')
                        return false
                    }
                    return true
                })
                return modules
            }
            const [shelves, presets, modules] = await Promise.all([getShelves(), getPresets(), getModules()])
            setShelves(shelves.map((shelf: StoryMetadata) => shelf.id))
            setPresets(presets)
            setModules(modules)

            if (remember) {
                setLocalStorage(
                    'session',
                    JSON.stringify({ auth_token: user.auth_token, encryption_key: user.encryption_key })
                )
            }
        }

        const defaultTheme = Dark
        if (user.settings.siteTheme) {
            let theme = user.settings.siteTheme
            if (!user.settings.siteTheme.name) {
                theme = defaultTheme
            }

            const loadPage = () => {
                if (!user.authenticated) {
                    throw 'Not authenticated'
                } else {
                    // Add potentially missing theme properties as defaults.
                    // Should be expanded in future to fully check for missing
                    // properties and use the selected theme (taken from the map)
                    // instead of default.
                    theme = { ...defaultTheme, ...theme }
                    theme.fonts = { ...defaultTheme.fonts, ...theme.fonts }
                    theme.colors = { ...defaultTheme.colors, ...theme.colors }

                    Sentry.setUser({ id: user.auth_token.slice(-16) })

                    setTheme(theme ?? defaultTheme)
                    setThemePreview(theme ?? defaultTheme)
                    setSession(user)
                }
            }

            if (
                googleFonts.includes(user.settings.siteTheme.fonts.selectedHeadings) ||
                googleFonts.includes(user.settings.siteTheme.fonts.selectedDefault)
            ) {
                WebFont.load({
                    google: {
                        families: [
                            user.settings.siteTheme.fonts.selectedHeadings + ':400,600,700',
                            user.settings.siteTheme.fonts.selectedDefault + ':400,600,700',
                        ],
                    },
                    active: loadPage,
                    inactive: loadPage,
                    timeout: 2000,
                })
            } else {
                loadPage()
            }
        } else {
            setTheme(defaultTheme)
            setThemePreview(defaultTheme)
            setSession(user)
        }
    }
}
