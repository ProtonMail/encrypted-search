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
     * @param {Any} data
     * @param {Array} keywords
     * @returns {Promise}
     */
    const insert = (id = '', data, keywords = []) => {
        return store.set(id, { data, keywords })
    }

    /**
     * Get data.
     * @param {String} id
     * @param {Transaction} [tx]
     * @returns {Promise<Any | undefined>}
     */
    const get = (id, tx = store.transaction('readonly')) => store.get(id, tx)

    /**
     * Get the keywords of a data.
     * @param {String} id
     * @param {Transaction} [tx]
     * @returns {Promise}
     */
    const getKeywords = async (id, tx = store.transaction('readonly')) => {
        const value = await get(id, tx)
        return (value && value.keywords) || []
    }

    /**
     * Update the data.
     * @param {String} id
     * @param {Function} cb
     * @returns {Promise}
     */
    const update = async (id = '', cb) => {
        const tx = store.transaction('readwrite')

        const oldValue = await get(id, tx)
        const { keywords = [], data = {} } = oldValue || {}

        return store.set(id, { data: cb(data), keywords }, tx)
    }

    /**
     * Get multiple datas.
     * @param {Array} ids
     * @returns {Promise<(Object)[]>}
     */
    const getDatas = async (ids = []) => {
        const tx = store.transaction('readonly')
        return Promise.all(ids.map((id) => get(id, tx)))
    }

    return {
        insert,
        getDatas,
        getKeywords,
        update,
        remove: store.remove,
        count: store.count,
        size: store.size,
        clear: store.clear
    }
}
