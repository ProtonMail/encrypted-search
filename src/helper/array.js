const defaultExtractor = (a) => a
const defaultComparator = (a, b) => a === b
const defaultTransformer = (a) => a

/**
 * Get unique values from an array.
 * @param {Array} array
 * @param {Function} extractor
 * @return {Array}
 */
export const unique = (array, extractor = defaultExtractor) => {
    const seen = new Set()
    const length = array.length
    const result = []
    for (let i = 0; i < length; i++) {
        const value = array[i]
        const extract = extractor(value)
        if (seen.has(extract)) {
            continue
        }
        seen.add(extract)
        result.push(value)
    }
    return result
}

/**
 * Flatten an array one level.
 * @param {Array} array
 * @return {Array}
 */
export const flatten = (array = []) => Array.prototype.concat(...array)

/**
 *
 * @param {Array} a The first array.
 * @param {Array} b The second array.
 * @param {Function} extractor
 * @returns {Array}
 */
export const minus = (a = [], b = [], extractor = defaultExtractor) => {
    const other = new Set(b.map(extractor))
    return a.reduce((prev, cur) => {
        const val = extractor(cur)
        if (!other.has(val)) {
            prev.push(cur)
        }
        return prev
    }, [])
}

/**
 * Intersect two arrays. Ignoring any duplicates.
 * @param {Array} a The first array.
 * @param {Array} b The second array.
 * @param {Function} extractor
 * @param {Function} transformer A transformer function to transform the two values.
 * @returns {Array}
 */
export const intersect = (a = [], b = [], extractor = defaultExtractor, transformer = defaultTransformer) => {
    return unique(a, extractor)
        .reduce((acc, cur) => {
            const idx = b.findIndex((x) => extractor(cur) === extractor(x))
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
 * @param {Function} extractor A extractor function read the value to compare
 * @param {Function} transformer A transformer function to transform the two values.
 * @returns {Array}
 */
export const union = (a = [], b = [], extractor = defaultExtractor, transformer = defaultTransformer) => {
    const duplicates = {}
    const union = [...unique(a, extractor), ...unique(b, extractor)]
    return union
        .reduce((acc, cur, index) => {
            const idx = union.findIndex((x, findex) => index !== findex && extractor(cur) === extractor(x))
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
        if (a.findIndex((y) => comparator(y, keyword)) !== -1) {
            counter++
        }
        return counter >= n
    })
}

/**
 * Convert an array to a gaps array
 * (Inline for performance)
 * @param {Array<Number>} arr
 * @returns {Array<Number>}
 */
export const getGapsArray = (arr = []) => {
    if (arr.length <= 1) {
        return arr
    }
    arr.sort((a, b) => a - b)
    let prev = arr[0]
    for (let i = 1; i < arr.length; ++i) {
        const value = arr[i]
        arr[i] = arr[i] - prev
        prev = value
    }
    return arr
}

/**
 * Convert an array to a gaps array
 * (Inline for performance)
 * @param {Array<Number>} arr
 * @returns {Array<Number>}
 */
export const getArrayGaps = (arr = []) => {
    if (arr.length <= 1) {
        return arr
    }
    for (let i = 1; i < arr.length; ++i) {
        arr[i] = arr[i] + arr[i - 1]
    }
    return arr
}

/**
 * Insert an item into a gaps array.
 * @param {Array} array
 * @param {Number} id
 * @returns {Array|undefined} Returns undefined if the item already exists
 */
export const insertIntoGapsArray = (array = [], id) => {
    const len = array.length
    if (len === 0) {
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
    } while (i < len)

    if (i === 0) {
        array.unshift(id)
        array[1] = array[1] - id
    } else if (i === len) {
        array.push(id - prevValue)
    } else {
        array.splice(i, 0, id - prevValue)
        array[i + 1] = currentValue - id
    }

    return array
}

export const removeFromGapsArray = (array = [], id) => {
    const len = array.length
    if (len === 0) {
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
    } while (i < len)

    if (i === len) {
        return
    }
    if (i === len - 1) {
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

/**
 * Shuffle an array.
 * @param {Array} result
 * @param {Number} i
 * @param {Number} j
 */
const swap = (result, i, j) => {
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
}

export const shuffle = (array) => {
    const result = array.slice()
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        swap(result, i, j)
    }
    return result
}

export const shuffleTwo = (arrayA, arrayB) => {
    for (let i = arrayA.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        swap(arrayA, i, j)
        swap(arrayB, i, j)
    }
}
