import { useRecoilValue } from 'recoil'
import { UserSubscription } from '../../data/user/user'
import { SessionValue } from '../../globals/state'
import { subscriptionIsActive } from '../../util/subscription'

export function AccountRequired(props: { children: JSX.Element | JSX.Element[] }): JSX.Element {
    const noAccount = useRecoilValue(SessionValue('noAccount'))

    return <>{!noAccount && props.children}</>
}

export function NonAccountOnly(props: { children: JSX.Element | JSX.Element[] }): JSX.Element {
    const noAccount = useRecoilValue(SessionValue('noAccount'))

    return <>{noAccount && props.children}</>
}

export function NoSubscriptionOnly(props: { children: JSX.Element | JSX.Element[] }): JSX.Element {
    const subscription = useRecoilValue(SessionValue('subscription')) as UserSubscription

    return <>{!subscriptionIsActive(subscription) && props.children}</>
}
