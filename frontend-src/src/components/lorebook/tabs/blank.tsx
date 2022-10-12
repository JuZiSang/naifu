/* eslint-disable max-len */
import styled from 'styled-components'
import LorebookBackground from '../../../assets/images/lorebackground.svg'
import { LineBackground } from '../../util/lineBackground'
export function LorebookTabBlank(): JSX.Element {
    return (
        <LineBackground
            background={LorebookBackground.src}
            backgroundStyle={{
                height: 'calc(100% - 40px)',
                width: 'calc(100% - 21px)',
                left: 21,
                top: 20,
            }}
        >
            <DummyLorebookTabContent />
        </LineBackground>
    )
}

const DummyLorebookTabContent = styled.div`
    height: 100%;
    width: 100%;
    flex: 1 1 auto;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    mask-repeat: no-repeat;
    mask-size: cover;
    mask-position: center;
    ${(props) => `
        background-image:  linear-gradient(${props.theme.colors.bg2} 0%, #00000000 5%, #00000000 95%, ${props.theme.colors.bg2} 100%),
        linear-gradient(90deg, ${props.theme.colors.bg2} 0%, #00000000 5%, #00000000 95%, ${props.theme.colors.bg2} 100%);
    `}
`
