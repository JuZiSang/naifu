import { EventParser } from '../event/eventhandling'
import { AdventureNode } from '../../components/conversation/schema'
import { PlatformImageData } from '../../compatibility/platformtypes'
import { StoryMode } from './story'

export class ShortcutResponse {
    parsedInput: string
    active: boolean

    constructor(parsedInput: string, active: boolean) {
        this.parsedInput = parsedInput
        this.active = active
    }
}

export class InputMode {
    name: string
    icon: PlatformImageData
    placeholderText: string
    storyModes: StoryMode[]
    parsers: EventParser[]
    shortcuts: RegExp[]
    shortcutIgnores: string[]
    node?: AdventureNode

    constructor(
        name: string,
        icon: PlatformImageData,
        storyModes: StoryMode[],
        parsers: EventParser[] = [],
        shortcuts: RegExp[] = [],
        shortcutIgnores: string[] = [],
        node?: AdventureNode,
        placeholderText: string = 'What would you like to do?'
    ) {
        this.name = name
        this.icon = icon
        this.storyModes = storyModes
        this.parsers = parsers
        this.shortcuts = shortcuts
        this.shortcutIgnores = shortcutIgnores
        this.placeholderText = placeholderText
        if (node) {
            this.node = node
        }
    }

    consumeShortcuts(input: string): ShortcutResponse {
        let parsedInput = input
        let isActive = false

        for (const shortcut of this.shortcuts) {
            const exec = shortcut.exec(input)
            if (exec) {
                isActive = true
                parsedInput = exec[1]
                break
            }
        }

        return new ShortcutResponse(parsedInput, isActive)
    }

    stringIsNode(text: string): boolean {
        return this.node?.regex ? this.node.regex.test(text) : false
    }
}
