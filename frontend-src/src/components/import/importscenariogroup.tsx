import { useState } from 'react'
import styled from 'styled-components'
import { ScenarioGroup } from '../../data/story/scenario'
import { StoryContainer } from '../../data/story/storycontainer'
import { Button } from '../../styles/ui/button'
import { mix, transparentize } from '../../util/colour'
import { ImportScenario } from './importscenario'

const ScenarioButton = styled(Button)<{ selected: boolean }>`
    font-size: 1rem;
    font-weight: 600;
    padding: 5px 10px;
    background: ${(props) => (props.selected ? props.theme.colors.bg3 : props.theme.colors.bg1)};
    color: ${(props) =>
        props.selected ? props.theme.colors.textMain : transparentize(0.5, props.theme.colors.textMain)};
    &:hover {
        background: ${(props) =>
            props.selected
                ? props.theme.colors.bg3
                : mix(0.2, props.theme.colors.bg3, props.theme.colors.bg1)};
    }
    min-width: 60px;
    min-height: 44px;
    display: flex;
    justify-content: center;
    align-items: center;
`
const SelectionButtons = styled.div`
    display: flex;
    flex-direction: row;
    background: ${(props) => props.theme.colors.bg1};
    outline: 2px solid ${(props) => props.theme.colors.bg1};
    width: fit-content;
`

const Container = styled.div`
    background: ${(props) => props.theme.colors.bg2};

    min-width: 320px;
    max-width: max(1160px, 65vw);
    max-height: 650px;
    display: flex;
    overflow-y: auto;
    flex-direction: column;
    > div {
        overflow-y: unset;
    }
    @media (max-width: 800px) {
        max-height: 100%;
        height: 100%;
        max-width: 100%;
    }
`

export function ImportScenarioGroup(props: {
    scenarioGroup: ScenarioGroup
    onScenarioSelect: (story: StoryContainer) => void
    onClose: () => void
}): JSX.Element {
    const [selectedScenario, setSelectedScenario] = useState(0)
    return (
        <Container>
            <ImportScenario
                importedScenario={props.scenarioGroup.scenarios[selectedScenario]}
                useStartText={true}
                onClickImport={props.onScenarioSelect}
                close={props.onClose}
                perspectiveButtons={
                    <SelectionButtons>
                        {props.scenarioGroup.names.map((name, i) => {
                            return (
                                <ScenarioButton
                                    selected={i === selectedScenario}
                                    key={i}
                                    onClick={() => setSelectedScenario(i)}
                                >
                                    {name}
                                </ScenarioButton>
                            )
                        })}
                    </SelectionButtons>
                }
            ></ImportScenario>
        </Container>
    )
}
