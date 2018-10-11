import { open } from '../helper/idb'
import createTransposeStore from './transposeStore'
import createKeyValueStore from './keyValueStore'

const tableName = 'lexicon'
const tableNameI = 'lexicon-i'

const upgradeDb = (db, oldVersion) => {
    switch (oldVersion) {
        case 0: {
            db.createObjectStore(tableName)
            db.createObjectStore(tableNameI)
            break
        }
    }
}

describe('transpose', () => {
    let db
    let store
    let getTransaction

    const createGetTransaction = (db) => (tables, mode) => db.transaction(tables, mode)

    beforeAll(async () => {
        db = await open(indexedDB, 'transpose', 1, upgradeDb)

        getTransaction = createGetTransaction(db)

        store = createTransposeStore(
            createKeyValueStore(tableName),
            createKeyValueStore(tableNameI),
            getTransaction
        )
    })

    afterAll(async () => {
        const tx = getTransaction([tableName, tableNameI], 'readwrite')
        await store.clear(tx)
        db.close()
    })

    it('should transpose', async () => {
        expect(await store.bulk(['123'])).toEqual([1])
        expect(await store.bulk(['abc', '123', 'def'])).toEqual([2, 1, 3])
        expect(await store.bulk(['xxx', 'xxx'])).toEqual([4, 4])
        expect(await store.bulk(['123'])).toEqual([1])
    })
})
