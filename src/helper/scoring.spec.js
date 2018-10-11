import scoring from './scoring'

describe('scoring', () => {
    it('should give score 0 to queries that match nothing', () => {
        const scores = scoring({
            terms: ['abc'],
            termsToIds: [[123]],
            N: 1000,
            idsToTerms: {
                123: ['foo']
            }
        })
        expect(scores[123])
            .toEqual(0)
    })

    it('should give score to queries that match exactly', () => {
        const scores = scoring({
            terms: ['foo'],
            termsToIds: [[123]],
            N: 10,
            idsToTerms: {
                123: ['foo']
            }
        })
        expect(scores[123])
            .toEqual(1)
    })

    it('should give the same score to documents that match exactly', () => {
        const scores = scoring({
            terms: ['foo', 'bar'],
            termsToIds: [[123, 124], [123, 125]],
            N: 1000,
            idsToTerms: {
                123: ['foo', 'bar'],
                125: ['bar'],
                124: ['foo']
            }
        })
        expect(scores[123] === scores[124] && scores[123] === scores[125])
            .toBeTruthy()
    })

    it('should give higher score to documents that contain both terms', () => {
        const scores = scoring({
            terms: ['foo', 'bar'],
            termsToIds: [[123, 124], [123, 125]],
            N: 1000,
            idsToTerms: {
                123: ['foo', 'bar'],
                125: ['bar', 'the'],
                124: ['foo', 'the']
            }
        })
        expect(scores[123] > scores[124] && scores[123] > scores[125])
            .toBeTruthy()
    })

    it('should give higher score to documents where the term is rare', () => {
        const scores = scoring({
            terms: ['foo'],
            termsToIds: [[123, 124, 125]],
            N: 1000,
            idsToTerms: {
                123: ['foo'],
                124: ['foo', 'the'],
                125: ['foo', 'the', 'an']
            }
        })
        expect(scores[123] > scores[124] && scores[124] > scores[125])
            .toBeTruthy()
    })

    it('should give higher score to documents where the term is rare', () => {
        const scores = scoring({
            terms: ['foo', 'bar'],
            termsToIds: [[123, 124, 125], [123]],
            N: 1000,
            idsToTerms: {
                123: ['foo', 'bar'],
                124: ['foo', 'the'],
                125: ['foo', 'the', 'an']
            }
        })
        expect(scores[123] > scores[124] && scores[123] > scores[125])
            .toBeTruthy()
    })
})
