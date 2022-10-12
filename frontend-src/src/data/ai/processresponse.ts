const AllowedPeriodUses = ['Dr.', 'Mr.', 'Ms.', 'Mrs.']

const closingCharacters = new Set([')', '}', ']', "'", '"'])

const checkCharactersBefore = (text: string, index: number) => {
    for (const allowed of AllowedPeriodUses) {
        if (text.slice(index - (allowed.length - 1), index + 1) === allowed) {
            return true
        }
    }
    return false
}

const checkDecimalNumber = (text: string, index: number) => {
    return !Number.isNaN(Number.parseInt(text.charAt(index + 1), 10))
}

const checkCharacterAfterIsClosing = (text: string, index: number) => {
    return closingCharacters.has(text.charAt(index + 1))
}

export const trimResponse = (
    response: string,
    minCheck: boolean = true
): { trimmed: string; wasTrimmed: boolean } => {
    const potentialTrimPoints = [...response.matchAll(/[!.;?]/g)]
    if (potentialTrimPoints === null) {
        return { trimmed: response, wasTrimmed: false }
    }
    for (let i = potentialTrimPoints.length - 1; i >= 0; i--) {
        let index = potentialTrimPoints[i].index
        if (!potentialTrimPoints[i] || !index) {
            continue
        }
        let canTrimHere = true
        if (response.charAt(index) === '.') {
            canTrimHere = canTrimHere && !checkCharactersBefore(response, index)
            canTrimHere = canTrimHere && !checkDecimalNumber(response, index)
        }

        if (canTrimHere) {
            if (checkCharacterAfterIsClosing(response, index)) {
                index++
            }
            if (minCheck) {
                return index / response.length > 0.2
                    ? { trimmed: response.slice(0, index + 1), wasTrimmed: index + 1 !== response.length }
                    : { trimmed: response, wasTrimmed: false }
            } else {
                return { trimmed: response.slice(0, index + 1), wasTrimmed: true }
            }
        }
        index -= 1
        if (index <= 0) {
            return { trimmed: response, wasTrimmed: false }
        }
    }
    return { trimmed: response, wasTrimmed: false }
}

export const trimBrokenUnicode = (text: string): string => {
    let encoded = new TextEncoder().encode(text)

    // Checks and removes incomplete unicode characters
    /*
    if (encoded.length > 3 && (encoded[encoded.length - 3] & 0b11110000) === 0b11110000) {
        encoded = encoded.slice(-3)
    } else if (
        encoded.length > 2 &&
        ((encoded[encoded.length - 2] & 0b11110000) === 0b11110000 ||
            (encoded[encoded.length - 2] & 0b11100000) === 0b11100000)
    ) {
        encoded = encoded.slice(-2)
    } else if (
        encoded.length > 1 &&
        ((encoded[encoded.length - 1] & 0b11110000) === 0b11110000 ||
            (encoded[encoded.length - 1] & 0b11100000) === 0b11100000 ||
            (encoded[encoded.length - 1] & 0b1100000) === 0b11000000)
    ) {
        encoded = encoded.slice(-1)
    }
    */

    if (
        JSON.stringify([...encoded.slice(-6)]) ===
        JSON.stringify([0b11101111, 0b10111111, 0b10111101, 0b11101111, 0b10111111, 0b10111101])
    ) {
        encoded = encoded.slice(0, -6)
    }
    const decoded = new TextDecoder('utf8').decode(encoded)
    return decoded
}
