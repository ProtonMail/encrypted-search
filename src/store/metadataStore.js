import { READWRITE, transaction } from '../helper/idb'

/**
 * Metadata database helper.
 * @param {Object} store
 * @param {Function} getTransaction
 * @returns {Object}
 */
export default (store, getTransaction) => {
    const table = [store.name]

    /**
     * Get a key from the table.
     * @param {String} key
     * @returns {Promise}
     */
    const get = async (key) => {
        return store.get(await getTransaction(table), key)
    }

    /**
     * Set a key in the table.
     * @param {String} key
     * @param {*} value
     * @returns {Promise}
     */
    const set = async (key, value) => {
        const tx = await getTransaction(table, READWRITE)
        const promise = transaction(tx)
        store.put(tx, value, key)
        return promise
    }

    /**
     * Get and set the next incrementing ID number.
     * @param {String} key
     * @returns {Promise}
     */
    const getAndSetId = async (key) => {
        const tx = await getTransaction(table, READWRITE)
        const value = await store.get(key, tx)
        const newValue = (value === undefined ? -1 : value) + 1
        store.put(tx, newValue, key)
        return newValue
    }

    /**
     * Remove a key from the table.
     * @param {String} key
     * @returns {Promise}
     */
    const remove = async (key) => {
        const tx = await getTransaction(table, READWRITE)
        const promise = transaction(tx)
        store.remove(tx, key)
        return promise
    }

    return {
        get,
        set,
        getAndSetId,
        remove,
        name: store.name,
        clear: store.clear
    }
}
