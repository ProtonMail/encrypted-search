import { decrypt, encrypt, hash } from './cryptoHelper'
import { stringToUint8Array } from './arrayHelper'
import { encodeUtf8 } from './stringHelper'
import { TABLES } from '../../src/master'
import { readJson, readUint32, writeJson, writeUint32 } from './serializeHelper'

export default (encryptionKey, hashSalt) => {
    const property = (table, key) => {
        if (table === TABLES.LEXICON) {
            return key
        }
        if (table === TABLES.IDS) {
            return key
        }
        return hash(stringToUint8Array(encodeUtf8(key)), hashSalt)
    }

    const writeTable = (table, key, data) => {
        return writeJson(data)
    }

    const serialize = (table, key, data) => {
        if (typeof data === 'undefined') {
            return
        }
        if (table === TABLES.POSTINGS || TABLES.POSITIONS || TABLES.WILDCARDS) {
            return data
        }
        if (table === TABLES.LEXICON_INVERSE || table === TABLES.IDS_INVERSE) {
            return writeUint32(data)
        }
        return encrypt(writeTable(table, key, data), encryptionKey)
    }

    const readTable = (table, key, data) => {
        return readJson(data)
    }

    const deserialize = (table, key, data) => {
        if (typeof data === 'undefined') {
            return
        }
        if (table === TABLES.POSTINGS || TABLES.POSITIONS || TABLES.WILDCARDS) {
            return data
        }
        if (table === TABLES.LEXICON_INVERSE || table === TABLES.IDS_INVERSE) {
            return readUint32(data)
        }
        return readTable(table, key, decrypt(data, encryptionKey))
    }

    return {
        property,
        serialize,
        deserialize
    }
}
