import { DataOrigin } from '../../components/editor/glue'
import { logDebug } from '../../util/browser'
import { DataBlock, DataOrigin as StoryDataOrigin, Story } from '../story/story'
import { Change, Document } from './document'
import { Section, SectionId, SectionType, SectionTypeText, SectionTypeTextMeta } from './section'
import { uniqueid } from './util'

export const mapStoryOriginToDocOrigin = (origin: StoryDataOrigin): DataOrigin => {
    switch (origin) {
        case StoryDataOrigin.user:
            return DataOrigin.user
        case StoryDataOrigin.prompt:
            return DataOrigin.prompt
        case StoryDataOrigin.ai:
            return DataOrigin.ai
        case StoryDataOrigin.edit:
            return DataOrigin.edit
        case StoryDataOrigin.root:
            return DataOrigin.root
        case StoryDataOrigin.unknown:
            return DataOrigin.unknown
        case StoryDataOrigin.flattened:
            return DataOrigin.flattened
        default:
            return DataOrigin.unknown
    }
}

const canCombineMeta = (a: SectionTypeTextMeta, b: SectionTypeTextMeta) => {
    // only meta of the same type can combine
    if (a.data !== b.data) {
        return false
    }
    // meta must intersect, check if b.position is within a.position and a.position + a.length
    if (b.position >= a.position && b.position <= a.position + a.length) {
        return true
    }
    return false
}

const combineMeta = (a: SectionTypeTextMeta, b: SectionTypeTextMeta) => {
    return {
        data: a.data,
        position: Math.min(a.position, b.position),
        length: Math.max(a.position + a.length, b.position + b.length) - Math.min(a.position, b.position),
    }
}

export const consolidateMeta = (meta: SectionTypeTextMeta[]): SectionTypeTextMeta[] => {
    const consolidated: SectionTypeTextMeta[] = []
    for (const m of meta) {
        if (consolidated.length === 0) {
            consolidated.push(m)
        } else {
            const last = consolidated[consolidated.length - 1]
            if (canCombineMeta(last, m)) {
                consolidated[consolidated.length - 1] = combineMeta(last, m)
            } else {
                consolidated.push(m)
            }
        }
    }
    return consolidated.filter((m) => m.length > 0)
}

export function convertStoryToDocument(story: Story): Document {
    const document = new Document()
    const rootBlock = story.datablocks[0]

    const canonicalPath = new Set<DataBlock>()

    let currentBlock = story.currentBlock
    while (currentBlock) {
        const block = story.datablocks[currentBlock]
        canonicalPath.add(block)
        currentBlock = block.prevBlock
    }
    canonicalPath.add(rootBlock)

    // Depth-first traversal of the story tree
    const traversed = new Set<DataBlock>()
    let block = rootBlock
    while (block !== undefined) {
        if (!block) throw 'block is null'

        if (!traversed.has(block)) {
            const changes = []

            // Handle changed blocks. Chained blocks should be combined into the same history step.
            while (block.chain && block?.nextBlock.length === 1 && block?.nextBlock[0]) {
                changes.push({
                    start: block.startIndex,
                    end: block.endIndex,
                    text: block.dataFragment.data,
                    origin: block.dataFragment.origin,
                })
                traversed.add(block)
                block = story.datablocks[block.nextBlock[0]]
            }
            changes.push({
                start: block.startIndex,
                end: block.endIndex,
                text: block.dataFragment.data,
                origin: block.dataFragment.origin,
            })

            for (const change of changes) {
                const changeMap = new Map<SectionId, Change<Section>>()

                // Find the section that this change starts and ends in
                const start = document.getSectionForCharacterPosition(change.start)
                // Handle a case where on some older stories endIndex for blocks appended to the
                // end of the story incorrectly are equal to start+length, rather than equal to start
                const maximumEnd = document.withPushedHistory().getText().length
                const end = document.getSectionForCharacterPosition(Math.min(change.end, maximumEnd))
                if (start.section === undefined) {
                    // This should happen on the first change, when the sections array is empty

                    document.appendText(
                        change.text,
                        new Map([[1, [mapStoryOriginToDocOrigin(change.origin)]]])
                    )
                    continue
                }

                // text added to the middle of the document
                if (start.section?.section.type !== SectionType.text) {
                    logDebug('Non-text section encountered when converting story at start:', start.section)
                    throw 'Non-text section encountered when converting story at start'
                }
                if (end.section?.section.type !== SectionType.text) {
                    logDebug('Non-text section encountered when converting story at end:', end.section)
                    throw 'Non-text section encountered when converting story at end'
                }

                const sections = document.withPushedHistory().getSections()
                // find sections to replace
                const startSectionIndex = sections.findIndex((s) => s.id === start.section?.id)
                const endSectionIndex = sections.findIndex((s) => s.id === end.section?.id)
                const text =
                    start.section?.section.text.slice(0, start.offset) +
                    change.text +
                    end.section?.section.text.slice(end.offset)
                // handle same start and end section

                const split = text.split('\n')
                // first section updates text
                // update start section with new text
                const firstSectionStartText = change.text.split('\n')[0]
                const lastSectionNewText = change.text.split('\n').slice(-1)[0]
                const lastSectionRemainingText = end.section?.section.text.slice(end.offset)
                const lastSectionRemainingTextStartIndex =
                    text.split('\n').slice(-1)[0].length - lastSectionRemainingText.length
                const startMetaPieces = (start.section.section.meta.get(1) ?? [])
                    .filter((m) => m.position < start.offset)
                    .map((m) => {
                        return {
                            position: m.position,
                            // prevent length from going past offset
                            length: Math.abs(m.position - start.offset),
                            data: m.data,
                        }
                    })
                const endMetaPieces = (end.section.section.meta.get(1) ?? [])
                    .filter((m) => m.position + m.length > end.offset)
                    .map((m) => {
                        return {
                            // move position forward to account for new text
                            position: lastSectionRemainingTextStartIndex,
                            length: m.length + (m.position - end.offset),
                            data: m.data,
                        }
                    })
                // if length is 0 a newline was added to the end, changing section is not needed
                const startMeta = new Map([
                    [
                        1,
                        consolidateMeta([
                            ...(startMetaPieces.length > 0 ? startMetaPieces : []),
                            {
                                position: start.offset,
                                length: firstSectionStartText.length,
                                data: mapStoryOriginToDocOrigin(change.origin),
                            },
                            ...(split.length > 1 ? [] : endMetaPieces),
                        ]),
                    ],
                ])
                const newStartSection: Change<SectionTypeText> = {
                    changedSection: {
                        type: SectionType.text,
                        text: split[0],
                        meta: startMeta,
                    },
                }
                changeMap.set(start.section?.id, newStartSection)

                // remove sections between start and end
                for (let i = startSectionIndex + 1; i < endSectionIndex; i++) {
                    changeMap.set(sections[i].id, {
                        changedSection: undefined,
                    })
                }
                // remove end section if it's not the same as start
                if (startSectionIndex !== endSectionIndex) {
                    changeMap.set(end.section?.id, { changedSection: undefined })
                }

                // for the rest of the lines, add new sections
                let lastId = start.section?.id
                for (let i = 1; i < split.length; i++) {
                    const newSection: Change<SectionTypeText> = {
                        changedSection: {
                            type: SectionType.text,
                            text: split[i],
                            meta:
                                lastSectionNewText && i === split.length - 1
                                    ? new Map([
                                          [
                                              1,

                                              consolidateMeta([
                                                  ...endMetaPieces,
                                                  {
                                                      position: 0,
                                                      length: lastSectionNewText.length,
                                                      data: mapStoryOriginToDocOrigin(change.origin),
                                                  },
                                              ]),
                                          ],
                                      ])
                                    : new Map([
                                          [
                                              1,
                                              consolidateMeta([
                                                  {
                                                      position: 0,
                                                      length: split[i].length,
                                                      data: mapStoryOriginToDocOrigin(change.origin),
                                                  },
                                              ]),
                                          ],
                                      ]),
                        },
                        after: lastId,
                    }
                    const id = uniqueid()
                    lastId = id
                    changeMap.set(id, newSection)
                }
                document.pushChange(changeMap)
            }
            document.pushHistory()

            traversed.add(block)
        }
        // handle next block

        // find the next block
        const next = block.nextBlock
            .filter((b) => !traversed.has(story.datablocks[b]))
            .sort((a, b) => {
                // ones in the canonical path should be last
                if (story.datablocks[b]) return 1
                return 0
            })
        // if there are no more blocks
        if (next.length === 0) {
            // if this is the end of the canonical path, we're done
            if (canonicalPath.has(block)) {
                break
            }
            // otherwise, go up the tree
            block = story.datablocks[block.prevBlock]
            while (block.chain) {
                block = story.datablocks[block.prevBlock]
            }
            document.popHistory()
        } else {
            block = story.datablocks[next[0]]
        }
    }
    return document
}
