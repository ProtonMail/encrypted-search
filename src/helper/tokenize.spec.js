import tokenize from './tokenize'

describe('tokenizer', () => {
    it('should should convert single-token strings', () => {
        expect(tokenize('word')).toEqual(['word'])
    })

    it('should should convert multi-token words', () => {
        expect(tokenize('lorem ipsum')).toEqual(['lorem', 'ipsum'])
    })

    it('should should remove one-letter tokens', () => {
        expect(tokenize('a word')).toEqual(['word'])
    })

    it('should should remove punctuation', () => {
        expect(tokenize('hello, this is me.')).toEqual(['hello', 'this', 'is', 'me'])
    })

    it('should convert cyrillic', () => {
        expect(tokenize('Артём Риженков')).toEqual(['artyom', 'rizhenkov'])
    })

    it('should remove brackets', () => {
        expect(tokenize('the (color) red ({is}) <pretty> [some] people say')).toEqual(['the', 'color', 'red', 'is', 'pretty', 'some', 'people', 'say'])
    })

    it('should remove special characters', () => {
        expect(tokenize('the /color/ %red% \\is \'pretty\' ´some`? *people* say!')).toEqual(['the', 'color', 'red', 'is', 'pretty', 'some', 'people', 'say'])
    })

    it('should latenise characters', () => {
        expect(tokenize('crème brulée is so good. åäöàüèé?')).toEqual(['creme', 'brulee', 'is', 'so', 'good', 'aaoauee'])
    })
})
