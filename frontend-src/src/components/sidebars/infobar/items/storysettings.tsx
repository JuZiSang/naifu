import { useSetRecoilState } from 'recoil'
import { useEffect, useState } from 'react'
import { StoryUpdate } from '../../../../globals/state'

import { GlobalUserContext } from '../../../../globals/globals'
import { SetterPackage, updateStory } from '../../../../component-logic/optionslogic'
import Checkbox from '../../../controls/checkbox'
import { AccountRequired } from '../../../util/accountrequired'

export default function StorySettings(props: { selectedStory: string }): JSX.Element {
    const currentStory = GlobalUserContext.stories.get(props.selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(props.selectedStory)

    const [remote, setRemote] = useState(currentStory?.remote ?? false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setRemote(currentStory?.remote ?? false), [props.selectedStory])

    const setterPackage: SetterPackage = {
        currentStory: currentStory,
        currentStoryContent: currentStoryContent,
        genSettings: currentStoryContent?.settings?.parameters,
        updateState: useSetRecoilState(StoryUpdate('')),
    }

    return (
        <>
            <AccountRequired>
                <Checkbox
                    label={'Remote Storage'}
                    alternate={true}
                    value={remote}
                    setValue={(value) => {
                        if (currentStory) {
                            setRemote(value)
                            updateStory(() => (currentStory.remote = value), setterPackage)
                        }
                    }}
                    checkedText={`Story is currently stored encrypted on the server.`}
                    uncheckedText={`Story is currently stored locally. Locally stored stories
                            may be deleted by your browser after a period of non-use.`}
                />
            </AccountRequired>
        </>
    )
}
