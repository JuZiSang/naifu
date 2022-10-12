/* eslint-disable max-len */

import { Fragment, useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { FaEgg } from 'react-icons/fa'
import { AnimatePresence, motion } from 'framer-motion'
import { useRecoilState, useSetRecoilState } from 'recoil'
import { GiPerspectiveDiceSixFacesRandom } from 'react-icons/gi'

import Text from '../assets/images/text.svg'

import { transparentize } from '../util/colour'
import {
    SettingsIcon,
    SmallCrossIcon,
    FlaskIcon,
    PenWritingIcon,
    FunnelEmptyIcon,
    SearchIcon,
    HeartDisabledIcon,
    PlusIcon,
    ExportIcon,
    ImageDownIcon,
    ImportIcon,
    MindIcon,
    Icon,
} from '../styles/ui/icons'
import { SettingsModalOpen, TipState } from '../globals/state'
import { LightOffIcon, LightOnIcon } from '../styles/components/lorebook'
import { FlexCol } from '../styles/ui/layout'
import { getSessionStorage, setSessionStorage } from '../util/storage'
import { SubtleButton } from '../styles/ui/button'
import { groupBy } from '../util/util'
import Tooltip from './tooltip'
import { WarningButton } from './deletebutton'
import { SettingsPages } from './settings/constants'

const IconSpan = styled.span`
    > div,
    > svg {
        height: 1rem;
        width: 1rem;
        position: relative;
        margin: 0 0.1rem;
        top: 0.2rem;
        display: inline-block;
        cursor: default;
    }
`

function InlineIcon(props: { icon: JSX.Element }) {
    return <IconSpan>{props.icon}</IconSpan>
}

/** help_tips_eggs_chance determines the 0-1 float chance of an easter egg appearing in place of the next tip. */
const help_tips_eggs_chance = 0.00015
/** help_tips is a nested list containing tips composed of a to[ category, tip name and tip entry. */
/** Keep in mind this is ORDER OF APPEARANCE. Each tip should flow into the next, though they should still appear grouped in cateories. */
/** If implementing these into a modal, I recommend populating it by getting each element's first entry (category), adding that as a header if it doesn't exist, then adding an entry under the second element (title), then adding text under that title based on the third element (the tip itself). */
const help_tips = [
    /** NovelAI */
    [
        'NovelAI',
        'Tips',
        <>
            Tips will appear to give you helpful advice. If you don&apos;t want to see them, you can disable
            them in <InlineIcon icon={<SettingsIcon />} />
            <strong> Interface Settings</strong>.
        </>,
    ],
    /*
    [
        'NovelAI',
        'Navigating Tips',
        'Tap the Next button (>) to view another tip, or press the Previous button (<) to view the last that appeared. If you want to view a random tip, tap Shuffle with the button (🔀).',
    ],
    */
    [
        'NovelAI',
        'AI Storytelling',
        'NovelAI is an interactive AI-powered storyteller. You can write anything with the help of artificial intelligence! There are no limits!',
    ],
    [
        'NovelAI',
        'Capabilities',
        'Driven by AI, you can easily construct unique stories, thrilling tales, seductive romances, or even just fool around. Anything goes!',
    ],
    [
        'NovelAI',
        'Hypebot',
        <>
            AI-powered commentary! Toggle and configure it in the <InlineIcon icon={<SettingsIcon />} />
            <strong> AI Settings</strong> menu. You can even change the displayed commentator picture!
        </>,
    ],
    [
        'NovelAI',
        'Tutorial',
        <>
            Missed the Tutorial? You can always return to the Tutorial under the{' '}
            <InlineIcon icon={<FlaskIcon />} /> <strong>Flask</strong> icon. The Advanced Tutorial is
            available there too!
        </>,
    ],
    [
        'NovelAI',
        'Support',
        "If you ever need help don't be afraid to send us an email at support@novelai.net! More assistance can also be found on our Twitter, Discord and Reddit.",
    ],
    [
        'NovelAI',
        'Logging Out',
        <>
            You can log out from the <InlineIcon icon={<SettingsIcon />} /> <strong>User Settings</strong>{' '}
            menu.
        </>,
    ],
    /** Story */
    ['Story', 'Editor', 'You can type directly in the Editor text field! Click anywhere you want to type!'],
    [
        'Story',
        'Input, Output',
        "Press Send or hit CTRL + Enter to get the AI to respond. If you don't like what it was generated, hit Undo, Retry, or edit it yourself!",
    ],
    [
        'Story',
        'Generate Inline',
        "If you want to generate text to fill in a specific part of the story you can right click and select 'Generate Inline'.",
    ],
    [
        'Story',
        'Undo, Redo',
        'Your action history can be managed with Undo and Redo. The number next to Redo lets you select the previous AI outputs, like time travel!',
    ],
    [
        'Story',
        'Hotkeys',
        <>
            Want to be more efficient? There are a plethora of shortcuts and hotkeys at your disposal! Check
            out the Hotkeys section of the <InlineIcon icon={<SettingsIcon />} />
            <strong> Settings</strong> menu!
        </>,
    ],
    [
        'Story',
        'Story Library',
        'The panel on the left of the screen is the Menubar it houses your Library. Manage your Stories, Shelves, and Settings here.',
    ],
    [
        'Story',
        'Shelves',
        <>
            Stories can be stored within Shelves in the Story Library in the left Menubar. Use the{' '}
            <InlineIcon icon={<PenWritingIcon />} />
            <strong> Pencil</strong> icon to edit them!
        </>,
    ],
    [
        'Story',
        'Search',
        <>
            You can search all your existing Stories clicking the Your Stories bar in the Library on the left
            or hit the <InlineIcon icon={<SearchIcon />} />. Sort and filter results with{' '}
            <InlineIcon icon={<FunnelEmptyIcon />} />!
        </>,
    ],
    [
        'Story',
        'Favorites',
        <>
            Particularly fond of a specific Story? Simply tap the <InlineIcon icon={<HeartDisabledIcon />} />{' '}
            <strong>Heart</strong> icon to mark it as a favorite. Set Favorites to be shown up top in the{' '}
            <InlineIcon icon={<FunnelEmptyIcon />} />
            <strong>Filter</strong> options.
        </>,
    ],
    [
        'Story',
        'Story Options',
        'The sidebar on the right is the Options Sidebar. Here, you can add details to be remembered and control how the AI will interact with your story!',
    ],
    [
        'NovelAI',
        'Title Generation',
        <>
            Think your &apos;New Story&apos; could use a better name? Set one in the Story settings by tapping
            the <InlineIcon icon={<PenWritingIcon />} />
            <strong> Pencil</strong> icon in the Library, or tap the{' '}
            <InlineIcon icon={<GiPerspectiveDiceSixFacesRandom />} />
            <strong> Dice</strong> icon for the AI to generate one based on your story!
        </>,
    ],
    [
        'Story',
        'Color Coding',
        <>
            Text in the Editor is color-coded to show where the text came from. AI generations and user input
            / edits are all uniquely color coded. Edit the colors in the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Theme</strong> options anytime.
        </>,
    ],
    [
        'Story',
        'Context',
        'The AI can only see so much at once. See the extent of what the AI can remember in the Context Viewer.',
    ],
    [
        'Story',
        "Author's Note",
        "The Author's Note has near limitless usages. Use it to give the story a primary focus, set a writing style, author or tone elements.",
    ],
    [
        'Story',
        "Author's Note",
        "The text in your Author's Note is one of most recent things the AI sees in your Story Context, supercharging its influence over your story!",
    ],
    [
        'Story',
        "Author's Note",
        'Describe just about anything with a few short sentences and lend your story a focus, details, moods or give it premonitions to make something happen.',
    ],
    /*
    [
        'Story',
        "Author's Note",
        'Different formats can lead to different results: Describe things with words or tag your story with Authors, Genres, content Tags or Styles [ Style: Genre: Tag: ]',
    ],
    */
    [
        'Story',
        "Author's Note",
        "Text inside the Author's Note will make the AI strongly focus on that detail. Be careful, it's stronger than you think!",
    ],
    [
        'Story',
        'Memory',
        'The Memory field can be used to store broad details related to your current setting, your character, their companions and what has previously happened in your story.',
    ],
    [
        'Story',
        'Memory',
        'Place information that is always relevant to the story into Memory to have it influence the plot later. Memory will always stay within your Context',
    ],
    [
        'Story',
        'Memory',
        'Updating the Memory field with important story elements as they take place will help the AI stay more consistent.',
    ],
    [
        'Story',
        'Memory',
        'AI only remembers a limited Context, based on your subscription: 4000/8000 characters of story text & setup. Remember the context limit when entering long inputs!',
    ],
    [
        'Story',
        'Lorebook',
        'The Lorebook is used to store information that is not always relevant, which the AI refers to only when a custom keyword you select is activated.',
    ],
    [
        'Story',
        'Lorebook',
        'The Lorebook helps the AI refer to any information you provide or generate for the specific elements in your story, such as characters, events, or locations.',
    ],
    [
        'Story',
        'Lorebook',
        "The information stored in your Lorebook doesn't take up any space in your Story Context unless triggered by a keyword!",
    ],
    [
        'Story',
        'Lorebook',
        'Writing your Lorebook in the same tense and perspective as your story will yield more consistent results!',
    ],
    [
        'Story',
        'Lorebook',
        "Keep in mind AI isn't perfect and no matter how detailed you write your Lorebook description, there is a chance for it to mess up.",
    ],
    [
        'Story',
        'Lorebook',
        'If the AI has issues reflecting Lorebook information try to hammer in features such as a physical descriptors by using different synonyms for the same thing.',
    ],
    [
        'Story',
        'Lorebook',
        'Shows the AI the type of output you desire with the way you word your Lorebook entries and it will continue on in the same style.',
    ],
    [
        'Story',
        'Lorebook Keys',
        'Assign Lorebook Keys to each of your entries or the AI will not be able to refer to their information when the subjects of your Lorebook appear in your story!',
    ],
    [
        'Story',
        'Lorebook Keys',
        'Pick as many or as few keys that encompass your Lorebook subject. You can have them naturally appear in the story or force them to activate through your inputs whenever you want the AI to call up the desired information!',
    ],
    [
        'Story',
        'Lorebook Generation',
        <>
            Want the AI to fill in the blanks for you? Create a Lorebook entry with{' '}
            <InlineIcon icon={<PlusIcon style={{ maxWidth: '0.9rem' }} />} /> Entry and tap the{' '}
            <InlineIcon icon={<LightOffIcon />} /> icon to open up the Lore Generation options.
        </>,
    ],
    [
        'Story',
        'Lorebook Generation Types',
        'Decide what you want to generate! We have a whole range of available options in the Generation Type dropdown.',
    ],
    [
        'Story',
        'Lorebook Export',
        <>
            Want to back up your Lorebook or share it? Use the <InlineIcon icon={<ExportIcon />} /> to export
            it as .lorebook file or <InlineIcon icon={<ImageDownIcon />} /> to export it a .png image file!
        </>,
    ],
    [
        'Story',
        'Lorebook Import',
        <>
            You can easily import Lorebooks by using the <InlineIcon icon={<ImportIcon />} /> to import
            .lorebook files. The community tends to share a lot of them. You may want to give those a try!
        </>,
    ],
    [
        'Story',
        'Lorebook Generation Type',
        <>
            Make use of the <InlineIcon icon={<LightOnIcon />} />
            <strong> Lorebook Generation Type</strong> dropdown to generate specific entries.
        </>,
    ],
    [
        'Story',
        'Lorebook Generation Context',
        <>
            Toggle Memory, Author&apos;s Note and Story to have their information influence your{' '}
            <InlineIcon icon={<LightOnIcon />} />
            <strong> Lorebook Generations</strong>.
        </>,
    ],
    [
        'Story',
        'Lorebook Generation History',
        <>
            Previous <InlineIcon icon={<LightOnIcon />} />
            <strong> Lorebook Generations</strong> are kept in the Generation History. Keep in mind that
            Generation History resets on page refresh.
        </>,
    ],
    [
        'Story',
        'Advanced - Lorebook Generation Settings',
        <>
            You can adjust the settings of your <InlineIcon icon={<LightOnIcon />} />
            <strong> Lorebook Generations</strong> in the Defaults. Adjust the Model, Preset used or switch to
            the Legacy Lore Generation.
        </>,
    ],
    [
        'Story',
        'Advanced - Lorebook Regex',
        'Are you a computer wizard? If so, good news! The Lorebook supports regular expressions!',
    ],
    [
        'Story',
        'Advanced - Ephemeral Context',
        'Information added to Ephemeral Context will appear to the AI when that step of the Story is reached.',
    ],
    [
        'Story',
        'Right Click Context Menu',
        'NovelAI features a custom context menu. This is the menu that opens when you right click in the Editor! Use CTRL + right click to see the regular right click menu.',
    ],
    [
        'NovelAI',
        'Screenshot',
        'See a moment you want to capture? Select the text in the editor, use the right click context menu and hit Screenshot. You can even choose how it gets styled!',
    ],
    [
        'Story',
        'Import',
        <>
            The <InlineIcon icon={<ImportIcon />} />
            <strong> Import File</strong> button in the left Menubar can import supported files. Drag and Drop
            into the Editor works too!
        </>,
    ],
    [
        'Story',
        'Import Images containing NovelAI Data',
        <>
            Lorebooks and Lorebook entries can be exported into .png files. Import them with the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Import File</strong> button in the left Menubar, or drag and drop them into the Editor!
        </>,
    ],
    [
        'Story',
        'Looping',
        'When the AI starts repeating itself, remove the text from your Context. Switching up your Preset may also help!',
    ],
    [
        'Story',
        'AI Output Quality',
        "Proper English will produce better results, but don't let that stop you from experimenting around with the AI!",
    ],
    [
        'Story',
        'AI Output Quality',
        'The AI will pick up from your input - If you use grammatically correct English, it will output in the same vein.',
    ],
    [
        'Story',
        'Prompts',
        "Prompts are the text written before the first AI generation. It is the basis of your AI-generated story. The more initial text your Prompt has, the better the AI's outputs.",
    ],
    [
        'Story',
        'Inputs',
        "You don't need to finish sentences or have to enter text at all. Just hit the Send button to generate whenever you feel like it and watch the AI continue on!",
    ],
    [
        'Story',
        'Perspective and Tense',
        'Generally, it is best to write your story, the setup in the Options Sidebar and Lorebook entries in the same perspective and tense.',
    ],
    [
        'Story',
        'Comments',
        "Want to leave a note for later? Any line with '##' at the start will be ignored by the AI!",
    ],
    [
        'Story',
        'Experiment!',
        'AI-powered storytelling is cutting-edge technology. Play around and see what works for you! Go discover something new!',
    ],
    /** Scenarios */
    [
        'Scenarios',
        'Scenarios',
        'A Scenario is a template for a Story. You can create one by Exporting a Story as a Scenario, using the option in the Story Options panel on the right.',
    ],
    /*
    TODO: Enable when Learning Hub exists to be linked to
    [
        'Scenarios',
        'Placeholders',
        'If you want people to be able to fill out information before starting a Scenario you share, try adding Placeholders. These are defined like so: {1#Name[Default value]Title:Description}. The number at the start determines the order in which it shows up when starting the Scenario.',
    ],
    [
        'Scenarios',
        'Advanced Placeholders',
        "You can put Placeholders in Memory, Author's Note, and even Lorebooks as the activation key.",
    ],
    */
    /** Modules */
    [
        'Modules',
        'AI Modules',
        'Want a story in a different style? Try an AI Module! AI Modules can focus the AI into a style, genre, or setting.',
    ],
    [
        'Modules',
        'AI Modules',
        'Quickly draw upon specific topics, emulate famous authors, writing styles or provide reference material with AI Modules!',
    ],
    [
        'Modules',
        'Custom AI Module Training',
        <>
            You can train your own Custom AI Modules by using the Module Trainer in the{' '}
            <InlineIcon icon={<FlaskIcon />} />
            <strong> Flask</strong> menu on the top of the panel on the left.
        </>,
    ],
    [
        'Modules',
        'Custom AI Modules',
        'You can export and import Custom AI Modules! Share your favorite Custom AI Modules with the community or find a new favorite.',
    ],
    /*
    Would fit better in the Learning Hub
    [
        'Modules',
        'Module Steps',`
        'A step when relevant to Modules is a single chunk of text, about 1kb in size. You can train anything between 50 steps and however many you want, though more is not necessarily better. See the Module Trainer for more information!',
    ],
    */
    /** Generation Settings */
    [
        'Generation Settings',
        'Presets',
        'Different generation presets will change how the AI generates text. You can even make your own!',
    ],
    [
        'Generation Settings',
        'Randomness',
        'As Randomness increases, so do chances for less likely words. While this can make text more interesting, it can also make it less accurate. Balance is key!',
    ],
    [
        'Generation Settings',
        'Output Length',
        "A higher output length will make the AI respond with more text. It's actually measured in tokens, so the number of characters might vary.",
    ],
    [
        'Generation Settings',
        'Repetition Penalty',
        'Whenever a token appears in the Context, Repetition Penalty decreases the chance of it appearing again.',
    ],
    [
        'Generation Settings',
        'Repetition Penalty Range',
        'How many tokens Repetition Penalty will apply to. You can make only the latest tokens be penalized, though it might make the AI repeat from further up if you do!',
    ],
    [
        'Generation Settings',
        'Dynamic Repetition Penalty Range',
        'Makes the Repetition Penalty Range dynamic, setting it based on where the story text starts. This makes things more likely to be repeated from Memory, sometimes verbatim.',
    ],
    [
        'Generation Settings',
        'Repetition Penalty Slope',
        'Add a Repetition Penalty Slope if you want more recent tokens to be penalized more harshly, and tokens further up in the Story to be penalized less.',
    ],
    [
        'Generation Settings',
        'Change Settings Order',
        'The order sampling methods are applied can be changed! Each of them are pretty different.',
    ],
    [
        'Generation Settings',
        'Top-K Sampling',
        'The simplest sampling method. With Top-K the number set is how many tokens will be considered, discarding all but the highest probability ones.',
    ],
    [
        'Generation Settings',
        'Nucleus Sampling',
        'By adding up the probability of possible tokens until reaching the number given, Nucleus Sampling lets you only exclude the lowest probabilty tokens.',
    ],
    [
        'Generation Settings',
        'Tail-Free Sampling',
        "The least-likely tokens can be considered a 'tail'. Tail-Free Sampling tries to cut off that tail, removing unlikely tokens.",
    ],
    [
        'Generation Settings',
        'Top-A Sampling',
        'Considering the chance of the most-likely token, then removing tokens that are too improbable as compared to the most-likely is how Top-A Sampling works.',
    ],
    [
        'Generation Settings',
        'Typical Sampling',
        "Language carries information. Anything expected to have the most amount of information is the most 'Typical Sampling'.",
    ],
    [
        'Generation Settings',
        'Phrase Bias',
        'Add a token, word, or series of words to Phrase Bias to make it more or less likely, allowing you to have more exciting action scenes or more loving romances!',
    ],
    [
        'Generation Settings',
        'Banned Tokens',
        "If something comes up that you don't want to see, you can remove it using Banned Tokens. This will cause it to have no chance of appearing.",
    ],
    [
        'Generation Settings',
        'Tricky Tokens',
        'When a word keeps showing up even if you tried to ban it, consider using a Phrase Bias instead. Banned Tokens prevent a word or phrase from being completed, while a Phrase Bias decreases likelihood from the very first token.',
    ],
    [
        'Generation Settings',
        'Special Bracketing',
        "Wherever there's a token entry field, you can use [brackets] to give a token ID number such as [198], or {braces} to say 'only when it's exactly how I wrote it'.",
    ],
    [
        'Generation Settings',
        'Ban Bracket Generation',
        '[Brackets] tell the AI to treat whatever is inside as not a part of the tale itself. If you have Ban Bracket Generation on, the AI will not add these to your story.',
    ],
    [
        'Generation Settings',
        'Stop Sequences',
        'When you want your generations to stop at a certain token sequence, such as a new line, you can set a stop sequence for it.',
    ],
    [
        'Generation Settings',
        'Min EoS Output Length',
        'Only used in conjunction with Stop Sequences. Before the Min Output Length has been reached, it will continue even when hitting a Stop Sequence.',
    ],
    /** AI */
    /*
    [
        'AI',
        'AGI',
        'The AI of science fiction are most often actually AGI, or Artificial General Intelligence. NovelAI uses a standard AI, which does not have feelings—it simply emulates literature as best it can.',
    ],
    [
        'AI',
        'Parameters',
        "In AI, a parameter is essentially a synapse like in a human brain. Having more of these theoretically allows for more abstract conceptual links, but parameters aren't everything.",
    ],
    */
    [
        'AI',
        'Tokens',
        'Text is translated into tokens for the AI to understand. They are similar to syllables.',
    ],
    [
        'AI',
        'Context Management',
        'Because the AI only has so much Context it can see, remember not to give it too many details at once. Less can be more!',
    ],
    [
        'AI',
        'Negation',
        "There's a fun phenomenon known as the 'pink elephant' - try not to think about one, and it's there! AI works the same way, so try not to use words you don't want to see brought up.",
    ],
    [
        'AI',
        'AI Prompting',
        'Show and tell: provide the AI all kinds of prompts to get interesting results! Use everything from recipes to chat logs!',
    ],
    /** Writing */
    [
        'Writing',
        'Prose',
        "Text that follows standard writing conventions is referred to as 'prose'. The type of prose can vary—poetic stanzas, haikus, and so on. The AI will try to continue whatever you give it!",
    ],
    [
        'Writing',
        'Perspective',
        "If a story is told from the author's perspective, it is first person. Second person is when 'you' tell the story, and third person is telling you about other people. Try not to mix them up in the same story!",
    ],
    [
        'Writing',
        'Tense',
        'Remember to keep your tense consistent! Grammatically incorrect inputs might confuse the AI and produce lower quality outputs.',
    ],
    [
        'Writing',
        'Unfinished Sentences',
        "Because the AI continues off the last thing, you can leave sentences unfinished for unexpected results. Try writing things like 'The man was', to have the AI describe the subject.",
    ],
    /*
    [
        'Writing',
        'Finetune',
        'The AI has special data trained into it that teaches it a method of categorizing Stories. This format is: [ [ Author: (name); Tags: (relevant words); Genre: (genre) ]. Try it out sometime!',
    ],
    */
    [
        'Writing',
        'Dialogue',
        'Remember to close off speech with quotation marks, or the AI may confuse when the dialogue is supposed to end! Similarly, specifying a speaker helps the AI stay on-track with who is saying what.',
    ],
    [
        'Writing',
        'Telepathy',
        'Want to talk non-verbally? That kind of communication can be defined with different <formatting> symbols rather than quotation marks.',
    ],
    [
        'Writing',
        'Scene Change',
        'The dinkus (***) is used to tell the AI when to change scenes. You can also use an asterism (⁂) to tell it to start a whole new story!',
    ],
    ['Writing', 'As an Aside', 'You can use parentheses to give an aside in dialogue.'],
    [
        'Writing',
        'Lists',
        'Bullet points (•) or dashes (-) and other symbols can be used to prompt the AI to create lists.',
    ],
    [
        'Writing',
        'RPG Formatting',
        'Horizontal line (─), not to be confused with a dash, may be used for MMORPG-styled skills and statistics.',
    ],
    [
        'Writing',
        'Poetry and Lyrics',
        'The em space ( ) is used on a newline when creating poetry or lyrics. Em space is different to the en space and the regular space and makes a big difference!',
    ],
    [
        'Writing',
        'Quotations and Excerpts',
        'Use an en space ( ) at the beginning of a newline to effectively mark it as a quotation or excerpt. This is different to both em space and the regular space!',
    ],
    [
        'Writing',
        'World Constants',
        'If your world has something specific about it, you can inform the AI of this distinction in your Lorebooks.',
    ],
    [
        'Writing',
        'Up to Date',
        'The AI is trained in some recent events, popular fiction and even celebrities. Specifics may need further prompting, but you should find it quite capable of broad strokes!',
    ],
    /** Subscription */
    /*
    [
        'Subscription',
        'Subscription',
        'Details about your current Subscription can be viewed in the Account section of the Settings menu.',
    ],
    [
        'Subscription',
        'Tiers',
        'NovelAI operates on a monthly subscription model, because it costs money to host AI! The four tiers are Paper, Tablet, Scroll and Opus; details of which may be found on the NovelAI homepage.',
    ],
    [
        'Subscription',
        'Free Trial',
        'A Free Trial under the Paper Tier is offered to prospective users for 50 actions. Once this is up, it is not replenished outside of special events.',
    ],
    [
        'Subscription',
        'Renewal',
        'Subscriptions are renewed every 30 days and are based on exchange rate to the USD. If you cancel it before the end of the month, you keep everything you paid to have until the 30 days are up!',
    ],
    [
        'Subscription',
        'Upgrading',
        'If you want to upgrade to a higher tier, you can do so at a discount when you have an active subscription. You will only pay the upgraded rate for the remaining days of the 30-day period onward, which is a nice discount!',
    ],
    ['Subscription', 'Donation', 'Like NovelAI? Consider donating to the Patreon! patreon.com/novelai'],
    [
        'Subscription',
        'Priority',
        'Response time is managed by Priority. Every tier has Maximum Priority Actions, which will be as fast as possible. Tiers below Opus will consume these MPAs until they follow the regular queue.',
    ],
    */
    /** Privacy */
    /*
    [
        'Privacy',
        'Our Promise',
        'Everything you keep is safe and secure, for you to share at your own discretion. No one can read your stories unless you let them.',
    ],
    [
        'Privacy',
        'Encryption',
        'AES-256 is used to encrypt your Stories before being sent to the NovelAI servers. No one can access them without your encryption key.',
    ],
    */
    [
        'Privacy',
        'Storage',
        <>
            Choose where a Story is kept by toggling the Remote Storage option in{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Account</strong> Settings. Be aware that local data can be cleared with your browser
            cache. Back up your Stories regularly!
        </>,
    ],
    [
        'Privacy',
        'Bad Connection Story Conflicts',
        <>
            If you have too many Story Conflicts pop up due to a bad connection you can disable the pop-up in{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Account Settings</strong>.
        </>,
    ],
    [
        'Privacy',
        'Story Backup',
        <>
            Download all Stories regularly in <InlineIcon icon={<SettingsIcon />} />
            <strong> Account Settings</strong>, especailly if you use Local Storage and your browser cache get
            cleared, or if you lose access to your account.
        </>,
    ],
    [
        'Subscription',
        'Stored Content',
        <>
            Even if you cancel your Subscription, all content in your account is retained. A manual backup by
            clicking Download All Stories under <InlineIcon icon={<SettingsIcon />} />
            <strong> Account</strong> is recommended, in case of Account loss or browser cache clearing.
        </>,
    ],
    /** Settings */
    [
        'Settings',
        'User Settings',
        <>
            There are many options for you to tweak and choose in the Settings menu. To get there, find the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Cog</strong> icon in the left Sidebar, the Menubar.
        </>,
    ],
    [
        'Settings',
        'Streamed AI Responses',
        <>
            If you don&apos;t want text to appear as the AI outputs its response, disable the Stream AI
            Responses option in the <InlineIcon icon={<SettingsIcon />} />
            <strong> AI Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Streamed AI Response Speed',
        <>
            The streamed AI response speed can be adjusted below the Stream AI Responses option in the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> AI Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Continue Response to End of Sentence',
        <>
            The AI will try to continue generating until the end of a sentence is reached. You may disable
            this in the <InlineIcon icon={<SettingsIcon />} />
            <strong> AI Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Whitespace',
        'Issues with double newlines and trailing spaces can be avoided by having the Trim Excess Whitespace option enabled in AI settings.',
    ],
    [
        'Settings',
        'Force 1024 token limit',
        <>
            Test how a Scenario works for users on the Tablet tier, with this setting in the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> AI Settings</strong> to force the AI to a 1024 token context.
        </>,
    ],
    [
        'Settings',
        'Default Bias',
        <>
            Dinkuses (***) and asterisms (⁂) can appear too often. You can apply the Default Bias in{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> AI Settings</strong> to reduce how often they appear.
        </>,
    ],
    [
        'Settings',
        'Enable Token Probabilities',
        <>
            Enable Token Probabilities in your <InlineIcon icon={<SettingsIcon />} />
            <strong> AI Settings</strong>. The Token Probabilities Viewer can be accessed via the{' '}
            <InlineIcon icon={<MindIcon />} />
            <strong> Brain</strong> icon. It shows you the ten most likely tokens considered for the last
            generation.
        </>,
    ],
    [
        'Settings',
        'Sizes and Spacing',
        <>
            You can adjust the size of fonts, the spacing of paragraphs and lines, and a bunch of other things
            in the <InlineIcon icon={<SettingsIcon />} />
            <strong> Interface Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Gesture Controls',
        <>
            Accidentally opening the sidebars? You can disable Gesture Controls in the{' '}
            <InlineIcon icon={<SettingsIcon />} /> <strong>Interface Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Right Clicking',
        <>
            By default, right clicking the Editor opens the NAI context menu. You can change this in the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Interface Settings</strong> or hold CTRL during a right click.
        </>,
    ],
    /*
    [
        'Settings',
        'The Input Box is a special area for typing text to be added to the most recent part of your Story. If you prefer to just type in the Input Field instead, you can disable the special Input Box in the Interface section of your User Settings menu.',
    ],
    [
        'Settings',
        'Output Spellcheck',
        "For supported browsers, NAI has a default option that allows misspelled words to be highlighted by your web browser. If you don't want this to happen, turn Spellcheck off by disabling the setting in the Interface section of your User Settings menu.",
    ],
    */
    [
        'Settings',
        'Editor Lorebook Keys',
        <>
            Highlight words or phrases that activate a Lorebook entry in bold by enableing it in the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Interface Settings</strong>.
        </>,
    ],

    [
        'Settings',
        'Context Viewer Color Coding',
        <>
            Text within the Context Viewer is color coded by origin: Memory, Author&apos;s Note, Lorebook,
            Ephemeral Context or Story. If you prefer it to all be one color, you can disable this option in
            the <InlineIcon icon={<SettingsIcon />} />
            <strong> Interface section Interface Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Show Story Title',
        <>
            NovelAI shows the title of your Story at the top of the screen by default. If you prefer
            otherwise, you can disable it in <InlineIcon icon={<SettingsIcon />} />
            <strong> Interface Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Themes',
        <>
            Customize how your NovelAI experience looks in the <InlineIcon icon={<SettingsIcon />} />
            <strong> Theme Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Custom Themes',
        <>
            If you want a more personal experience, you can download custom Themes or even make your own with
            custom css in the <InlineIcon icon={<SettingsIcon />} />
            <strong> Theme Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Pen Name',
        <>
            Your Pen Name is listed on things you export for sharing. To set a Pen Name, visit the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Account Settings</strong>.
        </>,
    ],
    [
        'Settings',
        'Credentials',
        <>
            If you need to change your email or password, use the <InlineIcon icon={<SettingsIcon />} />{' '}
            <strong>Account Settings</strong>. Be careful not to forget them since a password reset will wipe
            locally stored data!
        </>,
    ],
    [
        'Settings',
        'Account ID',
        <>
            In case you ever need official NovelAI support, you can view your Account ID in the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Account Settings</strong>.
        </>,
    ],

    [
        'Settings',
        'Default Storage Location',
        'Choose to keep your Stories on your device, or upload them to the NovelAI servers. Local stories rely on your browser cache, which can be cleared on occasion. All Stories on the NovelAI servers are specially encrypted so only you can view them.',
    ],
    [
        'Settings',
        'Download All Stories',
        <>
            You can export all your stories at once in the <InlineIcon icon={<SettingsIcon />} />
            <strong> Account Settings</strong>.
        </>,
    ],
    /*
    [
        'Settings',
        'Ignore Remote Story Conflicts',
        'When the same Story has been changed on two different sessions simultaneously, NovelAI will let you know and ask you how to resolve the conflict. This check can be disabled in the Account section of your User Settings menu.',
    ],
    */
    [
        'NovelAI',
        'Gift Keys',
        <>
            If you want to give someone a Subscription to NovelAI, or just keep a key for later, you can
            purchase Gift Keys in your <InlineIcon icon={<SettingsIcon />} />
            <strong> Account Settings</strong>. Keys don&apos;t expire until used!
        </>,
    ],
    [
        'Settings',
        'Text-to-Speech',
        <>
            NovelAI features text-to-speech integration. You can configure it in the{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong> Text to Speech</strong> settings.
        </>,
    ],
    [
        'Settings',
        'Streamed Text-to-Speech',
        <>
            NovelAI features a high quality streamed text-to-speech integration powered by AI. Enable it in
            the <InlineIcon icon={<SettingsIcon />} />
            <strong> Text to Speech</strong> settings.
        </>,
    ],
    [
        'Settings',
        'Streamed Text-to-Speech Seeds',
        <>
            Use a custom voice seed to find unique voices in the Streamed{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong>Text to Speech</strong> settings.
        </>,
    ],
    [
        'Settings',
        'Speak Inputs, Outputs or both',
        <>
            Enable the our TTS to either read Inputs, Outputs or both in the Streamed{' '}
            <InlineIcon icon={<SettingsIcon />} />
            <strong>Text to Speech</strong> Settings.
        </>,
    ],
    [
        'Settings',
        'Speak HypeBot Comments',
        <>
            Enable HypeBot comments to be read by TTS in the Streamed <InlineIcon icon={<SettingsIcon />} />{' '}
            <strong>Text to Speech</strong> settings.
        </>,
    ],
    /*
    [
        'Settings',
        'Speak Outputs',
        To make the service Speak Outputs, simply find and enable the setting in the Text to Speech section of your User Settings menu.',
    ],
    [
        'Settings',
        'Speak Inputs',
        "When NovelAI's text-to-speech is enabled, you can even make it read the inputs within the Input Box by enabling the setting in the Text to Speech section of your User Settings menu.",
    ],
    */
    [
        'Settings',
        'Defaults',
        <>
            Set up your favorite AI Model, Preset and Module in the <InlineIcon icon={<SettingsIcon />} />{' '}
            <strong>Defaults</strong> section of the Settings menu.
        </>,
    ],
    [
        'Settings',
        'Changelogs',
        <>
            NovelAI keeps a list of all updates. You can find them in the{' '}
            <InlineIcon icon={<SettingsIcon />} /> <strong>Change Log</strong> in the settings and on
            novelai.net/updates.
        </>,
    ],
]
/** help_tips_eggs is a nested list in the same format containing amusing anecdotes. */
/** Unlike help_tips, these are selected RANDOMLY. Their appearance does not correlate to their position in the list. */
/** These are quite silly, and should have a very low chance of appearing, taking into account the cumulative hours spread across userbase. Add or remove at your leisure. */
const help_tips_eggs = [
    ['Easter Eggs', 'Canadian Geese', 'Truly the superior kind of goose. HONK!'],
    ['Easter Eggs', 'The End Goal', 'The perfect AI Waifu/Husbando.'],
    ['Easter Eggs', 'Basket Weaving', 'NovelAI is quite popular in basket weaving forums.'],
    ['Easter Eggs', 'Nurse Help!', 'If you shout loudly enough a nurse might come help you.'],
    [
        'Easter Eggs',
        'Logo Wars',
        'Try clicking some logos a few dozen times... there could be fallen heroes around...',
    ],
    ['Easter Eggs', 'Geese VS Rats', 'Did you know the geese won the Great Rat War of 2021?'],
]

export function TipDisplay(props: {
    clampLines: number
    center?: boolean
    dismissable?: boolean
}): JSX.Element {
    const [tipState, setTipState] = useRecoilState(TipState)
    const setSettingsModalOpen = useSetRecoilState(SettingsModalOpen)
    const [tipsDisabled, setTipsDisabled] = useState(() => getSessionStorage('tipsDisabled') === 'true')

    /** helpTipNav chooses the next tip. Argument is -1 for PREVIOUS, 0 for SHUFFLE or 1 for NEXT. Note this does not handle history - it is pure index navigation. Therefore, randomize followed by previous will result in the index prior to that chosen randomized index, accounting for index wrapping. */
    const helpTipNav = useCallback(
        (dir: number, first?: boolean) => {
            /** First, we check to see if we're going to choose an easter egg instead. */
            if (Math.random() <= help_tips_eggs_chance) {
                /** If we are, set the easterEggTip to a random index. */
                setTipState((v) => ({
                    ...v,
                    easterEggTip: Math.floor(Math.random() * help_tips_eggs.length - 1),
                }))
            } else {
                if (dir === 0) {
                    setTipState((v) => {
                        if (first && v.tip !== -1) return v
                        /** This gets a random index, adjusted for zero-indexing. */
                        let random
                        /** We account for if the shuffled number is the same as the current index, which would display the same tip. We account for this by showing the next tip in sequence, accounting for wrapping. */
                        do {
                            random = Math.floor(Math.random() * help_tips.length - 1)
                        } while (random === v.tip)
                        return { ...v, tip: random, easterEggTip: -1 }
                    })
                } else {
                    /** If we're not going to choose an easter egg, we just increment or decrement the index, preventing it from exceeding the min/max */
                    setTipState((v) => ({
                        ...v,
                        tip: (v.tip + dir + help_tips.length) % help_tips.length,
                        easterEggTip: -1,
                    }))
                }
            }
        },
        [setTipState]
    )

    useEffect(() => {
        helpTipNav(0, true)
    }, [helpTipNav])

    // Cycle tips over time
    useEffect(() => {
        const interval = setInterval(() => {
            helpTipNav(1)
        }, 30000)
        return () => clearInterval(interval)
    }, [helpTipNav])

    const tipInner = help_tips[tipState.tip] && (
        <>
            {tipState.easterEggTip === -1 ? (
                <>
                    <span style={{ fontWeight: 'bold' }}>{help_tips[tipState.tip][1]}:</span>
                    <span> {help_tips[tipState.tip][2]}</span>
                </>
            ) : (
                <>
                    <span style={{ fontWeight: 'bold' }}>
                        <FaEgg
                            style={{
                                position: 'relative',
                                top: '0.1rem',
                            }}
                        />{' '}
                        {help_tips_eggs[tipState.easterEggTip][1]}:
                    </span>
                    <span> {help_tips_eggs[tipState.easterEggTip][2]}</span>
                </>
            )}
        </>
    )

    if (tipsDisabled) return <Fragment />
    return (
        <div
            style={{
                fontSize: '0.875rem',
                display: 'flex',
                width: '100%',
            }}
        >
            {help_tips[tipState.tip] && (
                <Tooltip
                    style={{ width: '100%' }}
                    tooltip=""
                    elementTooltip={<div>{tipInner}</div>}
                    delay={100}
                    overflowChild={'#tip-text'}
                >
                    <AnimatePresence exitBeforeEnter>
                        <motion.div
                            key={tipState.tip}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: 'easeInOut' }}
                        >
                            <ClampedText lines={props.clampLines} center={props.center} id="tip-text">
                                {tipInner}
                            </ClampedText>
                        </motion.div>
                    </AnimatePresence>
                </Tooltip>
            )}
            {props.dismissable && (
                <CloseButton
                    onConfirm={() => {
                        setTipsDisabled(true)
                        setSessionStorage('tipsDisabled', 'true')
                    }}
                    warningText={
                        <div>
                            <div>Are you sure you want to disable tips for this session?</div>
                            <div>
                                You can re-enable or permanently turn off tips in the
                                <br />
                                <SubtleButton
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSettingsModalOpen(SettingsPages.Interface)}
                                >
                                    <InlineIcon icon={<SettingsIcon />} /> <strong>Interface Settings</strong>
                                    .
                                </SubtleButton>
                            </div>
                        </div>
                    }
                    confirmButtonText={'Turn off Tips for this session'}
                    label={'Turn off Tips?'}
                    iconURL={Text.src}
                    buttonText={<SmallCrossIcon style={{ width: '11px' }} />}
                />
            )}
        </div>
    )
}

export function TipsList(props: { showEasterEggs?: boolean }): JSX.Element {
    const categories = {} as Record<string, typeof help_tips>
    for (const tip of help_tips) {
        if (!categories[tip[0] as string]) categories[tip[0] as string] = []
        categories[tip[0] as string].push(tip)
    }
    return (
        <FlexCol>
            {Object.entries(categories).map(([category, tips], i) => (
                <div key={i}>
                    <h4>{category}</h4>
                    {tips.map((tip, index) => (
                        <div key={index} style={{ marginBottom: 10 }}>
                            <span style={{ fontWeight: 'bold' }}>{tip[1]}:</span>
                            <span> {tip[2]}</span>
                        </div>
                    ))}
                </div>
            ))}
            {props.showEasterEggs && (
                <div>
                    <h4>Easter Eggs</h4>
                    {help_tips_eggs.map((tip, index) => (
                        <div key={index}>
                            <span style={{ fontWeight: 'bold' }}>{tip[1]}:</span>
                            <span> {tip[2]}</span>
                        </div>
                    ))}
                </div>
            )}
        </FlexCol>
    )
}

const CloseButton = styled(WarningButton)`
    opacity: 0.3;
    padding: 0 10px;
    width: auto;
    background: none;
    > div {
        background-color: ${(props) => props.theme.colors.textMain};
    }

    &:hover {
        background: none;
        opacity: 0.7;
    }
`

const ClampedText = styled.div<{ lines: number; center?: boolean }>`
    line-height: 1.5rem;
    color: ${(props) => transparentize(0.3, props.theme.colors.textMain)};
    ${Icon} {
        background-color: ${(props) => transparentize(0.3, props.theme.colors.textMain)};
    }
    text-align: ${(props) => (props.center ? 'center' : 'left')};
    overflow: hidden;
    text-overflow: ellipsis;
    // Should be replaced with line-clamp when/if it becomes availiable
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp for more information
    display: -webkit-box;
    -webkit-line-clamp: ${(props) => props.lines};
    -webkit-box-orient: vertical;
`
