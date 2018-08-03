/**
 * Keyword database helper.
 * Handles all logic around storing keywords.
 * @param {key-value store} store
 * @returns {Object}
 */
export default (store) => {
    /**
     * Get a keyword.
     * @param {String} keyword
     * @param {IDBTransaction} tx
     * @returns {Promise<Array>}
     */
    const getKeyword = (keyword = '', tx) => {
        return store.get(keyword, tx)
    }

    /**
     * Get the union of all id mappings from a list of keywords.
     * Returns the ids as a flattened unique list of results,
     * the ids to keywords and keywords to ids
     * @param {Array} keywords
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const get = async (keywords = [], tx) => {
        const keywordsToIds = await Promise.all(keywords.map((keyword) => getKeyword(keyword, tx)))
        return keywordsToIds.reduce((acc, cur = [], i) => {
            cur.forEach((id) => {
                const idx = acc.ids.indexOf(id)
                const keyword = keywords[i]
                if (idx === -1) {
                    acc.ids.push(id)
                    acc.idsToKeywords.push([keyword])
                } else {
                    acc.idsToKeywords[idx].push(keyword)
                }
            })
            return acc
        }, { ids: [], idsToKeywords: [], keywordsToIds })
    }

    /**
     * Insert a keyword-id mapping.
     * Get the old list of data ids for the keyword, and push the new id, ensuring the list contains unique values.
     * Does it in the same read-write transaction to prevent concurrency issues.
     * e.g: 'needle': [1,2,3,4,5]
     * @param {String} keyword
     * @param {String} id
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const insertKeywordLink = async (keyword = '', id = '', tx) => {
        const result = await getKeyword(keyword, tx)
        const oldValues = result || []

        // Only allow unique links.
        if (oldValues.indexOf(id) !== -1) {
            return
        }

        oldValues.push(id)
        return store.set(keyword, oldValues, tx)
    }

    /**
     * Insert a list of keyword-id mapping.
     * @param {Array} keywords
     * @param {String} id
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const insert = (keywords = [], id = '', tx) => {
        return Promise.all(keywords.map((keyword) => insertKeywordLink(keyword, id, tx)))
    }

    /**
     * Remove a keyword-id mapping.
     * If it was the only id, remove the keyword completely.
     * @param {String} keyword
     * @param {String} id
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const removeKeywordLink = async (keyword = '', id = '', tx) => {
        const result = await store.get(keyword, tx)

        const oldValues = result || []
        if (oldValues.length === 0) {
            return true
        }
        if (oldValues.indexOf(id) === -1) {
            return false
        }

        const newValues = oldValues.filter((aId) => aId !== id)

        // If it's empty, remove the keyword.
        if (newValues.length === 0) {
            store.remove(keyword, tx)
            return true
        }

        store.set(keyword, newValues, tx)
        return false
    }

    /**
     * Remove a list of keyword-id mapping
     * @param {Array} keywords
     * @param {String} id
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const remove = (keywords = [], id = '', tx) => {
        return Promise.all(keywords.map((keyword) => removeKeywordLink(keyword, id, tx)))
    }

    return {
        insert,
        get,
        remove,
        count: store.count,
        size: store.size,
        clear: store.clear
    }
}
