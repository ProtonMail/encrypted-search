import { decrypt, encrypt, hash } from './cryptoHelper'
import { stringToUint8Array, uint8ArrayToString } from './arrayHelper'
import { encodeUtf8, decodeUtf8 } from './stringHelper'
import { TABLES } from '../../src/master'

export default (encryptionKey, hashSalt) => {
    const property = (table, key) => hash(stringToUint8Array(encodeUtf8(key)), hashSalt)

    const serializeUint8Array = (key, data) => encrypt(data, encryptionKey)
    const deserializeUint8Array = (key, data) => decrypt(data, encryptionKey)

    const serializeJson = (key, data) => encrypt(stringToUint8Array(encodeUtf8(JSON.stringify(data))), encryptionKey)
    const deserializeJson = (key, data) => JSON.parse(decodeUtf8(uint8ArrayToString(decrypt(data, encryptionKey))))

    const serialize = (table, key, data) => {
        if (typeof data === 'undefined') {
            return
        }
        if (table === TABLES.KEYWORDS) {
            return serializeUint8Array(key, data)
        }
        return serializeJson(key, data)
    }

    const deserialize = (table, key, data) => {
        if (typeof data === 'undefined') {
            return
        }
        if (table === TABLES.KEYWORDS) {
            return deserializeUint8Array(key, data)
        }
        return deserializeJson(key, data)
    }

    return {
        property,
        serialize,
        deserialize
    }
}
