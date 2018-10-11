import {
    intersect,
    minus,
    union,
    unique,
    ordered,
    contains,
    proximity,
    quorom
} from '../helper/array'
import { hasWildcard, wildcardMatch } from '../helper/wildcard'

export const AND = '&'
export const OR = '|'
export const BEFORE = '<<'
export const PHRASE = '"'
export const KEYWORD = 'w'

export const PHRASE_ALL = ''
export const PHRASE_PROXIMITY = '~'
export const PHRASE_QUOROM = '/'

const validatePhraseOperator = (type, n) => {
    switch (type) {
        case PHRASE_ALL:
            return true
        case PHRASE_PROXIMITY:
        case PHRASE_QUOROM:
            return typeof n === 'number' && n >= 0
        default:
            return false
    }
}

const validatePhraseModifier = (modifier = '') => {
    switch (modifier) {
        case '':
        case '$':
        case '^':
        case '^$':
            return true
        default:
            return false
    }
}

const validateKeywordOperator = (type) => {
    switch (type) {
        case '':
        case '^':
        case '$':
            return true
        default:
            return false
    }
}

const validateQueryOperator = (type) => {
    switch (type) {
        case AND:
        case OR:
        case BEFORE:
        case PHRASE:
        case KEYWORD:
            return true
        default:
            return false
    }
}

const getResults = ({ result }) => result

const getQueryKeywords = (wildcard, keyword) => {
    if (hasWildcard(keyword)) {
        return wildcard(keyword)
    }
    return Promise.resolve([keyword])
}

const getPhraseQueryKeywords = (wildcard, keywords) => {
    const nonWildcardKeywordIndex = keywords.findIndex((keyword) => !hasWildcard(keyword))
    if (nonWildcardKeywordIndex === -1) {
        return wildcard(keywords[0])
    }
    return Promise.resolve([keywords[nonWildcardKeywordIndex]])
}

const equalityComparator = (a, b) => a === b

const curriedComparator = (comparator, b) => (a) => comparator(a, b)

const trueCb = () => true

const resultExtractor = (a = {}) => a._id

const resultTransformer = (a, { match = [] } = {}) => ({ ...a, match: unique(a.match.concat(match)) })

const beforeTransformer = (a, b) => {
    const { _terms: _termsLeft = [], _match: _matchLeft = [] } = a
    const { _match: _matchRight = [], match: matchRight = [] } = b
    if (!ordered(_termsLeft, _matchLeft, _matchRight)) {
        return undefined
    }
    return {
        ...a,
        _match: unique(a._match.concat(_matchRight)),
        match: unique(a.match.concat(matchRight))
    }
}

const handleResultsAndNot = (resultsA, resultsB) => minus(resultsA, resultsB, resultExtractor)

const handleResultsAnd = (resultsA, resultsB) => intersect(resultsA, resultsB, resultExtractor, resultTransformer)

const handleResultsOr = (resultsA, resultsB) => union(resultsA, resultsB, resultExtractor, resultTransformer)

const handleResultsBefore = (resultsA, resultsB) => intersect(resultsA, resultsB, resultExtractor, beforeTransformer)

const handleBranchResults = (queryOperator, resultsA, resultsB, notA, notB) => {
    switch (queryOperator) {
        case AND:
            if (notA || notB) {
                return handleResultsAndNot(notA ? resultsB : resultsA, notA ? resultsA : resultsB)
            }
            return handleResultsAnd(resultsA, resultsB)
        case OR:
            return handleResultsOr(resultsA, resultsB)
        case BEFORE:
            return handleResultsBefore(resultsA, resultsB)
        default:
            throw new Error(`Invalid operator ${queryOperator} in branch`)
    }
}

const filterFirst = (comparator) => (result = []) =>
    result.length >= 1 && comparator(result[0])

const filterLast = (comparator) => (result = []) =>
    result.length >= 1 && comparator(result[result.length - 1])

const filterFirstLast = (comparatorFirst, comparatorLast) => (result = []) =>
    result.length >= 1 && comparatorFirst(result[0]) && comparatorLast(result[result.length - 1])

const getPhraseFilter = (comparator, modifier, keywords = []) => {
    if (modifier === '' || keywords.length === 0) {
        return trueCb
    }
    switch (modifier) {
        case '$':
            return filterLast(
                curriedComparator(comparator, keywords[keywords.length - 1]))
        case '^':
            return filterFirst(
                curriedComparator(comparator, keywords[0]))
        case '^$':
            return filterFirstLast(
                curriedComparator(comparator, keywords[0]),
                curriedComparator(comparator, keywords[keywords.length - 1]))
    }
}

const handlePhrase = async (search, wildcard, keywords, phraseModifier, phraseOperator, n) => {
    if (!Array.isArray(keywords) || keywords.length === 0 || !validatePhraseOperator(phraseOperator, n) || !validatePhraseModifier(phraseModifier)) {
        throw new Error('Malformed phrase query')
    }

    const queryKeywords = await getPhraseQueryKeywords(wildcard, keywords)

    const results = getResults(await search(queryKeywords))
    const comparator = wildcardMatch
    const filter = getPhraseFilter(comparator, phraseModifier, keywords)

    switch (phraseOperator) {
        case PHRASE_QUOROM: {
            if (n === 1) {
                return results
            }
            return results
                .filter(({ terms: resultTerms = [] }) => filter(resultTerms) && quorom(resultTerms, keywords, n, comparator))
        }
        case PHRASE_PROXIMITY: {
            return results
                .filter(({ terms: resultTerms = [] }) => filter(resultTerms) && proximity(resultTerms, keywords, n, comparator))
        }
        case PHRASE_ALL: {
            return results
                .filter(({ terms: resultTerms = [] }) => filter(resultTerms) && contains(resultTerms, keywords, comparator) !== -1)
        }
    }
}

const handleKeyword = async (search, wildcard, keyword, keywordStartOperator, keywordEndOperator) => {
    if (!keyword.charAt || !validateKeywordOperator(keywordStartOperator) || !validateKeywordOperator(keywordEndOperator) || keyword === '*') {
        throw new Error('Malformed keyword')
    }

    const keywords = await getQueryKeywords(wildcard, keyword)
    const results = getResults(await search(keywords))

    if (keywordStartOperator === '^' || keywordEndOperator === '$') {
        return results
            .filter(({ _terms: _terms = [], _match = [] }) => {
                const start = keywordStartOperator === '^' ?
                    curriedComparator(equalityComparator, _terms[0]) : trueCb

                const end = keywordEndOperator === '$' ?
                    curriedComparator(equalityComparator, _terms[_terms.length - 1]) : trueCb

                return _terms.length > 0 && _match.length > 0 &&
                    _match.some((matchedKeyword) =>
                        start(matchedKeyword) && end(matchedKeyword))
            })
    }

    return results
}

const evaluateBranch = async (search, wildcard, queryOperator, a, b, c, d) => {
    if (!validateQueryOperator(queryOperator)) {
        throw new Error(`Invalid operator ${queryOperator} in branch`)
    }

    if (queryOperator === KEYWORD) {
        return handleKeyword(search, wildcard, a, b, c)
    }

    if (queryOperator === PHRASE) {
        return handlePhrase(search, wildcard, a, b, c, d)
    }

    if ((c || d) && queryOperator !== AND) {
        throw new Error('Invalid NOT in AND query')
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        const resultsA = await evaluateBranch(search, wildcard, ...a)
        const resultsB = await evaluateBranch(search, wildcard, ...b)
        return handleBranchResults(queryOperator, resultsA, resultsB, c, d)
    }

    throw new Error('Unrecognized branch')
}

export default (search, wildcard, query) => {
    if (!Array.isArray(query)) {
        throw new Error('Invalid query')
    }
    return evaluateBranch(search, wildcard, ...query)
}
