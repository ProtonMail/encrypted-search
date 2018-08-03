import { parse } from './grammar'

const KEYWORD = (keyword) => ['w', keyword, '', '']
const AND = (expr1, expr2, not1 = false, not2 = false) => ['&', expr1, expr2, not1, not2]
const OR = (expr1, expr2) => ['|', expr1, expr2]
const BETWEEN = (expr1, expr2) => ['<<', expr1, expr2]
const PHRASE = (phrase, extra = '', n = 0, modifier = '') => ['"', phrase, modifier, extra, n]

describe('grammar', () => {
    it('should default to AND query', () => {
        expect(parse('cat mouse')).toEqual(AND(KEYWORD('cat'), KEYWORD('mouse')))
    })

    it('should parse AND queries', () => {
        expect(parse('cat & mouse')).toEqual(AND(KEYWORD('cat'), KEYWORD('mouse')))
    })

    it('should parse OR queries', () => {
        expect(parse('cat | mouse')).toEqual(OR(KEYWORD('cat'), KEYWORD('mouse')))
    })

    it('should parse ORDER queries', () => {
        expect(parse('cat << mouse')).toEqual(BETWEEN(KEYWORD('cat'), KEYWORD('mouse')))
    })

    it('should parse PHRASE queries', () => {
        expect(parse('hello "cat mouse"')).toEqual(AND(KEYWORD('hello'), PHRASE('cat mouse')))
    })

    it('should parse PHRASE/n queries', () => {
        expect(parse('"cat mouse"/10')).toEqual(PHRASE('cat mouse', '/', 10))
    })

    it('should parse PHRASE~n queries', () => {
        expect(parse('"cat mouse"~10')).toEqual(PHRASE('cat mouse', '~', 10))
    })

    it('should parse AND and OR queries', () => {
        expect(parse('looking for cat | mouse')).toEqual(AND(KEYWORD('looking'), AND(KEYWORD('for'), OR(KEYWORD('cat'), KEYWORD('mouse')))))
    })

    it('should parse ORDER and OR queries', () => {
        expect(parse('cat << mouse | dog')).toEqual(BETWEEN(KEYWORD('cat'), OR(KEYWORD('mouse'), KEYWORD('dog'))))
    })

    it('should parse complex ORDER queries', () => {
        expect(parse('(bag of words) << "phrase  here" << red|blue|green')).toEqual(
            BETWEEN(
                AND(KEYWORD('bag'),
                    AND(KEYWORD('of'),
                        KEYWORD('words'))
                ),
                BETWEEN(
                    PHRASE('phrase  here'),
                    OR(KEYWORD('red'),
                        OR(KEYWORD('blue'),
                            KEYWORD('green')
                        )
                    )
                )
            )
        )
    })

    it('should parse queries in order', () => {
        expect(parse('partridge << turtle doves << French hens')).toEqual(
            AND(
                BETWEEN(
                    KEYWORD('partridge'),
                    KEYWORD('turtle')
                ),
                AND(
                    BETWEEN(
                        KEYWORD('doves'),
                        KEYWORD('French'),
                    ),
                    KEYWORD('hens')
                )
            )
        )
    })

    it('should parse grouping queries', () => {
        expect(parse('(looking for) | (cat mouse)')).toEqual(
            OR(
                AND(KEYWORD('looking'), KEYWORD('for')),
                AND(KEYWORD('cat'), KEYWORD('mouse'))
            )
        )
    })

    it('should parse grouping and OR queries', () => {
        expect(parse('(looking for) | cat')).toEqual(
            OR(
                AND(
                    KEYWORD('looking'),
                    KEYWORD('for')
                ),
                KEYWORD('cat')
            )
        )
    })

    it('should parse NOT queries', () => {
        expect(parse('!hello world')).toEqual(AND(KEYWORD('hello'), KEYWORD('world'), true, false))
        expect(parse('hello -world')).toEqual(AND(KEYWORD('hello'), KEYWORD('world'), false, true))
    })

    it('should parse complex NOT queries', () => {
        expect(parse('hello -(or | query)')).toEqual(
            AND(
                KEYWORD('hello'),
                OR(
                    KEYWORD('or'),
                    KEYWORD('query')
                ),
                false,
                true
            )
        )
        expect(parse('aaa -(bbb -(ccc ddd))')).toEqual(AND(KEYWORD('aaa'), AND(KEYWORD('bbb'), AND(KEYWORD('ccc'), KEYWORD('ddd')), false, true), false, true))
    })

    it('should throw when using illegal NOT', () => {
        expect(() => parse('-cat')).toThrow(new SyntaxError('Unexpected NOT in WORD'))
        expect(() => parse('cat | -dog')).toThrow(new SyntaxError('Unexpected NOT in WORD'))
        expect(() => parse('-cat -dog')).toThrow(new SyntaxError('Unexpected NOT in AND query'))
        expect(() => parse('!cat | dog')).toThrow(new SyntaxError('Unexpected NOT in WORD'))
        expect(() => parse('!cat | !dog')).toThrow(new SyntaxError('Unexpected NOT in WORD'))
        expect(() => parse('cat << -dog')).toThrow(new SyntaxError('Unexpected NOT in WORD'))
        expect(() => parse('"cat !dog"')).toThrow(new SyntaxError('Unexpected NOT in PHRASE query'))
        expect(() => parse('"cat !dog"/~10')).toThrow(new SyntaxError('Unexpected NOT in PHRASE query'))
        expect(() => parse('c!at')).toThrow(new SyntaxError('Unexpected NOT in WORD'))
        expect(() => parse('!c!at')).toThrow(new SyntaxError('Unexpected NOT in WORD'))
    })

    it('should throw when using illegal WILDCARD', () => {
        expect(() => parse('hello *')).toThrow(new SyntaxError('Unexpected wildcard, only supported in PHRASE query'))
    })
})
