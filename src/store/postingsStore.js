import { insertIntoGapsArray, removeFromGapsArray } from '../helper/array'
import { vbDecode, vbEncode } from '../helper/variableByteCodes'
import { READWRITE, transaction } from '../helper/idb'

/**
 * Postings database helper.
 * Handles all logic around storing keywords.
 * @param {Object} store
 * @param {Function} getTransaction
 * @returns {Object}
 */
export default (store, getTransaction) => {
    /**
     * Get the posting list for a term
     * @param {Number} term
     * @param {IDBTransaction} tx
     * @returns {Promise<Array>}
     */
    const getList = (term, tx) => {
        return store.get(tx, term)
            .then((result) => vbDecode(result))
    }

    /**
     * Set the posting list for a term.
     * @param {Number} term
     * @param {Array} list
     * @param {IDBTransaction} tx
     */
    const setList = (term, list, tx) => {
        store.put(tx, vbEncode(list), term)
    }

    /**
     * Insert an id to the postings list.
     * @param {Number} term
     * @param {Number} id
     * @param {IDBTransaction} tx
     */
    const insert = async (term, id, tx) => {
        const result = await getList(term, tx)
        const newValues = insertIntoGapsArray(result, id)

        // Only allow unique links
        if (!newValues) {
            return
        }

        setList(term, newValues, tx)
    }

    /**
     * Get the matching posting lists.
     * @param {Array<Number>} terms
     * @returns {Promise}
     */
    const getBulk = async (terms) => {
        const tx = await getTransaction(store.name)
        const postingLists = await Promise.all(terms.map((term) => getList(term, tx)))

        return postingLists.reduce((acc, list, i) => {
            let id = 0

            for (let j = 0; j < list.length; ++j) {
                id += list[j] // Stored as gap array

                const idx = acc.ids.indexOf(id)
                const term = terms[i]

                if (idx === -1) {
                    acc.ids.push(id)
                    acc.idsToTerms.push([term])
                } else {
                    acc.idsToTerms[idx].push(term)
                }
            }

            return acc
        }, { ids: [], idsToTerms: [], termsToIds: postingLists })
    }

    /**
     * Remove a keyword-id mapping.
     * If it was the only id, remove the keyword completely.
     * @param {Number} term
     * @param {Number} id
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const removeLink = async (term, id, tx) => {
        const oldValues = await getList(term, tx)

        if (oldValues.length === 0) {
            return true
        }

        const newValues = removeFromGapsArray(oldValues, id)
        if (!newValues) {
            return false
        }

        // If it's empty, remove the keyword.
        if (newValues.length === 0) {
            store.remove(tx, term)
            return true
        }

        setList(term, newValues, tx)
        return false
    }

    /**
     * Remove a list of keyword-id mapping
     * @param {Array} terms
     * @param {Number} id
     * @return {Promise<Array>}
     */
    const removeBulk = async (terms, id) => {
        const tx = await getTransaction(store.name, READWRITE)
        const promise = transaction(tx)
        const result = []
        terms.forEach((term, i) =>
            removeLink(term, id, tx)
                .then((value) => result[i] = value)
        )
        await promise
        return result
    }

    const insertBulk = async (terms, id) => {
        const tx = await getTransaction(store.name, READWRITE)
        const promise = transaction(tx)
        terms.forEach((term) => insert(term, id, tx))
        return promise
    }

    return {
        insertBulk,
        getBulk,
        removeBulk,
        name: store.name,
        count: store.count,
        size: store.size,
        clear: store.clear,
        clearCache: store.clearCache
    }
}
