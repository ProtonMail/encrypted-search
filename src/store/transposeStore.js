import { READWRITE, transaction } from '../helper/idb'

export default (aStore, bStore, getTransaction) => {
    const idKey = 'id'
    const table = [aStore.name, bStore.name]

    const from = async (bs = []) => {
        const tx = await getTransaction(table)
        return Promise.all(bs.map((b) => aStore.get(tx, b)))
    }

    const bulk = async (as = []) => {
        const tx = await getTransaction(table, READWRITE)
        const initialId = (await bStore.get(tx, idKey)) || 1
        let id = initialId
        const result = await Promise.all(as.map((a) => bStore.get(tx, a)))
        const seen = new Map()

        const cb = (iid, i) => {
            if (iid) {
                return
            }

            // Duplicates...
            const a = as[i]
            if (seen.has(a)) {
                result[i] = seen.get(a)
                return
            }

            const newId = id++

            seen.set(a, newId)
            result[i] = newId

            aStore.put(tx, a, newId)
            bStore.put(tx, newId, a)
        }

        const promise = transaction(tx)

        result.forEach(cb)

        if (id !== initialId) {
            bStore.put(tx, id, idKey)
        }

        await promise

        return result
    }

    const stat = (type = 'count') => (tx) => Promise.all([aStore[type](tx), bStore[type](tx)])
        .then((result) => result.reduce((agg, cur) => agg + cur, 0))

    return {
        name: [aStore.name, bStore.name],
        bulk,
        from,
        count: stat('count'),
        size: stat('size'),
        clear: (tx) => {
            aStore.clear(tx)
            bStore.clear(tx)
        },
        clearCache: () => {
            aStore.clearCache()
            bStore.clearCache()
        }
    }
}
