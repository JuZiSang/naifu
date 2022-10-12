import { useRef, useState } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { getStorage } from '../../data/storage/storage'
import { StoryId } from '../../data/story/storycontainer'
import { GlobalUserContext } from '../../globals/globals'
import { SelectedShelf, Session, StoryShelves } from '../../globals/state'
import { Button } from '../../styles/ui/button'
import { PenWritingIcon } from '../../styles/ui/icons'
import { FlexColSpacer, FlexRow } from '../../styles/ui/layout'
import WarningButton, { WarningButtonStyle } from '../deletebutton'
import { CloseButton } from './common'
import Modal, { ModalType } from './modal'

const MetadataModal = styled.div`
    background: ${(props) => props.theme.colors.bg2};
    max-width: 100vw;
    width: 590px;
    padding: 30px;
    textarea {
        height: 145px;
    }
`

const Title = styled.h4`
    font-size: 1.125rem;
`

const SectionTitle = styled.div`
    font-size: 1rem;
    padding-top: 20px;
    font-family: ${(props) => props.theme.fonts.headings};
    padding-bottom: 5px;
`

export function ShelfMetadataModal(props: {
    id: StoryId
    visible: boolean
    setVisible: (visible: boolean) => void
}): JSX.Element {
    const currentShelf = GlobalUserContext.shelves.get(props.id)
    const session = useRecoilValue(Session)

    const oldTitle = useRef(currentShelf?.title ?? '')
    const oldDescription = useRef(currentShelf?.description ?? '')

    const [titleInput, setTitleInput] = useState(currentShelf?.title ?? '')
    const [descriptionInput, setDescriptionInput] = useState(currentShelf?.description ?? '')

    const updateShelf = useRecoilCallback(({ set }) => () => {
        if (oldTitle.current === titleInput && oldDescription.current === descriptionInput) {
            return
        }
        set(StoryShelves, (shelves) => [...shelves])
        if (currentShelf) {
            getStorage(session).saveStoryShelf(currentShelf)
        }
    })

    const deleteShelf = useRecoilCallback(({ set }) => () => {
        if (currentShelf) getStorage(session).deleteStoryShelf(currentShelf)
        set(StoryShelves, (shelves) => [...shelves].filter((shelf) => shelf !== props.id))
        set(SelectedShelf, '')
        props.setVisible(false)
    })

    return (
        <>
            <Modal
                onRequestClose={() => {
                    updateShelf()
                    props.setVisible(false)
                }}
                isOpen={props.visible}
                shouldCloseOnOverlayClick={true}
                type={ModalType.Large}
                icon={false}
            >
                <MetadataModal onClick={(e) => e.stopPropagation()}>
                    <CloseButton
                        onClick={(e) => {
                            e.stopPropagation()
                            updateShelf()
                            props.setVisible(false)
                        }}
                    >
                        <div />
                    </CloseButton>
                    <Title>Shelf Settings</Title>
                    <SectionTitle>Shelf Title</SectionTitle>
                    <input
                        type="text"
                        aria-label="Shelf Title"
                        value={titleInput}
                        onChange={(e) => {
                            e.stopPropagation()
                            setTitleInput(e.target.value)
                            if (currentShelf) {
                                currentShelf.title = e.target.value
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && titleInput !== '') {
                                updateShelf()
                                props.setVisible(false)
                            }
                        }}
                    />
                    <SectionTitle>Description</SectionTitle>
                    <textarea
                        value={descriptionInput}
                        onChange={(e) => {
                            e.stopPropagation()
                            setDescriptionInput(e.target.value)
                            if (currentShelf) {
                                currentShelf.description = e.target.value
                            }
                        }}
                    />
                    <FlexColSpacer min={30} max={30} />
                    <FlexRow style={{ justifyContent: 'right', gap: '15px' }}>
                        <div style={{ flex: '1 1 100%' }} />
                        <WarningButton
                            onConfirm={() => deleteShelf()}
                            buttonType={WarningButtonStyle.Danger}
                            warningColors
                            warningText={
                                <>
                                    Are you sure you want to delete {'"'}
                                    {currentShelf?.title}
                                    {'"'}?<br /> The contained stories will be moved out of it.
                                </>
                            }
                            confirmButtonText="Delete it!"
                            buttonText="Delete Shelf"
                            label="Delete Shelf?"
                            style={{ flex: '0 1 auto' }}
                        />
                    </FlexRow>
                </MetadataModal>
            </Modal>
        </>
    )
}

export default function ShelfMetadataModalButton(props: { id: StoryId }): JSX.Element {
    const [modalVisible, setModalVisible] = useState(false)
    return (
        <>
            <Button
                aria-label={'Edit Shelf Information'}
                onClick={(e) => {
                    e.stopPropagation()
                    setModalVisible(true)
                }}
            >
                <PenWritingIcon />
            </Button>
            <ShelfMetadataModal id={props.id} visible={modalVisible} setVisible={setModalVisible} />
        </>
    )
}
