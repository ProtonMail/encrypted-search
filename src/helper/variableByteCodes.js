// Without the sign bit to be able to use bitwise operators.
const MAX_INT32 = 0b1111111111111111111111111111111

const ENCODING = 0b10000000
const MAX_BITS = 0b01111111

const TMP = new Uint8Array(5)
const EMPTY = new Uint8Array(0)

const MAX_BYTES_PER_NUMBER = 8
const MAX_BYTES_PER_PART = 5

const unsignedToDouble = (high, low) => (high * (MAX_INT32 + 1)) + low

const writeUint32 = (number, buffer, offset, force = false) => {
    let next = number
    let length = 1

    for (let byteIndex = 0; byteIndex < MAX_BYTES_PER_PART; ++byteIndex) {
        TMP[byteIndex] = next & MAX_BITS
        next = next >> 7
        if (TMP[byteIndex] > 0) {
            length = byteIndex + 1
        }
    }

    let totalBytes = force ? MAX_BYTES_PER_PART : length
    for (let i = offset + totalBytes - 1, j = 0; i >= offset; --i, ++j) {
        buffer[i] = TMP[j]
    }

    return totalBytes
}

/**
 * Encode a number. Takes into account the low and high part of a number in JavaScript.
 * If the high part exists, the low part is padded with 0s for 5 bytes. Otherwise the
 * low part only uses as many bytes as it requires.
 * @param {Uint8Array} buffer
 * @param {Number} number
 * @param {Number} offset
 * @returns {number}
 */
export const vbEncodeNumber = (buffer, number, offset) => {
    const low = number & MAX_INT32
    const high = (number > MAX_INT32) ? (number - low) / (MAX_INT32 + 1) : 0

    const lowLength = writeUint32(low, buffer, offset, high > 0)
    const highLength = high > 0 ? writeUint32(high, buffer, offset + lowLength) : 0

    return lowLength + highLength
}

/**
 * Encode an array of numbers in a variable byte-list encoding.
 * See {@link https://nlp.stanford.edu/IR-book/html/htmledition/variable-byte-codes-1.html}
 * @param {Array} numbers
 * @returns {Uint8Array}
 */
export const vbEncode = (numbers = []) => {
    if (numbers.length === 0) {
        return EMPTY
    }

    const guessLength = numbers.length * MAX_BYTES_PER_NUMBER
    const bytes = new Uint8Array(guessLength)

    let totalLength = 0

    for (let i = 0; i < numbers.length; ++i) {
        const number = numbers[i]
        const length = vbEncodeNumber(bytes, number, totalLength)
        // Set last bit to denote end of number
        bytes[totalLength + length - 1] = bytes[totalLength + length - 1] | ENCODING
        totalLength += length
    }

    return bytes.slice(0, totalLength)
}

/**
 * Decode an Uint8Array into an array of numbers.
 * @param {Uint8Array} bytes
 * @returns {Array}
 */
export const vbDecode = (bytes) => {
    if (!bytes || bytes.length === 0) {
        return []
    }

    const numbers = []
    let low = 0
    let offset = 1
    let part = 0
    let multi = false
    let bits = 0

    for (let i = 0; i < bytes.length; ++i) {
        const value = bytes[i]
        const byte = value & MAX_BITS

        let shift = bits === 31 ? 3 : 7

        part = (part << shift) | byte
        bits += shift
        offset++

        if (offset === MAX_BYTES_PER_PART + 1) {
            low = part
            part = 0
            multi = true
            bits = 0
        }

        if (value & ENCODING) {
            const number = multi ? unsignedToDouble(part, low) : part
            numbers.push(number)
            low = 0
            part = 0
            offset = 1
            multi = false
            bits = 0
        }
    }

    return numbers
}
