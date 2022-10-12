import { EncoderType } from '../tokenizer/encoder'
import { getGlobalEncoder } from '../tokenizer/interface'

export const getSequenceVariants = (strippedSequence: string): Array<Array<number>> => {
    //useful if sequence was whitespace before being trimmed
    const capSequence = strippedSequence //first letter capitalized
        .charAt(0)
        .toUpperCase()
        // eslint-disable-next-line unicorn/prefer-spread
        .concat(strippedSequence.slice(1))
    const allCapsSequence = strippedSequence.toUpperCase() //first letter capitalized

    //all possible variants, unlikely white space after word exists, but whatever
    const stringVariants: string[] = [
        strippedSequence,
        ' ' + strippedSequence,
        strippedSequence + ' ',
        ' ' + strippedSequence + ' ',
        capSequence,
        ' ' + capSequence,
        capSequence + ' ',
        ' ' + capSequence + ' ',
        allCapsSequence,
        ' ' + allCapsSequence,
        allCapsSequence + ' ',
        ' ' + allCapsSequence + ' ',
    ]
    const variants: number[][] = []
    for (const stringVariant of stringVariants) {
        const variant: number[] = getGlobalEncoder(EncoderType.GPT2).encode(stringVariant)
        if (
            variant[0] !== 220 &&
            variant[variant.length - 1] !== 220 &&
            variants.every(
                (old) => old.length !== variant.length || !old.every((elem, i) => variant[i] === elem)
            )
        )
            variants.push(variant)
    }

    return variants
}
