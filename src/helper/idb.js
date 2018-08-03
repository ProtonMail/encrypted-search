export const READONLY = 'readonly'
export const READWRITE = 'readwrite'

/**
 * Open an indexedDB in a promisified way.
 * @param {indexedDB} indexedDB
 * @param {String} name
 * @param {String} version
 * @param {Function} upgrade
 * @returns {Promise}
 */
export const open = (indexedDB, name, version, upgrade) => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version)
        request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion, request.transaction)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Convert an idb transaction to a promise.
 * @param {IDBTransaction} tx
 * @returns {Promise}
 */
export const transaction = (tx) => {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
    })
}

/**
 * Convert an idb request to a promise.
 * @param {IDBRequest} request
 * @returns {Promise}
 */
export const request = (request) => {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Delete a database.
 * @param {indexedDB} indexedDB
 * @param {String} dbName
 * @returns {Promise}
 */
export const deleteDb = async (indexedDB, dbName) => {
    const req = indexedDB.deleteDatabase(dbName)

    return new Promise((resolve, reject) => {
        req.onsuccess = resolve
        req.onerror = reject
        req.onblocked = reject
    })
}

/**
 * Open the database with closure timeout. This is to prevent the connection staying open constantly.
 * Which can be bad because it can prevent updates to the database from other tabs.
 * @param {Function} open Function to open the database.
 * @param {Number} closeTimeout Timeout after which to close the connection.
 * @returns {Object}
 */
export const openWithClosure = (open, closeTimeout) => {
    const state = {
        dbHandle: undefined,
        closeHandle: undefined,
        closed: false
    }

    const clearCloseHandle = () => {
        if (!state.closeHandle) {
            return
        }
        clearTimeout(state.closeHandle)
        state.closeHandle = undefined
    }

    const clearCloseDatabase = () => {
        if (!state.dbHandle) {
            return
        }
        state.dbHandle.close()
        state.dbHandle = undefined
    }

    const close = () => {
        clearCloseHandle()
        clearCloseDatabase()
    }

    const getTransaction = async (storeNames, mode = 'readonly') => {
        if (state.closed) {
            throw new Error('Database has been closed')
        }

        clearCloseHandle()
        state.closeHandle = setTimeout(close, closeTimeout)

        if (!state.dbHandle) {
            state.dbHandle = await open()
        }

        return state.dbHandle.transaction(storeNames, mode)
    }

    return {
        getTransaction,
        close: () => {
            state.closed = true
            close()
        }
    }
}

