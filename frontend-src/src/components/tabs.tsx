import { ReactElement, useState } from 'react'
import { RecoilState, useRecoilState } from 'recoil'
import {
    Tabs as StyledTabs,
    TabHeaderList,
    TabContent,
    Tab as StyledTab,
    TabHeader as StyledTabHeader,
} from '../styles/components/tabs'

interface TabProps {
    title: string | JSX.Element
    label?: string
    children: ReactElement[] | ReactElement
}

export default function Tabs(props: {
    children: ReactElement[]
    selected?: number
    setSelected?: (i: number) => void
}): JSX.Element {
    const [tabIndex, setTabIndex] = useState(props.selected ?? 0)

    return (
        <StyledTabs>
            <TabHeaderList>
                {props.children.map((tab, index) => {
                    return (
                        <TabHeader
                            key={index}
                            title={tab.props.title}
                            label={tab.props.label}
                            onClick={() => {
                                setTabIndex(index)
                                props.setSelected && props.setSelected(index)
                            }}
                            selected={index === tabIndex}
                        />
                    )
                })}
            </TabHeaderList>
            <TabContent>
                {props.children.map((tab, index) => {
                    return (
                        <StyledTab key={index} hidden={index !== tabIndex} visible={index === tabIndex}>
                            {tab}
                        </StyledTab>
                    )
                })}
            </TabContent>
        </StyledTabs>
    )
}

export function TabsGlobalState(props: {
    children: ReactElement[]
    state: RecoilState<number>
    setSelected?: (i: number) => void
}): JSX.Element {
    const [tabIndex, setTabIndex] = useRecoilState(props.state)

    return (
        <StyledTabs>
            <TabHeaderList>
                {props.children.map((tab, index) => {
                    return (
                        <TabHeader
                            key={index}
                            title={tab.props.title}
                            label={tab.props.label}
                            onClick={() => {
                                setTabIndex(index)
                                props.setSelected && props.setSelected(index)
                            }}
                            selected={index === tabIndex}
                        />
                    )
                })}
            </TabHeaderList>
            <TabContent>
                {props.children.map((tab, index) => {
                    return (
                        <StyledTab key={index} hidden={index !== tabIndex} visible={index === tabIndex}>
                            {tab}
                        </StyledTab>
                    )
                })}
            </TabContent>
        </StyledTabs>
    )
}

export function Tab(props: TabProps): JSX.Element {
    return <>{props.children}</>
}

export function TabHeader(props: {
    title: string | JSX.Element
    label: string
    onClick: () => void
    selected: boolean
}): JSX.Element {
    return (
        <StyledTabHeader
            aria-label={props.label}
            role="button"
            tabIndex={0}
            onClick={() => props.onClick()}
            selected={props.selected}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && props.onClick()}
        >
            {props.title}
        </StyledTabHeader>
    )
}
