import { extractQueryTokenPadding, ngram, splitTokenPadding, wildcardMatch } from './wildcard'

describe('wildcard', () => {

    it('should split in n-grams', () => {
        expect(ngram(3, 'hello')).toEqual(['hel', 'ell', 'llo'])
    })

    it('should split in 3-grams with padding', () => {
        expect(splitTokenPadding('castle')).toEqual(['^ca', 'cas', 'ast', 'stl', 'tle', 'le$'])
    })

    it('should return empty array on short input', () => {
        expect(splitTokenPadding('a')).toEqual([])
    })

    it('should throw bad input', () => {
        expect(() => extractQueryTokenPadding('r*')).toThrow(new Error('Could not parse wildcard query'))
        expect(() => extractQueryTokenPadding('*ab*')).toThrow(new Error('Could not parse wildcard query'))
    })

    it('should get one query token from a query', () => {
        expect(extractQueryTokenPadding('re?')).toEqual('^re')
        expect(extractQueryTokenPadding('?ed')).toEqual('ed$')
        expect(extractQueryTokenPadding('red*')).toEqual('^re')
        expect(extractQueryTokenPadding('*ired')).toEqual('ire')
        expect(extractQueryTokenPadding('***ired*')).toEqual('ire')
    })

    it('should match wildcard query', () => {
        expect(wildcardMatch('ab', 'aa')).toBeFalsy()
        expect(wildcardMatch('aa', 'aa')).toBeTruthy()
        expect(wildcardMatch('', '*')).toBeTruthy()
        expect(wildcardMatch('asd', '*')).toBeTruthy()
        expect(wildcardMatch('a', '??')).toBeFalsy()
        expect(wildcardMatch('a', '*?')).toBeTruthy()
        expect(wildcardMatch('ab', '*?')).toBeTruthy()
        expect(wildcardMatch('abc', '*?')).toBeTruthy()
        expect(wildcardMatch('ab', '?*?')).toBeTruthy()
        expect(wildcardMatch('ab', '*?*?*')).toBeTruthy()
        expect(wildcardMatch('abcde', '?*b*?*d*?')).toBeTruthy()
        expect(wildcardMatch('relevance', 'r*v*n*ce')).toBeTruthy()
        expect(wildcardMatch('relelelel', 're*le*el')).toBeTruthy()
        expect(wildcardMatch('relevance', 're*')).toBeTruthy()
        expect(wildcardMatch('relevance', 'ae*')).toBeFalsy()
        expect(wildcardMatch('relevance', '*e')).toBeTruthy()
        expect(wildcardMatch('relevance', '*ce')).toBeTruthy()
        expect(wildcardMatch('relevance', '*ee')).toBeFalsy()
        expect(wildcardMatch('relevance', 'rel?vance')).toBeTruthy()
        expect(wildcardMatch('relevance', 'rele*vance')).toBeTruthy()
        expect(wildcardMatch('relevance', 'rele****vance')).toBeTruthy()
        expect(wildcardMatch('abcccd', '*ccd')).toBeTruthy()
        expect(wildcardMatch('mississipissippi', '*issip*ss*')).toBeTruthy()
        expect(wildcardMatch('xxxx*zzzzzzzzy*f', 'xxxx*zzy*fffff')).toBeFalsy()
        expect(wildcardMatch('xxxx*zzzzzzzzy*f', 'xxx*zzy*f')).toBeTruthy()
        expect(wildcardMatch('xxxxzzzzzzzzyf', 'xxxx*zzy*fffff')).toBeFalsy()
        expect(wildcardMatch('xxxxzzzzzzzzyf', 'xxxx*zzy*f')).toBeTruthy()
        expect(wildcardMatch('abababababababababababababababababababaacacacacacacacadaeafagahaiajakalaaaaaaaaaaaaaaaaaffafagaagggagaaaaaaaab', '*a*b*ba*ca*aaaa*fa*ga*ggg*b*')).toBeTruthy()
        expect(wildcardMatch('aaabbaabbaab', '*aabbaa*a*')).toBeTruthy()
        expect(wildcardMatch('a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*', 'a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*')).toBeTruthy()
        expect(wildcardMatch('aaaaaaaaaaaaaaaaa', '*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*')).toBeTruthy()
        expect(wildcardMatch('aaaaaaaaaaaaaaaa', '*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*')).toBeFalsy()
        expect(wildcardMatch('abc*abcd*abcde*abcdef*abcdefg*abcdefgh*abcdefghi*abcdefghij*abcdefghijk*abcdefghijkl*abcdefghijklm*abcdefghijklmn', 'abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*')).toBeFalsy()
        expect(wildcardMatch('abc*abcd*abcde*abcdef*abcdefg*abcdefgh*abcdefghi*abcdefghij*abcdefghijk*abcdefghijkl*abcdefghijklm*abcdefghijklmn', 'abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*')).toBeTruthy()
        expect(wildcardMatch('abc*abcd*abcd*abc*abcd', 'abc*abc*abc*abc*abc')).toBeFalsy()
        expect(wildcardMatch('abc*abcd*abcd*abc*abcd*abcd*abc*abcd*abc*abc*abcd', 'abc*abc*abc*abc*abc*abc*abc*abc*abc*abc*abcd')).toBeTruthy()
        expect(wildcardMatch('abc', '********a********b********c********')).toBeTruthy()
    })
})
