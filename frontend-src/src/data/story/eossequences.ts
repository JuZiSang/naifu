import { createModelSchema, object } from 'serializr'
import { TokenData } from './logitbias'

export class EndOfSamplingSequence {
    sequence: TokenData
    enabled: boolean = true
    constructor(sequence: TokenData) {
        this.sequence = sequence
    }
}

createModelSchema(EndOfSamplingSequence, {
    sequence: object(TokenData),
})
