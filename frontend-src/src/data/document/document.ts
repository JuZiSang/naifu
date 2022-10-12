import { addExtension } from 'msgpackr'

import {
    ChangeMap,
    HistoryRoot,
    HistoryStateId,
    HistoryStep,
    HistoryStepCreate,
    HistoryStepRemove,
    HistoryStepType,
    HistoryStepUpdate,
    HistoryNode,
} from './history'
import {
    cloneSection,
    MetaId,
    Section,
    SectionDiff,
    SectionHandle,
    SectionId,
    sectionsEqual,
    sectionsFromText,
    SectionType,
    SectionTypeText,
} from './section'
import { documentToJsonReplacer, uniqueid } from './util'

/**
 * Map from section id to section.
 */
type SectionMap = Map<SectionId, Section>

export type Change<T extends Section> = { changedSection: T | undefined; after?: SectionId }

interface DocumentJson {
    sections: SectionMap
    order: Array<SectionId>
    history: HistoryRoot
    dirtySections: ChangeMap
    step: number
}

/**
 * Root datastructure of the document.
 */
export class Document {
    private sections: SectionMap
    private order: Array<SectionId>
    private history: HistoryRoot
    private dirtySections: ChangeMap
    private step: number

    constructor() {
        this.sections = new Map()
        this.order = []
        this.history = new HistoryRoot()
        this.dirtySections = new Map()
        this.step = 0
    }

    private addToOrder(sectionId: SectionId, after?: SectionId) {
        const afterIndex = after === undefined ? -1 : after === 0 ? 0 : this.order.indexOf(after) + 1
        this.order.splice(afterIndex === -1 ? this.order.length : afterIndex, 0, sectionId)
    }
    private removeFromOrder(sectionId: SectionId) {
        this.order = this.order.filter((id) => id !== sectionId)
    }

    /**
     * Get all sections in the current history state ordered by the section order.
     * @returns All active sections ordered by the section order.
     */
    getSections(): Array<SectionHandle> {
        return this.order
            .map((id) => ({ id, section: this.sections.get(id) }))
            .filter((section) => Boolean(section.section)) as Array<SectionHandle>
    }

    /**
     * Get a section in the current history state.
     * @param id Section id corresponding to the section.
     * @returns Section corresponding to `id`.
     */
    getSection(id: SectionId): Section | undefined {
        return this.sections.get(id)
    }

    /**
     * Get the sections that come before another section in the current history state ordered by the section order.
     * @param id Section id to search in the order.
     * @param count Maximum amount of sections to return.
     * @returns `count` active sections that come before `id` in the section order.
     */
    getSectionsBefore(id: SectionId, count: number): Array<SectionHandle> {
        const orderIndex = this.order.indexOf(id)
        if (!orderIndex) return [] as Array<SectionHandle>
        return this.order
            .slice(Math.max(0, orderIndex - count), orderIndex)
            .map((id) => ({ id, section: this.sections.get(id) }))
            .filter((section) => Boolean(section.section)) as Array<SectionHandle>
    }

    /**
     * Get the history state ids of all descendents of the current state in the history tree.
     * @returns List of history state ids of all descendents.
     */
    getDescendents(): Set<HistoryStateId> {
        return this.history.getCurrentNode().children
    }

    /**
     * Get the history node of a descendent.
     * @param id Descendent id corresponding to the history node.
     * @returns The history node of a descendent.
     */
    getDescendent(id?: HistoryStateId): HistoryNode | undefined {
        const descendent = id ?? this.getHistoryNode().route
        return descendent ? this.history.getNode(descendent) : undefined
    }

    /**
     * Get the history node of the current history state.
     * @returns the history node of the current history state.
     */
    getHistoryNode(): HistoryNode {
        return this.history.getCurrentNode()
    }

    /**
     * Check if any active changes are uncommitted.
     * @returns Boolean marking if any active changes are uncommitted.
     */
    isDirty(): boolean {
        return this.dirtySections.size > 0
    }

    /**
     * Push new changes into the set of active changes.
     * @param change Map of sections that should be changed.
     */
    pushChange(change: Map<SectionId, Change<Section>>): void {
        if (change.size === 0) return
        // if this is the first change since last history push or we're in the root history node,
        // create a new history state
        if (
            this.dirtySections.size === 0 &&
            (this.history.getCurrentChangeSet().size > 0 || this.history.isCurrentRoot())
        )
            this.history.pushState()
        // iterate all changed nodes and update sections
        for (const [sectionId, { changedSection, after: _after }] of change.entries()) {
            const after = _after
                ? _after
                : this.order.indexOf(sectionId) > 0
                ? this.order[this.order.indexOf(sectionId) - 1]
                : _after
            if (this.sections.has(sectionId)) {
                // document already contains section
                if (changedSection) {
                    // update existing section if node exists
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const section = this.sections.get(sectionId)!
                    if (sectionsEqual(section, changedSection)) {
                        // if the node is equal, remove it from the changeset
                        this.dirtySections.delete(sectionId)
                    } else if (this.dirtySections.has(sectionId)) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const step = this.dirtySections.get(sectionId)!
                        switch (step.type) {
                            case HistoryStepType.create: {
                                step.section = changedSection
                                break
                            }
                            case HistoryStepType.update: {
                                step.diff = new SectionDiff(section, changedSection)
                                break
                            }
                            case HistoryStepType.remove: {
                                this.dirtySections.set(sectionId, {
                                    type: HistoryStepType.update,
                                    diff: new SectionDiff(section, changedSection),
                                })
                                break
                            }
                        }
                    } else {
                        this.dirtySections.set(sectionId, {
                            type: HistoryStepType.update,
                            diff: new SectionDiff(section, changedSection),
                        })
                    }
                } else {
                    // remove section otherwise
                    this.dirtySections.set(sectionId, {
                        type: HistoryStepType.remove,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        previous: this.sections.get(sectionId)!,
                        after: after,
                    })
                }
            } else if (this.dirtySections.has(sectionId)) {
                // section is new but already tracked in current changeset
                if (changedSection) {
                    // update changeset if node exists
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const step = this.dirtySections.get(sectionId)!
                    switch (step.type) {
                        case HistoryStepType.create: {
                            step.section = changedSection
                            break
                        }
                        case HistoryStepType.update: {
                            throw new Error("can't update non-existing section")
                        }
                        case HistoryStepType.remove: {
                            throw new Error("can't update non-existing section")
                        }
                    }
                } else {
                    // remove section from the changeset otherwise
                    const afterSections = [...this.dirtySections.entries()].filter(
                        ([, dirtySection]) =>
                            (dirtySection.type === HistoryStepType.create ||
                                dirtySection.type === HistoryStepType.remove) &&
                            dirtySection.after === sectionId
                    ) as Array<[HistoryStateId, HistoryStepCreate] | [HistoryStateId, HistoryStepRemove]>
                    if (afterSections.length > 0) {
                        const withPushedHistory = this.withPushedHistory()
                        for (const afterSection of afterSections) {
                            // if there is a change after this section, its order needs to be updated
                            const beforeSection = withPushedHistory.getSectionsBefore(sectionId, 1)
                            afterSection[1].after = beforeSection.length > 0 ? beforeSection[0].id : 0
                        }
                    }
                    this.dirtySections.delete(sectionId)
                }
            } else {
                // add the new section otherwise
                if (changedSection) {
                    // add a new node
                    if (after !== undefined) {
                        // insert after previous node if there is one
                        const afterSections = [...this.dirtySections.entries()].filter(
                            ([, dirtySection]) =>
                                (dirtySection.type === HistoryStepType.create ||
                                    dirtySection.type === HistoryStepType.remove) &&
                                dirtySection.after === after
                        ) as Array<[HistoryStateId, HistoryStepCreate] | [HistoryStateId, HistoryStepRemove]>
                        for (const afterSection of afterSections) {
                            // if there is already a change after the same section, set it to come after the new one
                            afterSection[1].after = sectionId
                        }
                        this.dirtySections.set(sectionId, {
                            type: HistoryStepType.create,
                            section: changedSection,
                            after: after,
                        })
                    } else {
                        // append it at the end otherwise
                        this.dirtySections.set(sectionId, {
                            type: HistoryStepType.create,
                            section: changedSection,
                        })
                    }
                } else {
                    // node removed and not in current document so untrack it
                    this.dirtySections.delete(sectionId)
                }
            }
        }
    }

    /**
     * Check if active changes can be pushed into the history.
     * @returns Boolean marking if any changes can be committed.
     */
    canPushHistory(): boolean {
        return this.dirtySections.size > 0
    }

    /**
     * Commit active changes into the history.
     * @returns Boolean marking if any changes were committed.
     */
    pushHistory(): boolean {
        if (!this.canPushHistory()) {
            return false
        }
        for (const [sectionId, step] of this.dirtySections.entries()) {
            switch (step.type) {
                case HistoryStepType.create: {
                    this.sections.set(sectionId, step.section)
                    this.addToOrder(sectionId, step.after)
                    break
                }
                case HistoryStepType.update: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.sections.set(sectionId, step.diff.apply(this.sections.get(sectionId)!))
                    break
                }
                case HistoryStepType.remove: {
                    this.sections.delete(sectionId)
                    this.removeFromOrder(sectionId)
                    break
                }
            }
        }
        this.history.appendChanges(this.dirtySections)
        this.dirtySections.clear()
        this.step += 1
        return true
    }

    /**
     * Commit active changes into a copy of the document.
     * @returns Copy of the document with active changes committed and without history.
     */
    withPushedHistory(): Document {
        if (!this.canPushHistory()) {
            return this
        }
        const copy = new Document()
        copy.order = [...this.order]
        for (const [key, value] of this.sections.entries()) {
            copy.sections.set(key, cloneSection(value))
        }
        for (const [sectionId, step] of this.dirtySections.entries()) {
            switch (step.type) {
                case HistoryStepType.create: {
                    copy.sections.set(sectionId, step.section)
                    copy.addToOrder(sectionId, step.after)
                    break
                }
                case HistoryStepType.update: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    copy.sections.set(sectionId, step.diff.apply(copy.sections.get(sectionId)!))
                    break
                }
                case HistoryStepType.remove: {
                    copy.sections.delete(sectionId)
                    copy.removeFromOrder(sectionId)
                    break
                }
            }
        }
        copy.step = this.step + 1
        return copy
    }

    /**
     * Check if the current state can be popped into the parent state.
     * @returns Boolean marking if the current state can be popped.
     */
    canPopHistory(): boolean {
        return (
            this.dirtySections.size === 0 &&
            !!this.history.getCurrentNode().parent &&
            this.history.getCurrentChangeSet().size > 0
        )
    }

    /**
     * Pop the current state and return to the parent state in the history tree.
     * @returns List of changes that were applied between the previous and the new state.
     */
    popHistory(): ChangeMap | undefined {
        if (!this.canPopHistory()) {
            return
        }
        let changeSet = this.history.getCurrentChangeSet()
        if (!this.history.popState()) {
            return
        }
        if (!changeSet) return
        // sort changes by order in which they appear in the document
        const changesUpdate = [...changeSet.entries()].filter(
            ([, v]) => v.type === HistoryStepType.update
        ) as [SectionId, HistoryStepUpdate][]
        let changesCreate = [...changeSet.entries()].filter(([, v]) => v.type === HistoryStepType.create) as [
            SectionId,
            HistoryStepCreate
        ][]
        let changesRemove = [...changeSet.entries()].filter(([, v]) => v.type === HistoryStepType.remove) as [
            SectionId,
            HistoryStepRemove
        ][]
        changesCreate = changesCreate.reduce((prev, cur) => {
            if (cur[1].after === 0) {
                prev.unshift(cur)
                return prev
            }
            const prevIdx = prev.findIndex(([i]) => i === cur[1].after)
            if (prevIdx !== -1) {
                prev.splice(prevIdx + 1, 0, cur)
                return prev
            }
            const afterIndex = prev.findIndex(([, p]) => p.after === cur[0])
            if (afterIndex !== 1) {
                prev.splice(afterIndex, 0, cur)
                return prev
            }
            prev.push(cur)
            return prev
        }, [] as typeof changesCreate)
        changesCreate = changesCreate.reverse()
        changesRemove = changesRemove.reduce((prev, cur) => {
            if (cur[1].after === 0) {
                prev.unshift(cur)
                return prev
            }
            const prevIdx = prev.findIndex(([i]) => i === cur[1].after)
            if (prevIdx !== -1) {
                prev.splice(prevIdx + 1, 0, cur)
                return prev
            }
            const afterIndex = prev.findIndex(([, p]) => p.after === cur[0])
            if (afterIndex !== 1) {
                prev.splice(afterIndex, 0, cur)
                return prev
            }
            prev.push(cur)
            return prev
        }, [] as typeof changesRemove)
        changeSet = new Map([
            ...(changesRemove as [SectionId, HistoryStep][]),
            ...(changesUpdate as [SectionId, HistoryStep][]),
            ...(changesCreate as [SectionId, HistoryStep][]),
        ])
        for (const [sectionId, step] of changeSet.entries()) {
            switch (step.type) {
                case HistoryStepType.create: {
                    this.sections.delete(sectionId)
                    this.removeFromOrder(sectionId)
                    break
                }
                case HistoryStepType.update: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.sections.set(sectionId, step.diff.undo(this.sections.get(sectionId)!))
                    break
                }
                case HistoryStepType.remove: {
                    this.sections.set(sectionId, cloneSection(step.previous))
                    this.addToOrder(sectionId, step.after)
                    break
                }
            }
        }
        this.step -= 1
        return changeSet
    }

    /**
     * Check if a child state can be descended into.
     * @returns Boolean marking if a child state can be descended into.
     */
    canDescendHistory(): boolean {
        const descendents = this.history.getCurrentNode().children
        return descendents && descendents.size > 0
    }

    /**
     * Descend into a child state of the history tree.
     * @param branch History state id of the child state to be descended into.
     * @returns List of changes that were applied between the new and the previous state.
     */
    descendHistory(branch?: HistoryStateId): ChangeMap | undefined {
        if (!this.canDescendHistory() || !this.history.descendState(branch)) {
            return
        }
        let changeSet = this.history.getCurrentChangeSet()
        if (!changeSet) return
        // sort changes by order in which they appear in the document
        const changesUpdate = [...changeSet.entries()].filter(
            ([, v]) => v.type === HistoryStepType.update
        ) as [SectionId, HistoryStepUpdate][]
        let changesCreate = [...changeSet.entries()].filter(([, v]) => v.type === HistoryStepType.create) as [
            SectionId,
            HistoryStepCreate
        ][]
        let changesRemove = [...changeSet.entries()].filter(([, v]) => v.type === HistoryStepType.remove) as [
            SectionId,
            HistoryStepRemove
        ][]
        changesCreate = changesCreate.reduce((prev, cur) => {
            if (cur[1].after === 0) {
                prev.unshift(cur)
                return prev
            }
            const prevIdx = prev.findIndex(([i]) => i === cur[1].after)
            if (prevIdx !== -1) {
                prev.splice(prevIdx + 1, 0, cur)
                return prev
            }
            const afterIndex = prev.findIndex(([, p]) => p.after === cur[0])
            if (afterIndex !== 1) {
                prev.splice(afterIndex, 0, cur)
                return prev
            }
            prev.push(cur)
            return prev
        }, [] as typeof changesCreate)
        changesRemove = changesRemove.reduce((prev, cur) => {
            if (cur[1].after === 0) {
                prev.unshift(cur)
                return prev
            }
            const prevIdx = prev.findIndex(([i]) => i === cur[1].after)
            if (prevIdx !== -1) {
                prev.splice(prevIdx + 1, 0, cur)
                return prev
            }
            const afterIndex = prev.findIndex(([, p]) => p.after === cur[0])
            if (afterIndex !== 1) {
                prev.splice(afterIndex, 0, cur)
                return prev
            }
            prev.push(cur)
            return prev
        }, [] as typeof changesRemove)
        changesRemove = changesRemove.reverse()
        changeSet = new Map([
            ...(changesCreate as [SectionId, HistoryStep][]),
            ...(changesUpdate as [SectionId, HistoryStep][]),
            ...(changesRemove as [SectionId, HistoryStep][]),
        ])
        for (const [sectionId, step] of changeSet.entries()) {
            switch (step.type) {
                case HistoryStepType.create: {
                    this.sections.set(sectionId, step.section)
                    this.addToOrder(sectionId, step.after)
                    break
                }
                case HistoryStepType.update: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.sections.set(sectionId, step.diff.apply(this.sections.get(sectionId)!))
                    break
                }
                case HistoryStepType.remove: {
                    this.sections.delete(sectionId)
                    this.removeFromOrder(sectionId)
                    break
                }
            }
        }
        this.step += 1
        return changeSet
    }

    /**
     * Append text to the end of the document.
     * @param text Text to add to the end of the document.
     * @param meta Meta to set for the added text.
     */
    appendText(text: string, meta?: Map<MetaId, number[]>): void {
        const sections = sectionsFromText(text)
        let last = this.order[this.order.length - 1]
        const changes = new Map()
        sections.forEach((section) => {
            const id = uniqueid()
            const change: Change<SectionTypeText> = {
                changedSection: meta
                    ? {
                          ...section,
                          meta: new Map(
                              [...meta.entries()].map(([id, data]) => [
                                  id,
                                  data.map((d) => ({
                                      data: d,
                                      position: 0,
                                      length: section.text.length,
                                  })),
                              ])
                          ),
                      }
                    : section,
                after: last,
            }
            last = id
            changes.set(id, change)
        })
        this.pushChange(changes)
        this.pushHistory()
    }

    /**
     * Get the change counter of the document.
     * @returns The change number of the current history step.
     */
    getStep(): number {
        return this.step
    }

    /**
     * Get the full text of the document, including non-committed changes.
     */
    getText(): string {
        const withPushedHistory = this.withPushedHistory()
        let text = ''
        for (const section of [...withPushedHistory.getSections()].reverse() ?? []) {
            if (section.section.type === SectionType.text) {
                text = section.section.text + '\n' + text
            }
        }
        return text.slice(0, -1)
    }

    /**
     * @returns String representing the document.
     */
    toString(): string {
        return 'Document ' + JSON.stringify(this.toJSON(), documentToJsonReplacer, 4)
    }

    /**
     * @returns Object representing the document.
     */
    toJSON(): DocumentJson {
        return {
            step: this.step,
            dirtySections: this.dirtySections,
            sections: this.sections,
            order: this.order,
            history: this.history,
        }
    }

    /**
     * Get the section associated to a character index in the document.
     * Between each section one is added to account for newlines.
     * @param position Character index to get the matching section for.
     * @returns The section at the character position, if there is one.
     */
    getSectionForCharacterPosition(position: number): { section: SectionHandle | undefined; offset: number } {
        const sections = this.withPushedHistory().getSections() ?? []
        let index = 0
        const section = undefined
        for (const section of sections) {
            if (section.section.type === SectionType.text) {
                const sectionLength = section.section.text.length
                if (position >= index && position <= index + sectionLength) {
                    return { section, offset: position - index }
                }
                index += sectionLength + 1
            }
        }
        return { section, offset: position }
    }
}

/**
 * Serialization
 */
addExtension({
    Class: Document,
    type: 20,
    write(instance: Document) {
        const json = instance.toJSON()
        return {
            sections: json.sections,
            order: json.order,
            history: json.history,
            dirtySections: json.dirtySections,
            step: json.step,
        }
    },
    read(data) {
        return Object.assign(new Document(), data)
    },
})
