import { createModelSchema, primitive, deserialize } from 'serializr'
import { ContextEntry, getDefaultEphemeralConfig } from './contextfield'

export class EphemeralEntry extends ContextEntry {
    startingStep: number = 1
    delay: number = 0
    duration: number = 1
    repeat: boolean = false
    reverse: boolean = false
    static deserialize(entry: string): EphemeralEntry {
        return deserialize(EphemeralEntry, JSON.parse(entry) as EphemeralEntry)
    }
}

createModelSchema(EphemeralEntry, {
    startingStep: primitive(),
    delay: primitive(),
    duration: primitive(),
    repeat: primitive(),
    reverse: primitive(),
})

export function isEphemeralEntryActive(entry: EphemeralEntry, step: number): boolean {
    if (entry === null) {
        return false
    }
    step -= entry.startingStep
    if (step < 0) {
        return false != entry.reverse
    }
    if (entry.duration === 0) {
        return step >= entry.delay != entry.reverse
    }
    return entry.repeat
        ? step % entry.delay < entry.duration != entry.reverse
        : (step >= entry.delay && step < entry.delay + entry.duration) != entry.reverse
}

export function buildEphemeralContext(data: string, step: number): EphemeralEntry {
    data = data.slice(1, -1)
    let split = data.split(':')
    const text = split.slice(1).join(':').replace(/\\n/g, '\n')

    const entry = new EphemeralEntry(getDefaultEphemeralConfig(), text)

    data = split[0]

    if (data.charAt(0) === '!') {
        entry.reverse = true
        data = data.slice(1)
    }

    split = data.split(',')
    let location = 0
    if (split.length === 1) {
        location = Number.parseInt(split[0])
        location = Number.isNaN(location) ? 0 : location
        entry.contextConfig.insertionPosition = location
        entry.startingStep = step
    } else {
        location = Number.parseInt(split[1])
        location = Number.isNaN(location) ? 0 : location
        entry.contextConfig.insertionPosition = location
        data = split[0]
        split = data.split('~')
        if (split.length !== 1) {
            entry.duration = Number.parseInt(split[1])
            entry.duration = Number.isNaN(entry.duration) ? 0 : entry.duration
        }
        data = split[0]
        split = data.split('+')
        if (split.length !== 1) {
            if (split[1].charAt(split[1].length - 1) === 'r') {
                entry.repeat = true
            }
            let temp = Number.parseInt(split[1])
            temp = Number.isNaN(temp) ? 0 : temp
            entry.delay += temp
        }
        data = split[0]
        entry.startingStep = Number.parseInt(data)
        entry.startingStep = Number.isNaN(entry.startingStep) ? step : entry.startingStep
    }
    if (entry.contextConfig.insertionPosition === -1) {
        entry.contextConfig.suffix = ''
    }
    return entry
}

export function entryToText(entry: EphemeralEntry): string {
    const text = `{${entry.reverse ? '!' : ''}${entry.startingStep}${
        entry.delay !== 0 ? '+' + entry.delay : ''
    }${entry.repeat ? 'r' : ''}${entry.duration !== 1 ? '~' + entry.duration : ''},${
        entry.contextConfig.insertionPosition
    }:${entry.text.replace(/\n/g, '\\n')}}`

    return text
}
