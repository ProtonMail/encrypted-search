import { parse as parseGrammar } from './grammar'
import { KEYWORD, PHRASE } from './query'
import defaultTokenize, { transform as defaultTransform } from '../helper/tokenize'

const fixQueryBranch = (query, tokenize, transform) => {
    if (!query) {
        return
    }
    if (query[0] === KEYWORD) {
        query[1] = transform(query[1])
        return
    }
    if (query[0] === PHRASE) {
        query[1] = tokenize(query[1], 0, false)
        return
    }
    if (Array.isArray(query[1])) {
        queryFixer(query[1], tokenize, transform)
    }
    if (Array.isArray(query[2])) {
        queryFixer(query[2], tokenize, transform)
    }
}

const queryFixer = (query, tokenize, transform) => {
    fixQueryBranch(query, tokenize, transform)
    return query
}

export default (query = '', tokenize = defaultTokenize, transform = defaultTransform) => queryFixer(parseGrammar(query), tokenize, transform)
