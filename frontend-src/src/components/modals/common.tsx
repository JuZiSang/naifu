import styled from 'styled-components'
import { LargeClose } from '../../styles/components/modal'

export const CloseButton = styled(LargeClose)`
    position: absolute;
    right: 18px;
    top: 20px;

    > div {
        width: 2rem;
        height: 2rem;
    }
    flex: 0 0 auto;

    z-index: 1;
`
