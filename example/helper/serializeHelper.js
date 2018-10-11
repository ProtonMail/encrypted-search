/**
 * Write a javascript object to a Uint8Array.
 * @param {Object} data
 * @returns {Uint8Array}
 */
import { stringToUint8Array, uint8ArrayToString } from './arrayHelper'
import { decodeUtf8, encodeUtf8 } from './stringHelper'

export const writeJson = (data) => stringToUint8Array(encodeUtf8(JSON.stringify(data)))

/**
 * Read a Uint8Array to a javascript object.
 * @param data
 * @returns {any}
 */
export const readJson = (data) => JSON.parse(decodeUtf8(uint8ArrayToString(data)))

const getByteLength = (val) => {
    if (val <= 255) {
        return 1
    }
    if (val <= 65535) {
        return 2
    }
    if (val <= 16777215) {
        return 3
    }
    return 4
}

/**
 * Write a number into a variable 4 bytes Uint8Array.
 * @param {Number} val
 * @returns {Uint8Array}
 */
export const writeUint32 = (val) => {
    const len = getByteLength(val)
    const buf = new Uint8Array(len)

    let num = val
    for (let i = 0; i < len; ++i) {
        buf[i] = num
        if (len === i + 1) {
            break
        }
        num >>>= 8
    }
    return buf
}

/**
 * Read a variable 4 bytes Uint8Array into a number.
 * @param {Uint8Array} buf
 * @returns {number}
 */
export const readUint32 = (buf) => {
    if (buf.length <= 0) {
        return 0
    }
    let val = buf[0]
    if (buf.length === 1) {
        return val
    }
    val |= buf[1] << 8
    if (buf.length === 2) {
        return val
    }
    val |= buf[2] << 16
    if (buf.length === 3) {
        return val
    }
    return val + buf[3] * 0x1000000
}
