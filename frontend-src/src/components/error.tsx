import styled from 'styled-components'
import PenTip from '../assets/images/pen-tip-light.svg'
import { Dark } from '../styles/themes/dark'

const Overlay = styled.div`
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: ${() => Dark.colors.bg0};
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
`
const Block = styled.p`
    text-align: center;
`
const Link = styled.a`
    color: ${() => Dark.colors.textHeadings};
    font-weight: MdFormatBold;
    &:hover {
        color: ${() => Dark.colors.textHeadings};
    }
`
export const Logo = styled.div`
    background-color: ${() => Dark.colors.textMain};
    mask-image: url(${PenTip.src});
    mask-repeat: no-repeat;
    mask-size: contain;
    height: 64px;
    width: 64px;
`

export default function ErrorOverlay(props: {
    error: Error
    componentStack: string | null
    eventId: string | null
}): JSX.Element {
    return (
        <Overlay>
            <Logo />
            <h1>Unexpected Error</h1>
            <p>An internal error occured. Please reload the page.</p>
            <Block>
                {props.error && `${props.error}` ? (
                    <>
                        Error message: <code>{`${props.error}`}</code>
                    </>
                ) : null}
                <br />
                {props.eventId ? (
                    <>
                        Event ID: <code>{props.eventId}</code>
                    </>
                ) : null}
            </Block>
            <p>
                If you need further support, feel free to reach out to us on{' '}
                <Link href="https://discord.com/novelai">Discord</Link> or contact our{' '}
                <Link href="mailto:support@novelai.net">Support Email</Link>.
            </p>
        </Overlay>
    )
}
