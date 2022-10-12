// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function importAll(r: __WebpackModuleApi.RequireContext) {
    return r.keys().map((element: any) => r(element))
}
export const hashCode = (s: string): number =>
    [...s].reduce((a, b) => {
        a = (a << 5) - a + (b.codePointAt(0) ?? 1)
        return a & a
    }, 0)
