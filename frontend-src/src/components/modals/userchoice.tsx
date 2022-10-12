import { useRecoilState } from 'recoil'
import styled from 'styled-components'
import { UserPromptModal } from '../../globals/state'
import { LightColorButton } from '../../styles/ui/button'
import { LineBackground } from '../util/lineBackground'
import CircleBackground from '../../assets/images/circles.svg'
import { DeleteModalContent } from '../../styles/components/infobar'
import Modal, { ModalType } from './modal'

export default function UserChoiceModal(): JSX.Element {
    const [userPrompt, setUserPrompt] = useRecoilState(UserPromptModal)
    return (
        <Modal
            isOpen={!!userPrompt?.options.length}
            shouldCloseOnOverlayClick={false}
            showClose={false}
            label={userPrompt?.label}
            onRequestClose={() => {
                /* */
            }}
            type={ModalType.Large}
        >
            <DeleteModalContent style={{ width: '600px' }}>
                <LineBackground background={CircleBackground.src}>
                    <UserChoiceContent>
                        <MainText>{userPrompt?.label}</MainText>
                        {userPrompt?.text}
                        <ButtonRow>
                            {userPrompt?.options.map((option, i) => (
                                <StorageErrorChoice
                                    key={i}
                                    color={option.color}
                                    onClick={() => {
                                        setUserPrompt(null)
                                        option.onClick()
                                    }}
                                >
                                    {option.text}
                                </StorageErrorChoice>
                            ))}
                        </ButtonRow>
                        <Hint>{userPrompt?.hint}</Hint>
                    </UserChoiceContent>
                </LineBackground>
            </DeleteModalContent>
        </Modal>
    )
}

const StorageErrorChoice = styled(LightColorButton)`
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
`

const UserChoiceContent = styled.div`
    overflow: auto;
`

const ButtonRow = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: stretch;
    margin-top: 1rem;
    gap: 10px;
    > * {
        flex: 1;
        margin: 5px;
    }
`

const Hint = styled.div`
    margin-top: 0.5rem;
    opacity: 0.5;
    font-size: 0.8rem;
`

const MainText = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.375rem;
    font-weight: 600;
    text-align: center;
`
