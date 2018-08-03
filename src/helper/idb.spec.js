import { open, openWithClosure, request, transaction, deleteDb } from './idb'

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time))

describe('idb helper', () => {
    const STORE_NAME = 'test-os'

    const setup = () => {
        return open(indexedDB, 'test', 1, (db) => {
            db.createObjectStore(STORE_NAME)
        })
    }

    afterAll(() => deleteDb(indexedDB, 'test'))

    it('should open a db promisified', async () => {
        const db = await setup()
        db.close()
    })

    it('should open a db with auto closure', async () => {
        const mock = {
            transaction: jasmine.createSpy('transaction'),
            close: jasmine.createSpy('close')
        }
        const setup = jasmine.createSpy('setup')
            .and
            .returnValue(mock)
        const { close, getTransaction } = openWithClosure(setup, 100)

        expect(setup)
            .toHaveBeenCalledTimes(0)
        await getTransaction('woot')
        expect(setup)
            .toHaveBeenCalledTimes(1)

        await delay(100)

        expect(mock.close)
            .toHaveBeenCalledTimes(1)

        await getTransaction('woot')

        await delay(100)

        expect(mock.close)
            .toHaveBeenCalledTimes(2)
        expect(setup)
            .toHaveBeenCalledTimes(2)

        close()

        await getTransaction('woot')
            .catch((e) => {
                expect(e.message)
                    .toEqual('Database has been closed')
            })
    })

    it('should throw if it has been closed', async () => {
        const { close, getTransaction } = openWithClosure(setup, 100)

        await getTransaction(STORE_NAME)

        close()

        const error = await getTransaction(STORE_NAME)
            .catch((e) => e)
        expect(error.message)
            .toEqual('Database has been closed')
    })

    it('should put and get a value promisified', async () => {
        const db = await setup()

        const tx = db.transaction(STORE_NAME, 'readwrite')

        tx.objectStore(STORE_NAME)
            .put('bar', 'foo')

        tx.objectStore(STORE_NAME)
            .put('bar2', 'foo2')

        await transaction(tx)

        expect(await request(db.transaction(STORE_NAME, 'readonly')
            .objectStore(STORE_NAME)
            .get('foo')))
            .toEqual('bar')

        expect(await request(db.transaction(STORE_NAME, 'readonly')
            .objectStore(STORE_NAME)
            .get('foo2')))
            .toEqual('bar2')

        db.close()
    })
})
