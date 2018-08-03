/**
 * Data database helper.
 * Handles all logic around storing data.
 * @param {key-value store} store
 * @returns {Object}
 */
export default (store) => {
    /**
     * Insert data.
     * @param {String} id
     * @param {*} data
     * @param {Array} keywords Keywords as tokenized in order
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const insert = (id = '', data, keywords = [], tx) => {
        return store.set(id, { data, keywords }, tx)
    }

    /**
     * Get data.
     * @param {String} id
     * @param {IDBTransaction} tx
     * @returns {Promise<Any | undefined>}
     */
    const get = (id, tx) => store.get(id, tx)

    /**
     * Get the keywords of a data.
     * @param {String} id
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const getKeywords = async (id, tx) => {
        const value = await get(id, tx)
        return (value && value.keywords) || []
    }

    /**
     * Update data of an id.
     * @param {String} id
     * @param {Function} cb
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const update = async (id = '', cb, tx) => {
        const oldValue = await get(id, tx)
        const { keywords = [], data = {} } = oldValue || {}

        return store.set(id, { data: cb(data), keywords }, tx)
    }

    /**
     * Get multiple.
     * @param {Array} ids
     * @param {IDBTransaction} tx
     * @returns {Promise}
     */
    const getByIds = async (ids = [], tx) => {
        return Promise.all(ids.map((id) => get(id, tx)))
    }

    return {
        insert,
        getByIds,
        getKeywords,
        update,
        remove: store.remove,
        count: store.count,
        size: store.size,
        clear: store.clear
    }
}
