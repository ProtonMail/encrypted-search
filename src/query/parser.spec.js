import parse from './parser'

describe('parser', () => {
    it('should transform keywords', () => {
        expect(parse('hèllö')).toEqual(['w', 'hello', '', ''])
    })

    it('should change a phrase into tokens', () => {
        expect(parse('"hello you there"')).toEqual(['"', ['hello', 'you', 'there'], '', '', 0])
    })
})
