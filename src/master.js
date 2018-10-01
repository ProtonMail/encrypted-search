import { open as openDb, transaction, READWRITE, openWithClosure } from './helper/idb'

import createDataStore from './store/dataStore'
import createKeywordsStore from './store/keywordStore'
import createWildcardStore from './store/wildcardStore'
import createMetadataStore from './store/metadataStore'
import createTranslationStore from './store/translationStore'
import createKeyValueStore, { withCache, withTransformers } from './store/keyValueStore'
import createCache from './helper/lru'

import { unique } from './helper/array'

const DB_VERSION = 1
const INTEGRITY_KEY = 'T_E_S_T'
const INTEGRITY_VALUE = 'TEST'

export const TABLES = {
    KEYWORDS: 1,
    DATA: 2,
    WILDCARDS: 3,
    METADATA: 4,
    TRANSLATIONS: 5
}

const upgradeDb = ({ keywords, data, metadata, wildcards, translations }) => (db, oldVersion) => {
    switch (oldVersion) {
        case 0:
            db.createObjectStore(metadata)
            db.createObjectStore(keywords)
            db.createObjectStore(data)
            db.createObjectStore(wildcards)
            db.createObjectStore(translations)
    }
}

const assertId = (id) => {
    const type = typeof id
    return !(!id || (type !== 'string' && type !== 'number'))
}

const defaultTransformers = {
    property: (id, key) => key,
    serialize: (id, key, value) => value,
    deserialize: (id, key, value) => value
}

const buildKvStore = (id, store, transformer, cache) => {
    const enchancedStore = withTransformers(id, store, transformer)
    if (!cache) {
        return enchancedStore
    }
    return withCache(enchancedStore, cache)
}

/**
 * Create the encrypted search index.
 * @param {String} [dbName='index'] - The name of this database.
 * @param {String} [dataName='data'] - The name of the data object store.
 * @param {String} [keywordsName='keywords'] - The name of the keywords object store.
 * @param {String} [wildcardsName='wildcards'] - The name of the wildcards object store.
 * @param {String} [metadataName='metadata'] - The name of the metadata object store.
 * @param {String} [translationName='translations'] - The name of the translation object store.
 * @param {Number} [closeTimeout=15000] - Timeout before closing the indexedDB connection.
 * @param {Object} transformers - Object containing the property, serialize, and deserialize functions.
 * @param {Boolean} [useCache=false] - Cache the key-value stores locally.
 *   NOTE: Enabling this will only give consistent results if you access the encrypted search
 *   index from one instance. If you write from another instance the cache will become invalid
 *   and thus give the wrong results.
 * @returns {Object}
 */
export default ({
    dbName = 'index',
    dataName = 'data',
    keywordsName = 'keywords',
    wildcardsName = 'wildcards',
    metadataName = 'metadata',
    translationName = 'translations',
    closeTimeout = 15000,
    transformers = defaultTransformers,
    useCache = false
} = {}) => {
    const open = () => openDb(indexedDB, dbName, DB_VERSION, upgradeDb({
        keywords: keywordsName,
        data: dataName,
        wildcards: wildcardsName,
        metadata: metadataName,
        translations: translationName
    }))

    const { getTransaction, close } = openWithClosure(open, closeTimeout)

    const keywordsCache = useCache ? createCache() : undefined
    const keywordsStore = createKeywordsStore(
        buildKvStore(
            TABLES.KEYWORDS,
            createKeyValueStore(keywordsName),
            transformers,
            keywordsCache
        )
    )

    const wildcardsCache = useCache ? createCache() : undefined
    const wildcardStore = createWildcardStore(
        buildKvStore(
            TABLES.WILDCARDS,
            createKeyValueStore(wildcardsName),
            transformers,
            wildcardsCache
        )
    )

    const dataCache = useCache ? createCache() : undefined
    const dataStore = createDataStore(
        buildKvStore(
            TABLES.DATA ,
            createKeyValueStore(dataName),
            transformers,
            dataCache
        )
    )

    const metadataStore = createMetadataStore(
        buildKvStore(
            TABLES.METADATA,
            createKeyValueStore(metadataName),
            transformers
        ),
        getTransaction
    )

    const translationCache = useCache ? createCache() : undefined
    const translationStore = createTranslationStore(
        buildKvStore(
            TABLES.TRANSLATIONS,
            createKeyValueStore(translationName),
            transformers,
            translationCache
        ),
        getTransaction
    )

    /**
     * Clean stale data from the keywords->id table when performing a search.
     * It relies on the fact that a keyword returned an id which does not exist in the data table.
     * @param {Array} datas
     * @param {Array} ids
     * @param {Array} uniqueKeywords
     * @returns {Promise}
     */
    const cleanStaleData = async (datas, ids, uniqueKeywords) => {
        const staleIds = datas.reduce((agg, { keywords } = {}, i) => {
            // Detecting stale data.
            if (!Array.isArray(keywords)) {
                agg.push(ids[i])
            }
            return agg
        }, [])

        if (!staleIds) {
            return
        }

        const tx = await getTransaction([keywordsName], READWRITE)
        const promise = transaction(tx)

        staleIds.map((id) => keywordsStore.remove(uniqueKeywords, id, tx))

        return promise
    }

    /**
     * Find data based on the keywords.
     * @param {Array} searchKeywords Keywords to search
     * @return {Promise}
     */
    const search = async (searchKeywords = []) => {
        if (!Array.isArray(searchKeywords)) {
            throw new Error('Keywords must be an array')
        }

        const tx = await getTransaction([dataName, keywordsName])

        const uniqueKeywords = unique(searchKeywords)
        const { keywordsToIds, idsToKeywords, ids } = await keywordsStore.get(uniqueKeywords, tx)
        const data = await dataStore.getByIds(ids, tx)

        cleanStaleData(data, ids, uniqueKeywords)

        const idsTranslated = await translationStore.getTranslatedIds(ids)

        const result = data
            .reduce((agg, { data, keywords } = {}, i) => {
                // Ignore stale data.
                if (!Array.isArray(keywords)) {
                    return agg
                }

                const id = idsTranslated[i]
                const match = idsToKeywords[i]

                agg.push({
                    id,
                    data,
                    keywords,
                    match
                })

                return agg
            }, [])

        return {
            result,
            ids,
            keywordsToIds
        }
    }

    /**
     * Store keywords and data to index.
     * @param {String|Number} id
     * @param  {Array} keywords
     * @param  {*} [data]
     * @return {Promise}
     */
    const store = async (id, keywords, data) => {
        if (!assertId(id)) {
            throw new Error('ID required')
        }
        if (!Array.isArray(keywords)) {
            throw new Error('Keywords need to be an array')
        }

        const translatedId = await translationStore.getOrSetId(id)
        const tx = await getTransaction([dataName, keywordsName, wildcardsName], READWRITE)
        const promise = transaction(tx)

        const uniqueKeywords = unique(keywords)

        keywordsStore.insert(uniqueKeywords, translatedId, tx)
        dataStore.insert(translatedId, data, keywords, tx)
        wildcardStore.insert(uniqueKeywords, tx)

        return promise
    }

    /**
     * Update the data.
     * @param {String|Number} id
     * @param  {Function} cb
     * @returns {Promise}
     */
    const update = async (id, cb) => {
        if (!assertId(id)) {
            throw new Error('ID required')
        }

        const translatedId = await translationStore.getOrSetId(id)
        const tx = await getTransaction([dataName], READWRITE)
        const promise = transaction(tx)

        dataStore.update(translatedId, cb, tx)

        return promise
    }

    /**
     * Remove a data item. Ensures that all keywords related to the data are deleted too.
     * Returns a promise that resolves to a list of keywords that were fully deleted.
     * @param {String|Number} id
     * @returns {Promise}
     */
    const remove = async (id = '') => {
        if (!assertId(id)) {
            throw new Error('ID required')
        }

        const translatedId = await translationStore.getOrSetId(id)
        const tx = await getTransaction([dataName, keywordsName, wildcardsName], READWRITE)
        const promise = transaction(tx)

        const keywords = await dataStore.getKeywords(translatedId, tx)
        const uniqueKeywords = unique(keywords)
        const removals = await keywordsStore.remove(uniqueKeywords, translatedId, tx)
        const removedKeywords = uniqueKeywords.filter((keyword, i) => removals[i])

        dataStore.remove(translatedId, tx)
        wildcardStore.remove(removedKeywords, tx)

        return promise
    }

    /**
     * Perform a wildcard query.
     * @param {String} query Wildcard query pattern.
     * @returns {Promise}
     */
    const wildcard = async (query) => {
        const tx = await getTransaction([wildcardsName])
        return wildcardStore.search(query, tx)
    }

    const clearCache = () => {
        if (!useCache) {
            return
        }
        dataCache.clear()
        keywordsCache.clear()
        wildcardsCache.clear()
        translationCache.clear()
    }

    /**
     * Clear all tables.
     * @return {Promise}
     */
    const clear = async () => {
        const tx = await getTransaction([dataName, keywordsName, wildcardsName, metadataName, translationName], READWRITE)
        const promise = transaction(tx)

        clearCache()

        dataStore.clear(tx)
        keywordsStore.clear(tx)
        wildcardStore.clear(tx)
        metadataStore.clear(tx)
        translationStore.clear(tx)

        return promise
    }

    /**
     * Initialize the database by writing an integrity value. This value
     * is checked in the corrupt method to compare if it is still the same.
     * @returns {Promise}
     */
    const initialize = () => metadataStore.set(INTEGRITY_KEY, INTEGRITY_VALUE)

    /**
     * Returns a boolean whether the integrity of the database still holds.
     * @returns {Promise}
     */
    const corrupt = async () => (await metadataStore.get(INTEGRITY_KEY)) !== INTEGRITY_VALUE

    /**
     * Returns stats on all tables.
     * @returns {Promise}
     */
    const stats = async () => {
        const tx = await getTransaction([dataName, keywordsName, wildcardsName])

        const result = await Promise.all([keywordsStore, dataStore, wildcardStore]
            .map((store) => Promise.all([store.count(tx), store.size(tx)])))

        const getStats = (total, size) => ({ total, size })
        const getStatsResult = ([total, size]) => getStats(total, size)

        const keywords = getStatsResult(result[0])
        const data = getStatsResult(result[1])
        const wildcards = getStatsResult(result[2])

        return {
            keywords,
            data,
            wildcards,
            ...getStats(
                keywords.total + data.total + wildcards.total,
                keywords.size + data.size + wildcards.size
            )
        }
    }

    /**
     * Return the number of keywords currently indexed.
     * @returns {Promise}
     */
    const numberOfKeywords = async () => {
        const tx = await getTransaction([keywordsName])
        return keywordsStore.count(tx)
    }

    return {
        initialize,
        search,
        wildcard,
        store,
        update,
        remove,
        clear,
        clearCache,
        corrupt,
        numberOfKeywords,
        stats,
        close,
        metadata: metadataStore
    }
}
