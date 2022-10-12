import { diff_match_patch as DiffMatchPatch, DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT } from 'diff-match-patch'
import { addExtension } from 'msgpackr'
import { clone, equals } from 'rambda'

import { UniqueId } from './util'

/**
 * Unique identifier of a section.
 */
export type SectionId = UniqueId

/**
 * Identifier of a section metadata type.
 */
export type MetaId = number

/**
 * Data type of the section.
 */
export const enum SectionType {
    empty = 0,
    text = 1,
    image = 2,
}

/**
 * Empty section.
 */
export interface SectionTypeEmpty {
    type: SectionType.empty
}

/**
 * Metadata of a text section.
 */
export interface SectionTypeTextMeta {
    position: number
    length: number
    data: number
}
/**
 * Text section with metadata.
 */
export interface SectionTypeText {
    type: SectionType.text
    text: string
    meta: Map<MetaId, Array<SectionTypeTextMeta>>
}
/**
 * Image section.
 */
export interface SectionTypeImage {
    type: SectionType.image
    image: never
}

/**
 * Unification of all types of sections.
 */
export type Section = SectionTypeEmpty | SectionTypeText | SectionTypeImage

/**
 * Create a list of sections from text.
 */
export const sectionsFromText = (text: string): SectionTypeText[] => {
    return text.split('\n').map((paragraph) => ({
        type: SectionType.text,
        text: paragraph,
        meta: new Map(),
    }))
}

/**
 * Clone a section.
 */
export const cloneSection = <T extends Section>(section: T): T => {
    const cloned = { ...section }
    if (cloned.type === SectionType.text) {
        cloned.meta = new Map()
        for (const [metaType, metas] of (section as SectionTypeText).meta.entries()) {
            cloned.meta.set(metaType, clone(metas))
        }
    }
    return cloned
}
/**
 * Check if two sections are equal.
 * @returns Boolean marking if sections are equal.
 */
export const sectionsEqual = <T extends Section>(left: T, right: T): boolean => {
    if (left.type !== right.type) return false
    if (left.type === SectionType.text && right.type === SectionType.text) {
        return (
            left.text === right.text &&
            left.meta.size === right.meta.size &&
            [...left.meta.keys()].every((key) => equals(left.meta.get(key), right.meta.get(key)))
        )
    }
    return false
}

/**
 * Handle containing section and section id.
 */
export interface SectionHandle {
    id: SectionId
    section: Section
}

/**
 * Replacement diff, the simplest type of diff.
 * Keeps snapshots of before and after states.
 */
export class SectionDiffReplace {
    from: Section
    to: Section
    constructor(from?: Section, to?: Section) {
        if (!from || !to) {
            // ignore null params during deserialization
            return
        }
        this.from = from
        this.to = to
    }
    apply() {
        return cloneSection(this.to)
    }
    undo() {
        return cloneSection(this.from)
    }
}

interface SectionDiffTextPart {
    from: number
    insert: string
    delete: string
}
interface SectionDiffTextMeta {
    index: number
    position: number
    length: number
    data: number
}
/**
 * Text-section specific diff.
 * Keeps a compact bidirectional diff of text and metadata.
 */
export class SectionDiffText {
    parts: Array<SectionDiffTextPart>
    metas: Map<MetaId, Array<SectionDiffTextMeta>>

    /**
     * Create a new diff from the difference between `from` and `to`.
     * @param from Text section to base the diff with `to` on.
     * @param to Text section to diff against `from`.
     * @returns Diff generated from the difference between `from` and `to`.
     */
    constructor(from?: Section, to?: Section) {
        if (!from || !to) {
            // ignore null params during deserialization
            return
        }
        if (from.type !== SectionType.text || to.type !== SectionType.text) {
            throw new Error('invalid type')
        }
        this.parts = []
        this.metas = new Map()
        // generate a diff of the text content
        const diff = new DiffMatchPatch()
        const diffs = diff.diff_main(from.text, to.text)
        diff.diff_cleanupEfficiency(diffs)
        if (diffs.length === 0) {
            return
        }
        for (const [i, diff] of diffs.entries()) {
            const prev = this.parts[this.parts.length - 1] ?? { from: 0, to: 0, delete: '', insert: '' }
            if (diff[0] === DIFF_EQUAL) {
                this.parts.push({
                    from: diffs[i][1].length,
                    insert: '',
                    delete: '',
                })
            }
            if (this.parts.length === 0) {
                this.parts.push(prev)
            }
            if (diff[0] === DIFF_DELETE) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                prev!.delete = diff[1]
            } else if (diff[0] === DIFF_INSERT) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                prev!.insert = diff[1]
            }
        }
        if (
            this.parts[this.parts.length - 1] &&
            !this.parts[this.parts.length - 1]?.insert &&
            !this.parts[this.parts.length - 1]?.delete
        ) {
            this.parts = this.parts.slice(0, -1)
        }
        // generate a diff of the meta arrays
        // stores only differing indexes by skipping equals
        // and avoids cascading diffs from length changes by taking offset into account
        const metaTypes = new Set([...from.meta.keys(), ...to.meta.keys()])
        for (const metaType of metaTypes) {
            const fromMetas = from.meta.get(metaType)
            const toMetas = to.meta.get(metaType)
            const metaLength = Math.max(fromMetas?.length ?? 0, toMetas?.length ?? 0)
            let offset = 0
            for (const index of Array.from({ length: metaLength }).keys()) {
                const fromMeta = fromMetas?.[index]
                const toMeta = toMetas?.[index]
                if (fromMeta && toMeta) {
                    // meta exists in both, store diff with offset
                    const diff = {
                        index,
                        position: toMeta.position - fromMeta.position - offset,
                        data: toMeta.data - fromMeta.data,
                        length: toMeta.length - fromMeta.length,
                    } as SectionDiffTextMeta
                    offset += diff.length
                    if (diff.position === 0 && diff.data === 0 && diff.length === 0) {
                        // skip diff if it is the empty diff
                        continue
                    }
                    this.metas.set(metaType, [...(this.metas.get(metaType) ?? []), diff])
                } else if (fromMeta) {
                    // meta exists in from but not in to, store removal diff
                    const diff = {
                        // removal diff is indicated by negative index -1
                        index: -index - 1,
                        position: fromMeta.position,
                        data: fromMeta.data,
                        length: fromMeta.length,
                    } as SectionDiffTextMeta
                    this.metas.set(metaType, [...(this.metas.get(metaType) ?? []), diff])
                } else if (toMeta) {
                    // meta exists in to but not in from, store raw diff
                    const diff = {
                        index,
                        position: toMeta.position,
                        data: toMeta.data,
                        length: toMeta.length,
                    } as SectionDiffTextMeta
                    this.metas.set(metaType, [...(this.metas.get(metaType) ?? []), diff])
                }
            }
        }
    }

    /**
     * Apply this diff onto section `on`.
     * @param on Text section to apply this diff on.
     * @returns New text section based on `on` with this diff applied.
     */
    apply(on: Section) {
        if (on.type !== SectionType.text) {
            throw new Error('invalid type')
        }
        if (!this.parts) return on
        const newSection = cloneSection(on)
        // apply text diff
        let text = newSection.text
        let from = 0
        for (const part of this.parts) {
            from = from + part.from
            // apply delete
            text = text.slice(0, from) + text.slice(from + part.delete.length)
            // apply insert
            text = text.slice(0, from) + part.insert + text.slice(from)
            from = from + part.insert.length
        }
        newSection.text = text
        // apply meta diff
        for (const [metaType, metas] of this.metas.entries()) {
            let newMetas = newSection.meta.get(metaType)
            if (!newMetas) {
                newSection.meta.set(metaType, clone(metas))
                continue
            }
            for (const metaDiff of metas) {
                const index = metaDiff.index
                if (index < 0) {
                    // negative index denotes removal, delete remaining and stop
                    newMetas = newMetas.slice(0, -index - 1)
                    break
                }
                if (!newMetas[index]) {
                    newMetas.push({
                        data: metaDiff.data,
                        length: metaDiff.length,
                        position: metaDiff.position,
                    })
                    continue
                }
                newMetas[index].data += metaDiff.data
                newMetas[index].length += metaDiff.length
                const offsetDiff = metaDiff.length
                newMetas[index].position += metaDiff.position
                for (const nextMeta of newMetas.slice(index + 1)) {
                    nextMeta.position += offsetDiff
                }
            }
            newSection.meta.set(
                metaType,
                // eslint-disable-next-line unicorn/explicit-length-check
                newMetas.filter((meta) => meta.length !== 0)
            )
        }
        return newSection
    }

    /**
     * Undo this diff on section `on`.
     * @param on Text section to undo this diff on.
     * @returns New text section based on `on` with this diff undone.
     */
    undo(on: Section) {
        if (on.type !== SectionType.text) {
            throw new Error('invalid type')
        }
        if (!this.parts) return on
        const newSection = cloneSection(on)
        // undo text diff
        let text = newSection.text
        let from = 0
        for (const part of this.parts) {
            from = from + part.from
            // undo insert
            text = text.slice(0, from) + text.slice(from + part.insert.length)
            // undo delete
            text = text.slice(0, from) + part.delete + text.slice(from)
            from = from + part.delete.length
        }
        newSection.text = text
        // unde meta diff
        for (const [metaType, metas] of this.metas.entries()) {
            const newMetas = newSection.meta.get(metaType)
            if (!newMetas) {
                throw new Error('unable to undo a meta diff on nonexistent meta ' + metaType)
            }
            for (const metaDiff of metas) {
                // negative index denotes removal, reverse and apply
                const index = metaDiff.index < 0 ? -metaDiff.index - 1 : metaDiff.index
                if (!newMetas[index]) {
                    newMetas.push({
                        data: metaDiff.data,
                        length: metaDiff.length,
                        position: metaDiff.position,
                    })
                    continue
                }
                newMetas[index].data -= metaDiff.data
                newMetas[index].length -= metaDiff.length
                const offsetDiff = metaDiff.length
                newMetas[index].position -= metaDiff.position
                for (const nextMeta of newMetas.slice(index + 1)) {
                    nextMeta.position -= offsetDiff
                }
            }
            newSection.meta.set(
                metaType,
                // eslint-disable-next-line unicorn/explicit-length-check
                newMetas.filter((meta) => meta.length !== 0)
            )
        }
        return newSection
    }
}

/**
 * Unification of all types of section diffs.
 */
export class SectionDiff {
    diff: SectionDiffReplace | SectionDiffText
    constructor(from?: Section, to?: Section) {
        if (!from || !to) {
            // ignore null params during deserialization
            return
        }
        this.diff =
            from.type === SectionType.text && to.type === SectionType.text
                ? new SectionDiffText(from, to)
                : new SectionDiffReplace(from, to)
    }
    apply(on: Section) {
        return this.diff.apply(on)
    }
    undo(on: Section) {
        return this.diff.undo(on)
    }
}

/**
 * Serialization
 */
addExtension({
    Class: SectionDiffReplace,
    type: 42,
    write(instance: SectionDiffReplace) {
        return {
            from: instance.from,
            to: instance.to,
        }
    },
    read(data) {
        return Object.assign(new SectionDiffReplace(), data)
    },
})
addExtension({
    Class: SectionDiffText,
    type: 41,
    write(instance: SectionDiffText) {
        return {
            parts: instance.parts,
            metas: instance.metas,
        }
    },
    read(data) {
        return Object.assign(new SectionDiffText(), data)
    },
})
addExtension({
    Class: SectionDiff,
    type: 40,
    write(instance: SectionDiff) {
        return instance.diff
    },
    read(data) {
        return Object.assign(new SectionDiff(), { diff: data })
    },
})
