import {
    loreGeneratorConcepts,
    loreGeneratorEvents,
    loreGeneratorFactions,
    loreGeneratorLife,
    loreGeneratorPeople,
    loreGeneratorPlaces,
    loreGeneratorRole,
    loreGeneratorSeparator,
    loreGeneratorThings,
} from '../components/lorebook/loregen/exampleconstants'
import { Lorebook } from '../data/story/lorebook'
import { randomizeArray } from './util'

export function replaceSameNamedEntries(book1: Lorebook, book2: Lorebook): void {
    for (const entry of book2.entries) {
        const index = book1.entries.findIndex((entry2) => {
            return entry.displayName === entry2.displayName
        })
        if (index >= 0) {
            book1.entries[index] = entry
        } else {
            book1.entries.push(entry)
        }
    }
}

export function replaceSameIdEntries(book1: Lorebook, book2: Lorebook): void {
    for (const entry of book2.entries) {
        const index = book1.entries.findIndex((entry2) => {
            return entry.id === entry2.id
        })
        if (index >= 0) {
            book1.entries[index] = entry
        } else {
            book1.entries.push(entry)
        }
    }
}

export function importNonDuplicates(book1: Lorebook, book2: Lorebook): void {
    for (const entry of book2.entries) {
        const index = book1.entries.findIndex((entry2) => {
            return entry.id === entry2.id
        })
        if (index >= 0) {
            // nothing
        } else {
            book1.entries.push(entry)
        }
    }
}

export function replaceSameIdCategories(book1: Lorebook, book2: Lorebook): void {
    for (const entry of book2.categories) {
        const index = book1.categories.findIndex((entry2) => {
            return entry.id === entry2.id
        })
        if (index >= 0) {
            book1.categories[index] = entry
        } else {
            book1.categories.push(entry)
        }
    }
}

export function importNonDuplicateCatagories(book1: Lorebook, book2: Lorebook): void {
    for (const entry of book2.categories) {
        const index = book1.categories.findIndex((entry2) => {
            return entry.id === entry2.id
        })
        if (index >= 0) {
            // nothing
        } else {
            book1.categories.push(entry)
        }
    }
}

export function replaceSameIdThenName(book1: Lorebook, book2: Lorebook): void {
    const remaining = []
    for (const entry of book2.entries) {
        const index = book1.entries.findIndex((entry2) => {
            return entry.id === entry2.id
        })
        if (index >= 0) {
            book1.entries[index] = entry
        } else {
            remaining.push(entry)
        }
    }
    for (const entry of book2.entries) {
        const index = remaining.findIndex((entry2) => {
            return entry.displayName === entry2.displayName
        })
        if (index >= 0) {
            book1.entries[index] = entry
        } else {
            book1.entries.push(entry)
        }
    }
}

export function skipSameIdAddSameName(book1: Lorebook, book2: Lorebook): void {
    const remaining = []
    for (const entry of book2.entries) {
        const index = book1.entries.findIndex((entry2) => {
            return entry.id === entry2.id
        })
        if (index >= 0) {
            // nothing
        } else {
            remaining.push(entry)
        }
    }
    book1.entries = [...book1.entries, ...remaining]
}

export function replaceSameIdAddName(book1: Lorebook, book2: Lorebook): void {
    const remaining = []
    for (const entry of book2.entries) {
        const index = book1.entries.findIndex((entry2) => {
            return entry.id === entry2.id
        })
        if (index >= 0) {
            book1.entries[index] = entry
        } else {
            remaining.push(entry)
        }
    }
    book1.entries = [...book1.entries, ...remaining]
}

export function replaceSameNameEnforceUniqueId(book1: Lorebook, book2: Lorebook): void {
    const remaining = []
    for (const entry of book2.entries) {
        const index = book1.entries.findIndex((entry2) => {
            return entry.displayName === entry2.displayName
        })
        const idIndex = book1.entries.findIndex((entry2) => {
            return entry.id === entry2.id
        })
        if (index >= 0) {
            if (idIndex < 0 || book1.entries[index].id === entry.id) {
                book1.entries[index] = entry
            }
        } else {
            remaining.push(entry)
        }
    }
    book1.entries = [...book1.entries, ...remaining]
}

const transform = (lg: any, i: number, genName: boolean) => {
    return (
        '[ ' +
        (i < 3 && !genName ? lg.inputName : lg.inputDescription) +
        ((i + 1) % 3 !== 0 ? ' (' + lg.tags + ')' : '') +
        ' ]\n' +
        lg.output +
        ''
    )
}

export function getRandomGeneratorExamples(category: string = 'general', genName: boolean = false): string {
    let examples: string[] = []
    switch (category) {
        case 'person':
            examples.push(
                ...randomizeArray(loreGeneratorPeople)
                    .slice(0, 6)
                    .map((element, i) => transform(element, i, genName))
            )
            break
        case 'place':
            examples.push(
                ...randomizeArray(loreGeneratorPlaces)
                    .slice(0, 6)
                    .map((element, i) => transform(element, i, genName))
            )
            break
        case 'object':
            examples.push(
                ...randomizeArray(loreGeneratorThings)
                    .slice(0, 6)
                    .map((element, i) => transform(element, i, genName))
            )
            break
        case 'faction':
            examples.push(
                ...randomizeArray(loreGeneratorFactions)
                    .slice(0, 6)
                    .map((element, i) => transform(element, i, genName))
            )
            break
        case 'concept':
            examples.push(
                ...randomizeArray(loreGeneratorConcepts)
                    .slice(0, 6)
                    .map((element, i) => transform(element, i, genName))
            )
            break
        case 'event':
            examples.push(
                ...randomizeArray(loreGeneratorEvents)
                    .slice(0, 6)
                    .map((element, i) => transform(element, i, genName))
            )
            break
        case 'occupation':
            examples.push(
                ...randomizeArray(loreGeneratorRole)
                    .slice(0, 6)
                    .map((element, i) => transform(element, i, genName))
            )
            break
        case 'life':
            examples.push(
                ...randomizeArray(loreGeneratorLife)
                    .slice(0, 6)
                    .map((element, i) => transform(element, i, genName))
            )
            break

        default:
            const arr = randomizeArray([
                loreGeneratorPeople,
                loreGeneratorPlaces,
                loreGeneratorThings,
                loreGeneratorFactions,
                loreGeneratorConcepts,
                loreGeneratorEvents,
                loreGeneratorRole,
                loreGeneratorLife,
            ])

            for (let i = 0; i < 7; i++) {
                if (i < 6) examples.push(transform(randomizeArray(arr[i])[0], i, genName))
                if (i === 6) examples.push(transform(randomizeArray(loreGeneratorPeople)[0], i, genName))
            }

            break
    }
    examples = randomizeArray(examples)
    return examples.join(loreGeneratorSeparator)
}
