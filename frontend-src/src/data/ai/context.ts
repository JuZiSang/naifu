/* eslint-disable @typescript-eslint/no-unused-vars */
import { v4 as uuid } from 'uuid'
import { MaxLoreSearchDistance, MaxTokens } from '../../globals/constants'
import { StoryContent } from '../story/storycontainer'
import { EventHandler, PreContextEvent } from '../event/eventhandling'
import { logError, logWarning } from '../../util/browser'
import { LogitBiasGroup } from '../story/logitbias'
import { quoteCharacters } from '../../util/util'
import Encoder, { EncoderType, getModelEncoderType } from '../../tokenizer/encoder'
import { WorkerInterface } from '../../tokenizer/interface'
import { NoModule } from '../story/storysettings'
import { GenerationPlacebo } from '../../util/placebo'
import { normalizeModel, TextGenerationModel } from '../request/model'
import { calcPreamble } from '../../util/models'
import { ContextEntry, SeparationType, TrimDirection, getDefaultLoreConfig } from './contextfield'
import { isEphemeralEntryActive } from './ephemeralcontext'
import { findLastKeyIndex, isLoreEntryActive, LoreEntry } from './loreentry'

export enum ContextFieldState {
    Included = 'included',
    PartiallyIncluded = 'partially included',
    NotIncluded = 'not included',
}

export enum ContextFieldReason {
    Default = 'default',
    NoSpace = 'no space',
    Disabled = 'disabled',
    NoKeyTriggered = 'no key',
    KeyTriggered = 'key activated',
    KeyTriggeredNonStory = 'key in: ',
    ActivationForced = 'activation forced',
    NoText = 'no text',
    NoContextKey = 'no key in context',
    EphemeralActive = 'ephemeral active',
    EphemeralInactive = 'ephemeral inactive',
    NoActiveEntries = 'no active entries',
}

export enum TrimMethod {
    NoTrim = 'no trim',
    Token = 'token',
    Newline = 'newline',
    Sentence = 'sentence',
}

export class ContextReport {
    maxTokens: number = 0
    preContextText: string = ''
    output: string = ''
    tokens: number[] = []
    contextStatuses: ContextFieldStatus[] = []
    spacesTrimmed: number = 0
    structuredOutput: StructuredOutput[] = []
    stageReports: ContextStageReport[] = []
    keyRejections: ContextFieldStatus[] = []
    disabled: ContextFieldStatus[] = []
    orderZeroPoint: number = 0
    biases: { groups: LogitBiasGroup[]; identifier: string }[] = []
    storyTrimmed: boolean = false
    tokenizerType: EncoderType = EncoderType.GPT2
    preamble: { str: string; tokens: number[] } = { str: '', tokens: [] }
}

export class StructuredOutput {
    text: string = ''
    identifier: string = ''
    type: string = ''
}

export class ContextStageReport {
    structuredOutput: StructuredOutput[] = []
    reservedTokens: number = 0
    remainingTokens: number = 0
    usedTokens: number = 0
    description: string = ''
    constructor(
        structuredOutput: StructuredOutput[] = [],
        reservedTokens: number = 0,
        remainingTokens: number = 0,
        usedTokens: number = 0,
        description: string = ''
    ) {
        this.structuredOutput = JSON.parse(JSON.stringify(structuredOutput))
        this.reservedTokens = reservedTokens
        this.remainingTokens = remainingTokens
        this.usedTokens = usedTokens
        this.description = description
    }
}

export class ContextFieldStatus {
    included: boolean = true
    identifier: string = ''
    unqiueId: string = uuid()
    state: ContextFieldState = ContextFieldState.NotIncluded
    reason: ContextFieldReason | string = ContextFieldReason.Default
    triggeringKey: string = ''
    keyIndex: number = -1
    includedText: string = ''
    calculatedTokens: number = 0
    contextField: ContextEntry
    actualReservedTokens: number = 0
    keyRelative: boolean = false
    trimMethod: TrimMethod = TrimMethod.NoTrim
    type: string = ''
    settings: ContextEntry
    subContext?: ContextReport
    buildSubContext?: (availableTokens?: number) => Promise<void>
    constructor(contextField: ContextEntry) {
        this.contextField = contextField
        this.settings = contextField
    }
}

interface EncoderInterface {
    encode: (text: string) => Promise<number[]>
    decode: (tokens: number[]) => Promise<string>
}

function subContextBuild(
    category: any,
    inSubcontext: any,
    rejectedIn: any,
    tokenizer: any,
    contextEntry: any,
    contextStatus: any
) {
    return async (availableTokens?: number) => {
        const tempReport = new ContextReport()
        tempReport.contextStatuses = inSubcontext
        tempReport.keyRejections = rejectedIn
        let limit = category.subcontextSettings.contextConfig.tokenBudget
        limit = Math.min(limit, availableTokens ?? limit)
        tempReport.maxTokens = limit
        await buildContextFromReport(tempReport, limit, tokenizer)
        if (inSubcontext.length === 0) {
            contextStatus.included = false
            contextStatus.reason = ContextFieldReason.NoActiveEntries
            contextStatus.state = ContextFieldState.NotIncluded
        }
        contextEntry.text = tempReport.output.trim()
        contextStatus.subContext = tempReport
    }
}

let uncommentedTextCache: Map<ContextEntry, string> = new Map()

function getEntryText(entry: ContextEntry): string {
    return uncommentedTextCache.get(entry) ?? entry.text
}

export async function buildContext(
    storyContent: StoryContent,
    eventHandler: EventHandler,
    contextLimit: number,
    preambleEnabled: boolean = true,
    start: number = -1,
    tokenizer?: Encoder,
    placeboInserts?: ContextFieldStatus[],
    overrideStoryText?: string,
    tokenizerType?: EncoderType
): Promise<ContextReport> {
    const initialStoryText = overrideStoryText ?? storyContent.getStoryText()
    if (start < 0) start = initialStoryText.length

    const encoder = {
        encode: async (text: string) =>
            tokenizer !== undefined
                ? tokenizer.encode(text)
                : await new WorkerInterface().encode(text, contextReport.tokenizerType),

        decode: async (tokens: number[]) =>
            tokenizer !== undefined
                ? tokenizer.decode(tokens)
                : await new WorkerInterface().decode(tokens, contextReport.tokenizerType),
    }

    const contextReport = new ContextReport()
    contextReport.tokenizerType = tokenizerType ?? getModelEncoderType(storyContent.settings.model)

    const expectedPreamble = calcPreamble(
        storyContent.settings.model,
        preambleEnabled,
        false,
        false,
        storyContent.settings.prefix
    )
    const encodedExpectedPreamble =
        expectedPreamble.exactTokens ?? (await encoder.encode(expectedPreamble.str))

    contextLimit -= storyContent.settings.prefix === NoModule ? 0 : 20
    contextLimit -= encodedExpectedPreamble.length

    contextReport.maxTokens = contextLimit

    let storyText = eventHandler.handleEvent(
        new PreContextEvent(overrideStoryText ?? eventHandler.storyContent.getStoryText())
    ).event.contextText
    contextReport.preContextText = storyText

    if (start === (overrideStoryText ?? storyContent.getStoryText()).length) {
        start = storyText.length
    } else {
        start += Math.max(0, storyText.length - (overrideStoryText ?? storyContent.getStoryText()).length)
    }

    storyText =
        storyContent.storyContextConfig.trimDirection === TrimDirection.TrimTop
            ? storyText.slice(Math.max(0, start - MaxTokens * 20), Math.min(storyText.length, start))
            : storyText.slice(0, Math.min(MaxTokens * 20, start))

    uncommentedTextCache = new Map()
    if (storyContent.settings.model !== normalizeModel(TextGenerationModel.genjipython6b)) {
        storyText = storyText.replace(/^##.*\n?/gm, '')
        for (const entry of [
            ...storyContent.context,
            ...storyContent.lorebook.entries,
            ...storyContent.ephemeralContext,
        ]) {
            let newText = entry.text.replace(/^##.*\n?/gm, '')
            // Handle case where last line is a comment, resulting in a blank line
            if (newText.endsWith('\n') && !entry.text.endsWith('\n')) {
                newText = newText.slice(0, -1)
            }
            uncommentedTextCache.set(entry, newText)
        }
    }
    const defaultContexts: ContextEntry[] = [
        new ContextEntry(storyContent.storyContextConfig, storyText),
        ...storyContent.context,
    ]

    for (const [index, field] of defaultContexts.entries()) {
        contextReport.contextStatuses.push(new ContextFieldStatus(field))
        contextReport.contextStatuses[index].identifier = 'Story'

        switch (index) {
            case 0:
                contextReport.contextStatuses[index].identifier = 'Story'
                contextReport.contextStatuses[index].type = 'story'
                break
            case 1:
                contextReport.contextStatuses[index].identifier = 'Memory'
                contextReport.contextStatuses[index].type = 'memory'
                break
            case 2:
                contextReport.contextStatuses[index].identifier = 'A/N'
                contextReport.contextStatuses[index].type = 'an'
                break
            default:
                contextReport.contextStatuses[index].identifier = 'Unknown Default Context'
                contextReport.contextStatuses[index].type = 'unknown'
                break
        }
    }
    // Some nonsense
    contextReport.contextStatuses.push(...(placeboInserts ?? []))
    //

    let keyMaybe: ContextFieldStatus[] = []
    let keyAccepted: ContextFieldStatus[] = []

    const loreSearchText = storyText.slice(-MaxLoreSearchDistance)
    const lorebookMatches = keyMatches(
        loreSearchText,
        storyContent.lorebook.entries,
        !storyContent.lorebook.settings.orderByKeyLocations
    )
    for (const result of lorebookMatches.values()) {
        const loreEntry = result.entry
        const newStatus = new ContextFieldStatus(loreEntry)
        const category = storyContent.lorebook.categories.find((c) => c.id === loreEntry.category)
        newStatus.identifier = loreEntry.displayName
        newStatus.type = 'lore'
        const settings = newStatus.settings as LoreEntry

        if (loreEntry.enabled === false || category?.enabled === false) {
            newStatus.reason = ContextFieldReason.Disabled
            newStatus.included = false
            contextReport.disabled.push(newStatus)
            continue
        }

        // Add phrase biases to list
        const biases = []
        for (const b of loreEntry.loreBiasGroups) {
            if (result.index >= 0 === !b.whenInactive) {
                if (result.index < 0 && settings.nonStoryActivatable) continue
                biases.push(b)
            }
        }
        contextReport.biases.push({ groups: biases, identifier: newStatus.identifier })

        if (result.index >= 0) {
            newStatus.included = true
            newStatus.triggeringKey = result.key
            newStatus.keyIndex = result.index
            newStatus.keyRelative = settings.keyRelative
            newStatus.reason = settings.forceActivation
                ? ContextFieldReason.ActivationForced
                : ContextFieldReason.KeyTriggered
            keyAccepted.push(newStatus)
        } else {
            newStatus.included = false
            newStatus.reason = ContextFieldReason.NoKeyTriggered
            if (settings.nonStoryActivatable) {
                keyMaybe.push(newStatus)
            } else {
                contextReport.keyRejections.push(newStatus)
            }
        }
    }

    keyAccepted.sort((a, b) => {
        return b.keyIndex - a.keyIndex
    })

    for (const ephemeralContext of storyContent.ephemeralContext) {
        if (ephemeralContext === null) {
            continue
        }
        const status = new ContextFieldStatus(ephemeralContext)
        status.identifier =
            'E:' +
            (getEntryText(ephemeralContext).length > 12
                ? getEntryText(ephemeralContext).slice(0, 12) + '...'
                : getEntryText(ephemeralContext).slice(0, 15))
        status.type = 'ephemeral'
        if (isEphemeralEntryActive(ephemeralContext, storyContent.getStoryStep())) {
            status.included = true
            status.reason = ContextFieldReason.EphemeralActive
            contextReport.contextStatuses.push(status)
        } else {
            status.included = false
            status.reason = ContextFieldReason.EphemeralInactive
            contextReport.keyRejections.push(status)
        }
    }

    let change = 0
    do {
        let i = 0
        const origLength = keyMaybe.length
        while (i < keyMaybe.length) {
            let removed = false
            const entry = keyMaybe[i].contextField as LoreEntry
            for (const [j, activeContext] of contextReport.contextStatuses.entries()) {
                const prefix = activeContext.contextField.contextConfig.prefix
                const text = getEntryText(activeContext.contextField)
                const suffix = activeContext.contextField.contextConfig.suffix
                const result = isLoreEntryActive(entry, prefix + text + suffix)

                if (result.index >= 0) {
                    keyMaybe[i].included = true
                    keyMaybe[i].triggeringKey = result.key
                    keyMaybe[i].keyRelative = (keyMaybe[i].settings as LoreEntry).keyRelative
                    keyMaybe[i].reason = ContextFieldReason.KeyTriggeredNonStory + activeContext.identifier
                    j === keyAccepted.push(keyMaybe[i])
                    keyMaybe = [...keyMaybe.slice(0, i), ...keyMaybe.slice(i + 1)]
                    removed = true
                    break
                }
            }
            if (!removed)
                for (const [j, activeContext] of keyAccepted.entries()) {
                    const prefix = activeContext.contextField.contextConfig.prefix
                    const text = getEntryText(activeContext.contextField)
                    const suffix = activeContext.contextField.contextConfig.suffix
                    const result = isLoreEntryActive(entry, prefix + text + suffix)
                    if (result.index >= 0) {
                        keyMaybe[i].included = true
                        keyMaybe[i].triggeringKey = result.key
                        keyMaybe[i].keyRelative = (keyMaybe[i].settings as LoreEntry).keyRelative
                        keyMaybe[i].reason =
                            ContextFieldReason.KeyTriggeredNonStory + activeContext.identifier
                        keyAccepted.push(keyMaybe[i])
                        keyMaybe = [...keyMaybe.slice(0, i), ...keyMaybe.slice(i + 1)]
                        removed = true
                        break
                    }
                }

            if (removed) {
                const biases = []
                // Add phrase biases to list
                for (const b of entry.loreBiasGroups) {
                    if (!b.whenInactive) {
                        biases.push(b)
                    }
                }
                contextReport.biases.push({ groups: biases, identifier: entry.displayName })
            }

            if (!removed) i++
        }
        change = origLength - keyMaybe.length
    } while (change > 0)

    for (const maybe of keyMaybe) {
        const entry = maybe.contextField as LoreEntry
        // Add phrase biases to list
        const biases = []
        for (const b of entry.loreBiasGroups) {
            if (b.whenInactive) {
                biases.push(b)
            }
        }
        contextReport.biases.push({ groups: biases, identifier: entry.displayName })
    }

    contextReport.keyRejections = [...keyMaybe, ...contextReport.keyRejections]

    // Add category biases
    for (const category of storyContent.lorebook.categories) {
        const index = keyAccepted.findIndex((l) => (l.contextField as LoreEntry).category === category.id)
        const biases = []
        for (const group of category.categoryBiasGroups) {
            if ((index === -1) === group.whenInactive) {
                biases.push(group)
            }
        }
        contextReport.biases.push({ groups: biases, identifier: `C:${category.name}` })
    }

    const createdSubcontexts = []
    const rejectedSubContexts = []

    for (const category of storyContent.lorebook.categories) {
        if (category.createSubcontext) {
            const notInSubcontext = []
            const rejectedNotIn = []
            const inSubcontext: ContextFieldStatus[] = []
            const rejectedIn: ContextFieldStatus[] = []
            for (const status of keyAccepted) {
                if ((status.contextField as LoreEntry).category === category.id) {
                    inSubcontext.push(status)
                } else {
                    notInSubcontext.push(status)
                }
            }
            for (const status of contextReport.keyRejections) {
                if ((status.contextField as LoreEntry).category === category.id) {
                    rejectedIn.push(status)
                } else {
                    rejectedNotIn.push(status)
                }
            }

            const contextEntry = new ContextEntry(category.subcontextSettings.contextConfig) as LoreEntry
            contextEntry.id = category.id
            const contextStatus = new ContextFieldStatus(contextEntry)
            contextStatus.buildSubContext = subContextBuild(
                category,
                inSubcontext,
                rejectedIn,
                encoder,
                contextEntry,
                contextStatus
            )
            await contextStatus.buildSubContext()

            contextStatus.identifier = 'S:' + category.name
            contextStatus.type = 'lore'
            if (inSubcontext.length > 0) {
                createdSubcontexts.push(contextStatus)
            } else {
                rejectedSubContexts.push(contextStatus)
            }

            keyAccepted = notInSubcontext
            contextReport.keyRejections = rejectedNotIn
        }
    }
    contextReport.keyRejections = [...contextReport.keyRejections, ...rejectedSubContexts]
    contextReport.contextStatuses.push(...createdSubcontexts, ...keyAccepted)

    const resultReport = await buildContextFromReport(contextReport, contextLimit, encoder)
    const preamble = calcPreamble(
        storyContent.settings.model,
        preambleEnabled,
        resultReport.output.length === 0,
        !resultReport.storyTrimmed,
        storyContent.settings.prefix
    )
    resultReport.preamble = {
        str: preamble.str,
        tokens: preamble.exactTokens ?? (await encoder.encode(preamble.str)),
    }
    return resultReport
}

async function buildContextFromReport(
    contextReport: ContextReport,
    contextLimit: number,
    encoder: EncoderInterface
) {
    let context: string = ''
    let remainingContext = contextLimit
    let reservedContext = 0
    for (const status of contextReport.contextStatuses) {
        if (!status.settings.contextConfig) {
            logWarning('undefined contextConfig')
            status.settings.contextConfig = getDefaultLoreConfig()
        }
    }
    contextReport.contextStatuses.sort((a, b) => {
        return b.settings.contextConfig.budgetPriority - a.settings.contextConfig.budgetPriority
    })
    const maxTokenLengths = contextReport.contextStatuses.map(async (o) => {
        let cutString =
            o.settings.contextConfig.trimDirection === TrimDirection.TrimBottom
                ? o.settings.contextConfig.prefix +
                  getEntryText(o.contextField).slice(0, remainingContext * 8) +
                  o.settings.contextConfig.suffix
                : o.settings.contextConfig.prefix +
                  getEntryText(o.contextField).slice(-(remainingContext * 8)) +
                  o.settings.contextConfig.suffix
        if (o.contextField.text === '') {
            cutString = ''
        }
        const tokens = await encoder.encode(cutString)
        return tokens.length
    })

    for (const [index, contextStatus] of contextReport.contextStatuses.entries()) {
        const config = contextStatus.settings.contextConfig
        const transformedReserved = Number.isInteger(config.reservedTokens)
            ? config.reservedTokens
            : Math.floor(config.reservedTokens * contextLimit)

        const reserved = Math.min(transformedReserved, await maxTokenLengths[index])
        contextStatus.actualReservedTokens = reserved
        reservedContext += reserved
    }
    reservedContext = reservedContext > remainingContext ? remainingContext : reservedContext

    contextReport.stageReports.push(
        new ContextStageReport(
            contextReport.structuredOutput,
            reservedContext,
            remainingContext,
            (remainingContext - contextLimit) * -1
        )
    )
    const storyIdentifier = contextReport.contextStatuses.find((s) => s.type === 'story')?.unqiueId
    const insertAllowed = new Map(
        contextReport.contextStatuses.map((s) => {
            return [s.unqiueId, s.contextField.contextConfig.allowInsertionInside ?? false]
        })
    )
    if (storyIdentifier) insertAllowed.set(storyIdentifier, true)

    for (const contextStatus of contextReport.contextStatuses) {
        const config = contextStatus.settings.contextConfig
        const transformedBudget = Number.isInteger(config.tokenBudget)
            ? config.tokenBudget
            : Math.floor(config.tokenBudget * contextLimit)
        let reservedTokens = contextStatus.actualReservedTokens
        if (reservedTokens > 0 && reservedTokens > reservedContext) {
            reservedTokens = reservedContext
        }
        const alottedTokens = Math.min(remainingContext - reservedContext + reservedTokens, transformedBudget)

        if (contextStatus.buildSubContext) await contextStatus.buildSubContext(alottedTokens)
        if (!contextStatus.included) continue

        if (getEntryText(contextStatus.contextField).length === 0) {
            contextStatus.included = false
            contextStatus.state = ContextFieldState.NotIncluded
            contextStatus.reason = ContextFieldReason.NoText
            continue
        }

        let data = await dynamicTrim(contextStatus, alottedTokens, encoder)
        if (contextStatus.type === 'story' && data.tokenCount === 0) {
            data = await dynamicTrim(contextStatus, alottedTokens, encoder, false)
        }
        if (data.tokenCount === 0) {
            contextStatus.included = false
            contextStatus.state = ContextFieldState.NotIncluded
            contextStatus.reason = ContextFieldReason.NoSpace
            continue
        }

        contextStatus.state = data.trimmed ? ContextFieldState.PartiallyIncluded : ContextFieldState.Included
        contextStatus.includedText = data.text
        contextStatus.calculatedTokens = data.tokenCount
        const contextLength = context.length
        const insertPoint = await (contextStatus.keyRelative
            ? findKeyRelativeInsertionPoint(
                  context,
                  (contextStatus.contextField as LoreEntry).keys,
                  contextStatus.settings,
                  encoder
              )
            : findInsertionPoint(context, contextStatus.settings, encoder))
        const adjustedInsertPoint = contextStatus.contextField.contextConfig.allowInnerInsertion
            ? insertPoint
            : findSafeInsertionPoint(insertPoint, contextReport.structuredOutput, context, insertAllowed)
        if (insertPoint >= 0) context = insertEntry(adjustedInsertPoint, context, data.text)

        if (contextStatus.contextField.contextConfig.budgetPriority === 0) {
            contextReport.orderZeroPoint = adjustedInsertPoint
        } else if (adjustedInsertPoint < contextReport.orderZeroPoint) {
            contextReport.orderZeroPoint += data.text.length
        }

        if (context.length === contextLength) {
            contextStatus.state = ContextFieldState.NotIncluded
            contextStatus.reason = ContextFieldReason.NoContextKey
            contextStatus.included = false
        }
        if (contextStatus.included) {
            addStructuredOutput(
                contextReport,
                data.text,
                adjustedInsertPoint,
                contextStatus.unqiueId,
                contextStatus.type
            )
        }
        remainingContext -= data.tokenCount
        reservedContext -= reservedTokens

        {
            // Generate Stage Report
            const distance =
                contextStatus.settings.contextConfig.insertionPosition < 0
                    ? contextStatus.settings.contextConfig.insertionPosition * -1 - 1
                    : contextStatus.settings.contextConfig.insertionPosition
            const units = contextStatus.settings.contextConfig.insertionType + (distance !== 1 ? 's' : '')
            let direction =
                contextStatus.settings.contextConfig.insertionPosition >= 0
                    ? 'from the top'
                    : 'from the bottom'
            const order = contextStatus.settings.contextConfig.budgetPriority
            if (contextStatus.keyRelative) {
                direction =
                    contextStatus.settings.contextConfig.insertionPosition >= 0
                        ? 'below the last found key'
                        : 'above the last found key'
            }
            const shunt =
                insertPoint !== adjustedInsertPoint
                    ? `(shunted ${Math.abs(
                          insertPoint - adjustedInsertPoint
                      )} characters to prevent insertion inside another entry)`
                    : ''
            const descriptionText = `${contextStatus.identifier}
                ${distance} ${units} ${direction} ${shunt}`
            contextReport.stageReports.push(
                new ContextStageReport(
                    contextReport.structuredOutput,
                    reservedContext,
                    remainingContext,
                    (remainingContext - contextLimit) * -1,
                    descriptionText
                )
            )
        }
    }
    contextReport.output = context
    contextReport.tokens = await encoder.encode(context)
    contextReport.contextStatuses = [
        ...contextReport.contextStatuses,
        ...contextReport.keyRejections,
        ...contextReport.disabled,
    ]
    const storyStatus = contextReport.contextStatuses.find((s) => s.type === 'story')
    contextReport.storyTrimmed = storyStatus
        ? storyStatus.state !== ContextFieldState.PartiallyIncluded
        : false
    return contextReport
}

function addStructuredOutput(
    report: ContextReport,
    text: string,
    location: number,
    identifier: string,
    type: string
) {
    if (
        location < 0 ||
        (location > report.structuredOutput.map((o) => o.text).join('').length && location !== 0)
    ) {
        throw `Error creating structured output ${identifier} at location ${location}. Allowed range 0-${
            report.structuredOutput.map((o) => o.text).join('').length
        }`
    }
    let charactersToTraverse = location
    for (const [i, output] of report.structuredOutput.entries()) {
        if (charactersToTraverse - output.text.length <= 0) {
            const before = {
                text: output.text.slice(0, charactersToTraverse),
                identifier: output.identifier,
                type: output.type,
            }
            const after = {
                text: output.text.slice(charactersToTraverse),
                identifier: output.identifier,
                type: output.type,
            }
            const newOutput = []
            newOutput.push(...report.structuredOutput.slice(0, i))
            if (before.text.length > 0) {
                newOutput.push(before)
            }
            newOutput.push({ text: text, identifier: identifier, type: type })
            if (after.text.length > 0) {
                newOutput.push(after)
            }
            newOutput.push(...report.structuredOutput.slice(i + 1))
            report.structuredOutput = newOutput
            return
        }
        charactersToTraverse -= output.text.length
    }
    if (report.structuredOutput.length === 0) {
        report.structuredOutput.push({ text: text, identifier: identifier, type: type })
    }
}

async function dynamicTrim(
    contextStatus: ContextFieldStatus,
    remainingContext: number,
    encoder: EncoderInterface,
    enforceMinimum: boolean = true
): Promise<{ text: string; tokenCount: number; trimmed: boolean }> {
    const reverseTrim = contextStatus.settings.contextConfig.trimDirection === TrimDirection.TrimBottom
    const characterLimit = remainingContext * 8
    const data = reverseTrim
        ? getEntryText(contextStatus.contextField).slice(0, remainingContext * 8)
        : getEntryText(contextStatus.contextField).slice(-(remainingContext * 8))
    let prefix = contextStatus.settings.contextConfig.prefix
    let suffix = contextStatus.settings.contextConfig.suffix
    let tokenData: number[] = []
    let currentData: string = prefix + data + suffix
    if (reverseTrim) {
        prefix = contextStatus.settings.contextConfig.suffix
        suffix = contextStatus.settings.contextConfig.prefix
    }

    const origTokenData = await encoder.encode(currentData)

    // try to fit the entire thing
    tokenData = origTokenData

    const target =
        contextStatus.type === 'story'
            ? remainingContext
            : Math.min(tokenData.length, contextStatus.settings.contextConfig.reservedTokens)
    if (tokenData.length <= remainingContext) {
        contextStatus.trimMethod = TrimMethod.NoTrim
        return { text: currentData, tokenCount: tokenData.length, trimmed: false }
    }

    // if the entry was specified as DoNotTrim then return a failed trim
    if (contextStatus.settings.contextConfig.trimDirection === TrimDirection.DoNotTrim) {
        return { text: '', tokenCount: 0, trimmed: true }
    }

    // try to trim by lines
    const lines = data.split('\n')
    let tokenCount = origTokenData.length
    if (reverseTrim) {
        lines.reverse()
    }
    for (let index = 0; index < lines.length; index++) {
        const element = lines[index]
        const tempdata = lines.slice(index)

        const elementTokens = await encoder.encode(element)
        tokenCount -= elementTokens.length
        if (tokenCount > remainingContext) {
            continue
        }

        // found something that probably fits so continue
        if (reverseTrim) {
            tempdata.reverse()
        }
        currentData = reverseTrim
            ? suffix + tempdata.join('\n') + prefix
            : prefix + tempdata.join('\n') + suffix
        tokenData = await encoder.encode(currentData)
        if (enforceMinimum && (tokenData.length / target < 0.7 || target - tokenData.length > 150)) {
            break
        }
        if (tokenData.length <= remainingContext) {
            contextStatus.trimMethod = TrimMethod.Newline
            return { text: currentData, tokenCount: tokenData.length, trimmed: true }
        }
    }

    // if the maximum trim is newline then stop and return a failed trim
    if (contextStatus.settings.contextConfig.maximumTrimType === SeparationType.NewLine) {
        return { text: '', tokenCount: 0, trimmed: true }
    }

    // try to trim sentences
    const sentences = splitSentences(data)
    if (reverseTrim) {
        sentences.reverse()
    }
    tokenCount = origTokenData.length
    for (let index = 0; index < sentences.length; index++) {
        const element = sentences[index]
        const tempdata = sentences.slice(index)

        const elementTokens = await encoder.encode(element)
        tokenCount -= elementTokens.length
        if (tokenCount > remainingContext) {
            continue
        }

        // found something that probably fits so continue
        if (reverseTrim) {
            tempdata.reverse()
        }
        currentData = reverseTrim ? suffix + tempdata.join('') + prefix : prefix + tempdata.join('') + suffix

        tokenData = await encoder.encode(currentData)
        if (enforceMinimum && tokenData.length / target < 0.3) {
            break
        }
        if (tokenData.length <= remainingContext) {
            contextStatus.trimMethod = TrimMethod.Sentence
            return { text: currentData, tokenCount: tokenData.length, trimmed: true }
        }
    }

    // if the maximum trim is newline then stop and return a failed trim
    if (contextStatus.settings.contextConfig.maximumTrimType === SeparationType.Sentence) {
        return { text: '', tokenCount: 0, trimmed: true }
    }

    // nothing fits so just giveup and cut at token limit

    tokenData = await encoder.encode(data)
    const tokenPrefix = await encoder.encode(prefix)
    const tokenSuffix = await encoder.encode(suffix)

    if (reverseTrim) {
        tokenData.reverse()
        tokenPrefix.reverse()
        tokenSuffix.reverse()
    }

    const combined = [
        ...tokenPrefix,
        ...tokenData.slice(-1 * (remainingContext - tokenPrefix.length - tokenSuffix.length)),
        ...tokenSuffix,
    ]
    if (reverseTrim) {
        combined.reverse()
    }
    if (combined.length > remainingContext) {
        return { text: '', tokenCount: 0, trimmed: true }
    }

    const combinedText = await encoder.decode(combined)
    contextStatus.trimMethod = TrimMethod.Token
    return { text: combinedText, tokenCount: combined.length, trimmed: true }
}

async function findInsertionPoint(
    context: string,
    settings: ContextEntry,
    encoder: EncoderInterface
): Promise<number> {
    let insertIndex = settings.contextConfig.insertionPosition
    const negativeInsert = insertIndex < 0
    let insertedIndex = -1
    // newline insert
    if (settings.contextConfig.insertionType === SeparationType.NewLine) {
        const newlines = context.split(/(?=^)/m)
        if (negativeInsert) {
            newlines.reverse()
            insertIndex = (insertIndex + 1) * -1
        }
        // eslint-disable-next-line unicorn/prefer-ternary
        if (newlines.length < insertIndex) {
            insertedIndex = negativeInsert ? 0 : newlines.join('').length
        } else {
            insertedIndex = negativeInsert
                ? newlines.slice(insertIndex).join('').length
                : newlines.slice(0, insertIndex).join('').length
        }
        if (negativeInsert) {
            newlines.reverse()
            insertIndex = insertIndex * -1 - 1
        }
    }

    // sentence insert
    if (settings.contextConfig.insertionType === SeparationType.Sentence) {
        const sentences = splitSentences(context)
        if (negativeInsert) {
            sentences.reverse()
            insertIndex = (insertIndex + 1) * -1
        }
        // eslint-disable-next-line unicorn/prefer-ternary
        if (sentences.length < insertIndex) {
            insertedIndex = negativeInsert ? 0 : sentences.join('').length
        } else {
            insertedIndex = negativeInsert
                ? sentences.slice(insertIndex).join('').length
                : sentences.slice(0, insertIndex).join('').length
        }
        if (negativeInsert) {
            sentences.reverse()
            insertIndex = insertIndex * -1 - 1
        }
    }

    if (settings.contextConfig.insertionType === SeparationType.Token) {
        const tokenContext = await encoder.encode(context)
        const tokens = negativeInsert
            ? await encoder.decode(tokenContext.slice(tokenContext.length + (insertIndex + 1)))
            : await encoder.decode(tokenContext.slice(0, insertIndex))
        insertedIndex = negativeInsert ? context.length - tokens.length : tokens.length

        if (negativeInsert) {
            tokenContext.reverse()
            insertIndex = (insertIndex + 1) * -1
        }

        if (negativeInsert) {
            insertIndex = insertIndex * -1 - 1
        }
    }

    return insertedIndex
}

async function findKeyRelativeInsertionPoint(
    context: string,
    keys: string[],
    settings: ContextEntry,
    encoder: EncoderInterface
): Promise<number> {
    const insertIndex = settings.contextConfig.insertionPosition
    const lastKey = findLastKeyIndex(context, keys)
    if (lastKey.index === -1) {
        return -1
    }
    const negativeInsert = insertIndex < 0
    const key = context.slice(lastKey.index, lastKey.index + lastKey.length)
    const cutContext = !negativeInsert
        ? context.slice(0, lastKey.index + lastKey.length)
        : context.slice(lastKey.index)
    context = !negativeInsert
        ? context.slice(lastKey.index + lastKey.length)
        : context.slice(0, lastKey.index)
    if (
        settings.contextConfig.insertionType !== SeparationType.Token &&
        !(settings.contextConfig.insertionPosition === 0 || settings.contextConfig.insertionPosition === -1)
    ) {
        context = !negativeInsert ? 'DUMMY' + context : context + 'DUMMY'
    }

    let insertedIndex = await findInsertionPoint(context, settings, encoder)

    if (
        settings.contextConfig.insertionType !== SeparationType.Token &&
        !(settings.contextConfig.insertionPosition === 0 || settings.contextConfig.insertionPosition === -1)
    ) {
        context = !negativeInsert ? context.slice(5) : context.slice(0, -1 * 5)
    }
    context = !negativeInsert ? cutContext + context : context + cutContext
    insertedIndex = !negativeInsert ? cutContext.length + insertedIndex : insertedIndex

    if (
        settings.contextConfig.insertionType !== SeparationType.Token &&
        !(
            settings.contextConfig.insertionPosition === 0 || settings.contextConfig.insertionPosition === -1
        ) &&
        !negativeInsert
    ) {
        insertedIndex -= 'DUMMY'.length
    }

    return insertedIndex
}

export function keyMatches(
    searchText: string,
    entries: LoreEntry[],
    stopAtFirst: boolean,
    ignoreForceActivated: boolean = false
): Map<string, { key: string; index: number; length: number; entry: LoreEntry }> {
    const results = new Map<string, { key: string; index: number; length: number; entry: LoreEntry }>()
    for (const entry of entries) {
        try {
            const result = isLoreEntryActive(entry, searchText, stopAtFirst, undefined, ignoreForceActivated)
            results.set(entry.id, { ...result, entry })
        } catch (error: any) {
            logError(error, true, 'Failed to check lore entry:')
        }
    }
    return results
}

export function findSafeInsertionPoint(
    insertionPoint: number,
    structuredContext: StructuredOutput[],
    context: string,
    insertionAllowed: Map<string, boolean>
): number {
    let count = 0
    let startingIndex = 0
    for (const [i, context] of structuredContext.entries()) {
        count += context.text.length
        if (count >= insertionPoint) {
            startingIndex = i
            break
        }
    }
    const startingContext = structuredContext[startingIndex]
    if (
        startingContext === undefined ||
        insertionAllowed.get(startingContext.identifier) ||
        insertionPoint === context.length
    ) {
        return insertionPoint
    }
    let upperCount = count
    for (let index = startingIndex + 1; index < structuredContext.length; index++) {
        const element = structuredContext[index]
        if (element.identifier !== startingContext.identifier) {
            break
        }
        upperCount += element.text.length
    }

    let lowerCount = count - startingContext.text.length
    for (let index = startingIndex - 1; index >= 0; index--) {
        const element = structuredContext[index]
        if (element.identifier !== startingContext.identifier) {
            break
        }
        lowerCount -= element.text.length
    }
    if (insertionPoint - lowerCount > upperCount - insertionPoint) {
        return upperCount
    }
    return lowerCount
}

function insertEntry(index: number, context: string, text: string) {
    return context.slice(0, index) + text + context.slice(index)
}

const endingPunctuation = new Set(['.', '!', '?', '¿', '¡', '؟', '。', '？', '！'])
const whiteSpace = new Set([' ', '\n'])
const closingBrackets = new Set(['}', ')', ']'])
const commonTitles = new Set(['dr', 'mr', 'mrs', 'ms', 'esq'])
export function splitSentences(text: string): string[] {
    const sentences: string[] = []
    let inQuote = false
    let startIndex = 0
    let endIndex = 0
    let sentenceEnded = false
    let justFoundPeriod = false
    let abbreviation = false
    for (const [i, element] of [...text].entries()) {
        // If an acronym has started stall it out
        if (abbreviation) {
            if (/[^\d.A-Z]/.test(element)) {
                abbreviation = false
            } else {
                continue
            }
        }
        // Handle swapping in and out of quote state.
        if (quoteCharacters.has(element)) {
            inQuote = !inQuote
        }
        if (inQuote) {
            // Reset quotes on newline.
            if (element === '\n') {
                endIndex = i + 1
                sentences.push(text.slice(startIndex, endIndex))
                startIndex = endIndex
                sentenceEnded = false
                justFoundPeriod = false
                inQuote = false
                continue
            } else {
                // Otherwise continue until quotes are done.
                continue
            }
        }

        if (sentenceEnded) {
            if (justFoundPeriod && /\d/.test(element)) {
                // False Alarm: decimal number
                sentenceEnded = false
                continue
            }
            if (justFoundPeriod && /[A-z]/.test(element)) {
                // False Alarm: acronym
                sentenceEnded = false
                abbreviation = true
                continue
            }
            // Account for ellipses and include trailing whitespace
            if (element === '.' || whiteSpace.has(element) || closingBrackets.has(element)) {
                endIndex = i + 1
                justFoundPeriod = false
                continue
            } else {
                // Push new sentence
                sentences.push(text.slice(startIndex, endIndex))
                startIndex = endIndex
                sentenceEnded = false
                justFoundPeriod = false
            }
            continue
        }
        justFoundPeriod = false
        // Detect when a sentence has finished.
        if (endingPunctuation.has(element) || element === '\n') {
            if (element === '.') {
                let foundTitle = false
                for (const title of commonTitles) {
                    if (text.slice(i - title.length, i).toLocaleLowerCase() === title) {
                        // Found title, not a real sentence end
                        foundTitle = true
                        continue
                    }
                }
                if (foundTitle) continue
                justFoundPeriod = true
            }
            endIndex = i + 1
            sentenceEnded = true
        }
    }
    // Add any remaining characters as a final string
    const finalString = text.slice(startIndex)
    if (finalString !== '') sentences.push(finalString)
    return sentences
}
