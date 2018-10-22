import { READWRITE, request } from '../helper/idb'

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
        let requestA
        let requestB

        for (let i = 0; i < result.length; ++i) {
            const iid = result[i]

            if (iid) {
                continue
            }

            // Duplicates...
            const a = as[i]
            if (seen.has(a)) {
                result[i] = seen.get(a)
                continue
            }

            const newId = id++

            seen.set(a, newId)
            result[i] = newId

            requestA = aStore.put(tx, a, newId)
            requestB = bStore.put(tx, newId, a)
        }

        if (id !== initialId) {
            requestB = bStore.put(tx, id, idKey)
        }

        if (requestA) {
            await Promise.all([request(requestA), request(requestB)])
        }

        return result
    }

    const stat = (type = 'count') => async (tx) => {
        const result = await Promise.all([aStore[type](tx), bStore[type](tx)])
        return result.reduce((agg, cur) => agg + cur, 0)
    }

    return {
        name: table,
        bulk,
        from,
        count: stat('count'),
        size: stat('size'),
        clear: (tx) => {
            aStore.clear(tx)
            bStore.clear(tx)
        },
    }
}
