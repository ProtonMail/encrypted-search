import { READWRITE, transaction } from '../helper/idb'
import { vbDecode, vbEncode } from '../helper/variableByteCodes'

/**
 * Position database helper.
 * Handles all logic around storing keywords.
 * @param {Object} store
 * @param {Function} getTransaction
 * @returns {Object}
 */
export default (store, getTransaction) => {
    const table = store.name

    /**
     * Get the terms list for an id.
     * @param {Number} id
     * @param {IDBTransaction} tx
     * @returns {Promise<Array<Number>>}
     */
    const getList = (id, tx) => {
        return store.get(tx, id)
            .then((result) => vbDecode(result))
    }

    /**
     * Get the terms list for an id.
     * @param {Number} id
     * @returns {Promise<Array<Number>>}
     */
    const get = async (id) => {
        const tx = await getTransaction(table)
        return getList(id, tx)
    }

    /**
     * Get the terms list for multiple ids.
     * @param {Array<Number>} ids
     * @returns {Promise<Array<Number>[]>}
     */
    const getBulk = async (ids) => {
        const tx = await getTransaction(table)
        return Promise.all(ids.map((id) => getList(id, tx)))
    }

    /**
     * Set the terms list for an id.
     * @param {Number} id
     * @param {Array<Number>} terms
     * @return {Promise}
     */
    const insert = async (id, terms) => {
        const tx = await getTransaction(table, READWRITE)
        const promise = transaction(tx)
        store.put(tx, vbEncode(terms), id)
        return promise
    }

    /**
     *
     * @param {Number} id
     * @return {Promise}
     */
    const remove = async (id) => {
        const tx = await getTransaction(table, READWRITE)
        const promise = transaction(tx)
        store.remove(tx, id)
        return promise
    }

    return {
        insert,
        get,
        getBulk,
        remove,
        name: store.name,
        count: store.count,
        size: store.size,
        clear: store.clear,
        clearCache: store.clearCache
    }
}
