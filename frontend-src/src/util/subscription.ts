import { User, UserSubscription } from '../data/user/user'
import { PaddleCodexID, PaddleOpusID, PaddleScrollID, PaddleTabletID } from '../globals/constants'

export function subscriptionIdToName(id: number): string {
    switch (id) {
        case PaddleOpusID: {
            return 'Opus'
        }
        case PaddleTabletID: {
            return 'Tablet'
        }
        case PaddleScrollID: {
            return 'Scroll'
        }
        case PaddleCodexID: {
            return 'Codex'
        }
        default: {
            return 'Unknown / None'
        }
    }
}

export function tierNumberToName(tier: number): string {
    switch (tier) {
        case 1: {
            return 'Tablet'
        }
        case 2: {
            return 'Scroll'
        }
        case 3: {
            return 'Opus'
        }
        case 4: {
            return 'Codex'
        }
        default: {
            return 'Unknown / None'
        }
    }
}

export function tierNumberToNameCaps(tier: number): string {
    switch (tier) {
        case 1: {
            return 'TABLET'
        }
        case 2: {
            return 'SCROLL'
        }
        case 3: {
            return 'OPUS'
        }
        case 4: {
            return 'CODEX'
        }
        default: {
            return 'Unknown / None'
        }
    }
}

export function subscriptionIsActive(subscription: UserSubscription): boolean {
    return subscription.expiresAt > Date.now() / 1000 && subscription.tier > 0
}

export function hasStreamedTTSAccess(_user: User): boolean {
    return true
}

export function getAccountContextLimit(user: User): number {
    let limit = user.subscription.perks.contextTokens
    switch (true) {
        case user.settings.force1024Tokens:
            limit = 1024
            break
        case user.noAccount:
            limit = 2048
            break
        case user.information.trialActivated && !subscriptionIsActive(user.subscription):
            limit = 2048
            break
        case user.subscription.perks.contextTokens <= 0:
            limit = 2048
            break
    }
    return limit
}

export const getTrainingSteps = (trainingStepsLeft: number | Record<string, number>): number => {
    if (typeof trainingStepsLeft === 'object') {
        return trainingStepsLeft.fixedTrainingStepsLeft + trainingStepsLeft.purchasedTrainingSteps
    }
    if (typeof trainingStepsLeft === 'number') {
        return trainingStepsLeft
    }
    throw new Error('Wrong trainingStepsLeft in session: ' + typeof trainingStepsLeft)
}
