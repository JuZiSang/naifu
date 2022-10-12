/* eslint-env node */
/* eslint-disable unicorn/prefer-module */
/* eslint-disable @typescript-eslint/no-var-requires */

const childProcess = require('child_process')
const { writeFileSync } = require('fs')
const { withSentryConfig } = require('@sentry/nextjs')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
})
const intercept = require('intercept-stdout')

intercept((text) => (text.includes('Duplicate atom key') ? '' : text))

let commithash
try {
    commithash = childProcess.execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        windowsHide: true,
    })
} catch {
    commithash = 'unknown'
}

writeFileSync('./public/version', commithash.slice(0, 7))

/** @type {import('next').NextConfig} */
const sharedConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    compiler: {
        styledComponents: true,
    },
    reactStrictMode: true,
    experimental: {
        scrollRestoration: true,
    },
    poweredByHeader: false,
    env: {
        NEXT_PUBLIC_COMMITHASH: commithash.slice(0, 7),
        NEXT_PUBLIC_BACKEND_URL: process.env.NOVELAI_BACKEND_URL,
        NEXT_PUBLIC_ENVIRONMENT: process.env.NOVELAI_ENVIRONMENT,
        NEXT_PUBLIC_MOCK_ENV: process.env.NOVELAI_MOCK_ENV,
        NEXT_PUBLIC_RECAPTCHA_KEY: process.env.NOVELAI_RECAPTCHA_KEY,
        NEXT_PUBLIC_PADDLE_SANDBOX: process.env.NOVELAI_PADDLE_SANDBOX,
        NEXT_PUBLIC_PADDLE_OPUS_ID: process.env.NOVELAI_PADDLE_OPUS_ID,
        NEXT_PUBLIC_PADDLE_SCROLL_ID: process.env.NOVELAI_PADDLE_SCROLL_ID,
        NEXT_PUBLIC_PADDLE_TABLET_ID: process.env.NOVELAI_PADDLE_TABLET_ID,
        NEXT_PUBLIC_PADDLE_VENDOR_ID: process.env.NOVELAI_PADDLE_VENDOR_ID,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NOVELAI_SENTRY_DSN,
        NEXT_PUBLIC_PADDLE_GIFTKEY_TABLET_ID: process.env.NOVELAI_PADDLE_GIFTKEY_TABLET_ID,
        NEXT_PUBLIC_PADDLE_GIFTKEY_SCROLL_ID: process.env.NOVELAI_PADDLE_GIFTKEY_SCROLL_ID,
        NEXT_PUBLIC_PADDLE_GIFTKEY_OPUS_ID: process.env.NOVELAI_PADDLE_GIFTKEY_OPUS_ID,
    },
    productionBrowserSourceMaps: true,
    generateBuildId: () => commithash.slice(0, 7) + '-' + process.env.NOVELAI_ENVIRONMENT,
    webpack: {
        optimization: {
            moduleIds: 'deterministic',
        },
    },
}

/** @type {Partial<import('@sentry/nextjs/esm/config/types').SentryWebpackPluginOptions>}*/
const sentryConfig = {
    include: ['src', 'build', '.next/static'],
    ignore: ['node_modules'],
    org: 'anlatan',
    project: 'novelai',
    release: commithash.slice(0, 7),
    dist: commithash.slice(0, 7) + '-' + process.env.NOVELAI_ENVIRONMENT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    deploy: {
        env: process.env.NOVELAI_ENVIRONMENT,
    },
    silent: false,
    cleanArtifacts: true,
    ext: ['js', 'ts', 'jsx', 'tsx', 'map', 'jsbundle', 'bundle'],
    runOnce: true,
    validate: true,
}

module.exports = /*withBundleAnalyzer*/({
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    webpack: (
        config,
        { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
    ) => {
        //console.log(config);
        config.optimization.splitChunks = {
            cacheGroups: {
                default: false,
            },
        };
        //config.devtool = null;
        return config;
    }
});
