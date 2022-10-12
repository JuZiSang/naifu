import {
    continuingPunctuation,
    endingPunctuation,
    speechPunctuation,
    pairedPunctuation,
    closingCharacters,
    isUpperCase,
    getLastLine,
    stripRepeatedOpening,
} from '../../util/util'
import { EventParser, IEventScript, EventState } from '../event/eventhandling'
import { InputMode } from '../story/inputmodes'
import { AdventureNode } from '../../components/conversation/schema'
import { StoryMode } from '../story/story'
import { isTouchScreenDevice } from '../../util/compat'

import Book from '../../assets/images/book-open.svg'
import Say from '../../assets/images/speech-bubble.svg'
import Do from '../../assets/images/walking.svg'

class DoScript implements IEventScript {
    input(state: EventState): EventState {
        if (!state.remember.get('event/inputIsEmpty')) {
            state.event.inputText = state.event.inputText.trim()
            if (state.event.inputText.length === 0) {
                const verbs = state.remember.getArray('moods/verbs/do')

                if (verbs.length > 0) {
                    state.event.inputText += verbs[Math.floor(Math.random() * verbs.length)]
                }
            } else {
                state.event.inputText = stripRepeatedOpening('> You', state.event.inputText)
            }
            if (
                !state.remember.get('event/inputIsUppercase') &&
                isUpperCase(state.event.inputText.charAt(0)) &&
                [...state.event.inputText].filter((char) => isUpperCase(char)).length === 1
            ) {
                state.event.inputText =
                    state.event.inputText.charAt(0).toLowerCase() + state.event.inputText.slice(1)
            }

            state.event.inputText =
                state.event.inputText.length > 0
                    ? `> You${/^['’]/.test(state.event.inputText) ? '' : ' '}${state.event.inputText}`
                    : '>'
            if (state.event.storyText.length > 0) {
                state.event.inputText = '\n' + state.event.inputText
            }
        }

        return state
    }
}

class SayScript implements IEventScript {
    input(state: EventState): EventState {
        if (!state.remember.get('event/inputIsEmpty')) {
            let prefix = ''
            let postfix = ''
            const verbs = state.remember.getStringArray('moods/verbs/say')
            const preverbs = state.remember.getStringArray('moods/preverbs/say')
            const postverbs = state.remember.getStringArray('moods/postverbs/say')
            let adverbs = [] as Array<string>

            if (state.remember.get('event/moods/neutral')) {
                adverbs = state.remember.getStringArray('moods/adverbs/say/simple')
            }

            state.event.inputText = state.event.inputText.trim()
            state.event.inputText = stripRepeatedOpening('> You say "', state.event.inputText, true)

            if (speechPunctuation.has(state.event.inputText.charAt(0))) {
                state.event.inputText = state.event.inputText.slice(1)
            }
            if (
                speechPunctuation.has(state.event.inputText.charAt(state.event.inputText.length - 1)) &&
                !state.remember.get('event/inputIsWildcard')
            ) {
                state.event.inputText = state.event.inputText.slice(0, -1)
            }

            let adverbChance = state.remember.getNumber('me/adverbChance')
            if (adverbChance <= 0) {
                adverbChance = Math.floor(Math.random() * 10) / 10
            }

            if (verbs.length > 0) {
                const chosenVerb = verbs[Math.floor(Math.random() * verbs.length)]
                let chosenWords = [chosenVerb]
                if (adverbs.length > 0) {
                    const roll = Math.random()

                    while (adverbChance > roll) {
                        const chosenIndex = Math.floor(Math.random() * adverbs.length)
                        const word = adverbs[chosenIndex]
                        adverbs.splice(chosenIndex, 1)
                        chosenWords.push(word)
                        adverbChance -= 1
                    }
                }

                if (chosenWords.length > 1) {
                    let lastIsNotVerb = true
                    let index = 0
                    chosenWords = [...chosenWords].sort(() => 0.5 - Math.random())
                    while (index < chosenWords.length) {
                        const word = chosenWords[index]

                        if (word === chosenVerb) {
                            lastIsNotVerb = true
                        } else if (lastIsNotVerb) {
                            lastIsNotVerb = false
                        } else {
                            chosenWords[index] = 0.5 >= Math.random() ? 'and ' + word : ', ' + word
                        }

                        index++
                    }
                }

                if (preverbs.length > 0 && Math.random() > 0.1) {
                    prefix += preverbs[Math.floor(Math.random()) * preverbs.length] + ' and '
                }

                for (const word of chosenWords) {
                    prefix += word.endsWith(',') ? word : word + ' '
                }
            }

            if (adverbChance < 1.5) {
                state.remember.set('me/adverbChance', Math.min(Math.max(adverbChance, 0.1) + 0.05, 1.1))
            }

            state.event.inputText =
                state.event.inputText.charAt(0).toUpperCase() + state.event.inputText.slice(1)

            state.event.inputText = '> You ' + prefix + '"' + state.event.inputText
            if (state.event.storyText.length > 0) {
                state.event.inputText = '\n' + state.event.inputText
            }

            if (!state.remember.get('event/inputIsWildcard')) {
                state.event.inputText += '"'

                if (postverbs.length > 0 && Math.random() > 0.95) {
                    postfix += ' ' + postverbs[Math.floor(Math.random() * postfix.length)]
                }
                state.event.inputText += postfix
            }
        }
        return state
    }
}

class StoryScript implements IEventScript {
    input(state: EventState): EventState {
        if (!state.remember.get('inputIsEmpty') && state.event.storyText.length > 0) {
            state.event.inputText = '\n' + state.event.inputText
        }
        return state
    }
}

class IsEmptyScript implements IEventScript {
    input(state: EventState): EventState {
        if (state.event.originalInputText.length === 0) {
            state.remember.set('event/inputIsEmpty', true)
        }

        return state
    }
}

class PunctuationScript implements IEventScript {
    input(state: EventState): EventState {
        if (!state.remember.get('event/inputIsWildcard') && !state.remember.get('event/inputIsEmpty')) {
            const finisher = speechPunctuation.has(
                state.event.inputText.charAt(state.event.inputText.length - 1)
            )
                ? state.event.inputText.slice(-1)
                : ''

            // Close quotes and add proper punctuation based on moods
            if (finisher) {
                state.event.inputText = state.event.inputText.slice(0, -1)
            }
            if (!endingPunctuation.has(state.event.inputText.charAt(state.event.inputText.length - 1))) {
                const moods = state.remember.getScope('moods')
                state.log(moods)
                state.event.inputText += moods.get('action') || moods.get('scream') ? '!' : '.'
            }

            if (state.remember.get('event/inputIsUppercase')) {
                state.event.inputText = state.event.inputText.toUpperCase()
            }

            state.event.inputText += finisher + '\n'
        }

        return state
    }
}

class MoodyScript implements IEventScript {
    input(state: EventState): EventState {
        let lastWord = state.event.originalInputText.split(' ').pop()
        if (!lastWord) {
            lastWord = state.event.originalInputText
        }

        if (lastWord.includes('?')) {
            state.remember.set('event/moods/wonder', true)
            state.remember.add('event/moods/verbs/say/wonder', ['ask'])
            state.remember.add('event/moods/verbs/do/wonder', [
                'question',
                'ask',
                'inquire',
                'think',
                'shrug',
                'contemplate',
                'ponder',
                'analyze',
                'imagine',
                'mull',
            ])
        }

        if (lastWord.includes('!')) {
            state.remember.set('event/moods/action', true)
            state.remember.add('event/moods/verbs/say/action', ['yell', 'shout'])
            state.remember.add('event/moods/verbs/do/action', [
                'wriggle',
                'bounce',
                'bump',
                'fling',
                'flop',
                'hurtle',
                'jolt',
                'snatch',
                'thrust',
                'dance',
                'grab',
                'pull',
                'pluck',
                'quiver',
                'jerk',
            ])
        }

        if (isUpperCase(state.event.inputText)) {
            state.remember.set('event/moods/scream', true)
            state.remember.set('event/inputIsUppercase', true)
            state.remember.add('event/moods/verbs/say/action', ['yell', 'shout'])
        }

        if (state.remember.get('event/inputIsInterruption')) {
            state.remember.add('event/moods/preverbs/say/interruption', ['interrupt'])
        }

        if (/^\w+[!.?]?$/.test(state.event.inputText)) {
            state.remember.set('event/moods/simple', true)
            state.remember.add('event/moods/adverbs/say/simple', ['plainly', 'simply'])
        }

        if (!state.remember.has('moods/verbs/say')) {
            state.remember.set('event/moods/verbs/say/neutral', ['say'])
            state.remember.set('event/moods/neutral', true)
        }

        if (lastWord.includes('...')) {
            state.remember.set('event/moods/ellipsis', true)
            state.remember.add('event/moods/verbs/say/ellipsis', ['groan', 'sigh', 'grumble'])
            state.remember.add('event/moods/postverbs/say/ellipsis', ['and trail off'])
        }

        const lastInputs = state.remember.getArray('me/lastInputs')
        if (lastInputs.includes(state.event.inputText) && !state.remember.get('event/inputIsWildcard')) {
            state.remember.set('event/moods/repeat', true)
            state.remember.add('event/moods/verbs/say/repeat', ['repeat', 'restate', 'echo'])
            state.remember.add('event/moods/postverbs/say/repeat', 'again')
        }
        lastInputs.push(state.event.originalInputText)
        if (lastInputs.length > 3) {
            lastInputs.shift()
        }
        state.remember.set('me/lastInputs', lastInputs)
        return state
    }
}

class IsInputWildcard implements IEventScript {
    input(state: EventState): EventState {
        let wildAction = false

        if (state.event.inputText.length === 0) {
            wildAction = true
        } else if (
            state.event.inputText.endsWith('*') &&
            [...state.event.inputText.matchAll(/\*/g)].length % 2 !== 0
        ) {
            wildAction = true
            state.event.inputText = state.event.inputText.slice(0, -1)
        } else if (
            state.event.inputText.toLowerCase().endsWith(' and') ||
            continuingPunctuation.has(state.event.inputText.charAt(state.event.inputText.length - 1))
        ) {
            wildAction = true
        }

        if (['!', '?'].includes(state.event.inputText)) {
            state.event.inputText = ''
            wildAction = true
        }

        if (wildAction) {
            state.remember.set('event/inputIsWildcard', true)
        }
        return state
    }
}

class HandleInterruption implements IEventScript {
    input(state: EventState) {
        if (state.event.inputText.length > 0) {
            const lastLine = getLastLine(state.event.storyText)
            let editOffset = 0
            let interruptText = ''

            // Find all open pairs
            let position = 0
            while (position < lastLine.length) {
                if (interruptText.includes(lastLine.charAt(position))) {
                    interruptText = interruptText.replace(lastLine.charAt(position), '')
                } else {
                    const closingCharacter = pairedPunctuation.get(lastLine.charAt(position))

                    if (closingCharacter) {
                        interruptText = closingCharacter + interruptText
                    }
                }
                position++
            }

            // Strip continuing punctuation, but let unusual strings pass
            if (
                continuingPunctuation.has(lastLine.charAt(lastLine.length - 1)) &&
                !continuingPunctuation.has(lastLine.charAt(lastLine.length - 2))
            ) {
                editOffset += -1
            }

            // Add a finisher if the sentence is interrupted
            if (
                !endingPunctuation.has(lastLine.charAt(lastLine.length - 1 + editOffset)) &&
                !closingCharacters.has(lastLine.charAt(lastLine.length - 1 + editOffset))
            ) {
                let isDialogue = false
                for (const punctuation of speechPunctuation) {
                    if (interruptText.includes(punctuation)) {
                        interruptText = '—' + interruptText
                        isDialogue = true
                        state.remember.set('event/inputIsInterruption', true)
                        break
                    }
                }
                if (!isDialogue && editOffset !== 0) {
                    interruptText = '.' + interruptText
                }
            }

            if (editOffset !== 0) {
                state.event.storyText = state.event.storyText.slice(0, editOffset)
            }
            state.event.storyText += interruptText
        }
        return state
    }
}

class TipperScript implements IEventScript {
    input(state: EventState) {
        const tips = [
            'What would you like to do?',
            'Tip: Be as wordy and natural as you want, the AI will get it',
            'Tip: Shortcuts and wildcards can be combined',
            'Tip: Push Send without an input to let the AI continue the story',
            "Tip: You can freely edit the story's text",
            "Tip: Try different settings to change the AI's behavior",
            'Wildcard: End your input with an asterisk or comma to let the AI expand on it',
            'Wildcard: Type only a ? to ask and wonder',
            'Wildcard: Type only a ! to shout and act',
            'Shortcut: Begin your input with a quote mark to say something',
            'Shortcut: Begin your input with > to do something',
            'Shortcut: Begin your input with ! to tell the story',
        ]

        if (!isTouchScreenDevice) {
            tips.push('Tip: Right-click on the story to open the context menu')
        }

        state.remember.set('mode/metadata/placeholderText', tips[Math.floor(Math.random() * tips.length)])
        return state
    }
}

class PerspectiveSwitch implements IEventScript {
    input(state: EventState) {
        const replacements = new Map<string, string>([
            // Manual Alternates
            ["I'm", "You're"],
            ["i'm", "You're"],
            ['I’m', 'You’re'],
            ['i’m', 'You’re'],
            ["I'", "You'"],
            ["i'", "You'"],
            ['I’', 'You’'],
            ['i’', 'You’'],
            ['I am', 'You are'],
            ['i am', 'You are'],
            ['I', 'You'],
            ['i', 'You'],
            // Automatic Alternates
            ['Me', 'You'],
            ['My', 'Your'],
            ['Mine', 'Yours'],
            ['Myself', 'Yourself'],
        ])

        for (const replacement of replacements) {
            if (replacement[0].startsWith('I') || replacement[0].startsWith('i')) continue
            replacements.set(replacement[0].toLowerCase(), replacement[1].toLowerCase())
            replacements.set(replacement[0].toUpperCase(), replacement[1].toUpperCase())
        }

        const text = state.event.inputText
        const split = text.split(/(?=["“”])/g)
        for (const [i] of split.entries()) {
            if (i % 2 === 1) continue
            for (const [key, value] of replacements.entries()) {
                if (key.startsWith('I') || key.startsWith('i')) {
                    let beforeLength = 0
                    const text = split.join('')
                    for (let index = 0; index < i; index++) {
                        beforeLength += split[index].length
                    }
                    if (isUpperCase(split[i])) {
                        split[i] = split[i].replace(new RegExp(`\\b${key}\\b`, 'g'), value.toUpperCase())
                        continue
                    }
                    const matches = split[i].matchAll(new RegExp(`\\b${key}\\b`, 'g'))
                    let offset = 0
                    for (const match of matches) {
                        const index = (match.index ?? -1) + offset
                        if (closingCharacters.has(text.charAt(beforeLength + index - 2))) {
                            if (endingPunctuation.has(text.charAt(beforeLength + index - 3))) {
                                split[i] =
                                    split[i].slice(0, index) + value + split[i].slice(index + key.length)
                            } else {
                                split[i] =
                                    split[i].slice(0, index) +
                                    value.toLowerCase() +
                                    split[i].slice(index + key.length)
                            }
                        } else if (endingPunctuation.has(text.charAt(beforeLength + index - 2))) {
                            split[i] = split[i].slice(0, index) + value + split[i].slice(index + key.length)
                        } else {
                            split[i] =
                                split[i].slice(0, index) +
                                value.toLowerCase() +
                                split[i].slice(index + key.length)
                        }
                        offset += value.length - key.length
                    }
                } else {
                    split[i] = split[i].replace(new RegExp(`\\b${key}\\b`, 'g'), value)
                }
            }
        }

        state.event.inputText = split.join('')

        return state
    }
}

const doMode = new InputMode(
    'DO',
    Do,
    [1 as StoryMode],
    [
        new EventParser(new IsEmptyScript()),
        new EventParser(new PerspectiveSwitch()),
        new EventParser(new HandleInterruption()),
        new EventParser(new IsInputWildcard()),
        new EventParser(new MoodyScript()),
        new EventParser(new DoScript()),
        new EventParser(new PunctuationScript()),
        new EventParser(new TipperScript()),
    ],
    [/^>(.*)/s],
    [],
    new AdventureNode('adventureDo', Do, /^>/)
)

const sayMode = new InputMode(
    'SAY',
    Say,
    [1 as StoryMode],
    [
        new EventParser(new IsEmptyScript()),
        new EventParser(new HandleInterruption()),
        new EventParser(new IsInputWildcard()),
        new EventParser(new MoodyScript()),
        new EventParser(new SayScript()),
        new EventParser(new PunctuationScript()),
        new EventParser(new TipperScript()),
    ],
    [/^"(.*)/s],
    [],
    new AdventureNode('adventureSay', Say, /^> You \S* "/)
)

const storyMode = new InputMode(
    'STORY',
    Book,
    [1 as StoryMode, 0 as StoryMode],
    [
        new EventParser(new IsEmptyScript()),
        new EventParser(new StoryScript()),
        new EventParser(new TipperScript()),
    ],
    [/^!(.{2,})/s],
    ['SAY']
)

class CommandScript implements IEventScript {
    input(state: EventState): EventState {
        if (state.event.inputText.length > 0) {
            state.event.inputText = `\n[ ${state.event.inputText} ] >`
        }
        return state
    }

    preContext(state: EventState): EventState {
        let modifiedContext = ''
        let commandAmount = 0
        const lines = state.event.contextText.split(/\n/)

        state.event.contextText = modifiedContext
        return state
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const commandMode = new InputMode(
    'CMD',
    Book,
    [1 as StoryMode],
    [
        new EventParser(new IsEmptyScript()),
        new EventParser(new CommandScript()),
        new EventParser(new HandleInterruption()),
    ],
    [/^"(.*)/s]
)

export const DefaultInputModes: Array<InputMode> = [doMode, sayMode, storyMode]
