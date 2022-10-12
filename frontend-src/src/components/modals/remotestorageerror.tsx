import { useRecoilCallback, useRecoilState } from 'recoil'
import styled from 'styled-components'

import { StoryContainer, StoryMetadata } from '../../data/story/storycontainer'
import { GlobalUserContext } from '../../globals/globals'
import { RemeteSaveFailed, StoryUpdate } from '../../globals/state'
import { DeleteInfo } from '../../styles/components/infobar'
import { Button } from '../../styles/ui/button'
import { ExportButton } from '../sidebars/infobar/items/storyexporter'
import Modal, { ModalType } from './modal'

const Buttons = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    gap: 10px;
`
const FailedSaveModalContent = styled.div`
    display: flex;
    max-width: 500px;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    button {
        display: flex;
        justify-content: space-around;
        width: 100px;
    }
`

export default function RemoteStorageErrorModal(): JSX.Element {
    const [remoteSaveFailed, setRemoteSaveFailed] = useRecoilState(RemeteSaveFailed)

    const updateStory = useRecoilCallback(({ set }) => async (story: StoryMetadata) => {
        set(StoryUpdate(story.id), story.save())
    })

    return (
        <Modal
            label="Story Too Large for Remote Storage"
            type={ModalType.Compact}
            isOpen={remoteSaveFailed !== ''}
            onRequestClose={() => setRemoteSaveFailed('')}
            showClose={false}
        >
            <FailedSaveModalContent>
                <DeleteInfo>
                    {`The story "${GlobalUserContext.stories.get(remoteSaveFailed)?.title}" failed to save
        because it's too large to be saved remotely. The story will be set to local storage.`}
                </DeleteInfo>
                <Buttons>
                    <ExportButton
                        story={StoryContainer.bundle(
                            GlobalUserContext.stories.get(remoteSaveFailed),
                            GlobalUserContext.storyContentCache.get(remoteSaveFailed)
                        )}
                    ></ExportButton>
                    <Button
                        onClick={async () => {
                            const story = GlobalUserContext.stories.get(remoteSaveFailed)
                            if (!story) {
                                return
                            }
                            story.remote = false
                            await updateStory(story)
                            setRemoteSaveFailed('')
                        }}
                    >
                        <span>OK</span>
                    </Button>
                </Buttons>
            </FailedSaveModalContent>
        </Modal>
    )
}
