import { useCallback, useMemo } from 'react'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { GroupBase, OptionsOrGroups } from 'react-select'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { PlatformImageData } from '../compatibility/platformtypes'
import { normalizeModel, TextGenerationModel } from '../data/request/model'
import { PrefixOptions } from '../data/story/defaultprefixes'
import { AIModule } from '../data/story/storysettings'
import { GlobalUserContext } from '../globals/globals'
import { CustomModules, SelectedStoryId } from '../globals/state'
import { transparentize } from '../util/colour'
import { modelsCompatible, prefixModel } from '../util/models'
import { isModuleImageValid } from '../util/util'
import { Options } from './usePresetOptions'

export const themes = [...PrefixOptions.keys()].filter((prefix) =>
    PrefixOptions.get(prefix)?.label.startsWith('Theme:')
)
export const styles = [...PrefixOptions.keys()].filter((prefix) =>
    PrefixOptions.get(prefix)?.label.startsWith('Style:')
)
export const inspirations = [...PrefixOptions.keys()].filter((prefix) =>
    PrefixOptions.get(prefix)?.label.startsWith('Inspiration:')
)
export const specials = [...PrefixOptions.keys()].filter((prefix) =>
    PrefixOptions.get(prefix)?.label.startsWith('Special:')
)
export const generals = [...PrefixOptions.keys()].filter((prefix) =>
    PrefixOptions.get(prefix)?.label.startsWith('General:')
)

export const PrefixInnerDiv = styled.div<{ selected: boolean }>`
    margin: -5px -10px;
    position: relative;
    overflow: hidden;
    display: block;
    min-width: 200px;
    max-height: 200px;
    & > div:nth-child(1) {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 100px;
        img {
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 100px;
            object-fit: cover;
            object-position: center;
        }
        &::after {
            content: '';
            background: linear-gradient(
                to right,
                #00000000 0%,
                ${(props) =>
                        transparentize(0.2, props.selected ? props.theme.colors.bg0 : props.theme.colors.bg2)}
                    90%,
                ${(props) => (props.selected ? props.theme.colors.bg0 : props.theme.colors.bg2)} 100%
            );
            left: 0;
            top: 0;
            height: 100%;
            width: 100%;
            position: absolute;
        }
    }
    & > div:nth-child(2) {
        position: relative;
        margin-left: 100px;
        padding: 12px 10px;
        display: flex;
        flex-direction: column;
        justify-content: left;
    }
`

export function filterModules(model: TextGenerationModel | undefined): (_: AIModule) => boolean {
    return (module: AIModule) => {
        if (!model) return false
        return modelsCompatible(normalizeModel(prefixModel(module.id)), normalizeModel(model))
    }
}

export function useModuleOptions(
    selectedModule: string,
    model: TextGenerationModel | undefined,
    checkStory: boolean = false
): OptionsOrGroups<Options, GroupBase<Options>> {
    const customModules = useRecoilValue(CustomModules)
    const selectedStory = useRecoilValue(SelectedStoryId)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory)
    const hasStorySpecificPrefix =
        currentStoryContent &&
        currentStoryContent.settings &&
        currentStoryContent.settings.aiModule &&
        !customModules.some((e) => e.id === currentStoryContent?.settings?.aiModule?.id)

    const mapToOptions = useCallback(
        (key: string) => ({
            value: key,
            description: PrefixOptions.get(key)?.label ?? key,
            rawLabel: PrefixOptions.get(key)?.label ?? key,
            label: (
                <PrefixInnerDiv selected={key === selectedModule}>
                    <div>
                        <LazyLoadImage effect="opacity" src={PrefixOptions.get(key)?.image.src ?? ''} />
                    </div>
                    <div>
                        {(PrefixOptions.get(key)?.label ?? key).replace(
                            /^((theme|style|inspiration|general|special):? *)/i,
                            ''
                        )}
                    </div>
                </PrefixInnerDiv>
            ),
        }),
        [selectedModule]
    )

    const storyOptions = useMemo(() => {
        return checkStory &&
            hasStorySpecificPrefix &&
            modelsCompatible(
                currentStoryContent?.settings.model,
                prefixModel(currentStoryContent?.settings?.aiModule?.id ?? '')
            )
            ? [
                  {
                      label: 'Story',
                      options: [
                          {
                              value: currentStoryContent?.settings?.aiModule?.id,
                              description: currentStoryContent?.settings?.aiModule?.description,
                              rawLabel: currentStoryContent?.settings?.aiModule?.name ?? 'Unknown Module',
                              label: (
                                  <PrefixInnerDiv
                                      selected={
                                          currentStoryContent?.settings?.aiModule?.id === selectedModule
                                      }
                                  >
                                      <div>
                                          <LazyLoadImage
                                              effect="opacity"
                                              src={
                                                  isModuleImageValid(
                                                      (
                                                          currentStoryContent?.settings?.aiModule
                                                              ?.image as PlatformImageData
                                                      )?.src
                                                  )
                                                      ? (
                                                            currentStoryContent?.settings?.aiModule
                                                                ?.image as PlatformImageData
                                                        )?.src
                                                      : ""
                                              }
                                          />
                                      </div>
                                      <div>
                                          {currentStoryContent?.settings?.aiModule?.name ?? 'Unknown Module'}
                                      </div>
                                  </PrefixInnerDiv>
                              ),
                          },
                      ],
                  },
              ]
            : []
    }, [
        checkStory,
        currentStoryContent?.settings?.aiModule?.description,
        currentStoryContent?.settings?.aiModule?.id,
        currentStoryContent?.settings?.aiModule?.image,
        currentStoryContent?.settings?.aiModule?.name,
        currentStoryContent?.settings.model,
        hasStorySpecificPrefix,
        selectedModule,
    ])

    const importedOptions = useMemo(
        () => [
            {
                label: 'Imported',
                options: customModules.filter(filterModules(model)).map((module) => ({
                    value: module.id,
                    description: module.description,
                    rawLabel: module.name,
                    label: (
                        <PrefixInnerDiv selected={module.id === selectedModule}>
                            <div>
                                <LazyLoadImage
                                    effect="opacity"
                                    src={
                                        isModuleImageValid((module.image as PlatformImageData)?.src)
                                            ? (module.image as PlatformImageData)?.src
                                            : ""
                                    }
                                />
                            </div>
                            <div>{module.name}</div>
                        </PrefixInnerDiv>
                    ),
                })),
            },
        ],
        [customModules, model, selectedModule]
    )

    const defaultOptions = useMemo(
        () => [
            {
                label: 'Specials',
                options: specials.map((element) => mapToOptions(element)),
            },
            {
                label: 'General',
                options: generals.map((element) => mapToOptions(element)),
            },
            {
                label: 'Styles',
                options: styles.map((element) => mapToOptions(element)),
            },
            {
                label: 'Themes',
                options: themes.map((element) => mapToOptions(element)),
            },
            {
                label: 'Inspirations',
                options: inspirations.map((element) => mapToOptions(element)),
            },
        ],
        [mapToOptions]
    )

    const vanillaOptions = useMemo(
        () => [
            {
                label: 'Vanilla',
                options: [mapToOptions([...PrefixOptions.keys()][0])],
            },
        ],
        [mapToOptions]
    )

    const prefixOptions = useMemo(() => {
        const options: any = []
        options.push(...vanillaOptions, ...storyOptions, ...importedOptions, ...defaultOptions)
        return options
    }, [defaultOptions, importedOptions, storyOptions, vanillaOptions])

    return prefixOptions
}
