import { Schema, Node } from 'prosemirror-model'
import { PlatformSvgData } from '../../compatibility/platformtypes'

export interface SchemaNode {
    name: string
    icon: PlatformSvgData
    regex?: RegExp
}

export class AdventureNode implements AdventureNode {
    name: string
    icon: PlatformSvgData
    regex?: RegExp

    constructor(name: string, icon: PlatformSvgData, regex?: RegExp) {
        this.name = name
        this.icon = icon
        this.regex = regex
    }
}

export interface SchemaNodes {
    adventure: AdventureNode[]
}

export const activeNodes: SchemaNodes = { adventure: [] }

export const textSchema: Schema = new Schema({
    nodes: {
        text: {
            group: 'inline',
        },
        paragraph: {
            group: 'block',
            content: 'inline*',
            parseDOM: [
                { tag: 'p', preserveWhitespace: 'full' },
                { tag: 'code', preserveWhitespace: 'full' },
                { tag: 'div', preserveWhitespace: 'full' },
            ],
            toDOM() {
                return ['p', 0]
            },
        },

        adventureInput: {
            attrs: { name: { default: '' } },
            group: 'block',
            content: 'inline*',
            parseDOM: [
                {
                    tag: 'p.adventureInput',
                    preserveWhitespace: 'full',
                    priority: 60,
                },
            ],
            toDOM(node: Node) {
                return ['p', { class: 'adventureInput ' + node.attrs.name }, 0]
            },
        },

        adventureStory: {
            group: 'block',
            content: 'inline*',
            parseDOM: [{ tag: 'p.adventureStory', preserveWhitespace: 'full', priority: 60 }],
            toDOM() {
                return ['p', { class: 'adventureStory' }, 0]
            },
        },

        adventureStoryEnd: {
            group: 'block',
            content: 'inline*',
            parseDOM: [
                { tag: 'p.adventureStoryEnd.adventureStory', preserveWhitespace: 'full', priority: 80 },
            ],
            toDOM() {
                return ['p', { class: 'adventureStoryEnd adventureStory' }, 0]
            },
        },
        doc: { content: 'block+' },
    },
    marks: {
        ai_text: {
            toDOM() {
                return ['span', { class: 'aiText' }, 0]
            },
            parseDOM: [{ tag: 'span.aiText' }],
        },
        user_text: {
            toDOM() {
                return ['span', { class: 'userText' }, 0]
            },
            parseDOM: [{ tag: 'span.userText' }],
        },
        edit_text: {
            toDOM() {
                return ['span', { class: 'editText' }, 0]
            },
            parseDOM: [{ tag: 'span.editText' }],
        },
        prompt_text: {
            toDOM() {
                return ['span', { class: 'promptText' }, 0]
            },
            parseDOM: [{ tag: 'span.promptText' }],
        },
        retry_deletion_text: {
            toDOM() {
                return ['span', { class: 'retryDeletionText' }, 0]
            },
            parseDOM: [{ tag: 'span.retryDeletionText' }],
        },
        undo_deletion_text: {
            toDOM() {
                return ['span', { class: 'undoDeletionText' }, 0]
            },
            parseDOM: [{ tag: 'span.undoDeletionText' }],
        },
        unknown_text: {
            toDOM() {
                return ['span', { class: 'unknownText' }, 0]
            },
            parseDOM: [{ tag: 'span.unknownText' }],
        },
    },
})
