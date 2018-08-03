import { extractQueryTokenPadding, splitTokenPadding, wildcardMatch } from '../helper/wildcard'
import { unique } from '../helper/array'

/**
 * Split a list of keywords to a list of splitted tokens -> keywords map.
 * @param {Array} keywords
 * @returns {Object}
 */
const splitToKeyword = (keywords = []) => {
    return keywords.reduce((acc, keyword) => {
        const tokens = splitTokenPadding(keyword)
        tokens.forEach((token) => {
            if (!acc[token]) {
                acc[token] = []
            }
            acc[token].push(keyword)
        })
        return acc
    }, {})
}

/**
 * Wildcard database helper.
 * Handles all logic around storing and finding wildcards.
 * @param {key-value store} store
 * @returns {Object}
 */
export default (store) => {
    /**
     * Insert a token-keyword mapping.
     * @param {String} token
     * @param {Array} keywords
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const insertLink = async (token = '', keywords = [], tx) => {
        const result = await store.get(token, tx)
        const oldValues = result || []
        const newValues = unique(oldValues.concat(keywords))
        return store.set(token, newValues, tx)
    }

    /**
     * Store wildcards <-> keywords
     * @param {Array} keywords
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const insert = (keywords, tx) => {
        const map = splitToKeyword(keywords)
        return Promise.all(Object.keys(map)
            .map((token) => insertLink(token, map[token], tx)))
    }

    /**
     * Get a list of keywords from a wildcard pattern.
     * @param {String} query Wildcard pattern
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const search = async (query = '', tx) => {
        const queryToken = extractQueryTokenPadding(query)
        const results = (await store.get(queryToken, tx)) || []
        return results
            .filter((token) => wildcardMatch(token, query))
    }

    /**
     * Remove a keyword-id mapping.
     * If it was the only id, remove the keyword completely.
     * @param {String} token
     * @param {Array} keywords
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const removeLink = async (token = '', keywords = [], tx) => {
        const result = await store.get(token, tx)
        const oldValues = result || []
        const newValues = oldValues.filter((aKeyword) => !keywords.some((keyword) => keyword === aKeyword))
        if (newValues.length === 0) {
            return store.remove(token, tx)
        }
        return store.set(token, newValues, tx)
    }

    /**
     * Remove a list of keyword-id mapping
     * @param {Array} keywords
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const remove = (keywords = [], tx) => {
        const map = splitToKeyword(keywords)
        return Promise.all(Object.keys(map)
            .map((token) => removeLink(token, map[token], tx)))
    }

    return {
        insert,
        search,
        remove,
        count: store.count,
        size: store.size,
        clear: store.clear
    }
}
