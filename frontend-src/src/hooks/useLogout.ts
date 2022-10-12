import { useRecoilCallback } from 'recoil'
import { useRouter } from 'next/router'
import * as Sentry from '@sentry/nextjs'

import { SettingsPages } from '../components/settings/constants'
import { ContextReport } from '../data/ai/context'
import { IndexedDBStorage } from '../data/storage/indexeddbstorage'
import { KeyStore } from '../data/storage/keystore/keystore'
import { GlobalUserContext } from '../globals/globals'
import { LastContextReport, SelectedStory, Session, SettingsModalOpen, Stories } from '../globals/state'
import { removeLocalStorage } from '../util/storage'
import { User } from '../data/user/user'

export const useLogout = (): (() => void) => {
    const router = useRouter()
    const logout = useRecoilCallback(({ set }) => () => {
        IndexedDBStorage.teardown()
        removeLocalStorage('session')
        set(SettingsModalOpen, SettingsPages.Closed)
        set(SelectedStory, { loaded: false, id: '' })
        set(Stories, [])
        set(LastContextReport, new ContextReport())
        set(Session, new User('', ''))
        GlobalUserContext.keystore = new KeyStore()
        GlobalUserContext.remoteStories = new Set()
        GlobalUserContext.stories = new Map()
        Sentry.configureScope((scope) => scope.setUser(null))
        router.push('/')
    })
    return logout
}
