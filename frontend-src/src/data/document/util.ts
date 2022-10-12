export type UniqueId = number
export const uniqueid = (): UniqueId => {
    const random = crypto.getRandomValues(new Uint32Array(2))
    let buffer = 0
    for (const num of random.values()) {
        buffer = buffer * Math.pow(2, 19) + num
    }
    return buffer !== 0 ? Math.abs(Math.floor(buffer)) : uniqueid()
}

export const documentToJsonReplacer = (_k: string, v: unknown): any => {
    return v instanceof Map
        ? Object.fromEntries(v.entries())
        : v instanceof Set
        ? [...v.values()]
        : typeof v === 'bigint'
        ? v.toString()
        : v
}
