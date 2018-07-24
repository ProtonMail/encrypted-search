import idb from 'idb'

import createDataStore from './store/dataStore'
import createKeywordsStore from './store/keywordStore'
import createKeyValueStore, { withEncryption } from './store/keyValueStore'
import createMaster from './master'

const DB_VERSION = 1
const INTEGRITY_KEY = 'T_E_S_T'
const INTEGRITY_VALUE = 'TEST'

const upgradeDb = ({ keywords, data, metadata }) => (db) => {
    switch (db.oldVersion) {
        case 0:
            db.createObjectStore(metadata)
            db.createObjectStore(keywords)
            db.createObjectStore(data)
    }
}

export { default as tokenize } from './helper/tokenize'

export default async ({ dbName = 'index', dataName = 'data', keywordsName = 'keywords', metadataName = 'metadata', hash, encrypt, decrypt } = {}) => {
    if (!hash || !encrypt || !decrypt) {
        throw new Error('Hash/encrypt/decrypt required')
    }
    const db = await idb.open(dbName, DB_VERSION, upgradeDb({
        keywords: keywordsName,
        data: dataName,
        metadata: metadataName
    }))

    const keywordsStore = createKeywordsStore(
        withEncryption(createKeyValueStore(db, keywordsName), { hash, encrypt, decrypt })
    )
    const dataStore = createDataStore(
        withEncryption(createKeyValueStore(db, dataName), { hash, encrypt, decrypt })
    )
    const { set, get, clear } = withEncryption(createKeyValueStore(db, metadataName), { hash, encrypt, decrypt })

    // TODO: Remove once webpack4 is supported.
    return Object.assign({}, createMaster(keywordsStore, dataStore),
        {
            clear: () => Promise.all([keywordsStore.clear(), dataStore.clear(), clear()]),
            initialize: () => set(INTEGRITY_KEY, INTEGRITY_VALUE),
            corrupt: async () => (await get(INTEGRITY_KEY)) !== INTEGRITY_VALUE,
            close: () => db.close(),
            metadata: {
                get, set, clear
            }
        })
}
