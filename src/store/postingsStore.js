import { insertIntoGapsArray, removeFromGapsArray, shuffle } from '../helper/array'
import { vbDecode, vbEncode } from '../helper/variableByteCodes'
import { READWRITE, request, transaction } from '../helper/idb'

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
    const getList = async (term, tx) => {
        const result = await store.get(tx, term)
        return vbDecode(result)
    }

    /**
     * Set the posting list for a term.
     * @param {Number} term
     * @param {Array} list
     * @param {IDBTransaction} tx
     */
    const setList = (term, list, tx) => {
        return store.put(tx, vbEncode(list), term)
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
    const insert2 = (term, id, result, tx) => {
        const newValues = insertIntoGapsArray(result, id)

        // Only allow unique links
        if (!newValues) {
            return
        }

        return setList(term, newValues, tx)
    }


    /**
     * Get the matching posting lists.
     * @param {Number} term
     * @returns {Promise}
     */
    const get = async (term) => {
        const tx = await getTransaction(store.name)
        return getList(term, tx)
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
        terms.forEach(async (term, i) =>
            removeLink(term, id, tx)
                .then((value) => result[i] = value)
        )
        await promise
        return result
    }

    const removeBulk2 = async (terms, id) => {
        const tx = await getTransaction(store.name, READWRITE)
        const postingLists = await Promise.all(terms.map((term) => getList(term, tx)))
        const result = []
        let req
        for (let i = 0; i < terms.length; ++i) {
            const term = terms[i]
            const oldValues = postingLists[i]

            const newValues = removeFromGapsArray(oldValues, id)
            if (!newValues) {
                result[i] = true
                continue
            }

            // If it's empty, remove the keyword.
            if (newValues.length === 0) {
                result[i] = true
                req = store.remove(tx, term)
                continue
            }

            result[i] = false
            req = setList(term, newValues, tx)
        }

        if (!req) {
            return result
        }

        await request(req)
        return result
    }

    const insertBulk = async (terms, id) => {
        const tx = await getTransaction(store.name, READWRITE)
        const promise = transaction(tx)
        terms.forEach((term) => insert(term, id, tx))
        return promise
    }

    /**
     * Insert bulk, only waits for the last request rather than the transaction.
     * It's supposedly faster, but data consistency guarantees?
     * @param {Array} terms
     * @param {Number} id
     * @returns {Promise}
     */
    const insertBulk2 = async (terms, id) => {
        if (terms.length === 0) {
            return
        }

        const tx = await getTransaction(store.name, READWRITE)
        const postingLists = await Promise.all(terms.map((term) => getList(term, tx)))

        let req = undefined
        for (let i = 0; i < terms.length; ++i) {
            const insertRequest = insert2(terms[i], id, postingLists[i], tx)

            if (insertRequest) {
                req = insertRequest
            }
        }

        if (!req) {
            return
        }

        return request(req)
    }

    return {
        get,
        insertBulk: insertBulk2,
        getBulk,
        removeBulk: removeBulk2,
        name: store.name,
        count: store.count,
        size: store.size,
        clear: store.clear
    }
}
