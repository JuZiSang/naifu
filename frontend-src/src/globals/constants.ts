export const Environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'debug'
export const CommitHash = process.env.NEXT_PUBLIC_COMMITHASH || 'unknown'

export const SentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''

export const BackendURL = process.env.NEXT_PUBLIC_BACKEND_URL || ''
export const MockEnv = process.env.NEXT_PUBLIC_MOCK_ENV === 'true'
export const RecaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY || ''
export const PaddleSandbox = process.env.NEXT_PUBLIC_PADDLE_SANDBOX === 'true'
export const PaddleVendorID = Number.parseInt(process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID || '123')
export const PaddleCodexID = Number.parseInt(process.env.NEXT_PUBLIC_PADDLE_CODEX_ID || '123')
export const PaddleOpusID = Number.parseInt(process.env.NEXT_PUBLIC_PADDLE_OPUS_ID || '123')
export const PaddleScrollID = Number.parseInt(process.env.NEXT_PUBLIC_PADDLE_SCROLL_ID || '123')
export const PaddleTabletID = Number.parseInt(process.env.NEXT_PUBLIC_PADDLE_TABLET_ID || '123')

export const PaddleGitfKeyTabletID = Number.parseInt(
    process.env.NEXT_PUBLIC_PADDLE_GIFTKEY_TABLET_ID || '26963'
)
export const PaddleGitfKeyScrollID = Number.parseInt(
    process.env.NEXT_PUBLIC_PADDLE_GIFTKEY_SCROLL_ID || '27468'
)
export const PaddleGitfKeyOpusID = Number.parseInt(process.env.NEXT_PUBLIC_PADDLE_GIFTKEY_OPUS_ID || '27469')
export const PaddleGitfKeyCodexID = Number.parseInt(
    process.env.NEXT_PUBLIC_PADDLE_GIFTKEY_CODEX_ID || '27469'
)

export const PurchasesDisabled = false

export const BackendURLRegister = BackendURL + '/user/register'
export const BackendURLLogin = BackendURL + '/user/login'
export const BackendURLUserData = BackendURL + '/user/data'
export const BackendURLSubscriptions = BackendURL + '/user/subscription'
export const BackendURLSubscriptionBind = BackendURL + '/user/subscription/bind'
export const BackendURLSubscriptionsChange = BackendURL + '/user/subscription/change'
export const BackendURLUserGiftKeys = BackendURL + '/user/giftkeys'
export const BackendURLPriority = BackendURL + '/user/priority'
export const BackendURLKeystore = BackendURL + '/user/keystore'
export const BackendURLObjects = BackendURL + '/user/objects'
export const BackendURLStories = BackendURL + '/user/objects/stories'
export const BackendURLStoryContent = BackendURL + '/user/objects/storycontent'
export const BackendURLPresets = BackendURL + '/user/objects/presets'
export const BackendURLAIModules = BackendURL + '/user/objects/aimodules'
export const BackendURLClientSettings = BackendURL + '/user/clientsettings'
export const BackendURLGenerate = BackendURL + '/ai/generate'
export const BackendURLGenerateStream = BackendURL + '/generate-stream'
export const BackendURLGenerateImage = BackendURL + '/generate-stream'
export const BackendURLGenerateImagePrice = BackendURL + '/ai/generate-image/request-price'
export const BackendURLRecoveryInitiation = BackendURL + '/user/recovery/request'
export const BackendURLRecoverySubmit = BackendURL + '/user/recovery/recover'
export const BackendURLPrefixSubmit = BackendURL + '/ai/module/train'
export const BackendURLPrefix = BackendURL + '/ai/module'
export const BackendURLPrefixAll = BackendURL + '/ai/module/all'
export const BackendURLPrefixDelete = BackendURL + '/ai/module/delete'
export const BackendURLPurchaseSteps = BackendURL + '/ai/module/buy-training-steps'
export const BackendURLChangeAuth = BackendURL + '/user/change-access-key'
export const BackendURLStoryShelves = BackendURL + '/user/objects/shelf'
export const BackendURLVerifyEmail = BackendURL + '/user/verify-email'
export const BackendURLInformation = BackendURL + '/user/information'
export const BackendURLRequestVerifyEmail = BackendURL + '/user/request-email-verification'
export const BackendURLResendVerifyEmail = BackendURL + '/user/resend-email-verification'
export const BackendURLRequestDeleteAccount = BackendURL + '/user/deletion/request'
export const BackendURLVerifyDeleteAccount = BackendURL + '/user/deletion/delete'
export const BackendURLSubmitContest = BackendURL + '/user/submission'
export const BackendURLVoteContest = BackendURL + '/user/vote-submission'
export const BackendTTSUrl = BackendURL + '/ai/generate-voice'
export const BackendURLTagSearch = BackendURL + '/predict-tags'
export const BreakpointMobile = 1250
export const MaxLoreSearchDistance = 10000
export const MaxTokens = 2048

export const mobileSize = '1250px'
export const smallMobileSize = '900px'
export const smallerMobileSize = '600px'
