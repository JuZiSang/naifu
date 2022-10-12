import styled from 'styled-components'

import TextareaAutosize from 'react-textarea-autosize'
import { SubtleButton } from '../ui/button'

export const Container = styled.div`
    background-color: ${(props) => props.theme.colors.bg0};
    padding-bottom: 20px;
    padding-top: 10px;
    position: relative;
`

export const MemoryInput = styled(TextareaAutosize)`
    height: 180px;
    overflow-y: auto;
    padding-bottom: 0;
    padding-top: 0;
    position: relative;
    resize: none;
`

export const UsedMax = styled(SubtleButton)`
    font-size: 0.9rem;
    bottom: 0;
    display: flex;
    margin: 0 5px 0 0;
    opacity: 0.7;
    position: absolute;
    right: 0;
    cursor: pointer;
`
