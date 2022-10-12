import { StoryMetadata, StoryId, StoryChildContent } from '../story/storycontainer'
import { ScenarioGroup } from '../story/scenario'
import { GlobalUserContext } from '../../globals/globals'
import { AIModule } from '../story/storysettings'

class SearchCacheEntry {
    input: string = ''
    includes: string[] = []
    excludes: string[] = []
    metadataMatches: Map<StoryId, MetadataMatchResult> = new Map()
    scenarioGroupMatches: Map<ScenarioGroup, ScenarioGroupMatchResult> = new Map()
    moduleMatches: Map<AIModule, ModuleMatchResult> = new Map()
}

export enum MatchType {
    passive = 0,
    include = 1,
    exclude = 2,
}

export class MatchBit {
    start: number
    end: number
    next: number

    constructor(start: number, end: number, next: number) {
        this.start = start
        this.end = end
        this.next = next
    }
}

export class MetadataMatchResult {
    metadata: StoryMetadata
    lastUpdatedAt?: Date
    type: MatchType = MatchType.passive
    title: MatchBit[] = []
    description: MatchBit[] = []
    textPreview: MatchBit[] = []
    tags: Map<string, MatchBit[]> = new Map()
    elementType: 'shelf' | 'story' = 'story'
    parent?: StoryMetadata

    constructor(metadata: StoryMetadata) {
        this.metadata = metadata
        this.lastUpdatedAt = metadata?.lastUpdatedAt
    }
}

export class ScenarioGroupMatchResult {
    group: ScenarioGroup
    type: MatchType = MatchType.passive
    name: MatchBit[] = []
    names: MatchBit[] = []
    author: MatchBit[] = []
    description: MatchBit[] = []
    tags: Map<string, MatchBit[]> = new Map()

    constructor(group: ScenarioGroup) {
        this.group = group
    }
}

export class ModuleMatchResult {
    module: AIModule
    type: MatchType = MatchType.passive
    name: MatchBit[] = []
    description: MatchBit[] = []

    constructor(module: AIModule) {
        this.module = module
    }
}

export class SearchFilter {
    private cache: Map<string, SearchCacheEntry> = new Map()
    private matchedIncludes = new Set()

    private addEntry(searchInput: string): SearchCacheEntry {
        const newEntry = new SearchCacheEntry()
        const includes: Set<string> = new Set()
        const excludes: Set<string> = new Set()
        let parsedInput = searchInput

        const matches = [...parsedInput.matchAll(/".*?"/g)]
        let index = matches.length - 1
        while (index >= 0) {
            const match = matches[index][0]
            parsedInput = parsedInput.replace(`/${match}/g`, match.replace(/ /g, '<|>'))
            index--
        }
        parsedInput = parsedInput.replace(/"/g, '')

        const filters = parsedInput
            .toLowerCase()
            .split(' ')
            .filter((value) => value.length > 0)

        for (const filter of filters) {
            if (filter.startsWith('-') && !filters.includes(filter.slice(1))) {
                if (filter.length > 1) {
                    excludes.add(filter.slice(1).replace(/<|>/g, ' '))
                }
            } else {
                includes.add(filter.replace(/<|>/g, ' '))
            }
        }

        newEntry.input = searchInput
        newEntry.excludes = [...excludes]
        newEntry.includes = [...includes]

        this.cache.set(searchInput, newEntry)

        return newEntry
    }

    private getEntry(searchInput: string): SearchCacheEntry {
        const entry = this.cache.get(searchInput)
        if (entry === undefined) {
            return this.addEntry(searchInput)
        }
        return entry
    }

    private matchString(text: string, filters: string[]): MatchBit[] {
        text = text.toLowerCase()
        const indexes = []

        for (const filter of filters) {
            const startIndex = text.indexOf(filter)
            if (startIndex !== -1) {
                const endIndex = filter.length + startIndex
                indexes.push([startIndex, endIndex])
                this.matchedIncludes.add(filter)
            }
        }

        if (indexes.length === 0) {
            return []
        }
        indexes.sort((aa, bb) => aa[0] - bb[0])

        const bits: MatchBit[] = []
        bits.push(new MatchBit(indexes[0][0], indexes[0][1], text.length))

        let lastBit = bits[0]
        for (const index of indexes.slice(1)) {
            if (lastBit.end < index[0]) {
                const newBit = new MatchBit(index[0], index[1], text.length)
                bits.push(newBit)
                lastBit.next = newBit.start
                lastBit = newBit
            } else {
                lastBit.end = Math.max(lastBit.end, index[1])
            }
        }

        return bits
    }

    scenarioGroupMatch(
        groups: ScenarioGroup[],
        searchInput: string,
        matchTypes: Array<MatchType> = [],
        maximumAmount: number = -1
    ): Array<ScenarioGroupMatchResult> {
        if (maximumAmount === 0) {
            return []
        }

        const entry = this.getEntry(searchInput)
        const results = []

        if (matchTypes.length === 0) {
            if (entry.includes.length > 0) {
                matchTypes.push(MatchType.include)
            } else {
                matchTypes.push(MatchType.passive)
            }
        }

        for (const group of groups) {
            let matchResult = entry.scenarioGroupMatches.get(group)

            if (matchResult === undefined) {
                matchResult = new ScenarioGroupMatchResult(group)
                entry.scenarioGroupMatches.set(group, matchResult)

                let tags: string[] = []
                for (const scenario of group.scenarios) {
                    tags = [...tags, ...scenario.tags]
                }
                const finalTags = [...new Set(tags)]

                for (const exclude of entry.excludes) {
                    if (group.name.toLowerCase().includes(exclude)) {
                        matchResult.type = MatchType.exclude
                        break
                    } else if (group.names.join(' ').toLowerCase().includes(exclude)) {
                        matchResult.type = MatchType.exclude
                        break
                    } else if (group.scenarios[0].author.toLowerCase().includes(exclude)) {
                        matchResult.type = MatchType.exclude
                        break
                    } else if (group.scenarios[0].description.toLowerCase().includes(exclude)) {
                        matchResult.type = MatchType.exclude
                        break
                    } else if (finalTags.join(' ').toLowerCase().includes(exclude)) {
                        matchResult.type = MatchType.exclude
                        break
                    }
                }

                if (matchResult.type === MatchType.passive && entry.includes.length > 0) {
                    matchResult.name = this.matchString(group.name, entry.includes)
                    matchResult.names = this.matchString(group.names.join(' | '), entry.includes)
                    matchResult.author = this.matchString(group.scenarios[0].author, entry.includes)
                    matchResult.description = this.matchString(group.scenarios[0].description, entry.includes)

                    for (const tag of finalTags) {
                        const tagResult = this.matchString(tag, entry.includes)
                        if (tagResult.length > 0) {
                            matchResult.tags.set(tag, tagResult)
                        }
                    }

                    if (this.matchedIncludes.size === entry.includes.length) {
                        matchResult.type = MatchType.include
                    }
                }
            }

            this.matchedIncludes.clear()
            if (matchTypes.includes(matchResult.type)) {
                results.push(matchResult)
                if (results.length === maximumAmount) {
                    return results
                }
            }
        }

        return results
    }

    moduleMatch(
        modules: AIModule[],
        searchInput: string,
        matchTypes: Array<MatchType> = [],
        maximumAmount: number = -1
    ): Array<ModuleMatchResult> {
        if (maximumAmount === 0) {
            return []
        }

        const entry = this.getEntry(searchInput)
        const results = []

        if (matchTypes.length === 0) {
            if (entry.includes.length > 0) {
                matchTypes.push(MatchType.include)
            } else {
                matchTypes.push(MatchType.passive)
            }
        }

        for (const _module of modules) {
            let matchResult = entry.moduleMatches.get(_module)

            if (matchResult === undefined) {
                matchResult = new ModuleMatchResult(_module)
                entry.moduleMatches.set(_module, matchResult)

                for (const exclude of entry.excludes) {
                    if (_module.name.toLowerCase().includes(exclude)) {
                        matchResult.type = MatchType.exclude
                        break
                    } else if (_module.description.toLowerCase().includes(exclude)) {
                        matchResult.type = MatchType.exclude
                        break
                    }
                }

                if (matchResult.type === MatchType.passive && entry.includes.length > 0) {
                    matchResult.name = this.matchString(_module.name, entry.includes)
                    matchResult.description = this.matchString(_module.description, entry.includes)

                    if (this.matchedIncludes.size === entry.includes.length) {
                        matchResult.type = MatchType.include
                    }
                }
            }

            this.matchedIncludes.clear()
            if (matchTypes.includes(matchResult.type)) {
                results.push(matchResult)
                if (results.length === maximumAmount) {
                    return results
                }
            }
        }

        return results
    }

    metadataMatch(
        shelfContents: StoryChildContent[],
        searchInput: string,
        maximumAmount: number = -1,
        matchTypes: Array<MatchType> = []
    ): Array<MetadataMatchResult> {
        if (maximumAmount === 0) {
            return []
        }

        const entry = this.getEntry(searchInput)
        const results = []

        if (matchTypes.length === 0) {
            if (entry.includes.length > 0) {
                matchTypes.push(MatchType.include)
            } else {
                matchTypes.push(MatchType.passive)
            }
        }

        for (const shelfContent of shelfContents) {
            if (shelfContent.type === 'shelf') {
                // TODO: search shelves too
                if (!searchInput) {
                    const shelf = GlobalUserContext.shelves.get(shelfContent.id)
                    if (shelf !== undefined) {
                        const result = new MetadataMatchResult(shelf)
                        result.elementType = 'shelf'
                        results.push(result)
                    }
                } else {
                    const shelf = GlobalUserContext.shelves.get(shelfContent.id)
                    if (shelf !== undefined) {
                        const shelvedChildren = this.metadataMatch(shelf.children ?? [], searchInput)
                        for (const shelvedChild of shelvedChildren) {
                            shelvedChild.parent = shelvedChild.parent || shelf
                        }
                        results.push(...shelvedChildren)
                    }
                }
            } else if (shelfContent.type === 'story') {
                const story = GlobalUserContext.stories.get(shelfContent.id)
                if (story !== undefined) {
                    let matchResult = entry.metadataMatches.get(story.id)

                    if (matchResult === undefined || matchResult.lastUpdatedAt !== story.lastUpdatedAt) {
                        matchResult = new MetadataMatchResult(story)
                        entry.metadataMatches.set(story.id, matchResult)

                        for (const exclude of entry.excludes) {
                            if (story.title.toLowerCase().includes(exclude)) {
                                matchResult.type = MatchType.exclude
                                break
                            } else if (story.description.toLowerCase().includes(exclude)) {
                                matchResult.type = MatchType.exclude
                                break
                            } else if (story.textPreview.toLowerCase().includes(exclude)) {
                                matchResult.type = MatchType.exclude
                                break
                            } else if (story.tags.join(' ').toLowerCase().includes(exclude)) {
                                matchResult.type = MatchType.exclude
                                break
                            }
                        }

                        if (matchResult.type === MatchType.passive && entry.includes.length > 0) {
                            matchResult.title = this.matchString(story.title, entry.includes)
                            matchResult.description = this.matchString(story.description, entry.includes)
                            matchResult.textPreview = this.matchString(story.textPreview, entry.includes)

                            for (const tag of story.tags) {
                                const tagResult = this.matchString(tag, entry.includes)
                                if (tagResult.length > 0) {
                                    matchResult.tags.set(tag, tagResult)
                                }
                            }

                            if (this.matchedIncludes.size === entry.includes.length) {
                                matchResult.type = MatchType.include
                            }
                        }
                    }
                    this.matchedIncludes.clear()
                    if (matchTypes.includes(matchResult.type)) {
                        results.push(matchResult)
                        if (results.length === maximumAmount) {
                            return results
                        }
                    }
                }
            }
        }
        return results
    }
}

export function sortStoryMetadata(
    results: Array<MetadataMatchResult>,
    sortValue: { reverse: boolean; by: { label: string; value: string } }
): void {
    switch (sortValue.by.value) {
        case 'recent': {
            if (sortValue.reverse)
                results.sort((a, b) =>
                    a.metadata && b.metadata
                        ? a.metadata.lastUpdatedAt.getTime() - b.metadata.lastUpdatedAt.getTime()
                        : 0
                )
            else
                results.sort((a, b) =>
                    a.metadata && b.metadata
                        ? b.metadata.lastUpdatedAt.getTime() - a.metadata.lastUpdatedAt.getTime()
                        : 0
                )
            break
        }
        case 'alphabetical': {
            if (sortValue.reverse)
                results.sort((a, b) =>
                    a.metadata && b.metadata ? b.metadata.title.localeCompare(a.metadata.title) : 0
                )
            else
                results.sort((a, b) =>
                    a.metadata && b.metadata ? a.metadata.title.localeCompare(b.metadata.title) : 0
                )
            break
        }
        case 'creation': {
            if (sortValue.reverse)
                results.sort((a, b) =>
                    a.metadata && b.metadata
                        ? a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime()
                        : 0
                )
            else
                results.sort((a, b) =>
                    a.metadata && b.metadata
                        ? b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime()
                        : 0
                )
            break
        }
    }
}
