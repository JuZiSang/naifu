/* eslint-disable unicorn/prefer-module */
/* eslint-disable @typescript-eslint/no-var-requires */

// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { Integrations } from '@sentry/tracing'

const Environment = process.env.NOVELAI_ENVIRONMENT ?? 'debug'
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
        new Integrations.BrowserTracing({
            startTransactionOnPageLoad: true,
            startTransactionOnLocationChange: false,
        }),
    ],
    tracesSampleRate: 0.2,
    environment: Environment,
    release: process.env.NEXT_PUBLIC_COMMITHASH,
    enabled: !!Environment && Environment !== 'debug',
    autoSessionTracking: false,
})
