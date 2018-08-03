import { READWRITE, transaction } from '../helper/idb'

/**
 * Metadata database helper.
 * @param {key-value store} store
 * @param {Function} getTransaction
 * @param {String} name
 * @returns {Object}
 */
export default (store, getTransaction, name) => {
    /**
     * Get a key from the table.
     * @param {String} key
     * @returns {Promise}
     */
    const get = async (key) => {
        return store.get(key, await getTransaction([name]))
    }

    /**
     * Set a key in the table.
     * @param {String} key
     * @param {*} value
     * @returns {Promise}
     */
    const set = async (key, value) => {
        const tx = await getTransaction([name], READWRITE)
        const promise = transaction(tx)
        store.set(key, value, tx)
        return promise
    }

    /**
     * Remove a key from the table.
     * @param {String} key
     * @returns {Promise}
     */
    const remove = async (key) => {
        const tx = await getTransaction([name], READWRITE)
        const promise = transaction(tx)
        store.remove(key, tx)
        return promise
    }

    return {
        get,
        set,
        remove,
        clear: store.clear
    }
}
