import styled from 'styled-components'
import { ScreenReader } from '../mixins'

export const ScreenreaderToggle = styled.div<{ notShown: boolean }>`
    ${(props) => (!props.notShown ? '' : ScreenReader)}
`
