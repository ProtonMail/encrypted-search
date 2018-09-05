const defaultComparator = (a, b) => a === b
const defaultTransformer = (a) => a
/**
 * Get unique values from an array.
 * @param {Array} array
 * @param {Function} comparator
 * @return {Array}
 */
export const unique = (array = [], comparator = defaultComparator) => array.filter((value, index, self) => self.findIndex((x) => comparator(value, x)) === index)

/**
 * Flatten an array one level.
 * @param {Array} array
 * @return {Array}
 */
export const flatten = (array = []) => Array.prototype.concat(...array)

/**
 * Intersect two arrays. Ignoring any duplicates.
 * @param {Array} a The first array.
 * @param {Array} b The second array.
 * @param {Function} comparator A comparator function to compare a value in array a with a value in array b.
 * @param {Function} transformer A transformer function to transform the two values.
 * @returns {Array}
 */
export const intersect = (a = [], b = [], comparator = defaultComparator, transformer = defaultTransformer) => {
    return unique(a, comparator)
        .reduce((acc, cur) => {
            const idx = b.findIndex((x) => comparator(cur, x))
            if (idx === -1) {
                return acc
            }
            const transformedValue = transformer(cur, b[idx])
            if (transformedValue) {
                acc.push(transformedValue)
            }
            return acc
        }, [])
}

/**
 * Join two arrays. Ignoring any duplicates.
 * @param {Array} a The first array.
 * @param {Array} b The second array.
 * @param {Function} comparator A comparator function to compare a value in array a with a value in array b.
 * @param {Function} transformer A transformer function to transform the two values.
 * @returns {Array}
 */
export const union = (a = [], b = [], comparator = defaultComparator, transformer = defaultTransformer) => {
    const duplicates = {}
    const union = [...unique(a, comparator), ...unique(b, comparator)]
    return union
        .reduce((acc, cur, index) => {
            const idx = union.findIndex((x, findex) => index !== findex && comparator(cur, x))
            if (idx === -1) {
                acc.push(transformer(cur))
                return acc
            }
            if (duplicates[idx]) {
                return acc
            }
            duplicates[index] = true
            const transformedValue = transformer(cur, union[idx])
            if (transformedValue) {
                acc.push(transformedValue)
            }
            return acc
        }, [])
}

/**
 * Find a subset of an array in order.
 * @param {Array} a Array
 * @param {Array} b Subset of array
 * @param {Function} comparator A comparator function to compare a value in array a with a value in array b.
 * @returns {Number}
 */
export const contains = (a = [], b = [], comparator = defaultComparator) => {
    let m = b.length
    let n = a.length
    let i = 0
    while (i <= n - m) {
        let j = 0
        while (j < m) {
            if (!comparator(a[i], b[j])) {
                break
            }
            i++
            j++
        }
        if (j === 0) {
            i++
        } else if (j === m) {
            return i - m
        }
    }

    return -1
}

/**
 * Returns whether an array a contains any element in array b before any element in array c.
 * @param {Array} a The array containing the elements.
 * @param {Array} b The array containing the elements that should be placed before c.
 * @param {Array} c The array containing the elements that should be placed after b.
 * @param {Function} comparator A comparator function to compare a value in array a with a value in array b.
 * @returns {Boolean}
 */
export const ordered = (a = [], b = [], c = [], comparator = defaultComparator) => {
    return b.some((x, i) => {
        let idxB = a.findIndex((y) => comparator(x, y))
        const any = c.some((y) => {
            let idxC = a.findIndex((z) => comparator(y, z))
            return idxC >= idxB
        })
        if (!any && i === b.length - 1) {
            return false
        }
        return any
    })
}

/**
 * Returns whether an element in array b is not contained in array a.
 * @param {Array} a The array containing the elements.
 * @param {Array} b The array containing the elements which can not exist in a.
 * @param {Function} comparator A comparator function to compare a value in array a with a value in array b.
 * @returns {Boolean}
 */
export const notContains = (a = [], b = [], comparator = defaultComparator) => {
    return !b.some((x) => {
        let otherIdx = a.findIndex((y) => comparator(x, y))
        if (otherIdx !== -1) {
            return true
        }
    })
}

/**
 * Returns whether the elements of b in array a are separated by n length.
 * @param {Array} a The array containing the elements.
 * @param {Array} b The array containing the elements in a to compare.
 * @param {Number} n The total length that can exist between the elements in b.
 * @param {Function} comparator A comparator function to compare a value in array a with a value in array b.
 * @returns {Boolean}
 */
export const proximity = (a = [], b = [], n, comparator = defaultComparator) => {
    const value = b
        .map((keyword) => a.findIndex((y) => comparator(keyword, y)))
        .filter((x) => x !== -1)
        .sort()
        .reduce((agg, x, i, a) => {
            if (i === a.length - 1) {
                return agg
            }
            return agg + ((a[i + 1] - 1) - x)
        }, 0)
    return value < n
}

/**
 * Returns whether at least n elements in b exist in a.
 * @param {Array} a The array containing the elements.
 * @param {Array} b The array containing the elements to search.
 * @param {Number} n The total amount that must exist.
 * @param {Function} comparator A comparator function to compare a value in array a with a value in array b.
 * @returns {Boolean}
 */
export const quorom = (a = [], b = [], n, comparator = defaultComparator) => {
    let counter = 0
    return b.some((keyword) => {
        if (a.findIndex((y) => comparator(keyword, y)) !== -1) {
            counter++
        }
        return counter >= n
    })
}

/**
 * Insert an item into a gaps array.
 * @param {Array} array
 * @param {Number} id
 * @returns {Array|undefined} Returns undefined if the item already exists
 */
export const insertIntoGapsArray = (array = [], id) => {
    if (array.length === 0) {
        return [id]
    }

    let i = 0
    let currentValue = 0
    let prevValue = 0
    do {
        currentValue = prevValue + array[i]

        if (currentValue === id) {
            return
        }

        if (id < currentValue) {
            break
        }

        prevValue = currentValue

        i++
    } while (i < array.length)

    if (i === 0) {
        array.unshift(id)
        array[1] = array[1] - id
    } else if (i === array.length) {
        array.push(id - prevValue)
    } else {
        array.splice(i, 0, id - prevValue)
        array[i + 1] = currentValue - id
    }

    return array
}

export const removeFromGapsArray = (array = [], id) => {
    if (array.length === 0) {
        return []
    }

    let i = 0
    let currentValue = 0
    let prevValue = 0
    do {
        currentValue = prevValue + array[i]
        if (currentValue === id) {
            break
        }
        prevValue = currentValue
        i++
    } while (i < array.length)

    if (i === array.length) {
        return
    }
    if (i === array.length - 1) {
        array.splice(i, 1)
        return array
    }
    if (i === 0) {
        array.splice(0, 1)
        array[0] = currentValue + array[0]
        return array
    }

    array.splice(i, 1)
    array[i] = (currentValue + array[i]) - prevValue

    return array
}
