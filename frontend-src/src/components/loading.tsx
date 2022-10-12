import styled from 'styled-components'
import { LoginBackground } from '../styles/components/login'
import Spinner from './spinner'

export const LoadingSpinner = styled(Spinner)`
    width: 30px;
    height: 30px;
`

export default function Loading(): JSX.Element {
    return (
        <LoginBackground>
            <LoadingSpinner visible={true} />
        </LoginBackground>
    )
}
