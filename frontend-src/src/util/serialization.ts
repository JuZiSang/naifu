import { ClazzOrModelSchema, deserialize as sDeserialize } from 'serializr'

function clearNull(json: any) {
    for (const key of Object.keys(json)) {
        if (json[key] === null) json[key] = undefined
        else if (typeof json[key] === 'object') clearNull(json[key])
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function deserialize<T>(modelschema: ClazzOrModelSchema<T>, json: any): T {
    clearNull(json)
    return sDeserialize(modelschema, json)
}
