import { open as openDb, transaction, READWRITE, openWithClosure } from './helper/idb'

import createPostingsStore from './store/postingsStore'
import createPositionsStore from './store/positionsStore'
import createWildcardStore from './store/wildcardStore'
import createTransposeStore from './store/transposeStore'
import createKeyValueStore, { withTransformers } from './store/keyValueStore'

import { flatten, mutablyShuffleTwo, unique } from './helper/array'
import { wildcardMatch } from './helper/wildcard'

const DB_VERSION = 1

export const TABLES = {
    LEXICON: 1,
    LEXICON_INVERSE: 2,

    IDS: 3,
    IDS_INVERSE: 4,

    POSTINGS: 5,
    POSITIONS: 6,
    WILDCARDS: 7
}

export const DEFAULT_NAMES = {
    db: 'index',
    [TABLES.LEXICON]: 'lexicon',
    [TABLES.LEXICON_INVERSE]: 'lexicon_inverse',
    [TABLES.IDS]: 'ids',
    [TABLES.IDS_INVERSE]: 'ids_inverse',
    [TABLES.POSTINGS]: 'postings',
    [TABLES.POSITIONS]: 'positions',
    [TABLES.WILDCARDS]: 'wildcards'
}

const upgradeDb = (names) => (db, oldVersion) => {
    switch (oldVersion) {
        case 0: {
            [
                TABLES.LEXICON,
                TABLES.IDS,
                TABLES.LEXICON_INVERSE,
                TABLES.IDS_INVERSE,
                TABLES.POSTINGS,
                TABLES.POSITIONS,
                TABLES.WILDCARDS
            ].forEach((table) => db.createObjectStore(names[table]))
            break
        }
    }
}

const assertId = (id) => {
    const type = typeof id
    return !(!id || (type !== 'string' && type !== 'number'))
}

const DEFAULT_TRANSFORMERS = {
    property: (id, key) => key,
    serialize: (id, key, value) => value,
    deserialize: (id, key, value) => value
}

/**
 * Create the encrypted search index.
 * @param {Object} options
 * @returns {Object}
 */
export default (options = {}) => {
    const names = { ...DEFAULT_NAMES, ...options.names, }
    const transformers = { ...DEFAULT_TRANSFORMERS, ...options.transformers }
    const closeTimeout = options.closeTimeout || 15000

    const open = () => openDb(indexedDB, names.db, DB_VERSION, upgradeDb(names))

    const { getTransaction, close } = openWithClosure(open, closeTimeout)

    const lexiconStore = createTransposeStore(
        withTransformers(
            TABLES.LEXICON,
            createKeyValueStore(names[TABLES.LEXICON]),
            transformers
        ),
        withTransformers(
            TABLES.LEXICON_INVERSE,
            createKeyValueStore(names[TABLES.LEXICON_INVERSE]),
            transformers
        ),
        getTransaction
    )

    const idsStore = createTransposeStore(
        withTransformers(
            TABLES.IDS,
            createKeyValueStore(names[TABLES.IDS]),
            transformers
        ),
        withTransformers(
            TABLES.IDS_INVERSE,
            createKeyValueStore(names[TABLES.IDS_INVERSE]),
            transformers
        ),
        getTransaction
    )

    const postingsStore = createPostingsStore(
        withTransformers(
            TABLES.POSTINGS,
            createKeyValueStore(names[TABLES.POSTINGS]),
            transformers,
        ),
        getTransaction
    )

    const positionsStore = createPositionsStore(
        withTransformers(
            TABLES.POSITIONS,
            createKeyValueStore(names[TABLES.POSITIONS]),
            transformers,
        ),
        getTransaction
    )

    const wildcardStore = createWildcardStore(
        withTransformers(
            TABLES.WILDCARDS,
            createKeyValueStore(names[TABLES.WILDCARDS]),
            transformers
        ),
        getTransaction
    )

    /**
     * Clean stale data from the postings table when performing a search.
     * It relies on the fact that a term returned an id which does not exist in the positions table.
     * @param {Array} positions
     * @param {Array} ids
     * @param {Array} terms
     */
    const cleanStaleData = async (positions, ids, terms) => {
        const staleIds = positions.reduce((agg, terms, i) => {
            // Detecting stale data.
            if (terms.length === 0) {
                agg.push(ids[i])
            }
            return agg
        }, [])

        if (!staleIds.length) {
            return
        }

        staleIds.forEach((id) => postingsStore.removeBulk(terms, id))
    }

    /**
     * Find data based on the terms.
     * @param {Array} searchTerms Terms to search
     * @return {Promise}
     */
    const search = async (searchTerms = []) => {
        if (!Array.isArray(searchTerms)) {
            throw new Error('Terms must be an array')
        }

        const uniqueSearchTerms = unique(searchTerms)
        const uniqueTransposedTerms = await lexiconStore.bulk(uniqueSearchTerms)
        const { idsToTerms, termsToIds, ids } = await postingsStore.getBulk(uniqueTransposedTerms)
        const positions = await positionsStore.getBulk(ids)
        const termIds = unique(flatten(positions))

        cleanStaleData(positions, ids, uniqueTransposedTerms)

        const [idsTransposed, termsTransposed] = await Promise.all([
            idsStore.from(ids),
            lexiconStore.from(termIds)
        ])

        const termIdsToTerm = termIds.reduce((agg, cur, i) => {
            agg[cur] = termsTransposed[i]
            return agg
        }, {})

        const result = positions
            .reduce((agg, terms, i) => {
                // Ignore stale data.
                if (terms.length === 0) {
                    return agg
                }

                const id = idsTransposed[i]
                const match = idsToTerms[i]
                const transposedTerms = terms.map((term) => termIdsToTerm[term])
                const transposedMatch = match.map((term) => termIdsToTerm[term])

                agg.push({
                    _id: ids[i],
                    _terms: terms,
                    _match: match,
                    terms: transposedTerms,
                    match: transposedMatch,
                    id,
                })

                return agg
            }, [])

        return {
            result,
            ids,
            termsToIds,
            idsToTerms
        }
    }

    /**
     * Store terms.
     * @param {String|Number} id
     * @param  {Array} terms
     * @return {Promise}
     */
    const store = async (id, terms) => {
        if (!assertId(id)) {
            throw new Error('ID required')
        }
        if (!Array.isArray(terms)) {
            throw new Error('Terms must be an array')
        }
        if (terms.length === 0) {
            return
        }

        const [[transposedId], transposedTerms] = await Promise.all([
            idsStore.bulk([id]),
            lexiconStore.bulk(terms)
        ])

        const uniqueTerms = unique(terms)
        const uniqueTransposedTerms = unique(transposedTerms)

        // Randomize the array to prevent row-lock contention
        mutablyShuffleTwo(uniqueTerms, uniqueTransposedTerms)

        return Promise.all([
            postingsStore.insertBulk(uniqueTransposedTerms, transposedId),
            positionsStore.insert(transposedId, transposedTerms),
            wildcardStore.insertBulk(uniqueTerms, uniqueTransposedTerms)
        ])
    }

    /**
     * Remove a document. Also deletes all terms related to the document as well.
     * Returns a promise that resolves to a list of terms that were fully deleted.
     * @param {String|Number} id
     * @returns {Promise}
     */
    const remove = async (id) => {
        if (!assertId(id)) {
            throw new Error('ID required')
        }

        const [transposedId] = await idsStore.bulk([id])

        const terms = await positionsStore.get(transposedId)

        const uniqueTerms = unique(terms)
        const removals = await postingsStore.removeBulk(uniqueTerms, transposedId)
        const removedTerms = uniqueTerms.filter((term, i) => removals[i])

        return Promise.all([
            lexiconStore.from(removedTerms)
                .then((termsTransposed) => wildcardStore.removeBulk(termsTransposed, removedTerms)),
            positionsStore.remove(transposedId)
        ])
    }

    /**
     * Perform a wildcard query.
     * @param {String} query Wildcard query pattern.
     * @returns {Promise}
     */
    const wildcard = async (query) => {
        const terms = await wildcardStore.get(query)
        const termsTransposed = await lexiconStore.from(terms)
        return termsTransposed
            .filter((token) => wildcardMatch(token, query))
    }

    /**
     * Clear all tables.
     * @return {Promise}
     */
    const clear = async () => {
        const stores = [postingsStore, positionsStore, wildcardStore, lexiconStore, idsStore]

        const tx = await getTransaction([
            ...flatten(stores.map((store) => store.name)),
        ], READWRITE)

        const promise = transaction(tx)
        stores.forEach((store) => store.clear(tx))
        return promise
    }

    /**
     * Returns stats on all tables.
     * @returns {Promise}
     */
    const stats = async () => {

        const get = async (store) => {
            const tx = await getTransaction(store.name)
            return Promise.all([store.count(tx), store.size(tx)])
        }

        const result = await Promise.all([postingsStore, positionsStore, wildcardStore, lexiconStore, idsStore].map(get))

        const getStats = (total, size) => ({ total, size })
        const getStatsResult = ([total, size]) => getStats(total, size)

        const postings = getStatsResult(result[0])
        const positions = getStatsResult(result[1])
        const wildcards = getStatsResult(result[2])
        const lexicon = getStatsResult(result[3])
        const ids = getStatsResult(result[4])

        return {
            postings,
            positions,
            wildcards,
            lexicon,
            ids,
            ...getStats(
                result.reduce((prev, cur) => prev + cur[0], 0),
                result.reduce((prev, cur) => prev + cur[1], 0)
            )
        }
    }

    /**
     * Return the number of terms currently indexed.
     * @returns {Promise}
     */
    const numberOfTerms = async () => {
        const tx = await getTransaction(postingsStore.name)
        return postingsStore.count(tx)
    }

    return {
        search,
        wildcard,
        store,
        remove,
        clear,
        numberOfTerms,
        stats,
        close
    }
}
