import { addExtension } from 'msgpackr'

import { Section, SectionDiff, SectionId } from './section'
import { documentToJsonReplacer, uniqueid, UniqueId } from './util'

/**
 * Type of a step in a history state node.
 */
export const enum HistoryStepType {
    create = 0,
    update = 1,
    remove = 2,
}

/**
 * Step for creating a new section.
 */
export type HistoryStepCreate = {
    type: HistoryStepType.create
    section: Section
    after?: SectionId
}
/**
 * Step for updating an existing section.
 */
export type HistoryStepUpdate = {
    type: HistoryStepType.update
    diff: SectionDiff
}
/**
 * Step for removing a section.
 */
export type HistoryStepRemove = {
    type: HistoryStepType.remove
    previous: Section
    after?: SectionId
}

/**
 * Unification of all types of steps.
 */
export type HistoryStep = HistoryStepCreate | HistoryStepUpdate | HistoryStepRemove

/**
 * Map from section id to history step.
 * Every section can have at most one step per history node.
 */
export type ChangeMap = Map<SectionId, HistoryStep>

/**
 * Unique identifier of a history state node.
 */
export type HistoryStateId = UniqueId

/**
 * A single state node in the history tree.
 */
export class HistoryNode {
    id: HistoryStateId
    parent: HistoryStateId | undefined
    children: Set<HistoryStateId>
    route: HistoryStateId | undefined
    changes: ChangeMap
    date: Date

    constructor(parent?: HistoryStateId) {
        this.id = uniqueid()
        this.parent = parent
        this.children = new Set()
        this.changes = new Map()
        this.date = new Date()
    }

    toString() {
        return 'HistoryNode ' + JSON.stringify(this.toJSON(), documentToJsonReplacer, 4)
    }

    toJSON() {
        return {
            id: this.id,
            parent: this.parent,
            children: this.children,
            changes: this.changes,
        }
    }
}

/**
 * Root of the history tree.
 */
export class HistoryRoot {
    private root: HistoryStateId
    private current: HistoryStateId
    private nodes: Map<HistoryStateId, HistoryNode>

    constructor() {
        const root = new HistoryNode()
        this.root = root.id
        this.current = this.root
        this.nodes = new Map()
        this.nodes.set(root.id, root)
    }

    getNode(id: HistoryStateId) {
        return this.nodes.get(id)
    }

    getCurrentNode() {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.getNode(this.current)!
    }

    getChangeSet(id: HistoryStateId) {
        return this.getNode(id)?.changes
    }

    getCurrentChangeSet() {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.getChangeSet(this.current)!
    }

    isCurrentRoot() {
        return this.current === this.root
    }

    appendChanges(changes: ChangeMap) {
        if (changes.size === 0) return
        const changeSet = this.getCurrentChangeSet()
        for (const [id, change] of changes.entries()) {
            changeSet.set(id, change)
        }
    }

    pushState() {
        const newHistoryNode = new HistoryNode(this.current)
        while (this.nodes.has(newHistoryNode.id)) {
            newHistoryNode.id = uniqueid()
        }
        this.nodes.set(newHistoryNode.id, newHistoryNode)
        this.getCurrentNode().children.add(newHistoryNode.id)
        this.current = newHistoryNode.id
        return this.current
    }

    popState() {
        const parent = this.getCurrentNode().parent
        if (!parent) return
        const child = this.getCurrentNode().id
        this.current = parent
        this.getCurrentNode().route = child
        return this.current
    }

    descendState(branch?: HistoryStateId) {
        const target =
            branch ?? this.getCurrentNode().route ?? this.getCurrentNode().children.values().next().value
        if (!target || !this.getCurrentNode().children.has(target)) {
            return
        }
        this.current = target
        return this.getCurrentNode()
    }

    toString() {
        return 'HistoryRoot ' + JSON.stringify(this.toJSON(), documentToJsonReplacer, 4)
    }

    toJSON() {
        return {
            root: this.root,
            current: this.current,
            nodes: this.nodes,
        }
    }
}

/**
 * Serialization
 */
addExtension({
    Class: HistoryNode,
    type: 31,
    write(instance: HistoryNode) {
        return {
            id: instance.id,
            parent: instance.parent,
            children: instance.children,
            route: instance.route,
            changes: instance.changes,
            date: instance.date,
        }
    },
    read(data) {
        return Object.assign(new HistoryNode(), data)
    },
})
addExtension({
    Class: HistoryRoot,
    type: 30,
    write(instance: HistoryRoot) {
        const json = instance.toJSON()
        return {
            root: json.root,
            current: json.current,
            nodes: json.nodes,
        }
    },
    read(data) {
        return Object.assign(new HistoryRoot(), data)
    },
})
