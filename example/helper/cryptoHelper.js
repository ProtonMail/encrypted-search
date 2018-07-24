/* eslint-disable max-len */
import nacl from 'tweetnacl'
import { Pbkdf2HmacSha256 } from 'asmCrypto.js'
import { concatUint8Array } from './arrayHelper'

const ITERATIONS = 10
const DKLEN = 32
const KEY_LENGTH = 32
const SALT_LENGTH = 32
const NONCE_LENGTH = 24

// eslint-disable-next-line import/prefer-default-export
export const getRandomValues = (buf) => {
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(buf)
        return buf
    }
    if (self.crypto && self.crypto.getRandomValues) {
        self.crypto.getRandomValues(buf)
        return buf
    }
    if (window.msCrypto && window.msCrypto.getRandomValues) {
        window.msCrypto.getRandomValues(buf)
        return buf
    }
    throw new Error('No secure random number generator available.')
}

/**
 * Get a hash using a key-stretching algorithm.
 * @param {Uint8Array} data
 * @param {Uint8Array} salt
 * @param {Number} iterations
 * @param {Number} dklen
 * @returns {Uint8Array}
 */
export const hash = (data, salt, iterations = ITERATIONS, dklen = DKLEN) => {
    return Pbkdf2HmacSha256(data, salt, iterations, dklen)
}

/**
 * Encrypt data using a non-deterministic algorithm.
 * @param {Uint8Array} data
 * @param {Uint8Array} key
 * @returns {Uint8Array | undefined}
 */
export const encrypt = (data, key) => {
    if (!data) {
        return
    }
    const nonce = getRandomValues(new Uint8Array(NONCE_LENGTH))
    const ciphertext = nacl.secretbox(data, nonce, key)
    return concatUint8Array(nonce, ciphertext)
}

/**
 * Decrypt data with the given key.
 * @param {Uint8Array} data
 * @param {Uint8Array} key
 * @param {Number} nonceLength
 * @returns {Uint8Array | undefined}
 */
export const decrypt = (data, key) => {
    if (!data) {
        return
    }
    const nonce = data.slice(0, NONCE_LENGTH)
    const ciphertext = data.slice(NONCE_LENGTH, data.length)
    return nacl.secretbox.open(ciphertext, nonce, key)
}

export const generateKey = () => getRandomValues(new Uint8Array(KEY_LENGTH))
export const generateSalt = () => getRandomValues(new Uint8Array(SALT_LENGTH))
