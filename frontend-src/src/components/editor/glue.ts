import { Mark, Node } from 'prosemirror-model'

import { Section, SectionId, SectionType, SectionTypeTextMeta } from '../../data/document/section'
import { schema } from './schema'

export enum DataOrigin {
    root = 0,
    user = 1,
    ai = 2,
    edit = 3,
    prompt = 10,
    flattened = 20,
    unknown = 100,
}

export enum TextFormatting {
    bold = 1,
    italic = 2,
    underline = 3,
    strikethrough = 4,
}

export const SectionMetaOrigin = 1
export const SectionMetaFormatting = 2

export const originToMark = (origin: DataOrigin): Mark | undefined => {
    switch (origin) {
        case DataOrigin.user:
            return schema.mark(schema.marks.user_text)
        case DataOrigin.ai:
            return schema.mark(schema.marks.ai_text)
        case DataOrigin.edit:
            return schema.mark(schema.marks.edit_text)
        case DataOrigin.prompt:
            return schema.mark(schema.marks.prompt_text)
    }
    return
}

export const formattingToMark = (origin: TextFormatting): Mark | undefined => {
    switch (origin) {
        case TextFormatting.bold:
            return schema.mark(schema.marks.bold)
        case TextFormatting.italic:
            return schema.mark(schema.marks.italic)
        case TextFormatting.underline:
            return schema.mark(schema.marks.underline)
        case TextFormatting.strikethrough:
            return schema.mark(schema.marks.strikethrough)
    }
}

export const markToOrigin = (mark: Mark): DataOrigin | undefined => {
    switch (mark.type.name) {
        case schema.marks.user_text.name:
            return DataOrigin.user
        case schema.marks.ai_text.name:
            return DataOrigin.ai
        case schema.marks.edit_text.name:
            return DataOrigin.edit
        case schema.marks.prompt_text.name:
            return DataOrigin.prompt
    }
    return
}

export const markToFormatting = (mark: Mark): TextFormatting | undefined => {
    switch (mark.type.name) {
        case schema.marks.bold.name:
            return TextFormatting.bold
        case schema.marks.italic.name:
            return TextFormatting.italic
        case schema.marks.underline.name:
            return TextFormatting.underline
        case schema.marks.strikethrough.name:
            return TextFormatting.strikethrough
    }
    return
}

export const nodeToSection = (id: SectionId, node: Node): Section => {
    const metaOrigin = [] as SectionTypeTextMeta[]
    const metaFormatting = [] as SectionTypeTextMeta[]
    node.descendants((node, pos) => {
        if (node.content.size === 0 && (node.text?.length ?? 0) === 0) return false
        for (const mark of node.marks) {
            const origin = markToOrigin(mark)
            if (origin) {
                const lastMeta = metaOrigin[metaOrigin.length - 1]
                if (lastMeta && lastMeta.data === origin && pos === lastMeta.position + lastMeta.length) {
                    // merge metas if they are adjacent and of the same data
                    // eslint-disable-next-line unicorn/explicit-length-check
                    lastMeta.length += node.content.size || node.text?.length || 0
                } else {
                    metaOrigin.push({
                        position: pos,
                        data: origin,
                        // eslint-disable-next-line unicorn/explicit-length-check
                        length: node.content.size || node.text?.length || 0,
                    })
                }
            }
            const formatting = markToFormatting(mark)
            if (formatting) {
                const lastMeta = metaFormatting[metaFormatting.length - 1]
                if (lastMeta && lastMeta.data === origin && pos === lastMeta.position + lastMeta.length) {
                    // merge metas if they are adjacent and of the same data
                    // eslint-disable-next-line unicorn/explicit-length-check
                    lastMeta.length += node.content.size || node.text?.length || 0
                } else {
                    metaFormatting.push({
                        position: pos,
                        data: formatting,
                        // eslint-disable-next-line unicorn/explicit-length-check
                        length: node.content.size || node.text?.length || 0,
                    })
                }
            }
        }
        return true
    })
    return {
        type: SectionType.text,
        text: node.content.size > 0 ? node.content.textBetween(0, node.content.size) : '',
        meta: new Map([
            [SectionMetaOrigin, metaOrigin],
            [SectionMetaFormatting, metaFormatting],
        ]),
    }
}
