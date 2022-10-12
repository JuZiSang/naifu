const NullWebFont = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    load: () => {},
}
const isBrowser = typeof window !== 'undefined'

// eslint-disable-next-line unicorn/prefer-module
export default isBrowser ? require('webfontloader') : NullWebFont
