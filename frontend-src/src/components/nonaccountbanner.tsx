import styled from 'styled-components'
import Link from 'next/link'
import { useSetRecoilState } from 'recoil'
import { SubtleButton } from '../styles/ui/button'
import { Session, SiteTheme } from '../globals/state'
import { User } from '../data/user/user'
import { Dark } from '../styles/themes/dark'

export const BannerContent = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-size: 1rem;
    padding: 5px 70px;
    button {
        display: inline;
        padding-left: 10px;
        color: ${(props) => props.theme.colors.textMain};
    }
`

export function NonAccountBanner(): JSX.Element {
    const setSession = useSetRecoilState(Session)
    const setTheme = useSetRecoilState(SiteTheme)
    return (
        <BannerContent>
            <span>
                {(window.visualViewport?.width || window.innerWidth) <= 450
                    ? `You’re currently playing without an account.`
                    : `You’re currently playing without an account. To ensure your stories are saved, create an
                account now.`}
            </span>
            <Link href="/register" passHref>
                <SubtleButton
                    onClick={() => {
                        setSession(new User('', ''))
                        setTheme(Dark)
                    }}
                    color={'#D9FFE1'}
                >
                    Sign&nbsp;Up&nbsp;&gt;
                </SubtleButton>
            </Link>
        </BannerContent>
    )
}
