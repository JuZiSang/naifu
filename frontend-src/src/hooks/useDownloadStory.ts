import { useRecoilValue } from 'recoil'
import { deserialize, serialize } from 'serializr'
import { StoryContainer } from '../data/story/storycontainer'
import { AIModule } from '../data/story/storysettings'
import { GlobalUserContext } from '../globals/globals'
import { CustomModules } from '../globals/state'
import { downloadTextFile } from '../util/browser'

export default function useDownloadStoryJson(id: string): () => void {
    const customModules = useRecoilValue(CustomModules)

    const downloadStoryJson = (): void => {
        const meta = GlobalUserContext.stories.get(id)
        const story = GlobalUserContext.storyContentCache.get(id)
        let container = StoryContainer.bundle(meta, story)
        const serialized = container.serialize()
        container = StoryContainer.deserialize(serialized)
        container.metadata.remoteId = undefined
        container.metadata.remoteStoryId = undefined
        if (container.content.settings.prefix && container.content.settings.prefix.includes(':')) {
            let aiModule = customModules.find((e: AIModule) => e.id === container.content.settings.prefix)
            if (aiModule) {
                aiModule = deserialize(AIModule, serialize(AIModule, aiModule) as AIModule)
                aiModule.remoteId = ''
                container.content.settings.aiModule = aiModule
                container.content.settings.aiModule.remoteId = ''
            }
        }
        downloadTextFile(
            container.serialize(true),
            `${container.metadata.title.slice(0, 40)} (${new Date().toISOString()}).story`
        )
    }

    return downloadStoryJson
}
