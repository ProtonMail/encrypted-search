import { decrypt, encrypt, hash } from './cryptoHelper'
import { stringToUint8Array, uint8ArrayToString } from './arrayHelper'
import { encodeUtf8, decodeUtf8 } from './stringHelper'
import { TABLES } from '../../src/master'

export default (encryptionKey, hashSalt) => {
    const property = (key) => hash(stringToUint8Array(encodeUtf8(key)), hashSalt)

    const serializeUint8Array = (key, data) => encrypt(data, encryptionKey)
    const deserializeUint8Array = (key, data) => decrypt(data, encryptionKey)

    const serializeJson = ( key, data) => encrypt(stringToUint8Array(encodeUtf8(JSON.stringify(data))), encryptionKey)
    const deserializeJson = (key, data) => JSON.parse(decodeUtf8(uint8ArrayToString(decrypt(data, encryptionKey))))

    return {
        property,
        serializeJson,
        serializeUint8Array,
        deserializeJson,
        deserializeUint8Array
    }
}

export const transformer = ({
    property,
    serializeUint8Array,
    deserializeUint8Array,
    serializeJson,
    deserializeJson
}) => (table) => {
    if (table === TABLES.KEYWORDS) {
        return {
            property,
            serialize: serializeUint8Array,
            deserialize: deserializeUint8Array
        }
    }

    return {
        property,
        serialize: serializeJson,
        deserialize: deserializeJson
    }
}
