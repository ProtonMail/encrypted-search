import { READWRITE, transaction } from '../helper/idb'

/**
 * Translation database helper.
 * @param {key-value store} store
 * @param {Function} getTransaction
 * @returns {Object}
 */
export default (store, getTransaction) => {
    /**
     * Get a key from the table.
     * @param {String} key
     * @returns {Promise}
     */
    const get = async (key) => {
        return store.get(key, await getTransaction([store.name]))
    }

    /**
     * Set a key in the table.
     * @param {String} key
     * @param {*} value
     * @returns {Promise}
     */
    const set = async (key, value) => {
        const tx = await getTransaction([store.name], READWRITE)
        const promise = transaction(tx)
        store.set(key, value, tx)
        return promise
    }

    /**
     * Get a key from the table.
     * @param {String} key
     * @param {Function} cb
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const getAndSet = async (key, cb, tx) => {
        const value = await store.get(key, tx)
        const newValue = cb(value)
        store.set(key, newValue, tx)
        return newValue
    }

    /**
     * Remove a key from the table.
     * @param {String} key
     * @returns {Promise}
     */
    const remove = async (key) => {
        const tx = await getTransaction([store.name], READWRITE)
        const promise = transaction(tx)
        store.remove(key, tx)
        return promise
    }

    const idPrefix = (id) => `id-${id}`

    const getTranslatedIds = async (ids = []) => {
        const tx = await getTransaction([store.name])
        return Promise.all(ids.map((id) => store.get(id, tx)))
    }

    const getOrSetId = async (id) => {
        const tx = await getTransaction([store.name], READWRITE)
        const promise = transaction(tx)
        const translatedId = await store.get(idPrefix(id), tx)
        if (translatedId >= 0) {
            return translatedId
        }
        const nextId = await getAndSet('idKey', (value = -1) => ++value, tx)
        store.set(idPrefix(id), nextId, tx)
        store.set(nextId, id, tx)
        await promise
        return nextId
    }

    return {
        get,
        getTranslatedIds,
        getOrSetId,
        set,
        remove,
        clear: store.clear
    }
}
