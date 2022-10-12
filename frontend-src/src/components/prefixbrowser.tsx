import styled from 'styled-components'
import { useMemo, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { toast } from 'react-toastify'
import { transparentize } from '../util/colour'
import { PrefixOptions } from '../data/story/defaultprefixes'
import { ArrowDownIcon, ArrowUpIcon, Icon } from '../styles/ui/icons'
import { CustomModules, SelectedStoryId, Session } from '../globals/state'
import Trash from '../assets/images/trash.svg'
import { getStorage } from '../data/storage/storage'
import { GlobalUserContext } from '../globals/globals'
import { filterModules } from '../hooks/useModuleOptions'
import { prefixModel } from '../util/models'
import { isModuleImageValid } from '../util/util'
import { SubtleButton } from '../styles/ui/button'
import { ModuleMatchResult, SearchFilter } from '../data/storage/search'
import { StoryMode } from '../data/story/story'
import { AIModule } from '../data/story/storysettings'
import { DefaultModel } from '../data/request/model'
import { PlatformImageData } from '../compatibility/platformtypes'
import { logError } from '../util/browser'
import { getUserSetting } from '../data/user/settings'
import { TextHighlight } from './util/texthighlight'
import Tooltip from './tooltip'

const moduleFilter = new SearchFilter()

const Card = styled.div`
    flex: 1 1 250px;
    cursor: pointer;
    position: relative;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    transition: box-shadow 0.1s ease-in-out, background 0.1s ease-in-out;
    margin-bottom: 10px;
    &:hover {
        box-shadow: 0 0 5px 2px ${(props) => transparentize(0.67, props.theme.colors.bg3)};
        background: ${(props) => transparentize(0.67, props.theme.colors.bg3)};
    }
    & > div {
        position: relative;
    }
    & > div:nth-child(1) {
        height: 130px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        & > h4 {
            z-index: 100;
            position: relative;
            padding: 0 20px;
        }
        &::after {
            content: '';
            background: linear-gradient(
                to bottom,
                ${(props) => transparentize(0.93, props.theme.colors.bg0)} 0%,
                ${(props) => transparentize(0.6, props.theme.colors.bg0)} 50%,
                ${(props) => transparentize(0.27, props.theme.colors.bg0)} 100%
            );
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 50;
        }
        img {
            height: 120px;
            object-fit: cover;
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 50;
            object-position: center;
        }
    }
    & > div:nth-child(2) {
        padding: 10px 15px;
        font-size: 0.9rem;
    }
`

const CustomCard = styled(Card)`
    cursor: pointer;
    position: relative;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    transition: box-shadow 0.1s ease-in-out, background 0.1s ease-in-out;
    min-height: 100px;
    flex: 1 1 auto;
    margin-bottom: 0;

    &:hover {
        box-shadow: 0 0 5px 2px ${(props) => transparentize(0.67, props.theme.colors.bg3)};
        background: ${(props) => transparentize(0.67, props.theme.colors.bg3)};
    }
    & > div {
        position: relative;
    }
    & > div:nth-child(1) {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
    }
`

const CollapsibleCategory = styled.div`
    margin-bottom: 15px;
    & > button:nth-child(1) {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
        padding-bottom: 10px;
        margin-bottom: 15px;
        cursor: pointer;
        & > div:nth-child(1) {
            display: flex;
            flex-direction: column;
            h4 {
                margin-bottom: 0;
                color: ${(props) => props.theme.colors.textMain};
            }
        }
        & > div:nth-child(2) {
            display: flex;
            justify-content: center;
            align-items: center;
        }
    }
    & > div:nth-child(2) {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 20px;
        justify-content: stretch;
        @media (max-width: 800px) {
            grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 500px) {
            grid-template-columns: 1fr;
        }
    }
`

export const DeleteIcon = styled(Icon)`
    opacity: 0.9;
    align-self: center;
    height: 1.5rem;
    width: 1.5rem;
    mask-size: 1rem 1rem;

    mask-image: url(${Trash.src});
    background: ${(props) => props.theme.colors.textMain};
`

export const CustomModuleContainer = styled.div`
    flex: 1 1 250px;
    display: flex;
    flex-direction: column;
`

export const CustomModuleControls = styled.div`
    flex: 0 0 auto;
    padding: 5px 5px 0 5px;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    background: ${(props) => props.theme.colors.bg1};
    border-top: none;
`

export const ModuleSearchBox = styled.input`
    margin-bottom: 20px;
`

function PrefixBrowserCategory(props: {
    title: string
    subtitle: string
    options: { id: string; name: string; description: string; mode: StoryMode; image: PlatformImageData }[]
    onSelect: (prefix: string) => void
    filter: string
}): JSX.Element {
    const [collapsed, setCollapsed] = useState(false)
    const filteredOptions = moduleFilter.moduleMatch(props.options as AIModule[], props.filter)
    return filteredOptions.length > 0 ? (
        <CollapsibleCategory>
            <SubtleButton onClick={() => setCollapsed(!collapsed)}>
                <div>
                    <h4>{props.title}</h4>
                    <div>{props.subtitle}</div>
                </div>
                <div>{collapsed ? <ArrowUpIcon /> : <ArrowDownIcon />}</div>
            </SubtleButton>
            <div>
                {!collapsed &&
                    filteredOptions.map((result, i) => (
                        <Card
                            key={i}
                            onClick={() => props.onSelect(result.module.id)}
                            onKeyDown={(e) => e.key === 'Enter' && props.onSelect(result.module.id)}
                            tabIndex={0}
                            aria-label={result.module.name ?? ''}
                            // eslint-disable-next-line jsx-a11y/aria-props
                            aria-description={result.module.description ?? ''}
                            role="button"
                        >
                            <div>
                                <LazyLoadImage
                                    effect="opacity"
                                    src={(result.module.image as PlatformImageData)?.src ?? ''}
                                />
                                <h4>
                                    <TextHighlight text={result.module.name ?? ''} highlight={result.name} />
                                </h4>
                            </div>
                            <div>
                                <TextHighlight
                                    text={result.module.description}
                                    highlight={result.description}
                                />
                            </div>
                        </Card>
                    ))}
            </div>
        </CollapsibleCategory>
    ) : (
        <></>
    )
}

function CustomPrefixes(props: {
    title: string
    subtitle: string
    onSelect: (prefix: string) => void
    filter: string
}): JSX.Element {
    const [collapsed, setCollapsed] = useState(false)
    const [customModules, setCustomModules] = useRecoilState(CustomModules)
    const session = useRecoilValue(Session)
    const selectedStoryId = useRecoilValue(SelectedStoryId)

    const filteredModules = useMemo(() => {
        const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStoryId)
        if (!currentStoryContent) return moduleFilter.moduleMatch(customModules, props.filter)
        const storyModel =
            currentStoryContent?.settings?.model ??
            getUserSetting(session.settings, 'defaultModel') ??
            DefaultModel
        return moduleFilter.moduleMatch(
            customModules.filter(filterModules(prefixModel(storyModel))),
            props.filter
        )
    }, [customModules, props.filter, selectedStoryId, session.settings.defaultModel])

    const deleteModule = async (module: ModuleMatchResult) => {
        try {
            await getStorage(session).deleteModule(module.module)
            setCustomModules([
                ...customModules.filter((_module) => _module.remoteId !== module.module.remoteId),
            ])
        } catch (error: any) {
            logError(error)
            toast(`${error.message ?? error}`)
        }
    }

    return filteredModules.length > 0 ? (
        <CollapsibleCategory>
            <SubtleButton onClick={() => setCollapsed(!collapsed)}>
                <div>
                    <h4>{props.title}</h4>
                    <div>{props.subtitle}</div>
                </div>
                <div>{collapsed ? <ArrowUpIcon /> : <ArrowDownIcon />}</div>
            </SubtleButton>
            <div>
                {!collapsed &&
                    filteredModules.map((result, i) => (
                        <CustomModuleContainer key={i}>
                            <CustomCard
                                onClick={() => props.onSelect(result.module.id)}
                                onKeyDown={(e) => e.key === 'Enter' && props.onSelect(result.module.id)}
                                tabIndex={0}
                                aria-label={result.module.name}
                                // eslint-disable-next-line jsx-a11y/aria-props
                                aria-description={result.module.description}
                                role="button"
                            >
                                <div>
                                    <LazyLoadImage
                                        effect="opacity"
                                        src={
                                            isModuleImageValid(
                                                (result.module.image as PlatformImageData)?.src
                                            )
                                                ? (result.module.image as PlatformImageData)?.src
                                                : ""
                                        }
                                    />
                                    <h4>
                                        <TextHighlight text={result.module.name} highlight={result.name} />
                                    </h4>
                                </div>
                                <div>
                                    <TextHighlight
                                        text={result.module.description}
                                        highlight={result.description}
                                    />
                                </div>
                            </CustomCard>
                            <CustomModuleControls>
                                <Tooltip delay={1} tooltip="Delete Module">
                                    <DeleteIcon
                                        role="button"
                                        aria-label="Delete Module"
                                        onClick={() => deleteModule(result)}
                                    />
                                </Tooltip>
                            </CustomModuleControls>
                        </CustomModuleContainer>
                    ))}
            </div>
        </CollapsibleCategory>
    ) : (
        <></>
    )
}

const themes = [...PrefixOptions.entries()]
    .filter((p) => p[1].label.startsWith('Theme:'))
    .map((p) => ({
        id: p[0],
        name: p[1].label.replace(/^((theme|style|inspiration|general|special):? *)/i, ''),
        description: p[1].description,
        mode: p[1].mode,
        image: p[1].image,
    }))

const styles = [...PrefixOptions.entries()]
    .filter((p) => p[1].label.startsWith('Style:'))
    .map((p) => ({
        id: p[0],
        name: p[1].label.replace(/^((theme|style|inspiration|general|special):? *)/i, ''),
        description: p[1].description,
        mode: p[1].mode,
        image: p[1].image,
    }))

const inspirations = [...PrefixOptions.entries()]
    .filter((p) => p[1].label.startsWith('Inspiration:'))
    .map((p) => ({
        id: p[0],
        name: p[1].label.replace(/^((theme|style|inspiration|general|special):? *)/i, ''),
        description: p[1].description,
        mode: p[1].mode,
        image: p[1].image,
    }))

const specials = [...PrefixOptions.entries()]
    .filter((p) => p[1].label.startsWith('Special:'))
    .map((p) => ({
        id: p[0],
        name: p[1].label.replace(/^((theme|style|inspiration|general|special):? *)/i, ''),
        description: p[1].description,
        mode: p[1].mode,
        image: p[1].image,
    }))

const generals = [...PrefixOptions.entries()]
    .filter((p) => p[1].label.startsWith('General:'))
    .map((p) => ({
        id: p[0],
        name: p[1].label.replace(/^((theme|style|inspiration|general|special):? *)/i, ''),
        description: p[1].description,
        mode: p[1].mode,
        image: p[1].image,
    }))

const all = [...PrefixOptions.entries()].map((p) => ({
    id: p[0],
    name: p[1].label.replace(/^((theme|style|inspiration|general|special):? *)/i, ''),
    description: p[1].description,
    mode: p[1].mode,
    image: p[1].image,
}))

export default function PrefixBrowser(props: { onSelect: (prefix: string) => void }): JSX.Element {
    const [searchInput, setSearchInput] = useState('')
    const customModules = useRecoilValue(CustomModules)
    const filteredCustom = moduleFilter.moduleMatch(customModules, searchInput)
    const filteredAll = moduleFilter.moduleMatch(all as AIModule[], searchInput)
    return (
        <div>
            <ModuleSearchBox
                placeholder="Search by title, author, tag, or perspective"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
            />
            {filteredCustom.length > 0 || filteredAll.length > 0 ? (
                <>
                    <CustomPrefixes
                        title={'Imported'}
                        subtitle={'Modules imported from a file or scenario.'}
                        onSelect={props.onSelect}
                        filter={searchInput}
                    />
                    <PrefixBrowserCategory
                        title={'Specials'}
                        subtitle={'Special modules with extra functionality.'}
                        options={specials}
                        onSelect={props.onSelect}
                        filter={searchInput}
                    />
                    <PrefixBrowserCategory
                        title={'General'}
                        subtitle={'General modules fitting many situations.'}
                        options={generals}
                        onSelect={props.onSelect}
                        filter={searchInput}
                    />
                    <PrefixBrowserCategory
                        title={'Style'}
                        subtitle={'Emulate your favorite writers.'}
                        options={styles}
                        onSelect={props.onSelect}
                        filter={searchInput}
                    />
                    <PrefixBrowserCategory
                        title={'Theme'}
                        subtitle={'Drive your writing in a specific thematic direction.'}
                        options={themes}
                        onSelect={props.onSelect}
                        filter={searchInput}
                    />
                    <PrefixBrowserCategory
                        title={'Inspiration'}
                        subtitle={'Take inspiration from established works.'}
                        options={inspirations}
                        onSelect={props.onSelect}
                        filter={searchInput}
                    />
                </>
            ) : (
                <div>No modules meet the current search conditions.</div>
            )}
        </div>
    )
}
