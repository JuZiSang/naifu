import { StoryMode } from '../story/story'
import { InputMode } from '../story/inputmodes'
import { StoryContent, StoryMetadata } from '../story/storycontainer'
import { isAdventureModeStory } from '../../util/util'
import { logInfo } from '../../util/browser'

export enum EventTypes {
    unknown = 'unknown',
    storyInput = 'input',
    preContext = 'preContext',
    postContext = 'postContext',
    generation = 'generation',
}

export class EventState {
    event: StoryEvent
    currentContext: string = ''
    remember: RememberPack = new RememberPack()
    debugMessages: string[] = []

    constructor(event: StoryEvent) {
        this.event = event
    }

    logRemember(): void {
        for (const message of this.remember.messages) {
            this.debugMessages.push(`[${this.currentContext}/remember] ${message}`)
        }
        this.remember.messages = []
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    log(text: any): void {
        this.logRemember()
        this.debugMessages.push(`[${this.currentContext}] ${text}`)
    }
}

class EventContainer {
    event: StoryEvent
    states: EventState[] = []

    constructor(state: EventState) {
        this.event = state.event
        this.states.push(state)
    }
}

export class EventHandler {
    events: Array<EventContainer> = []
    remember = new RememberScope()
    storyContent: StoryContent
    storyMetadata: StoryMetadata
    inputMode?: InputMode
    inputModes: InputMode[] = []
    logging: boolean = false

    private newStateLine(state: EventState): void {
        const newLine = new EventContainer(JSON.parse(JSON.stringify(state)))
        this.events.push(newLine)
    }

    private pushState(state: EventState): void {
        this.events[this.events.length - 1].states.push(JSON.parse(JSON.stringify(state)))
    }

    constructor(
        storyContent: StoryContent,
        storyMetadata: StoryMetadata,
        inputMode?: InputMode,
        inputModes?: InputMode[]
    ) {
        this.storyContent = storyContent
        this.storyMetadata = storyMetadata
        if (inputMode) {
            this.inputMode = inputMode
        }
        if (inputModes) {
            this.inputModes = inputModes
        }
    }

    initialState(): EventState | undefined {
        return this.events[0]?.states[0]
    }

    finalResult(): EventState | undefined {
        return this.events[this.events.length - 1]?.states[
            this.events[this.events.length - 1]?.states.length - 1
        ]
    }

    isStoryEdit(): boolean {
        const initial = this.initialState()
        const final = this.finalResult()

        return initial && final ? final.event.storyText !== initial.event.storyText : false
    }

    handleEvent(event: StoryEvent): EventState {
        let activeMode = this.inputMode
        let state = new EventState(event)
        const storyMode = isAdventureModeStory(this.storyContent.settings)
            ? (1 as StoryMode)
            : (0 as StoryMode)
        const shortcutIgnores = activeMode?.shortcutIgnores ?? []

        if (event instanceof StoryInputEvent) {
            // Shortcuts
            for (const mode of this.inputModes) {
                if (
                    mode.storyModes.includes(storyMode) &&
                    activeMode !== mode &&
                    !shortcutIgnores.includes(mode.name)
                ) {
                    if (!activeMode) {
                        activeMode = mode
                        break
                    }

                    const response = mode.consumeShortcuts(event.inputText)
                    if (response.active) {
                        state.currentContext = mode.name
                        if (this.logging) {
                            state.log(`Consumed input '${event.inputText}' -> '${response.parsedInput}'`)
                        }

                        event.inputText = response.parsedInput
                        activeMode = mode

                        break
                    }
                }
            }
        }

        state.remember.set('story/metadata/title', this.storyMetadata.title)
        state.remember.set('event', this.remember)

        if (activeMode) {
            state.currentContext = activeMode.name
            const parsers = new Array<EventParser>()
            for (const parser of activeMode.parsers) {
                if (parser.canHandle(event)) {
                    parsers.push(parser)
                }
            }

            state.remember.set('mode/metadata/placeholderText', activeMode.placeholderText)

            this.newStateLine(state)

            for (const parser of parsers) {
                state.currentContext = activeMode.name + '/' + parser.script.constructor.name
                const newState = parser.parseState(state, this.logging)

                if (newState) {
                    newState.logRemember()
                    this.pushState(newState)
                    state = newState
                } else {
                    break
                }
            }

            activeMode.placeholderText = state.remember.getString('mode/metadata/placeholderText')
        } else {
            this.newStateLine(state)
        }

        if (this.logging) {
            for (const message of state.debugMessages) {
                logInfo(message)
            }
        }

        return state
    }
}

export class StoryEvent {
    readonly eventType: EventTypes = EventTypes.unknown
    storyText: string = ''
    inputText: string = ''
    readonly originalInputText: string = ''
    generate: boolean = true

    contextText: string = ''

    genText: string = ''
    readonly model: number = 0
}

export class StoryInputEvent extends StoryEvent {
    readonly eventType = EventTypes.storyInput
    storyText: string
    inputText: string
    readonly originalInputText: string
    generate: boolean = true

    constructor(storyText: string, inputText: string, generate: boolean) {
        super()
        this.storyText = storyText
        this.inputText = inputText
        this.originalInputText = inputText
        this.generate = generate
    }
}

export class PreContextEvent extends StoryEvent {
    readonly eventType = EventTypes.preContext
    contextText: string

    constructor(contextText: string) {
        super()
        this.contextText = contextText
    }
}

export class GenerationEvent extends StoryEvent {
    readonly eventType = EventTypes.generation
    genText: string
    storyText: string
    readonly model: number

    constructor(genText: string, storyText: string, model: number) {
        super()
        this.genText = genText
        this.storyText = storyText
        this.model = model
    }
}

type RememberType = string | number | boolean | Array<string | number | boolean> | RememberScope

export class RememberScope extends Map<string, RememberType> {}
const baseRememberScopes = new Set<string>(['event', 'me', 'mode', 'story'])

class RememberGetResult {
    multipleValues: Array<RememberType> = []
    value: RememberType | undefined
    scope: RememberScope | undefined
}

export class RememberPack {
    private _memory = new RememberScope()
    messages: string[] = []

    constructor() {
        for (const scope of baseRememberScopes) {
            this._memory.set(scope, new RememberScope())
        }
    }

    private _log(text: any): void {
        this.messages.push(`${text}`)
    }

    private _parsePath(path: string): Array<Array<string>> {
        const parsedPath = [] as Array<Array<string>>
        const steps = path.split(/[./]+/).filter((step) => step.length > 0)

        let firstStep = true
        for (const step of steps) {
            const forks = step.split(/[,|]+/).filter((fork) => fork.length > 0)

            if (firstStep) {
                const possibleScopes = forks.filter((fork) => baseRememberScopes.has(fork))
                const notScopes = forks.filter((fork) => !baseRememberScopes.has(fork))

                if (possibleScopes.length === 0) {
                    parsedPath.push([...baseRememberScopes])
                } else {
                    parsedPath.push(possibleScopes)
                }

                if (notScopes.length > 0) {
                    parsedPath.push(notScopes)
                }

                firstStep = false
            } else {
                parsedPath.push(forks)
            }
        }

        return parsedPath
    }

    private _memoryGet(path: string, getType: string, multiple: boolean): RememberGetResult {
        const steps = this._parsePath(path)
        let scope: RememberScope = this._memory
        let lastValue: RememberType | undefined
        const multipleValues = new Array<RememberType>()

        const scopes = new Array<Map<string, RememberScope | number>>()
        scopes.push(
            new Map<string, RememberScope | number>([
                ['scope', this._memory],
                ['position', 0],
                ['fork', 0],
            ])
        )

        let scopeIndex = 0
        while (scopeIndex < scopes.length) {
            const currentScope = scopes[scopeIndex]
            scope = currentScope.get('scope') as RememberScope
            let position = currentScope.get('position') as number
            let fork = currentScope.get('fork') as number

            while (position < steps.length) {
                const step = steps[position]

                if (step.length - 1 > fork) {
                    scopes.push(
                        new Map<string, RememberScope | number>([
                            ['scope', scope],
                            ['position', position],
                            ['fork', fork + 1],
                        ])
                    )
                }

                const value = scope.get(step[fork])
                fork = 0

                if (position === steps.length - 1) {
                    lastValue = value

                    if (multiple && lastValue instanceof RememberScope) {
                        multipleValues.push(...lastValue.values())
                    }
                } else {
                    if (!(value instanceof RememberScope)) {
                        break
                    } else {
                        scope = value
                    }
                }

                position++
            }

            if (getType !== '' && typeof lastValue !== getType) {
                lastValue = undefined
            }

            if (lastValue !== undefined && position >= steps.length) {
                if (!multiple) {
                    break
                } else {
                    multipleValues.push(lastValue)
                }
            }

            scopeIndex++
        }

        const result = new RememberGetResult()
        result.scope = scope
        result.value = lastValue
        if (multiple) {
            result.multipleValues = multipleValues
        }

        return result
    }

    get(path: string): RememberType | undefined {
        return this._memoryGet(path, '', false).value as RememberType | undefined
    }

    getScope(path: string): RememberScope {
        const value = this._memory.get(path)
        return value instanceof RememberScope ? value : new RememberScope()
    }

    getArray(path: string): Array<string | number | boolean> {
        const result = this._memoryGet(path, '', true)
        const valuesToCheck = result.multipleValues
        const values = new Array<string | number | boolean>()

        while (valuesToCheck.length > 0) {
            const value = valuesToCheck.shift()

            if (Array.isArray(value)) {
                values.push(...value)
            } else if (value instanceof RememberScope) {
                valuesToCheck.push(...value.values())
            } else if (value !== undefined) {
                values.push(value)
            }
        }

        return values
    }

    getStringArray(path: string): Array<string> {
        const result = this._memoryGet(path, '', true)
        const valuesToCheck = result.multipleValues
        const values = new Array<string>()

        while (valuesToCheck.length > 0) {
            const value = valuesToCheck.shift()

            if (Array.isArray(value)) {
                valuesToCheck.push(...value)
            } else if (value instanceof RememberScope) {
                valuesToCheck.push(...value.values())
            } else if (typeof value === 'string') {
                values.push(value)
            }
        }

        return values
    }

    getNumber(path: string): number {
        const result = this._memoryGet(path, 'number', false)
        return typeof result.value === 'number' ? result.value : 0
    }

    getString(path: string): string {
        const result = this._memoryGet(path, 'string', false)
        return typeof result.value === 'string' ? result.value : ''
    }

    set(path: string, value: RememberType, safe: boolean = false): boolean {
        const steps = this._parsePath(path)
        let map = this._memory

        if (steps[0].length !== 1) {
            steps[0] = [steps[0][0]]
        }

        let stepIndex = 0
        while (stepIndex < steps.length) {
            const step = steps[stepIndex]

            // Don't allow forks
            if (step.length > 1) {
                this._log(`Setting ${steps} to ${value} failed: no forks allowed.`)
                return false
            }

            const lastStep = stepIndex === steps.length - 1
            const stepValue = map.get(step[0])

            if (!lastStep) {
                if (stepValue instanceof RememberScope) {
                    map = stepValue
                } else if (stepValue === undefined || !safe) {
                    const newMap = new RememberScope()
                    map.set(step[0], newMap)
                    map = newMap
                } else {
                    this._log(`Setting ${steps} (${stepValue}) to ${value} failed: unsafe operation.`)
                    return false
                }
            } else {
                if (safe && stepValue !== undefined && typeof stepValue !== typeof value) {
                    this._log(`Setting ${steps} (${stepValue}) to ${value} failed: unsafe operation.`)
                    return false
                }
                map.set(step[0], value)
                this._log(`${steps} ${stepValue} => ${value}.`)
                return true
            }

            stepIndex++
        }

        this._log(`Setting ${steps} to ${value} failed.`)
        return false
    }

    has(path: string): boolean {
        return this._memoryGet(path, '', false).value !== undefined
    }

    add(
        path: string,
        value: string | number | boolean | Array<string | number | boolean>,
        safe: boolean = false
    ): boolean {
        const result = this._memoryGet(path, '', false)
        if (!Array.isArray(value)) {
            value = [value]
        }

        if (result.value === undefined) {
            return this.set(path, value)
        }

        if (Array.isArray(result.value)) {
            const resultArray = result.value as Array<string | number | boolean>
            value = value.filter((subvalue) => !resultArray.includes(subvalue))
            result.value.push(...value)
            return value.length > 0
        } else {
            return result.value instanceof RememberScope
                ? this.set(path, value, safe)
                : this.set(path, [...value, result.value], safe)
        }
    }
}

export interface IEventScript {
    unknown?(state: EventState): EventState
    input?(state: EventState): EventState
    generation?(state: EventState): EventState
    preContext?(state: EventState): EventState
    postContext?(state: EventState): EventState
}

export class EventParser {
    script: IEventScript
    remember = new RememberScope()

    constructor(script: IEventScript) {
        this.script = script
    }

    canHandle(event: StoryEvent): boolean {
        return typeof this.script[event.eventType] === 'function'
    }

    parseState(state: EventState, logging: boolean): EventState | null {
        if (this.canHandle(state.event)) {
            state.remember.set('me', this.remember)
            const oldState = JSON.parse(JSON.stringify(state))

            try {
                let result
                switch (state.event.eventType) {
                    case EventTypes.storyInput:
                        if (typeof this.script['input'] === 'function') {
                            result = this.script.input(state)
                        }
                        break
                    case EventTypes.preContext:
                        if (typeof this.script['preContext'] === 'function') {
                            result = this.script.preContext(state)
                        }
                        break
                    case EventTypes.postContext:
                        if (typeof this.script['postContext'] === 'function') {
                            result = this.script.postContext(state)
                        }
                        break
                    case EventTypes.generation:
                        if (typeof this.script['generation'] === 'function') {
                            result = this.script.generation(state)
                        }
                        break
                }

                if (logging) {
                    for (const change of this.logParse(oldState, JSON.parse(JSON.stringify(result)))) {
                        result ? result.log(change) : state.log(change)
                    }
                }

                if (result) {
                    this.remember = result.remember.getScope('me')
                    return result
                } else {
                    state.log('Script returned invalid state!')
                    state.log(result)
                    state.log(this)
                }
            } catch (error) {
                state.log('Script error!\n' + error + '\n')
                state.log(this)
            }
        }
        return null
    }

    logParse(oldState: EventState, newState: EventState): Set<string> {
        const changes = new Set<string>()
        const objectsToCheck: Array<any> = []
        objectsToCheck.push(oldState, newState)

        while (objectsToCheck.length > 0) {
            const oldObj = objectsToCheck.shift()
            const newObj = objectsToCheck.shift()

            for (const key of Object.keys(oldObj)) {
                const oldValue: any = oldObj[key as keyof EventState]
                const newValue: any = newObj[key as keyof EventState]

                if (oldValue !== newValue && typeof oldValue !== 'object') {
                    changes.add(`${key}: ${oldValue} => ${newValue}`)
                } else {
                    if (typeof newValue === 'object' && newValue !== null) {
                        objectsToCheck.push(oldValue, newValue)
                    }
                }
            }
        }

        return changes
    }
}
