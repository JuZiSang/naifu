import { Omnibus } from 'omnibus-rxjs'
import { Action, actionCreatorFactory } from 'typescript-fsa'

export const eventBus = new Omnibus<Action<any>>()
export const actionCreator = actionCreatorFactory()
