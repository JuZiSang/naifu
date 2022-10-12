/* eslint-disable @typescript-eslint/ban-ts-comment */

// Exists only to prevent jest error
if (typeof global.navigator === 'undefined')
    global.navigator = { userAgent: 'test', maxTouchPoints: 0 } as Navigator

export const isBrowser = (() => {
    // check if window and document exist
    return typeof window !== 'undefined' && typeof window.document !== 'undefined'
})()

export const isMacOS = (() => {
    // test if platform advertises itself as mac or idevice
    if (
        typeof navigator !== 'undefined' &&
        typeof navigator.userAgentData !== 'undefined' &&
        typeof navigator.userAgentData.platform !== undefined
    ) {
        return /mac|iphone|ipad|ipod/i.test(navigator.userAgentData.platform)
    }
    // test if user agent contains mac or idevice
    if (typeof navigator !== 'undefined' && 'userAgent' in navigator) {
        return /mac|iphone|ipad|ipod/i.test(navigator.userAgent)
    }
    return false
})()

export const isTouchScreenDevice = (() => {
    // test if device has touch points
    if (typeof navigator !== 'undefined') {
        if ('maxTouchPoints' in navigator) {
            return navigator.maxTouchPoints > 0
        }
        if ('msMaxTouchPoints' in navigator) {
            // @ts-ignore
            return navigator.msMaxTouchPoints > 0
        }
    }
    // test if pointer is advertised as coarse
    if (typeof matchMedia !== 'undefined') {
        const pointerCoarse = matchMedia('(pointer:coarse)')
        return pointerCoarse.matches && pointerCoarse.media.replace(' ', '') === '(pointer:coarse)'
    }
    // test if window supports touch events
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
        return true
    }
    // test if document supports touch events
    if (typeof document !== 'undefined') {
        try {
            document.createEvent('TouchEvent')
            return true
            // eslint-disable-next-line no-empty
        } catch {}
    }
    return false
})()

export const isMobileDevice = (() => {
    // test if user agent data advertises itself as mobile
    if (
        typeof navigator !== 'undefined' &&
        typeof navigator.userAgentData !== 'undefined' &&
        typeof navigator.userAgentData.mobile !== undefined
    ) {
        return navigator.userAgentData.mobile
    }
    // test if window has orientation property
    if (typeof window !== 'undefined' && 'orientation' in window) {
        return true
    }
    // test if user agent contains mobi
    if (typeof navigator !== 'undefined' && 'userAgent' in navigator) {
        return /mobi/i.test(navigator.userAgent)
    }
    return false
})()

export const isSafari = (() => {
    // check user agent for safari
    if (typeof navigator !== 'undefined' && 'userAgent' in navigator) {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    }
    return false
})()

export const isIOS = (() => {
    return isMacOS && isMobileDevice
})()

export const isInternetExplorer = (() => {
    // check for deprecated ie 6-11 only property
    if (
        typeof window !== 'undefined' &&
        typeof window.document !== 'undefined' &&
        // @ts-ignore
        typeof window.document.documentMode !== 'undefined'
    ) {
        return true
    }
    return false
})()

export const isChromium = (() => {
    // check for chromium-only global chrome property
    // @ts-ignore
    if (typeof chrome !== 'undefined') {
        // @ts-ignore
        return 'runtime' in chrome || 'webstore' in chrome
    }
    return false
})()

export const isFirefox = (() => {
    // check user agent for firefox
    if (typeof navigator !== 'undefined' && 'userAgent' in navigator) {
        return /firefox/i.test(navigator.userAgent)
    }
    return false
})()

export const isRegExpLookBehindSupported = (() => {
    // test if lookbehind regexp is constructible
    try {
        new RegExp('(?<=)')
        return true
    } catch {
        return false
    }
})()

export const chromeMajorVersion = (() => {
    // non-chromium browsers don't apply
    if (!isChromium) {
        return Number.NaN
    }
    // parse chrome version from user agent
    if (typeof navigator !== 'undefined' && 'userAgent' in navigator) {
        const match = navigator.userAgent.match(/(chrome(?=\/))\/?\s*(\d+)/i)
        if (match && match.length >= 3 && /chrome/i.test(match[1])) {
            return Number.parseInt(match[2], 10)
        }
    }
    return Number.NaN
})()

export const isSpellCheckSupported = (() => {
    // spell check in chrome version 96 has an adverse performance impact
    if (!Number.isNaN(chromeMajorVersion) && chromeMajorVersion === 96) {
        return false
    }
    return true
})()
