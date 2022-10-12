/* eslint-disable unicorn/prefer-module */
/* eslint-disable @typescript-eslint/no-var-requires */

// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const Environment = process.env.NOVELAI_ENVIRONMENT ?? 'debug'
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [],
    tracesSampleRate: 0.2,
    environment: Environment,
    release: process.env.NEXT_PUBLIC_COMMITHASH,
    enabled: !!Environment && Environment !== 'debug',
    autoSessionTracking: false,
})
