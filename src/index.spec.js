import { open, transaction, request } from './helper/idb'
import { create as createIndex, tokenize, parse, query } from './index.esm'
import createEncryptionHelper from '../example/helper/encryptionHelper'
import { vbDecode } from './helper/variableByteCodes'
import { TABLES, DEFAULT_NAMES } from './master'
import { getArrayGaps } from './helper/array'

const MOCK = {
    ID: '123',
    TOKENS: tokenize('this is my body')
}

const DB_NAME = 'index'
const DB_VERSION = 1

const indexKey = new Uint8Array(32)
const indexSalt = new Uint8Array(32)
const transformers = createEncryptionHelper(indexKey, indexSalt)

describe('index', () => {
    const getIndex = () => createIndex({ transformers })

    const tableNameToId = Object.keys(TABLES).reduce((prev, cur) => {
        prev[DEFAULT_NAMES[TABLES[cur]]] = TABLES[cur]
        return prev
    }, {})

    const removeValue = async (tableId, key) => {
        const tableName = DEFAULT_NAMES[tableId]
        const db = await open(indexedDB, DB_NAME, DB_VERSION)
        const tx = db.transaction(tableName, 'readwrite')
        const promise = transaction(tx)
        tx.objectStore(tableName).delete(transformers.property(tableNameToId[tableName], key))
        await promise
        db.close()
    }

    const getDb = async (tableName) => {
        const db = await open(indexedDB, DB_NAME, DB_VERSION)
        const tx = db.transaction(tableName, 'readwrite')
        return { db, tx }
    }

    const getValue = async (tableId, key) => {
        const tableName = DEFAULT_NAMES[tableId]
        const { tx, db } = await getDb(tableName)
        const data = await request(tx.objectStore(tableName).get(transformers.property(tableNameToId[tableName], key)))
        db.close()

        const value = transformers.deserialize(tableId, key, data)

        if (tableId === TABLES.POSTINGS || tableId === TABLES.WILDCARDS) {
            if (!value) {
                return
            }
            return getArrayGaps(vbDecode(value))
        }

        if (tableId === TABLES.POSITIONS) {
            if (!value) {
                return
            }
            return vbDecode(value)
        }

        return value
    }

    const getInternalDocId = (id) => getValue(TABLES.IDS_INVERSE, id)
    const getMultiple = (tableId) => async (keys) => {
        const tableName = DEFAULT_NAMES[tableId]
        const { tx, db } = await getDb(tableName)
        const data = await Promise.all(keys.map((term) =>
            request(tx.objectStore(tableName).get(transformers.property(tableId, term))))
        )
        db.close()
        return data
    }

    const getInternalTermIds = getMultiple(TABLES.LEXICON_INVERSE)
    const getTerms = getMultiple(TABLES.LEXICON)

    describe('metadata', () => {
        let index

        beforeAll(async () => {
            index = createIndex({ transformers })
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should initialize corruption data', async () => {
            await index.initialize()
            expect(await getValue(TABLES.METADATA, 'T_E_S_T'))
                .toEqual('TEST')
        })

        it('should read corruption data', async () => {
            await index.initialize()
            const value = await index.corrupt()
            expect(value)
                .toBeFalsy()
        })

        it('should fail when data gets corrupted', async () => {
            await index.initialize()
            await removeValue(TABLES.METADATA, 'T_E_S_T')
            index.clearCache()
            const value = await index.corrupt()
            expect(value)
                .toBeTruthy()
        })
    })

    describe('store', () => {
        let index
        let internalDocId
        let internalTermIds

        beforeAll(async () => {
            index = getIndex()
            await index.store(MOCK.ID, MOCK.TOKENS)
            internalDocId = await getInternalDocId(MOCK.ID)
            internalTermIds = await getInternalTermIds(MOCK.TOKENS)
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should store a link between the keywords and data id', async () => {
            const value = await getValue(TABLES.POSTINGS, internalTermIds[0])
            expect(value[0])
                .toEqual(internalDocId)
        })

        it('should store a link between the data and keywords', async () => {
            const value = await getValue(TABLES.POSITIONS, internalDocId)
            expect(value.sort())
                .toEqual(internalTermIds.sort())
        })

        it('should store wildcard information', async () => {
            const values = await Promise.all([
                getValue(TABLES.WILDCARDS, '^th').then(getTerms),
                getValue(TABLES.WILDCARDS, 'thi').then(getTerms),
                getValue(TABLES.WILDCARDS, 'his').then(getTerms),
                getValue(TABLES.WILDCARDS, 'is$').then(getTerms)
            ])
            expect(values)
                .toEqual([['this'], ['this'], ['this'], ['this', 'is']])
        })
    })

    describe('search', () => {
        let index

        const bodyA = 'hello this is a really long fluffy text abc'
        const bodyB = 'i just started using this secure email app this hello'
        const bodyC = 'hello this is a really good app abc'

        beforeAll(async () => {
            index = getIndex()
            await index.store('123', tokenize(bodyA))
            await index.store('124', tokenize(bodyB))
            await index.store('125', tokenize(bodyC))
            await index.store('150', tokenize('random text'))
            await index.store('160', tokenize('redemption rededicate'))
            await index.store('161', tokenize('redundancy retired rediscover'))
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        const mapIds = ({ result = [] }) => result.map(({ id }) => id)

        it('should not return any result for keywords that do not exist', async () => {
            expect(mapIds(await index.search(['foo'])))
                .toEqual([])
        })

        it('should return A, B and C', async () => {
            expect(mapIds(await index.search(tokenize('hello this'))))
                .toEqual(['123', '124', '125'])
        })

        it('should return result for keywords that exist', async () => {
            const result = await index.search(['hello'])
            expect(mapIds(result))
                .toEqual(['123', '124', '125'])
        })

        it('should return A for the query fluffy', async () => {
            const result = await index.search(['fluffy'])
            expect(mapIds(result))
                .toEqual(['123'])
        })

        it('should return B and C for the query app', async () => {
            const result = await index.search(['app'])
            expect(mapIds(result))
                .toEqual(['124', '125'])
        })

        it('should return with an extra id key', async () => {
            const { result } = await index.search(['hello', 'secure'])
            expect(result.map((result) => result.id))
                .toEqual(['123', '124', '125'])
        })

        it('should return with an extra match key', async () => {
            const { result } = await index.search(['hello', 'secure'])
            expect(result.map((result) => result.match))
                .toEqual([['hello'], ['hello', 'secure'], ['hello']])
        })

        it('should return unique keywords for the wildcard query', async () => {
            const result = await index.wildcard('re*')
            expect(result).toEqual(['really', 'redemption', 'rededicate', 'redundancy', 'retired', 'rediscover'])
        })

        it('should return keywords that match', async () => {
            const result = await index.wildcard('red*')
            expect(result).toEqual(['redemption', 'rededicate', 'redundancy', 'rediscover'])
        })

        it('should return keywords in the end', async () => {
            const result = await index.wildcard('*ed')
            expect(result).toEqual(['started', 'retired'])
        })

        it('should return keywords', async () => {
            const result = await index.wildcard('*ndo*')
            expect(result).toEqual(['random'])
        })

        it('should clean stale data', async () => {
            const id = '199'
            await index.store(id, tokenize('unicorn zebra'))
            const internalId = await getInternalDocId('199')
            const [unicornId, zebraId] = await getInternalTermIds(['unicorn', 'zebra'])

            expect(mapIds(await index.search(['unicorn', 'zebra']))).toEqual([id])
            expect(await getValue(TABLES.POSTINGS, unicornId)).toEqual([internalId])
            expect(await getValue(TABLES.POSTINGS, zebraId)).toEqual([internalId])

            await removeValue(TABLES.POSITIONS, internalId)
            index.clearCache()

            expect(mapIds(await index.search(['unicorn', 'zebra']))).toEqual([])
            expect(await getValue(TABLES.POSTINGS, unicornId)).toBeUndefined()
            expect(await getValue(TABLES.POSTINGS, zebraId)).toBeUndefined()
        })

        it('should search with query', async () => {
            const results = query(index.search, index.wildcard, parse('red*'))
            expect((await results).map(({ id }) => id)).toEqual(['160', '161'])
        })
    })

    describe('remove one', () => {
        let index
        let internalId
        let internalTermId

        beforeAll(async () => {
            index = getIndex()
            await index.store(MOCK.ID, MOCK.TOKENS)

            internalId = await getInternalDocId(MOCK.ID)
            internalTermId = await getInternalTermIds(MOCK.TOKENS)

            await index.remove(MOCK.ID)
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should remove data', async () => {
            const value = await getValue(TABLES.POSITIONS, internalId)
            expect(value)
                .toBeUndefined()
        })

        it('should remove the link between the keywords and data', async () => {
            const value = await getValue(TABLES.POSTINGS, internalTermId[0])
            expect(value)
                .toBeUndefined()
        })
    })

    describe('remove multiple', () => {
        let index
        let internalId
        let internalId2
        const ID2 = '321'
        const body2 = 'this is my body'

        beforeAll(async () => {
            index = getIndex()

            await index.store(MOCK.ID, MOCK.TOKENS.concat('removed'))
            await index.store(ID2, tokenize(body2))

            internalId = await getInternalDocId(MOCK.ID)
            internalId2 = await getInternalDocId(ID2)

            await index.remove(MOCK.ID)
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should remove the first instance', async () => {
            const value = await getValue(TABLES.POSITIONS, internalId)
            expect(value)
                .toBeUndefined()
            const value2 = await getValue(TABLES.POSITIONS, internalId2)
            expect(value2)
                .not.toBeUndefined()
        })

        it('should remove the link between the keywords and the first message id', async () => {
            const terms = await getInternalTermIds(tokenize(body2))
            await Promise.all(terms.map((async (token) => {
                const value = await getValue(TABLES.POSTINGS, token)
                expect(value)
                    .toEqual([internalId2])
            })))
        })

        it('should keep wildcard information', async () => {
            const values = await Promise.all([
                getValue(TABLES.WILDCARDS, '^th').then(getTerms),
                getValue(TABLES.WILDCARDS, 'thi').then(getTerms),
                getValue(TABLES.WILDCARDS, 'his').then(getTerms),
                getValue(TABLES.WILDCARDS, 'is$').then(getTerms)
            ])
            expect(values)
                .toEqual([['this'], ['this'], ['this'], ['this', 'is']])
        })

        it('should remove unique wildcard information', async () => {
            const values = await Promise.all([
                getValue(TABLES.WILDCARDS, '^re'),
                getValue(TABLES.WILDCARDS, 'rem'),
                getValue(TABLES.WILDCARDS, 'emo'),
                getValue(TABLES.WILDCARDS, 'mov'),
                getValue(TABLES.WILDCARDS, 'ove'),
                getValue(TABLES.WILDCARDS, 'ved'),
                getValue(TABLES.WILDCARDS, 'ed$')
            ])
            expect(values)
                .toEqual([undefined, undefined, undefined, undefined, undefined, undefined, undefined])
        })
    })

    describe('stats', () => {
        let index

        beforeAll(async () => {
            index = getIndex()
            await index.clear()
            await index.store(MOCK.ID, MOCK.TOKENS)
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should get stats', async () => {
            const stats = await index.stats()
            expect(stats.total).toBe(28)
        })

        it('should get number of terms indexed', async () => {
            expect(await index.numberOfTerms()).toBe(4)
        })
    })
})

