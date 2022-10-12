import * as Sentry from '@sentry/nextjs'
import { Environment } from '../globals/constants'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function logError(message: any, report: boolean = true, additional: any = ''): void {
    if (additional) {
        // eslint-disable-next-line no-console
        console.error(additional, message)
    } else {
        // eslint-disable-next-line no-console
        console.error(message)
    }
    if (report) Sentry.captureException(message)
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function logWarning(message: any, report: boolean = false, additional: any = ''): void {
    if (additional) {
        // eslint-disable-next-line no-console
        console.warn(additional, message)
    } else {
        // eslint-disable-next-line no-console
        console.warn(message)
    }
    if (report) Sentry.captureMessage(message, 'warning')
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function logInfo(message: any, report: boolean = false, additional: any = ''): void {
    if (additional) {
        // eslint-disable-next-line no-console
        console.info(additional, message)
    } else {
        // eslint-disable-next-line no-console
        console.info(message)
    }
    if (report) Sentry.captureMessage(message, 'info')
}

export function logDebug(...message: any[]): void {
    if (Environment !== 'production') {
        // eslint-disable-next-line no-console
        console.debug(...message)
    }
}

export function downloadTextFile(text: string, name: string): void {
    const a = document.createElement('a')
    const type = name.split('.').pop()
    a.href = URL.createObjectURL(new Blob([text], { type: `text/${type === 'txt' ? 'plain' : type}` }))
    a.download = name.replace(/["%*/:<>?\\|]/g, '_')
    a.target = '_blank'
    a.click()
    setTimeout(() => {
        URL.revokeObjectURL(a.href)
    }, 500)
}

export function downloadFile(buffer: Uint8Array, name: string, type: string): void {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([buffer], { type }))
    a.download = name.replace(/["%*/:<>?\\|]/g, '_')
    a.target = '_blank'
    a.click()
    setTimeout(() => {
        URL.revokeObjectURL(a.href)
    }, 1000 * 60)
}

export function createObjectURL(file: Blob | MediaSource): string {
    if (window.webkitURL) {
        return window.webkitURL.createObjectURL(file)
    } else if (window.URL && window.URL.createObjectURL) {
        return window.URL.createObjectURL(file)
    } else {
        return ''
    }
}
