export const MIN_WILDCARD_LEN = 2

/**
 * Returns whether the string contains a wildcard query.
 * @param {String} string
 * @returns {boolean}
 */
export const hasWildcard = (string = '') => {
    for (let i = 0; i < string.length; ++i) {
        const c = string[i]
        if (c === '*' || c === '?') {
            return true
        }
    }
    return false
}

/**
 * Split a string in n-grams.
 * @param {Number} n Number of n-grams
 * @param {String} value
 * @returns {Array}
 */
export const ngram = (n, value) => {
    if (!value || !value.charAt) {
        return []
    }
    let index = value.length - n + 1
    if (index < 1) {
        return []
    }
    const result = Array(index)
    while (index--) {
        result[index] = value.substr(index, n)
    }
    return result
}

/**
 * Split a token in ngrams, with padding.
 * @param {String} value
 * @returns {Array}
 */
export const splitTokenPadding = (value = '') => {
    if (value.length <= MIN_WILDCARD_LEN - 1) {
        return []
    }
    return ngram(MIN_WILDCARD_LEN + 1, `^${value}$`)
}


/**
 * Extract a wildcard key to query for.
 * @param {String} value
 * @returns {string}
 */
const extractQueryToken = (value = '') => {
    let start = -1
    let n = 0
    for (let i = 0; i < value.length; ++i) {
        const c = value[i]
        const wildcard = c === '*' || c === '?'
        if (start === -1) {
            if (wildcard) {
                continue
            }
            start = i
            n++
        } else {
            if (!wildcard) {
                n++
                if (n === MIN_WILDCARD_LEN + 1) {
                    break
                }
            } else {
                start = -1
                n = 0
            }
        }
    }
    if (n !== MIN_WILDCARD_LEN + 1) {
        throw new Error('Could not parse wildcard query')
    }
    return value.substr(start, n)
}

export const extractQueryTokenPadding = (value = '') => extractQueryToken(`^${value}$`)

/**
 * Match a wildcard pattern against a string.
 * @param {String} string
 * @param {String} pattern
 * @returns {Boolean}
 */
export const wildcardMatch = (string, pattern) => {
    if (pattern === '*') {
        return true
    }

    const m = string.length
    const n = pattern.length

    let wildcards = 0
    let singleWildcards = 0

    for (let i = 1; i <= n; i++) {
        if (pattern[i - 1] === '*') {
            wildcards++
        }
        if (pattern[i - 1] === '?') {
            singleWildcards++
        }
    }

    // If there are no wildcards and the lengths do not match, it's not a match.
    if (wildcards === 0 && n !== m) {
        return false
    }
    // If it contains no wildcards, use normal comparison
    if (singleWildcards === 0 && wildcards === 0) {
        return string === pattern
    }

    const table = Array(n + 1)
    table[0] = 1

    for (let i = 1; i <= n; i++) {
        if (pattern[i - 1] === '*') {
            table[i] = table[i - 1]
        }
    }

    if (m === 1 && n === 1 && pattern[0] === '?') {
        return true
    }

    const table_prev = Array(n + 1)
    table_prev[0] = 1

    for (let i = 1; i <= m; i++) {
        for (let j = 0; j <= n; j++) {
            table_prev[j] = table[j]
            if (j === 0) {
                table[j] = 0
            }
            if (pattern[j - 1] === '*') {
                table[j] = (table[j] || table[j - 1])
            }
            else if (pattern[j - 1] === '?' || pattern[j - 1] === string[i - 1]) {
                table[j] = table_prev[j - 1]
            }
            else {
                table[j] = 0
            }
        }
    }

    return !!table[n]
}

