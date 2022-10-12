import { createModelSchema, date, list, optional, primitive } from 'serializr'

export class UpdateNote {
    date: Date = new Date()
    title: string = ''
    subtitle?: string
    message: Array<string> = []
    expandedMessage?: Array<string>
    image?: string = ''
    background?: number
}

createModelSchema(UpdateNote, {
    date: date(),
    title: primitive(),
    subtitle: optional(primitive()),
    message: list(primitive()),
    expandedMessage: optional(list(primitive())),
    image: optional(primitive()),
    background: optional(primitive()),
})
