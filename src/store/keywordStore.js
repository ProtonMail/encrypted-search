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
     * @param {Transaction} tx
     * @returns {Promise<Array>}
     */
    const getKeyword = async (keyword = '', tx) => {
        return store.get(keyword, tx)
    }

    /**
     * Get the id mappings from a list of keywords.
     * @param {Array} keywords
     * @returns {Promise<Array>}
     */
    const get = (keywords = []) => {
        const tx = store.transaction('readonly')
        return Promise.all(keywords.map((keyword) => getKeyword(keyword, tx)))
    }

    /**
     * Insert a keyword-id mapping.
     * Get the old list of data ids for the keyword, and push the new id, ensuring the list contains unique values.
     * Does it in the same read-write transaction to prevent concurrency issues.
     * e.g: 'needle': [1,2,3,4,5]
     * @param {String} keyword
     * @param {String} id
     * @param {Transaction} tx
     * @returns {Promise}
     */
    const insertKeywordLink = async (keyword = '', id = '', tx) => {
        const result = await getKeyword(keyword, tx)
        const oldValues = result || []

        // Only allow unique links.
        if (oldValues.indexOf(id) !== -1) {
            return
        }

        const newValues = [...oldValues, id]
        return store.set(keyword, newValues, tx)
    }

    /**
     * Insert a list of keyword-id mapping.
     * @param {Array} keywords
     * @param {String} id
     * @returns {Promise}
     */
    const insert = (keywords = [], id = '') => {
        const tx = store.transaction('readwrite')
        return Promise.all(keywords.map((keyword) => insertKeywordLink(keyword, id, tx)))
    }

    /**
     * Remove a keyword-id mapping.
     * If it was the only id, remove the keyword completely.
     * @param {String} keyword
     * @param {String} id
     * @param {Transaction} tx
     * @returns {Promise}
     */
    const removeKeywordLink = async (keyword = '', id = '', tx) => {
        const result = await store.get(keyword, tx)
        const oldValues = result || []
        if (oldValues.indexOf(id) === -1) {
            return
        }

        const newValues = oldValues.filter((aId) => aId !== id)

        // If it's empty, just remove the keyword.
        if (newValues.length === 0) {
            return store.remove(keyword, tx)
        }
        return store.set(keyword, newValues, tx)
    }

    /**
     * Remove a list of keyword-id mapping
     * @param {Array} keywords
     * @param {String} id
     * @returns {Promise}
     */
    const remove = (keywords = [], id = '') => {
        const tx = store.transaction('readwrite')
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
