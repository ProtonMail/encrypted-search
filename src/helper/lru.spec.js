import createLru from './lru'

describe('lru', () => {
    it('should set and get', () => {
        const lru = createLru()
        lru.set('a', 'woot')
        expect(lru.get('a')).toBe('woot')
    })

    it('should evict', () => {
        const lru = createLru({ max: 2 })
        lru.set('a', 'woot')
        lru.set('b', 'b')
        lru.set('c', 'c')
        expect(lru.get('a')).toBeUndefined()
        expect(lru.get('b')).toBe('b')
        expect(lru.get('c')).toBe('c')
    })

    it('should set', () => {
        const lru = createLru({ max: 3 })
        lru.set('a', 'a')
        lru.set('b', 'b')
        lru.set('b', 'b')
        lru.set('b', 'b')
        lru.set('b', 'b')
        lru.set('b', 'b')
        lru.set('b', 'b')
        lru.set('c', 'c')
        lru.set('b', 'b')
        lru.set('c', 'c')
        lru.set('b', 'b')
        lru.set('b', 'b')
        lru.set('d', 'd')
        lru.set('d', 'd')
        lru.set('d', 'd')
        lru.set('d', 'd')
        expect(lru.get('a')).toBeUndefined()
        expect(lru.get('b')).toBe('b')
        expect(lru.get('c')).toBe('c')
        expect(lru.get('d')).toBe('d')
    })
})
