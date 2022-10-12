import { Fragment, Slice } from 'prosemirror-model'
import { EditorState, Transaction } from 'prosemirror-state'
import { Step, Transform } from 'prosemirror-transform'

import { schema } from './schema'

export const toPlainText = (content: Fragment): string => {
    let text = ''

    for (let index = 0; index < content.childCount; index++) {
        const element = content.child(index)
        text += index + 1 !== content.childCount ? element.textContent + '\n' : element.textContent
    }
    return text.replace(/\r/g, '')
}
export const fromPlainText = (text: string, tr: Transform): Transform => {
    const lines = text.split(/\r?\n/)
    for (const [index, element] of lines.entries()) {
        const node =
            element === ''
                ? schema.nodes.paragraph.create()
                : schema.nodes.paragraph.create(null, schema.text(element))
        if (index === 0) {
            tr.replaceWith(0, tr.doc.content.size, node)
        } else {
            tr.insert(tr.doc.content.size, node)
        }
    }
    return tr
}
export const handlePasteText = (text: string): Slice => {
    const editor = EditorState.create({ schema: schema })
    const tr = editor.tr
    fromPlainText(text, tr)
    return new Slice(tr.doc.content, 0, 0)
}

export const transformHTML = (html: string): string => {
    if (!/^<html>\s*<body>\s*<!--StartFragment--></.test(html)) {
        html = html.replace(/^<html>\s*<body>\s*<!--StartFragment-->/, '<html><body><!--StartFragment--><p>')
        html = html.replace(
            /<!--EndFragment-->\s*<\/body>\s*<\/html>$/,
            '</p><!--StartFragment--></body></html>'
        )
    }
    return html.replace(/<br[^>]*>/g, '\n')
}

export const mergeTransactionSteps = (tr: Transaction, init: Array<Step> = []): Array<Step> =>
    tr.steps.reduce((prev, cur) => {
        if (prev.length === 0) return [cur]
        const last = prev.length - 1
        const mergedStep = prev[last].merge(cur)
        if (mergedStep) {
            prev[last] = mergedStep
            return prev
        } else {
            return [...prev, cur]
        }
    }, init)
