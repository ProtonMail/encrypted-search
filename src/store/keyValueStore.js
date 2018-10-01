import { request } from '../helper/idb'
import sizeof from '../helper/sizeof'

/**
 * Enhance a key-value store with caching.
 * @param {key-value store} store
 * @param {Cache} cache
 * @returns {Object}
 */
export const withCache = (store, { set, get, remove }) => {
    return {
        ...store,
        set: (key, value, tx) => {
            set(key, value)
            return store.set(key, value, tx)
        },
        get: async (key, tx) => {
            const cachedValue = get(key)
            if (cachedValue) {
                return cachedValue
            }
            const value = await store.get(key, tx)
            set(key, value)
            return value
        },
        remove: (key, tx) => {
            remove(key)
            return store.remove(key, tx)
        }
    }
}

/**
 * Enhance a key-value store with transformer functions.
 * @param {Number} id
 * @param {key-value store} store
 * @param {String} table
 * @param {Function} property
 * @param {Function} serialize
 * @param {Function} deserialize
 * @returns {Object}
 */
export const withTransformers = (id, store, { property, serialize, deserialize }) => {
    return {
        ...store,
        set: (key, value, tx) => {
            return store.set(property(id, key), serialize(id, key, value), tx)
        },
        get: async (key, tx) => {
            const encryptedValue = await store.get(property(id, key), tx)
            return deserialize(id, key, encryptedValue)
        },
        remove: (key, tx) => {
            return store.remove(property(id, key), tx)
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
