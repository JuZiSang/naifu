import { User } from '@sentry/nextjs'
import { toast } from 'react-toastify'
import styled from 'styled-components'
import { DefaultModel, normalizeModel, TextGenerationModel } from '../../data/request/model'
import { getUserSetting } from '../../data/user/settings'
import { getAvailiableModels, modelName } from '../../util/models'

const Highlight = styled.span`
    color: ${(props) => props.theme.colors.textHeadings};
    font-weight: 600;
`

export function modelDifferenceToast(session: User, model: TextGenerationModel, scenarioText: boolean): void {
    const modelUnavailiable = !getAvailiableModels(session.subscription.tier === 3).some(
        (m) => normalizeModel(m.str) === normalizeModel(model)
    )

    toast(
        <>
            {modelUnavailiable ? (
                <div>
                    You do not have access to the default model of this {scenarioText ? 'scenario' : 'story'}{' '}
                    [<Highlight>{modelName(model)}</Highlight>].
                    <br />
                    <br />
                    The model will be changed to your default model [
                    <Highlight>{modelName(getUserSetting(session.settings, 'defaultModel'))}</Highlight>
                    ].
                </div>
            ) : (
                <div>
                    The model of the imported {scenarioText ? 'scenario' : 'story'} [
                    <Highlight>{modelName(model)}</Highlight>] does not match the current default model [
                    <Highlight>{modelName(getUserSetting(session.settings, 'defaultModel'))}</Highlight>
                    ].
                    <br />
                    <br />
                    {scenarioText
                        ? 'You can switch to a different model, though the scenario may not work as originally intented.'
                        : 'You can change the model used in the Story tab of the right sidebar.'}
                </div>
            )}
        </>,
        { autoClose: false }
    )
}
