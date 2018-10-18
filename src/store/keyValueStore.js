import { request } from '../helper/idb'
import sizeof from '../helper/sizeof'

/**
 * Enhance a key-value store with transformer functions.
 * @param {Number} id
 * @param {Object} store
 * @param {String} table
 * @param {Function} property
 * @param {Function} serialize
 * @param {Function} deserialize
 * @returns {Object}
 */
export const withTransformers = (id, store, { property, serialize, deserialize }) => {
    return {
        ...store,
        put: (tx, value, key) => {
            return store.put(tx, serialize(id, key, value), property(id, key))
        },
        get: async (tx, key) => {
            const encryptedValue = await store.get(tx, property(id, key))
            return deserialize(id, key, encryptedValue)
        },
        remove: (tx, key) => {
            return store.remove(tx, property(id, key))
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
        put: (tx, value, key) => {
            return tx.objectStore(tableName).put(value, key)
        },
        get: (tx, key) => {
            return request(tx.objectStore(tableName).get(key))
        },
        remove: (tx, key) => {
            return tx.objectStore(tableName).delete(key)
        },
        clear: (tx) => {
            return tx.objectStore(tableName).clear()
        }
    }
}
