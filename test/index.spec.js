import idb from 'idb'
import createIndex from '../src/index'
import tokenize from '../src/helper/tokenize'
import createEncryptionHelper from '../example/helper/encryptionHelper'

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
    keywords: 'keywords'
}

const indexKey = new Uint8Array(32)
const indexSalt = new Uint8Array(32)
const { hash, encrypt, decrypt } = createEncryptionHelper(indexKey, indexSalt)

describe('index', () => {
    const getIndex = () => createIndex({ hash, encrypt, decrypt })

    const getValue = async (tableName, key) => {
        const db = await idb.open(DB_NAME, DB_VERSION)
        const tx = db.transaction(tableName, 'readwrite')
        const data = await tx.objectStore(tableName).get(hash(key))
        const value = decrypt(key, data)
        db.close()
        return value
    }

    describe('metadata', () => {
        let index

        beforeAll(async () => {
            index = await createIndex({ hash, encrypt, decrypt })
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should initialize corruption data', async () => {
            await index.initialize()
            const value = await getValue(TABLE_NAMES.metadata, 'T_E_S_T')
            expect(value)
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
            const index2 = await createIndex({ hash, encrypt, decrypt: (x) => x })
            const value = await index2.corrupt()
            expect(value)
                .toBeTruthy()
        })
    })

    describe('store', () => {
        let index

        beforeAll(async () => {
            index = await getIndex()
            await index.store(MOCK.ID, MOCK.TOKENS, MOCK.DATA)
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should store a link between the keywords and data id', async () => {
            const value = await getValue(TABLE_NAMES.keywords, 'this')
            expect(value[0])
                .toEqual(MOCK.ID)
        })

        it('should store store', async () => {
            const value = await getValue(TABLE_NAMES.data, MOCK.ID)
            expect(value.data)
                .toEqual(MOCK.DATA)
        })

        it('should store a link between the data and keywords', async () => {
            const value = await getValue(TABLE_NAMES.data, MOCK.ID)
            expect(value.keywords)
                .toEqual(MOCK.TOKENS)
        })
    })

    describe('search', () => {
        let index

        const bodyA = 'hello this is a really long fluffy text'
        const bodyB = 'hello i just started using this secure email app'
        const bodyC = 'hello this is a really good app'

        beforeAll(async () => {
            index = await getIndex()
            await index.store('123', tokenize(bodyA), { ID: '123' })
            await index.store('124', tokenize(bodyB), { ID: '124' })
            await index.store('125', tokenize(bodyC), { ID: '125' })
            await index.store('150', tokenize('random text'), { ID: '150' })
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        const mapIds = (x) => x.map(({ ID }) => ID)
        const getScore = ({ Score }) => Score

        it('should not return any result for keywords that do not exist', async () => {
            expect(await index.search(['foo']))
                .toEqual([])
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

        it('should return A and B for the query app', async () => {
            const result = await index.search(['app'])
            expect(mapIds(result))
                .toEqual(['124', '125'])
        })

        it('should return with an extra score key for ordering', async () => {
            const result = await index.search(['hello', 'secure'])
            expect(mapIds(result.sort((a, b) => getScore(b) - getScore(a))))
                .toEqual(['124', '125', '123'])
        })
    })


    describe('update', () => {
        let index

        const update = {
            ID: MOCK.ID,
            newKey: true
        }

        beforeAll(async () => {
            index = await getIndex()
            await index.store(MOCK.ID, MOCK.TOKENS, MOCK.DATA)
            await index.update(MOCK.ID, () => update)
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should update the metadata of the message', async () => {
            const value = await getValue(TABLE_NAMES.data, MOCK.ID)
            expect(value.data)
                .toEqual(update)
            expect(value.keywords)
                .toEqual(MOCK.TOKENS)
        })
    })

    describe('remove one', () => {
        let index

        beforeAll(async () => {
            index = await getIndex()
            await index.store(MOCK.ID, MOCK.TOKENS, MOCK.DATA)
            await index.remove(MOCK.ID)
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should remove data', async () => {
            const value = await getValue(TABLE_NAMES.data, MOCK.ID)
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
        const message2 = {
            ID: '321',
            Subject: 'hello'
        }
        const body2 = 'this is my body'

        beforeAll(async () => {
            index = await getIndex()
            await index.store(MOCK.ID, MOCK.TOKENS, MOCK.DATA)
            await index.store(message2.ID, tokenize(body2), message2)
            await index.remove(MOCK.ID)
        })

        afterAll(async () => {
            await index.clear()
            index.close()
        })

        it('should remove the first instance', async () => {
            const value = await getValue(TABLE_NAMES.data, MOCK.ID)
            expect(value)
                .toBeUndefined()
            const value2 = await getValue(TABLE_NAMES.data, message2.ID)
            expect(value2)
                .not.toBeUndefined()
        })

        it('should remove the link between the keywords and the first message id', async () => {
            await Promise.all(tokenize(body2).map(async (token) => {
                const value = await getValue(TABLE_NAMES.keywords, token)
                expect(value)
                    .toEqual(['321'])
            }))
        })
    })
})
