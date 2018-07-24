import { onlyUnique, flatten } from './helper/arrayHelper'
import scoring from './helper/scoring'

/**
 * The master database in charge of the search index.
 * Handles the logic around the search index, i.e. tying together keywords, data and searching for it.
 * @returns {Object}
 */
export default (keywordsStore, dataStore) => {
    /**
     * Find data based on the inputted keywords.
     * @param {Array} keywords Keywords to search
     * @param {Boolean} withScoring Add scoring
     * @return {Promise} messages
     */
    const search = async (keywords, withScoring = true) => {
        if (!Array.isArray(keywords)) {
            return
        }
        const uniqueKeywords = onlyUnique(keywords)
        const keywordsToIds = await keywordsStore.get(uniqueKeywords)
        const uniqueDataIds = onlyUnique(flatten(keywordsToIds))
        const datas = await dataStore.getDatas(uniqueDataIds)
        // TODO: Filter out the keyword<-id->mappings that does not exist, and remove them from the keywords.
        const filteredDatas = datas.filter((data) => !!data)
        if (!withScoring) {
            return filteredDatas
        }
        const count = await dataStore.count()
        const idsToKeywords = filteredDatas.reduce((agg, { keywords } = {}, i) => {
            if (!Array.isArray(keywords)) {
                return agg
            }
            agg[uniqueDataIds[i]] = keywords
            return agg
        }, {})
        const scores = scoring({
            keywords,
            keywordsToIds,
            N: count,
            idsToKeywords
        })
        return filteredDatas.map(({ data }) => {
            // Mutating the object in case it's a class to preserve the this context.
            data.Score = scores[data.ID] || 0
            return data
        })
    }

    /**
     * Store a message to be indexed.
     * @param  {String} id
     * @param  {Array} keywords
     * @param  {Any} data
     * @return {Promise}
     */
    const store = (id, keywords, data) => {
        if (!id || typeof id !== 'string') {
            throw new Error('ID required')
        }
        if (!Array.isArray(keywords)) {
            throw new Error('Keywords need to be an array')
        }
        return Promise.all([keywordsStore.insert(onlyUnique(keywords), id), dataStore.insert(id, data, keywords)])
    }

    /**
     * Update the data.
     * @param  {String} id
     * @param  {Function} cb
     * @returns {Promise}
     */
    const update = async (id, cb) => {
        if (!id || typeof id !== 'string') {
            throw new Error('ID required')
        }
        return dataStore.update(id, cb)
    }

    /**
     * Remove a data item. Ensures that all keywords related to the data are deleted too.
     * @param {String} id
     * @returns {Promise}
     */
    const remove = async (id = '') => {
        if (!id || typeof id !== 'string') {
            throw new Error('ID required')
        }
        const keywords = await dataStore.getKeywords(id)
        await keywordsStore.remove(onlyUnique(keywords), id)
        return dataStore.remove(id)
    }

    /**
     * Get the total count and size of the database.
     * @returns {Promise}
     */
    const stats = async () => {
        return {
            keywords: {
                total: await keywordsStore.count(),
                size: await keywordsStore.size()
            },
            data: {
                total: await dataStore.count(),
                size: await dataStore.size()
            }
        }
    }

    return {
        search,
        store,
        update,
        remove,
        stats
    }
}
