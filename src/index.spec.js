import { open, transaction, request } from './helper/idb'
import { create as createIndex, tokenize, parse, query } from './index.esm'
import createEncryptionHelper from '../example/helper/encryptionHelper'
import { vbDecode } from './helper/variableByteCodes'
import { TABLES } from './master'

const MOCK = {
    ID: '123',
    DATA: {
        Subject: 'hello'
    },
    TOKENS: tokenize('this is my body')
}

const DB_NAME = 'index'
const DB_VERSION = 1
const TABLE_NAMES = {
    data: 'data',
    metadata: 'metadata',
    keywords: 'keywords',
    wildcards: 'wildcards',
    translations: 'translations',
}

const indexKey = new Uint8Array(32)
const indexSalt = new Uint8Array(32)
const transformers = createEncryptionHelper(indexKey, indexSalt)

const run = (getIndex) => {
    describe('index', () => {

        const tableNameToId = {
            [TABLE_NAMES.data]: TABLES.DATA,
            [TABLE_NAMES.metadata]: TABLES.METADATA,
            [TABLE_NAMES.keywords]: TABLES.KEYWORDS,
            [TABLE_NAMES.wildcards]: TABLES.WILDCARDS,
            [TABLE_NAMES.translations]: TABLES.TRANSLATIONS
        }

        const removeValue = async (tableName, key) => {
            const db = await open(indexedDB, DB_NAME, DB_VERSION)
            const tx = db.transaction(tableName, 'readwrite')
            const promise = transaction(tx)
            tx.objectStore(tableName).delete(transformers.property(tableNameToId[tableName], key))
            await promise
            db.close()
        }

        const getGaps = (array) => {
            let currentValue = 0
            return array.map((v) => {
                currentValue += v
                return currentValue
            })
        }

        const getValue = async (tableName, key) => {
            const db = await open(indexedDB, DB_NAME, DB_VERSION)
            const tx = db.transaction(tableName, 'readwrite')

            const data = await request(tx.objectStore(tableName).get(transformers.property(tableNameToId[tableName], key)))
            db.close()

            const value = data && transformers.deserialize(tableNameToId[tableName], key, data)

            if (tableName === TABLE_NAMES.keywords) {
                if (!value) {
                    return
                }
                return getGaps(vbDecode(value))
            } else {
                return value
            }
        }

        const getInternalId = (id) => getValue(TABLE_NAMES.translations, `id-${id}`)

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
                expect(await getValue(TABLE_NAMES.metadata, 'T_E_S_T'))
                    .toEqual('TEST')
            })

            it('should read corruption data', async () => {
                await index.initialize()
                const value = await index.corrupt()
                expect(value)
                    .toBeFalsy()
            })

            it('should fail when encryption information is different', async () => {
                await index.initialize()
                const otherTransformer = {
                    property: (id, value) => value,
                    serialize: (id, k, x) => x,
                    deserialize: (id, k, x) => x
                }
                const index2 = createIndex({
                    transformers: otherTransformer
                })
                const value = await index2.corrupt()
                expect(value)
                    .toBeTruthy()
            })
        })

        describe('store', () => {
            let index
            let internalId

            beforeAll(async () => {
                index = getIndex()
                await index.store(MOCK.ID, MOCK.TOKENS, MOCK.DATA)
                internalId = await getInternalId(MOCK.ID)
            })

            afterAll(async () => {
                await index.clear()
                index.close()
            })

            it('should store a link between the keywords and data id', async () => {
                const value = await getValue(TABLE_NAMES.keywords, 'this')
                expect(value[0])
                    .toEqual(internalId)
            })

            it('should store data', async () => {
                const value = await getValue(TABLE_NAMES.data, internalId)
                expect(value.data)
                    .toEqual(MOCK.DATA)
            })

            it('should store a link between the data and keywords', async () => {
                const value = await getValue(TABLE_NAMES.data, internalId)
                expect(value.keywords)
                    .toEqual(MOCK.TOKENS)
            })

            it('should store wildcard information', async () => {
                const values = await Promise.all([
                    getValue(TABLE_NAMES.wildcards, '^th'),
                    getValue(TABLE_NAMES.wildcards, 'thi'),
                    getValue(TABLE_NAMES.wildcards, 'his'),
                    getValue(TABLE_NAMES.wildcards, 'is$')
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
                await index.store('123', tokenize(bodyA), { ID: '123' })
                await index.store('124', tokenize(bodyB), { ID: '124' })
                await index.store('125', tokenize(bodyC), { ID: '125' })
                await index.store('150', tokenize('random text'), { ID: '150' })
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
                await index.store(id, tokenize('unicorn zebra'), { ID: '199' })
                const internalId = await getInternalId('199')

                expect(mapIds(await index.search(['unicorn', 'zebra']))).toEqual([id])
                expect(await getValue(TABLE_NAMES.keywords, 'unicorn')).toEqual([internalId])
                expect(await getValue(TABLE_NAMES.keywords, 'zebra')).toEqual([internalId])

                await removeValue(TABLE_NAMES.data, internalId)
                index.clearCache()

                expect(mapIds(await index.search(['unicorn', 'zebra']))).toEqual([])
                expect(await getValue(TABLE_NAMES.keywords, 'unicorn')).toBeUndefined()
                expect(await getValue(TABLE_NAMES.keywords, 'zebra')).toBeUndefined()
            })

            it('should search with query', async () => {
                const results = query(index.search, index.wildcard, parse('red*'))
                expect((await results).map(({ id }) => id)).toEqual(['160', '161'])
            })
        })

        describe('update', () => {
            let index
            let internalId

            const update = {
                ID: MOCK.ID,
                newKey: true
            }

            beforeAll(async () => {
                index = getIndex()
                await index.store(MOCK.ID, MOCK.TOKENS, MOCK.DATA)
                internalId = await getInternalId(MOCK.ID)
                await index.update(MOCK.ID, () => update)
            })

            afterAll(async () => {
                await index.clear()
                index.close()
            })

            it('should update the metadata of the message', async () => {
                const value = await getValue(TABLE_NAMES.data, internalId)
                expect(value.data)
                    .toEqual(update)
                expect(value.keywords)
                    .toEqual(MOCK.TOKENS)
            })
        })

        describe('remove one', () => {
            let index
            let internalId

            beforeAll(async () => {
                index = getIndex()
                await index.store(MOCK.ID, MOCK.TOKENS, MOCK.DATA)
                internalId = await getInternalId(MOCK.ID)
                await index.remove(MOCK.ID)
            })

            afterAll(async () => {
                await index.clear()
                index.close()
            })

            it('should remove data', async () => {
                const value = await getValue(TABLE_NAMES.data, internalId)
                expect(value)
                    .toBeUndefined()
            })

            it('should remove the link between the keywords and data', async () => {
                const value = await getValue(TABLE_NAMES.keywords, MOCK.TOKENS[0])
                expect(value)
                    .toBeUndefined()
            })
        })

        describe('remove multiple', () => {
            let index
            let internalId
            let internalId2
            const message2 = {
                ID: '321',
                Subject: 'hello'
            }
            const body2 = 'this is my body'

            beforeAll(async () => {
                index = getIndex()

                await index.store(MOCK.ID, MOCK.TOKENS.concat('removed'), MOCK.DATA)
                await index.store(message2.ID, tokenize(body2), message2)

                internalId = await getInternalId(MOCK.ID)
                internalId2 = await getInternalId(message2.ID)

                await index.remove(MOCK.ID)
            })

            afterAll(async () => {
                await index.clear()
                index.close()
            })

            it('should remove the first instance', async () => {
                const value = await getValue(TABLE_NAMES.data, internalId)
                expect(value)
                    .toBeUndefined()
                const value2 = await getValue(TABLE_NAMES.data, internalId2)
                expect(value2)
                    .not.toBeUndefined()
            })

            it('should remove the link between the keywords and the first message id', async () => {
                await Promise.all(tokenize(body2).map(async (token) => {
                    const value = await getValue(TABLE_NAMES.keywords, token)
                    expect(value)
                        .toEqual([internalId2])
                }))
            })

            it('should keep wildcard information', async () => {
                const values = await Promise.all([
                    getValue(TABLE_NAMES.wildcards, '^th'),
                    getValue(TABLE_NAMES.wildcards, 'thi'),
                    getValue(TABLE_NAMES.wildcards, 'his'),
                    getValue(TABLE_NAMES.wildcards, 'is$')
                ])
                expect(values)
                    .toEqual([['this'], ['this'], ['this'], ['this', 'is']])
            })

            it('should remove unique wildcard information', async () => {
                const values = await Promise.all([
                    getValue(TABLE_NAMES.wildcards, '^re'),
                    getValue(TABLE_NAMES.wildcards, 'rem'),
                    getValue(TABLE_NAMES.wildcards, 'emo'),
                    getValue(TABLE_NAMES.wildcards, 'mov'),
                    getValue(TABLE_NAMES.wildcards, 'ove'),
                    getValue(TABLE_NAMES.wildcards, 'ved'),
                    getValue(TABLE_NAMES.wildcards, 'ed$')
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
                await index.store(MOCK.ID, MOCK.TOKENS, MOCK.DATA)
            })

            afterAll(async () => {
                await index.clear()
                index.close()
            })

            it('should get stats', async () => {
                const stats = await index.stats()
                expect(stats.total).toBe(16)
            })

            it('should get number of keywords indexed', async () => {
                expect(await index.numberOfKeywords()).toBe(4)
            })
        })
    })
}

run(() => createIndex({ transformers, useCache: false }))
run(() => createIndex({ transformers, useCache: true }))
