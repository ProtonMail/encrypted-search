const typeSizes = {
    boolean: () => 4,
    number: () => 8,
    string: (item) => 2 * item.length
}

export default (object) => {
    const objectList = []
    const stack = [object]
    let bytes = 0

    while (stack.length) {
        const value = stack.pop()
        const type = typeof value

        if (!value) {
            continue
        }

        if (value.byteLength) {
            bytes += value.byteLength
            continue
        }

        if (Array.isArray(value)) {
            value.forEach((v) => stack.push(v))
            continue
        }

        if (type === 'object' && objectList.indexOf(value) === -1) {
            objectList.push(value)

            Object.keys(value).forEach((key) => {
                stack.push(key)
                stack.push(value[key])
            })
        }

        if (typeSizes[type]) {
            bytes += typeSizes[type](value)
        }
    }

    return bytes
}
