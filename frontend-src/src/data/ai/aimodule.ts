import { createModelSchema, primitive, optional, list, serialize } from 'serializr'
import { StoryMode } from '../story/story'

export class AIModuleExport {
    moduleVersion: number = 1
    data: string = ''
    name: string = ''
    description: string = ''
    model: string = ''
    steps?: number
    loss?: number
    lossHistory?: number[]
    mode?: StoryMode = StoryMode.normal
    image?: string

    serialize(pretty: boolean = false): string {
        return JSON.stringify(serialize(AIModuleExport, this), undefined, pretty ? '  ' : undefined)
    }
}

createModelSchema(AIModuleExport, {
    moduleVersion: primitive(),
    data: primitive(),
    name: primitive(),
    description: primitive(),
    model: primitive(),
    steps: optional(primitive()),
    loss: optional(primitive()),
    lossHistory: optional(list(primitive())),
    mode: optional(primitive()),
    image: optional(primitive()),
})
