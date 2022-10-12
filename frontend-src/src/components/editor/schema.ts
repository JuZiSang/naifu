import { Schema, NodeSpec, MarkSpec } from 'prosemirror-model'
import { UniqueId } from '../../data/document/util'

export const nodes: { [name: string]: NodeSpec } = {
    doc: { content: 'block+' },
    paragraph: {
        group: 'block',
        content: 'text*',
        attrs: {
            id: { default: null as null | UniqueId },
        },
        parseDOM: [
            { tag: 'p', preserveWhitespace: 'full' },
            { tag: 'code', preserveWhitespace: 'full' },
            { tag: 'div', preserveWhitespace: 'full' },
        ],
        toDOM(node) {
            return ['p', { class: 'paragraph', id: node.attrs.id }, 0]
        },
    },
    text: {
        group: 'inline',
        marks: '_',
    },
}

export const marks: { [name: string]: MarkSpec } = {
    highlight: {
        inclusive: false,
        toDOM() {
            return ['span', { class: 'highlight' }, 0]
        },
        parseDOM: [{ tag: 'span.highlight' }],
    },
    link: {
        inclusive: false,
        toDOM() {
            return ['span', { class: 'link' }, 0]
        },
        parseDOM: [{ tag: 'span.link' }],
    },
    user_text: {
        inclusive: true,
        excludes: 'user_text ai_text edit_text prompt_text',
        toDOM() {
            return ['span', { class: 'userText' }, 0]
        },
        parseDOM: [{ tag: 'span.userText' }],
    },
    ai_text: {
        inclusive: false,
        excludes: 'user_text ai_text edit_text prompt_text',
        toDOM() {
            return ['span', { class: 'aiText' }, 0]
        },
        parseDOM: [{ tag: 'span.aiText' }],
    },
    edit_text: {
        inclusive: true,
        excludes: 'user_text ai_text edit_text prompt_text',
        toDOM() {
            return ['span', { class: 'editText' }, 0]
        },
        parseDOM: [{ tag: 'span.editText' }],
    },
    prompt_text: {
        inclusive: true,
        excludes: 'user_text ai_text edit_text prompt_text',
        toDOM() {
            return ['span', { class: 'promptText' }, 0]
        },
        parseDOM: [{ tag: 'span.promptText' }],
    },
    bold: {
        inclusive: true,
        excludes: '',
        toDOM() {
            return ['span', { class: 'bold' }, 0]
        },
        parseDOM: [{ tag: 'span.bold' }],
    },
    italic: {
        inclusive: true,
        excludes: '',
        toDOM() {
            return ['span', { class: 'italic' }, 0]
        },
        parseDOM: [{ tag: 'span.italic' }],
    },
    underline: {
        inclusive: true,
        excludes: 'strikethrough',
        toDOM() {
            return ['span', { class: 'underline' }, 0]
        },
        parseDOM: [{ tag: 'span.underline' }],
    },
    strikethrough: {
        inclusive: true,
        excludes: 'underline',
        toDOM() {
            return ['span', { class: 'strikethrough' }, 0]
        },
        parseDOM: [{ tag: 'span.strikethrough' }],
    },
}

export const schema: Schema = new Schema({
    nodes,
    marks,
    topNode: 'doc',
})
