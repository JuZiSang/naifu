import { createModelSchema, list, object, primitive } from 'serializr'
import { TokenData } from './logitbias'

export class BannedSequenceGroup {
    sequences: TokenData[] = []
    enabled: boolean = true
    constructor(sequences: TokenData[] = []) {
        this.sequences = sequences
    }
}

createModelSchema(BannedSequenceGroup, {
    sequences: list(object(TokenData)),
    enabled: primitive(),
})
