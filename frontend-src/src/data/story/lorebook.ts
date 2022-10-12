import { createModelSchema, list, object, optional, primitive, serialize } from 'serializr'
import { v4 as uuid } from 'uuid'
import { migrateLorebook } from '../../util/migration'
import { deserialize } from '../../util/serialization'
import { ContextEntry, getDefaultLoreConfig } from '../ai/contextfield'
import { LoreEntry } from '../ai/loreentry'
import { LogitBiasGroup } from './logitbias'

export class LorebookSettings {
    orderByKeyLocations: boolean = false
}

createModelSchema(LorebookSettings, {
    orderByKeyLocations: primitive(),
})
export class LorebookCategory {
    name: string = 'New Category'
    id: string = uuid()
    enabled: boolean = true
    createSubcontext: boolean = false
    subcontextSettings: ContextEntry = new ContextEntry(getDefaultLoreConfig())
    useCategoryDefaults: boolean = false
    categoryDefaults: LoreEntry = new LoreEntry()
    categoryBiasGroups: LogitBiasGroup[] = [new LogitBiasGroup()]
    open?: boolean
}

createModelSchema(LorebookCategory, {
    name: primitive(),
    id: primitive(),
    enabled: primitive(),
    createSubcontext: primitive(),
    subcontextSettings: object(LoreEntry),
    useCategoryDefaults: primitive(),
    categoryDefaults: object(LoreEntry),
    categoryBiasGroups: list(object(LogitBiasGroup)),
    open: optional(primitive()),
})

export class Lorebook {
    lorebookVersion: number = 4
    entries: LoreEntry[] = []
    settings: LorebookSettings = new LorebookSettings()
    categories: LorebookCategory[] = []
    serialize(pretty: boolean = false): string {
        return JSON.stringify(serialize(Lorebook, this), undefined, pretty ? '  ' : undefined)
    }
    static deserialize(story: string): Lorebook {
        const deserialized = deserialize(Lorebook, JSON.parse(story))
        migrateLorebook(deserialized)
        return deserialized
    }

    static nonMigrateDeserialize(story: string): Lorebook {
        const deserialized = deserialize(Lorebook, JSON.parse(story))
        return deserialized
    }
}

createModelSchema(Lorebook, {
    lorebookVersion: primitive(),
    entries: list(object(LoreEntry)),
    settings: object(LorebookSettings),
    categories: list(object(LorebookCategory)),
})

export function findSharedNames(book1: Lorebook, book2: Lorebook): { a: LoreEntry; b: LoreEntry }[] {
    const duplicateNames: { a: LoreEntry; b: LoreEntry }[] = []

    for (const entry of book1.entries) {
        const index2 = book2.entries.findIndex((entry2) => {
            return entry2.displayName === entry.displayName
        })
        if (index2 >= 0) {
            duplicateNames.push({ a: entry, b: book2.entries[index2] })
        }
    }
    return duplicateNames
}

export function findSameEntries(book1: Lorebook, book2: Lorebook): { a: LoreEntry; b: LoreEntry }[] {
    const duplicateNames: { a: LoreEntry; b: LoreEntry }[] = []

    for (const entry1 of book1.entries) {
        for (const entry2 of book2.entries) {
            if (entry1.id === entry2.id) {
                duplicateNames.push({ a: entry1, b: entry2 })
            }
        }
    }
    return duplicateNames
}
