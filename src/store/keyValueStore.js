import { request } from '../helper/idb'
import sizeof from '../helper/sizeof'

/**
 * Enhance a key-value store with transformer functions.
 * @param {key-value store} store
 * @param {String} table
 * @param {Function} property
 * @param {Function} serialize
 * @param {Function} deserialize
 * @returns {Object}
 */
export const withTransformers = (store, { property, serialize, deserialize }) => {
    return {
        ...store,
        set: (key, value, tx) => {
            const serializedValue = typeof value === 'undefined' ?
                undefined : serialize(key, value)

            return store.set(property(key), serializedValue, tx)
        },
        get: async (key, tx) => {
            const encryptedValue = await store.get(property(key), tx)

            return typeof encryptedValue === 'undefined' ?
                undefined : deserialize(key, encryptedValue)
        },
        remove: (key, tx) => {
            return store.remove(property(key), tx)
        }
    }
}

/**
 * Create a idb key-value store with transaction support.
 * @param {String} tableName
 * @returns {Object}
 */
export default (tableName = '') => {
    return {
        name: tableName,
        count: (tx) => {
            return request(tx.objectStore(tableName).count())
        },
        size: (tx) => {
            let size = 0
            return new Promise((resolve, reject) => {
                const request = tx.objectStore(tableName).openCursor()
                request.onerror = () => reject(request.error)
                request.onsuccess = (event) => {
                    const cursor = event.target.result
                    if (!cursor) {
                        return resolve(size)
                    }
                    size += sizeof(cursor.value) + sizeof(cursor.key)
                    cursor.continue()
                }
            })
        },
        set: (key = '', value, tx) => {
            return tx.objectStore(tableName).put(value, key)
        },
        get: (key = '', tx) => {
            return request(tx.objectStore(tableName).get(key))
        },
        remove: (key = '', tx) => {
            return tx.objectStore(tableName).delete(key)
        },
        clear: (tx) => {
            return tx.objectStore(tableName).clear()
        }
    }
}
