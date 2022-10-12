import { DefaultModel, normalizeModel, TextGenerationModel } from '../request/model'

export const MODEL_KRAKE_V2 = 502
export const MODEL_KRAKE_V1 = 501
export const MODEL_EUTERPE_V2 = 402
export const MODEL_EUTERPE_V0 = 401
export const MODEL_GENJIPYTHON6B = 301
export const MODEL_GENJIJP6B_V2 = 202
export const MODEL_GENJIJP6B = 201
export const MODEL_SIGURD_V4 = 4
export const MODEL_SIGURD_V3 = 3
export const MODEL_SIGURD = 2
export const MODEL_CALLIOPE = 1

export function modelSupportsUserModules(model: TextGenerationModel = DefaultModel): boolean {
    if (model === TextGenerationModel.j6bv3) return true
    if (model === TextGenerationModel.j6bv4) return true
    if (model === TextGenerationModel.euterpev2) return true
    return false
}

export function modelSupportsModules(model: TextGenerationModel = DefaultModel): boolean {
    if (model === TextGenerationModel.j6b) return true
    if (model === TextGenerationModel.j6bv3) return true
    if (model === TextGenerationModel.j6bv4) return true
    if (model === TextGenerationModel.euterpev0) return true
    if (model === TextGenerationModel.euterpev2) return true
    if (model === TextGenerationModel.krakev1) return true
    if (model === TextGenerationModel.krakev2) return true
    if (model === TextGenerationModel.blue) return true
    if (model === TextGenerationModel.red) return true
    if (model === TextGenerationModel.green) return true
    if (model === TextGenerationModel.purple) return true
    return false
}

export function modelSupportsPhraseBias(model: TextGenerationModel = DefaultModel): boolean {
    if (model === TextGenerationModel.neo2b) return false
    if (model === TextGenerationModel.infill) return false
    return true
}

export function modelHasScaledRepetitionPenalty(model: TextGenerationModel = DefaultModel): boolean {
    if (model === TextGenerationModel.krakev1) return false
    if (model === TextGenerationModel.krakev2) return false
    if (model === TextGenerationModel.neo2b) return false
    return true
}

export function modelRepPenMax(model: TextGenerationModel = DefaultModel): number {
    if (normalizeModel(model) === normalizeModel(TextGenerationModel.krakev2)) return 1.08
    return 8
}

export function modelRepPenStepSize(model: TextGenerationModel = DefaultModel): string {
    if (normalizeModel(model) === normalizeModel(TextGenerationModel.krakev2)) return '0.0001'
    return '0.025'
}

export function modelBiasMax(model: TextGenerationModel = DefaultModel): number {
    if (normalizeModel(model) === normalizeModel(TextGenerationModel.krakev2)) return 0.3
    return 2
}

export function modelBiasStrong(model: TextGenerationModel = DefaultModel): number {
    if (normalizeModel(model) === normalizeModel(TextGenerationModel.krakev2)) return 0.1
    return 0.6
}

export function modelBiasStepSize(model: TextGenerationModel = DefaultModel): string {
    if (normalizeModel(model) === normalizeModel(TextGenerationModel.krakev2)) return '0.0001'
    return '0.01'
}

export function modelBiasRoundDigits(model: TextGenerationModel = DefaultModel): number {
    if (normalizeModel(model) === normalizeModel(TextGenerationModel.krakev2)) return 3
    return 2
}

export function modelMaxContextSize(model: TextGenerationModel = DefaultModel): number {
    return 2048
}
