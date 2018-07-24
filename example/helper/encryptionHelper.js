import { decrypt, encrypt, hash } from './cryptoHelper'
import { stringToUint8Array, uint8ArrayToString } from './arrayHelper'
import { encodeUtf8, decodeUtf8 } from './stringHelper'

export default (encryptionKey, hashSalt) => {
    const getEncryptedKey = (key = '') => hash(stringToUint8Array(encodeUtf8(key)), hashSalt)

    const getEncryptedValue = (data) => {
        if (!data) {
            return
        }
        try {
            const serializedData = stringToUint8Array(encodeUtf8(JSON.stringify(data)))
            return encrypt(serializedData, encryptionKey)
        } catch (e) {
            return encrypt(data, encryptionKey)
        }
    }

    const getDecryptedValue = (data) => {
        if (!data) {
            return
        }
        const decryptedData = decodeUtf8(uint8ArrayToString(decrypt(data, encryptionKey)))
        try {
            return JSON.parse(decryptedData)
        } catch (e) {
            return decryptedData
        }
    }

    return {
        hash: (key) => getEncryptedKey(key),
        encrypt: (key, data) => getEncryptedValue(data),
        decrypt: (key, data) => getDecryptedValue(data)
    }
};
