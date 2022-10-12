import styled from 'styled-components'

import BoxBackground from '../../assets/images/login/background.svg'
import { Icon } from '../ui/icons'
import { darken, transparentize } from '../../util/colour'


export const LoginBackground = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    background-position: 20% 50%;
    background-repeat: no-repeat;
    background-size: cover;
    position: absolute;
    height: 100%;
    width: 100%;
`

export const RegisterBackground = styled(LoginBackground)`
    background-image: linear-gradient(0deg, rgba(33, 35, 53, 0.6), rgba(33, 35, 53, 0.6));`

export const LoginContainer = styled.div`
    display: flex;
    height: 100%;
    width: 100%;
`

export const LoginBox = styled.form`
    background: url(${BoxBackground.src});
    background-repeat: no-repeat;
    background-size: cover;
    background-color: ${(props) => props.theme.colors.bg2};
    border: 1px solid ${(props) => props.theme.colors.bg3};
    padding: 50px;
    width: 520px;
    max-height: var(--app-height, 100%);
    overflow: auto;
    height: 100%;
    max-width: 100vw;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    position: relative;
    align-items: center;
    > div:first-child {
        max-width: 100%;
        width: 290px;
    }
    label {
        margin-bottom: 11px;
        font-size: 0.875rem;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    @media (max-height: 700px) {
        justify-content: flex-start;
        padding-top: 100px;
    }

    @media (max-width: 500px) {
        justify-content: flex-start;
        padding-top: 100px;
    }
`

export const SignupBox = styled(LoginBox)`
    @media (max-height: 1000px) {
        justify-content: flex-start;
        padding-top: 100px;
    }
`

export const Spacer = styled.div`
    @media (max-height: 1000px) {
        display: none;
    }
`

export const Field = styled.input`
    background: ${(props) => props.theme.colors.bg0};
    margin-bottom: 21px;
`

export const LoginHeader = styled.div`
    align-items: bottom;
    display: flex;
    flex-direction: column;
    margin-bottom: 15px;
    font-weight: 600;
    > :first-child {
        color: ${(props) => props.theme.colors.textHeadings};
        font-size: 1rem;
    }
    > :last-child {
        font-family: ${(props) => props.theme.fonts.headings};
        font-size: 2rem;
    }
`

export const SignUp = styled.a``

export const Key = styled.div`
    font-family: ${(props) => props.theme.fonts.headings};
    height: fit-content;
    opacity: 0.6;
    padding-bottom: 5px;
`

export const LoginError = styled.div`
    color: rgb(224, 98, 98);
    margin-top: 15px;
    p {
        margin-bottom: 0;
    }
`

export const Submit = styled.input`
    padding: 12px;
    background: ${(props) => props.theme.colors.textHeadings};
    cursor: pointer;
    font-weight: bold;
    color: ${(props) => props.theme.colors.bg0};
    font-family: ${(props) => props.theme.fonts.default};
    height: 46px;
    transition: ${(props) => props.theme.transitions.interactive};
    user-select: none;
    font-size: 1rem;

    transition: all ${(props) => props.theme.transitions.interactive};
    &:hover,
    &:focus {
        background-color: ${(props) => props.theme.colors.textMain};
    }
    &:active {
        background-color: ${(props) => darken(0.1, props.theme.colors.textMain)};
    }
`

export const LoginStyleButton = styled.button`
    line-height: 0;
    padding: 12px;
    background: ${(props) => props.theme.colors.textHeadings};
    cursor: pointer;
    font-weight: bold;
    color: ${(props) => props.theme.colors.bg0};
    font-family: ${(props) => props.theme.fonts.default};
    height: 46px;
    transition: ${(props) => props.theme.transitions.interactive};
    user-select: none;
    font-size: 1rem;
    width: 100%;
    transition: all ${(props) => props.theme.transitions.interactive};
    &:hover,
    &:focus {
        background-color: ${(props) => props.theme.colors.textMain};
    }
    &:active {
        background-color: ${(props) => darken(0.1, props.theme.colors.textMain)};
    }
    &:disabled {
        color: ${(props) => transparentize(0.5, props.theme.colors.bg0)};
    }
`

export const Policy = styled.div`
    margin-bottom: 1.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 20px;
    p,
    a {
        color: ${(props) => transparentize(0.3, props.theme.colors.textMain)};
    }
    a {
        font-weight: 700;
    }
    a:hover {
        text-decoration: underline;
    }
`

export const ImportantInfo = styled.p`
    color: ${(props) => transparentize(0.2, props.theme.colors.textMain)} !important;
    > span {
        color: ${(props) => props.theme.colors.textHeadings};
    }
`

export const LoginTop = styled.div`
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    justify-content: space-between;
    padding: 30px;
    font-size: 1rem;

    font-family: ${(props) => props.theme.fonts.headings};
    font-weight: 600;
    user-select: none;
    > a {
        cursor: pointer;
        display: flex;
        flex-direction: row;
        align-items: center;
        > :first-child {
            margin-right: 10px;
            top: -2px;
            position: relative;
        }
        &:hover {
            > ${Icon} {
                background-color: ${(props) => props.theme.colors.textHeadings};
            }
        }
    }
`
