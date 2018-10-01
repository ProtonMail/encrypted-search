export default ({ max = 1000 } = {}) => {
    const map = new Map()
    let head
    let tail
    let length = 0

    const clear = () => {
        map.clear()
        head = tail = undefined
        length = 0
    }

    const unlink = function (key, prev, next) {
        length--

        if (length === 0) {
            head = tail = undefined
            return
        }

        if (head === key) {
            head = prev
            map.get(head).next = undefined
            return
        }

        if (tail === key) {
            tail = next
            map.get(tail).prev = undefined
            return
        }

        if (prev) {
            map.get(prev).next = next
        }
        if (next) {
            map.get(next).prev = prev
        }
    }

    const remove = (key) => {
        if (!map.has(key)) {
            return
        }
        const element = map.get(key)
        map.delete(key)
        unlink(key, element.prev, element.next)
    }

    const get = (key) => {
        const el = map.get(key)
        if (!el) {
            return
        }
        return el.value
    }

    const set = (key, value) => {
        let element

        if (map.has(key)) {
            element = map.get(key)
            element.value = value

            if (key === head) {
                return value
            }

            unlink(key, element.prev, element.next)
        } else {
            element = {
                value,
            }
            map.set(key, element)

            if (length === max) {
                remove(tail)
            }
        }

        length++
        element.next = undefined
        element.prev = head

        if (head) {
            map.get(head).next = key
        }

        head = key

        if (!tail) {
            tail = key
        }

        return value
    }

    return { set, get, remove, clear }
}

