import { open } from '../helper/idb'
import createPostingsStore from './postingsStore'
import createKeyValueStore from './keyValueStore'
import { getArrayGaps } from '../helper/array'

const tableName = 'postings'

const upgradeDb = (db, oldVersion) => {
    switch (oldVersion) {
        case 0: {
            db.createObjectStore(tableName)
            break
        }
    }
}

describe('postings', () => {
    let db
    let store
    let getTransaction

    const createGetTransaction = (db) => (tables, mode) => db.transaction(tables, mode)

    beforeAll(async () => {
        db = await open(indexedDB, 'postings', 1, upgradeDb)

        getTransaction = createGetTransaction(db)

        store = createPostingsStore(
            createKeyValueStore(tableName),
            getTransaction
        )
    })

    afterAll(async () => {
        const tx = getTransaction([tableName], 'readwrite')
        await store.clear(tx)
        db.close()
    })

    it('should handle multiple calls with proper locking', async () => {
        const promises = []
        const expectation = []
        for (let i = 0; i < 1000; ++i) {
            promises.push(store.insertBulk([1,2,3], i))
            expectation.push(i)
        }
        expect(getArrayGaps(await store.get(1))).toEqual(expectation)
        expect(getArrayGaps(await store.get(2))).toEqual(expectation)
        expect(getArrayGaps(await store.get(3))).toEqual(expectation)
    })
})
