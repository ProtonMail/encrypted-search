/**
 * Calculate the idf score for a term.
 * @param {Number} N The number of documents in the corpus.
 * @param {Number} df The number of times this term occurs in the corpus.
 * @returns {number}
 */
const idf = (N, df) => (df > 0 ? Math.log10(N / df) : 0)

/**
 * Calculate the weight of the term.
 * @param {Number} tf The number of times this term occurs in a single document.
 * @returns {Number}
 */
const wt = (tf) => (tf > 0 ? 1 + Math.log10(tf) : 0)

/**
 * Generate a ranking based on cosine similarity scoring.
 * https://nlp.stanford.edu/IR-book/html/htmledition/computing-vector-scores-1.html
 * @param {Array} keywords The keywords in the query.
 * @param {Array} keywordsToIds Each keyword mapped to a list of document IDs.
 * @param {Number} N The number of documents in this corpus.
 * @param {Object} idsToKeywords Result id to list of keywords.
 */
export default ({ keywords = [], keywordsToIds = [], N = 0, idsToKeywords = {} }) => {
    if (!Array.isArray(keywords) || !Array.isArray(keywordsToIds) || keywords.length !== keywordsToIds.length) {
        throw new Error('Keyword array exception')
    }
    if (keywordsToIds.some((keywordToIds = []) => !Array.isArray(keywordToIds))) {
        throw new Error('Keyword to IDs array exception')
    }
    if (Object.keys(idsToKeywords).some((id) => !Array.isArray(idsToKeywords[id] || []))) {
        throw new Error('IDs to keywords array exception')
    }

    const result = {}

    keywords.forEach((keyword, i) => {
        const keywordToIds = keywordsToIds[i] || []
        const termFrequencyInCorpus = keywordToIds.length
        const inverseTermDocumentFrequency = idf(N, termFrequencyInCorpus)
        const queryTermWeight = (1 / keywords.length) * inverseTermDocumentFrequency

        keywordToIds.forEach((id) => {
            const documentKeywords = idsToKeywords[id] || []

            const termFrequencyInDocument = documentKeywords.filter((documentKeyword) => documentKeyword === keyword)
                .length
            const documentTermWeight = wt(termFrequencyInDocument) * inverseTermDocumentFrequency
            const score = documentTermWeight * queryTermWeight

            result[id] = (result[id] || 0) + score
        })
    })

    // Normalize scores.
    Object.keys(result).forEach((id) => {
        const documentKeywords = idsToKeywords[id] || []
        const len = documentKeywords.length
        result[id] = len > 0 ? result[id] / len : 0
    })

    return result
}
