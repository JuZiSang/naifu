import { Fragment, Slice } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { Transform } from 'prosemirror-transform'

import { textSchema } from './schema'

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
                ? textSchema.nodes.paragraph.create()
                : textSchema.nodes.paragraph.create(null, textSchema.text(element))
        if (index === 0) {
            tr.replaceWith(0, tr.doc.content.size, node)
        } else {
            tr.insert(tr.doc.content.size, node)
        }
    }
    return tr
}
export const handlePasteText = (text: string) => {
    const editor = EditorState.create({ schema: textSchema })
    const tr = editor.tr
    fromPlainText(text, tr)
    return new Slice(tr.doc.content, 0, 0)
}

export const transformHTML = (html: string) => {
    if (!/^<html>\s*<body>\s*<!--StartFragment--></.test(html)) {
        html = html.replace(/^<html>\s*<body>\s*<!--StartFragment-->/, '<html><body><!--StartFragment--><p>')
        html = html.replace(
            /<!--EndFragment-->\s*<\/body>\s*<\/html>$/,
            '</p><!--StartFragment--></body></html>'
        )
    }
    return html.replace(/<br[^>]*>/g, '\n')
}
