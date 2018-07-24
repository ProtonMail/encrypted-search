/**
 * Enhance a key-value store with encryption.
 * @param {key-value store} store
 * @param {Function} hash
 * @param {Function} encrypt
 * @param {Function} decrypt
 * @returns {Object}
 */
export const withEncryption = (store = {}, { hash, encrypt, decrypt }) => {
    // TODO: Remove once webpack4 is supported.
    return Object.assign({}, store, {
        set: (key, value, tx) => {
            return store.set(hash(key), encrypt(key, value), tx)
        },
        get: async (key, tx) => {
            const encryptedValue = await store.get(hash(key), tx)
            return decrypt(key, encryptedValue)
        },
        remove: (key, tx) => {
            return store.remove(hash(key), tx)
        }
    })
}

/**
 * Create a idb key-value store with transaction support.
 * @param {idb} db
 * @param {String} tableName
 * @returns {Object}
 */
export default (db, tableName = '') => {
    const transaction = (type = 'readonly') => db.transaction(tableName, type)

    /**
     * Get the byte size.
     * @param {String | Uint8Array} value
     * @returns {Number}
     */
    const getSize = (value) => {
        if (!value) {
            return 0
        }
        if (value.byteLength) {
            return value.byteLength
        }
        if (value.length) {
            return value.length
        }
        return 0
    }

    return {
        transaction,
        count: (tx = transaction('readwrite')) => {
            return tx.objectStore(tableName).count()
        },
        size: (tx = transaction()) => {
            let size = 0
            return new Promise((resolve) => {
                const iterate = (cursor) => {
                    if (!cursor) return resolve(size)
                    size += getSize(cursor.value) + getSize(cursor.key)
                    return cursor.continue().then(iterate)
                }
                tx.objectStore(tableName)
                    .openCursor()
                    .then(iterate)
            })
        },
        set: (key = '', value, tx = transaction('readwrite')) => {
            tx.objectStore(tableName).put(value, key)
            return tx.complete
        },
        get: (key = '', tx = transaction()) => {
            return tx.objectStore(tableName).get(key)
        },
        remove: (key = '', tx = transaction('readwrite')) => {
            tx.objectStore(tableName).delete(key)
            return tx.complete
        },
        clear: (tx = transaction('readwrite')) => {
            tx.objectStore(tableName).clear()
            return tx.complete
        }
    }
};
