import { READWRITE, request, transaction } from '../helper/idb'
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
    const getList = async (id, tx) => {
        const result = await store.get(tx, id)
        return vbDecode(result)
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
        return request(store.put(tx, vbEncode(terms), id))
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
        clear: store.clear
    }
}
