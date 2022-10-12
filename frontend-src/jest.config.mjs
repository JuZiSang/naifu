import createConfig from 'next/jest.js'

const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/config/jest/setup.ts'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!**/*.d.ts', '!**/node_modules/**'],
    extensionsToTreatAsEsm: ['.jsx', '.ts', '.tsx'],
}

export default createConfig()(customJestConfig)
