/**
 * Concatenate two Uint8Arrays.
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {Uint8Array}
 */
export const concatUint8Array = (a, b) => {
    const result = new Uint8Array(a.byteLength + b.byteLength)
    result.set(new Uint8Array(a), 0)
    result.set(new Uint8Array(b), a.byteLength)
    return result
}

/**
 * Convert a string to a Uint8Array containing a UTF-8 string data.
 * @param {String} string
 * @return {Uint8Array}
 */
export const stringToUint8Array = (string) => {
    const result = new Uint8Array(string.length)
    for (let i = 0; i < string.length; i++) {
        result[i] = string.charCodeAt(i)
    }
    return result
}

/**
 * Convert a Uint8Array to a string.
 * @param {Uint8Array} array
 * @returns {string}
 */
export const uint8ArrayToString = (array) => {
    const result = []
    const bs = 1 << 14
    const j = array.length
    for (let i = 0; i < j; i += bs) {
        // eslint-disable-next-line prefer-spread
        result.push(String.fromCharCode.apply(String, array.subarray(i, i + bs < j ? i + bs : j)))
    }
    return result.join('')
}

