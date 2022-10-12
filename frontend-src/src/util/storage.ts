export function getLocalStorage(name: string): string | null {
    if (typeof window === "undefined" || !window.localStorage) return null
    try {
        return window.localStorage.getItem(name)
    } catch {
        return null
    }
}

export function setLocalStorage(name: string, value: string): void {
    if (!window.localStorage) return
    try {
        return window.localStorage.setItem(name, value)
    } catch {
        return
    }
}

export function removeLocalStorage(name: string): void {
    if (!window.localStorage) return
    try {
        return window.localStorage.removeItem(name)
    } catch {
        return
    }
}

export function getSessionStorage(name: string): string | null {
    if (!window.sessionStorage) return null
    try {
        return window.sessionStorage.getItem(name)
    } catch {
        return null
    }
}

export function setSessionStorage(name: string, value: string): void {
    if (!window.sessionStorage) return
    try {
        return window.sessionStorage.setItem(name, value)
    } catch {
        return
    }
}

export function removeSessionStorage(name: string): void {
    if (!window.sessionStorage) return
    try {
        return window.sessionStorage.removeItem(name)
    } catch {
        return
    }
}
