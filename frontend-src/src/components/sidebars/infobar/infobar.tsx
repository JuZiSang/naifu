import { useRecoilValue } from 'recoil'
import { lazy, Suspense, useEffect } from 'react'
import styled from 'styled-components'
import { InfobarSelectedTab, SelectedStoryId, SessionValue } from '../../../globals/state'

import { BreakpointMobile } from '../../../globals/constants'
import { Infobar, Toggler, ArrowRight, TogglerSettingsIcon } from '../../../styles/components/infobar'
import { ArrowLeftIcon, ArrowRightIcon, Icon, SlidersIcon } from '../../../styles/ui/icons'
import { useWindowSizeBreakpoint } from '../../../hooks/useWindowSize'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { Tab, TabsGlobalState } from '../../tabs'
import Sidebar from '../common/sidebar'
import { UserSettings } from '../../../data/user/settings'
import { DEFAULT_THEME } from '../../../styles/themes/theme'

const Story = lazy(() => import('./story'))
const Advanced = lazy(() => import('./advanced'))
const GenerationSettings = lazy(() => import('./generationsettings'))

export default function InfoBar(props: {
    visible: boolean
    setVisible: (visible: boolean) => void
}): JSX.Element {
    const windowSize = useWindowSizeBreakpoint(BreakpointMobile, 0)

    const [getLocal, setLocal] = useLocalStorage(
        'infoBarState',
        false,
        (val) => val.toString(),
        (val) => val === 'true'
    )

    useEffect(() => {
        if (
            windowSize.width <= BreakpointMobile &&
            (!windowSize.prevWidth || windowSize.prevWidth > BreakpointMobile)
        ) {
            props.setVisible(false)
        }
        if (
            windowSize.width > BreakpointMobile &&
            (!windowSize.prevWidth || windowSize.prevWidth <= BreakpointMobile)
        ) {
            props.setVisible(getLocal())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowSize.width])

    return (
        <>
            <Toggler
                visible={!props.visible}
                onClick={() => {
                    setLocal(!props.visible)
                    props.setVisible(!props.visible)
                }}
                className="toggler infobar-toggler"
            >
                <ArrowLeftIcon />
                <TogglerSettingsIcon />
            </Toggler>
            <Menu visible={props.visible} setVisible={props.setVisible} />
        </>
    )
}

export function Menu(props: { visible: boolean; setVisible: (visible: boolean) => void }): JSX.Element {
    const selectedStoryId = useRecoilValue(SelectedStoryId)

    const [, setLocal] = useLocalStorage(
        'infoBarState',
        false,
        (val) => val.toString(),
        (val) => val === 'true'
    )

    const sessionSettings = useRecoilValue(SessionValue('settings')) as UserSettings
    const siteTheme = sessionSettings.siteTheme ?? DEFAULT_THEME

    return (
        <Sidebar
            left={false}
            open={props.visible}
            setOpen={props.setVisible}
            breakpointDesktop={`${Math.max(
                Number.parseInt(siteTheme.breakpoints.desktop) || BreakpointMobile + 1,
                (Number.parseInt(siteTheme.breakpoints.mobile) || BreakpointMobile) + 1
            )}px`}
            breakpointMobile={`${Math.max(
                Number.parseInt(siteTheme.breakpoints.mobile) || BreakpointMobile,
                BreakpointMobile
            )}px`}
            initialOffset={400}
        >
            <Infobar visible={props.visible} className="infobar">
                <ArrowContainer>
                    <ArrowRight
                        onClick={() => {
                            setLocal(!props.visible)
                            props.setVisible(!props.visible)
                        }}
                    >
                        <ArrowRightIcon />
                    </ArrowRight>
                </ArrowContainer>
                <TabsGlobalState state={InfobarSelectedTab}>
                    <Tab title="Story">
                        <div style={{ touchAction: 'pan-y', height: '100%' }}>
                            <Suspense fallback={<div>Loading...</div>}>
                                <Story selectedStory={selectedStoryId} />
                            </Suspense>
                        </div>
                    </Tab>
                    <Tab title="Advanced">
                        <div style={{ touchAction: 'pan-y', height: '100%' }}>
                            <Suspense fallback={<div>Loading...</div>}>
                                <Advanced selectedStory={selectedStoryId} />
                            </Suspense>
                        </div>
                    </Tab>
                    <Tab title={<SlidersIcon />} label="Settings">
                        <div style={{ touchAction: 'pan-y', height: '100%' }}>
                            <Suspense fallback={<div>Loading...</div>}>
                                <GenerationSettings selectedStory={selectedStoryId} />
                            </Suspense>
                        </div>
                    </Tab>
                </TabsGlobalState>
            </Infobar>
        </Sidebar>
    )
}

const ArrowContainer = styled.div`
    ${Icon} {
        width: 16px;
        height: 16px;
        transition: transform ${(props) => props.theme.transitions.iteractive};
    }
    > div {
        &:hover {
            ${Icon} {
                transform: scale(1.1);
            }
        }
    }
`
