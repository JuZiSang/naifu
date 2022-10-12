import { useCallback, useEffect, useState } from 'react'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import styled, { css } from 'styled-components'
import { StoryMetadata } from '../../data/story/storycontainer'
import { getUserSetting } from '../../data/user/settings'
import { GlobalUserContext } from '../../globals/globals'
import { SelectedStory, Session, StoryUpdate } from '../../globals/state'
import { useDebounce } from '../../hooks/useDebounce'
import { useWindowSize } from '../../hooks/useWindowSize'
import RandomStoryNameButton from '../randomstorynamebutton'

const ConversationTitleComponent = styled.div`
    display: flex;
    flex-direction: column;
    padding: 2px 0 5px 0;
`
const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    > :first-child {
        display: flex;
        width: 100%;
        height: 30px;
    }
    margin-bottom: 5px;
`
const TitleInput = styled.input<{ expanded: boolean }>`
    width: 100%;
    padding: 8px 0 7px 15px;
    background: ${(props) => (props.expanded ? props.theme.colors.bg1 : props.theme.colors.bg2)};
    ${(props) =>
        props.expanded
            ? ''
            : `&:focus {
        background: ${props.theme.colors.bg1};
    }`}
    border: 1px solid ${(props) => (props.expanded ? props.theme.colors.bg3 : props.theme.colors.bg2)};
    font-family: ${(props) => props.theme.fonts.headings};
    color: ${(props) => props.theme.colors.textMain};
    padding-bottom: 0;
    padding-top: 6px;
    height: 40px;
    &:focus {
        color: ${(props) => props.theme.colors.textHeadings};
    }
    ${(props) =>
        props.expanded
            ? css`
                  color: ${(props) => props.theme.colors.textHeadings};
              `
            : css`
                  &:focus {
                      border: 1px solid ${props.theme.colors.bg3};
                  }
              `}
    font-size: 1.375rem;
    line-height: 1.813rem;
    font-weight: 600;
`

export default function ConversationTitle(props: {
    menuVisible: boolean
    infoVisible: boolean
    visible: boolean
}): JSX.Element {
    const selectedStory = useRecoilValue(SelectedStory)
    const currentStory = GlobalUserContext.stories.get(selectedStory.id)
    const updateStory = useRecoilCallback(({ set }) => (metadata: StoryMetadata) => {
        set(StoryUpdate(metadata.id), metadata.save())
    })
    const session = useRecoilValue(Session)
    const [leftSpace, setLeftSpace] = useState(false)
    const [rightSpace, setRightSpace] = useState(false)
    const window = useWindowSize()
    const containerRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (node !== null) {
                const rect = node.getBoundingClientRect()
                setRightSpace(window.width < 1200 || (!props.infoVisible && window.width - rect.right < 80))
                setLeftSpace(window.width < 1200 || (!props.menuVisible && rect.left < 80))
            }
        },
        [props.infoVisible, props.menuVisible, window.width]
    )
    const [titleInput, setTitleInput, updateTitleInput] = useDebounce(
        currentStory?.title ?? '',
        (s: string) => {
            if (currentStory) {
                currentStory.title = s
                updateStory(currentStory)
            }
        }
    )

    useEffect(() => {
        setTitleInput(currentStory?.title ?? '')
    }, [currentStory?.title, setTitleInput])

    return (
        <ConversationTitleComponent
            className={'conversation-title'}
            ref={containerRef}
            style={{
                paddingBottom: getUserSetting(session.settings, 'showStoryTitle') ? '15px' : '5px',
                visibility: props.visible ? 'visible' : 'hidden',
            }}
        >
            {getUserSetting(session.settings, 'showStoryTitle') && window.width > 500 ? (
                <TitleContainer>
                    <div>
                        {leftSpace ? <div style={{ width: '70px' }} /> : <></>}

                        <TitleInput
                            expanded={false}
                            type="text"
                            aria-label="Story Title"
                            value={titleInput}
                            onChange={(e) => updateTitleInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const element = document.querySelector('.ProseMirror') as HTMLDivElement
                                    if (element) {
                                        element.focus()
                                    }
                                    e.preventDefault()
                                    e.stopPropagation()
                                }
                            }}
                        />
                        <RandomStoryNameButton />
                        {rightSpace ? <div style={{ width: '90px' }} /> : <></>}
                    </div>
                </TitleContainer>
            ) : (
                (leftSpace || rightSpace) && <div style={{ height: '40px' }} />
            )}
        </ConversationTitleComponent>
    )
}
