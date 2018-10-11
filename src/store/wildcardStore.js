import { extractQueryTokenPadding, splitTokenPadding } from '../helper/wildcard'
import { getArrayGaps, getGapsArray, unique } from '../helper/array'
import { READWRITE, transaction } from '../helper/idb'
import { vbDecode, vbEncode } from '../helper/variableByteCodes'

/**
 * Split a list of terms to a list of splitted tokens -> term id map.
 * @param {Array<String>} stringTerms
 * @param {Array<Number>} terms
 * @returns {Object}
 */
const splitToMap = (stringTerms, terms) => {
    return stringTerms.reduce((acc, stringTerm, i) => {
        const tokens = splitTokenPadding(stringTerm)
        tokens.forEach((token) => {
            if (!acc[token]) {
                acc[token] = []
            }
            acc[token].push(terms[i])
        })
        return acc
    }, {})
}

/**
 * Wildcard database helper.
 * Handles all logic around storing and finding wildcards.
 * @param {Object} store
 * @param {Function} getTransaction
 * @returns {Object}
 */
export default (store, getTransaction) => {
    const table = store.name

    /**
     * @param {String} token
     * @param {IDBTransaction} tx
     * @returns {Promise<Array>}
     */
    const getList = (token, tx) => {
        return store.get(tx, token)
            .then((result) => getArrayGaps(vbDecode(result)))
    }

    /**
     * @param {String} token
     * @param {Array} list
     * @param {IDBTransaction} tx
     */
    const setList = (token, list, tx) => {
        store.put(tx, vbEncode(getGapsArray(list)), token)
    }

    /**
     * Insert a token-keyword mapping.
     * @param {String} token
     * @param {Array} terms
     * @param {IDBTransaction} tx
     */
    const insertLink = async (token = '', terms = [], tx) => {
        const oldValues = await getList(token, tx)
        const newValues = unique(oldValues.concat(terms))
        setList(token, newValues, tx)
    }

    /**
     * Store wildcards <-> terms
     * @param {Array<String>} stringTerms
     * @param {Array<Number>} terms
     * @returns {Promise}
     */
    const insertBulk = async (stringTerms, terms) => {
        const tx = await getTransaction(table, READWRITE)
        const map = splitToMap(stringTerms, terms)
        const promise = transaction(tx)
        Object.keys(map)
            .forEach((token) => insertLink(token, map[token], tx))
        return promise
    }

    /**
     * Get a list of term ids from a wildcard pattern.
     * @param {String} query Wildcard pattern
     * @returns {Promise<Array<Number>>}
     */
    const get = async (query) => {
        const queryToken = extractQueryTokenPadding(query)
        const tx = await getTransaction(table)
        return getList(queryToken, tx)
    }

    /**
     * Remove a keyword-id mapping.
     * If it was the only id, remove the keyword completely.
     * @param {String} token
     * @param {Array} terms
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const removeLink = async (token = '', terms = [], tx) => {
        const oldValues = await getList(token, tx)
        const newValues = oldValues.filter((aTerm) => !terms.some((term) => term === aTerm))
        if (newValues.length === 0) {
            store.remove(tx, token)
            return
        }
        setList(token, newValues, tx)
    }

    /**
     * Remove a list of keyword-id mapping
     * @param {Array<String>} stringTerms
     * @param {Array<Number>} terms
     * @returns {Promise}
     */
    const removeBulk = async (stringTerms = [], terms) => {
        const map = splitToMap(stringTerms, terms)
        const tx = await getTransaction(table, READWRITE)
        const promise = transaction(tx)
        Object.keys(map)
            .forEach((token) => removeLink(token, map[token], tx))
        return promise
    }

    return {
        insertBulk,
        get,
        removeBulk,
        name: store.name,
        count: store.count,
        size: store.size,
        clear: store.clear,
        clearCache: store.clearCache
    }
}
