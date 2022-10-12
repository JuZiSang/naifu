import {
    MODEL_GENJIPYTHON6B,
    MODEL_GENJIJP6B,
    MODEL_SIGURD_V4,
    MODEL_SIGURD_V3,
    MODEL_SIGURD,
    MODEL_CALLIOPE,
    MODEL_EUTERPE_V0,
    MODEL_EUTERPE_V2,
    MODEL_GENJIJP6B_V2,
    MODEL_KRAKE_V1,
    MODEL_KRAKE_V2,
} from '../ai/model'

export enum TextGenerationModel {
    neo2b = '2.7B',
    j6b = '6B',
    j6bv3 = '6B-v3',
    j6bv4 = '6B-v4',
    genjipython6b = 'genji-python-6b',
    genjijp6b = 'genji-jp-6b',
    genjijp6bv2 = 'genji-jp-6b-v2',
    euterpev0 = 'euterpe-v0',
    euterpev2 = 'euterpe-v2',
    krakev1 = 'krake-v1',
    krakev2 = 'krake-v2',
    blue = 'blue',
    red = 'red',
    green = 'green',
    purple = 'purple',
    commentBot = 'hypebot',
    infill = 'infillmodel',
}

export const DefaultModel = TextGenerationModel.euterpev2

export function normalizeModel(model: TextGenerationModel): TextGenerationModel {
    switch (model) {
        case TextGenerationModel.j6b:
        case TextGenerationModel.j6bv3:
        case TextGenerationModel.j6bv4:
            return TextGenerationModel.j6bv4
        case TextGenerationModel.neo2b:
            return TextGenerationModel.neo2b
        case TextGenerationModel.genjijp6b:
        case TextGenerationModel.genjijp6bv2:
            return TextGenerationModel.genjijp6bv2
        case TextGenerationModel.genjipython6b:
            return TextGenerationModel.genjipython6b
        case TextGenerationModel.euterpev0:
        case TextGenerationModel.euterpev2:
            return TextGenerationModel.euterpev2
        case TextGenerationModel.krakev1:
        case TextGenerationModel.krakev2:
            return TextGenerationModel.krakev2
        case TextGenerationModel.blue:
            return TextGenerationModel.blue
        case TextGenerationModel.red:
            return TextGenerationModel.red
        case TextGenerationModel.green:
            return TextGenerationModel.green
        case TextGenerationModel.purple:
            return TextGenerationModel.purple
        case TextGenerationModel.commentBot:
            return TextGenerationModel.commentBot
        case TextGenerationModel.infill:
            return TextGenerationModel.infill
    }
}

export function modelFromModelId(model?: number): TextGenerationModel {
    switch (model) {
        case MODEL_SIGURD:
            return TextGenerationModel.j6bv4
        case MODEL_SIGURD_V3:
            return TextGenerationModel.j6bv4
        case MODEL_SIGURD_V4:
            return TextGenerationModel.j6bv4
        case MODEL_CALLIOPE:
            return TextGenerationModel.neo2b
        case MODEL_GENJIJP6B:
            return TextGenerationModel.genjijp6b
        case MODEL_GENJIJP6B_V2:
            return TextGenerationModel.genjijp6bv2
        case MODEL_GENJIPYTHON6B:
            return TextGenerationModel.genjipython6b
        case MODEL_EUTERPE_V0:
            return TextGenerationModel.euterpev2
        case MODEL_EUTERPE_V2:
            return TextGenerationModel.euterpev2
        case MODEL_KRAKE_V1:
            return TextGenerationModel.krakev1
        case MODEL_KRAKE_V2:
            return TextGenerationModel.krakev2
        default:
            return TextGenerationModel.euterpev2
    }
}
