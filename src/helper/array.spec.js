import {
    unique,
    flatten,
    intersect,
    union,
    contains,
    proximity,
    ordered,
    quorom,
    insertIntoGapsArray, removeFromGapsArray
} from './array'

describe('array', () => {
    it('should flatten an array', () => {
        expect(flatten([[1, 2, 3], [4, 5, 6]])).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('should only take unique items', () => {
        expect(unique([1, 1, 2, 2, 3, 4])).toEqual([1, 2, 3, 4])
    })

    it('should not find a subarray', () => {
        expect(contains(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(-1)
        expect(contains(['a'], ['b', 'c', 'd'])).toEqual(-1)
        expect(contains(['a'], [])).toEqual(-1)
        expect(contains(['a', 'b', 'a'], ['a', 'a'])).toEqual(-1)
    })

    it('should find a subarray', () => {
        expect(contains(['a', 'b', 'c'], ['b', 'c'])).toEqual(1)
        expect(contains(['a', 'a', 'a'], ['a', 'a'])).toEqual(0)
    })

    it('should find a subarray with wildcards', () => {
        const cb = (a, b) => a === b || b === '*'
        expect(contains(['foo', 'a', 'b', 'c', 'bar'], ['*', 'c'], cb)).toEqual(2)
    })

    it('should union two arrays uniquely', () => {
        const a = [{ id: 1 }, { id: 2 }]
        const b = [{ id: 1 }, { id: 3 }]
        const cb = (a, b) => a.id === b.id
        expect(union(a, b, cb)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })

    it('should intersect two arrays', () => {
        const a = [{ id: 1 }, { id: 2 }]
        const b = [{ id: 1 }, { id: 3 }]
        const cb = (a, b) => a.id === b.id
        expect(intersect(a, b, cb)).toEqual([{ id: 1 }])
    })

    it('should intersect two arrays uniquely', () => {
        const a = [{ id: 1 }, { id: 1 }, { id: 2 }, { id: 1 }]
        const b = [{ id: 1 }, { id: 3 }, { id: 2 }, { id: 1 }, { id: 2 }]
        const cb = (a, b) => a.id === b.id
        expect(intersect(a, b, cb)).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('should intersect and transform', () => {
        const a = [{ id: 1, result: ['abc', 'def'] }, { id: 2 },]
        const b = [{ id: 1, result: ['def', 'fgh'] },]
        const comparator = (a, b) => a.id === b.id
        const transformer = (a, { result = [] }) => ({
            ...a,
            result: a.result.concat(result)
        })
        expect(intersect(a, b, comparator, transformer))
            .toEqual([{ id: 1, result: ['abc', 'def', 'def', 'fgh'] }])
    })

    it('should union and transform', () => {
        const comparator = (a, b) => a.id === b.id
        const transformer = (a, { result = [] } = {}) => ({
            ...a,
            result: a.result.concat(result)
        })
        const a = [{ id: 1, result: ['abc', 'def'] }, { id: 2, result: ['123'] }]
        const b = [{ id: 1, result: ['cde', 'fgh'] }]
        expect(union(a, b, comparator, transformer))
            .toEqual([{ id: 1, result: ['abc', 'def', 'cde', 'fgh'] }, { id: 2, result: ['123'] }])

    })

    it('should return true if one item is before', () => {
        expect(ordered(['aaa', 'bbb', 'ccc'], ['aaa'], ['bbb'])).toBeTruthy()
    })

    it('should return true if one item is before and the other is not', () => {
        expect(ordered(['aaa', 'bbb', 'ccc', 'eee'], ['ccc', 'aaa'], ['bbb'])).toBeTruthy()
        expect(ordered(['aaa', 'bbb', 'ccc', 'eee'], ['aaa', 'ccc'], ['bbb'])).toBeTruthy()
    })

    it('should return false if no item is before', () => {
        expect(ordered(['aaa', 'bbb', 'ccc', 'eee'], ['ccc', 'eee'], ['aaa', 'bbb'])).toBeFalsy()
        expect(ordered(['aaa', 'bbb', 'ccc', 'eee'], ['eee', 'ccc', 'bbb'], ['aaa'])).toBeFalsy()
        expect(ordered(['aaa', 'bbb', 'ccc', 'eee'], [], ['aaa'])).toBeFalsy()
        expect(ordered(['aaa', 'bbb', 'ccc', 'eee'], ['aaa'], [])).toBeFalsy()
    })

    it('should find proximity', () => {
        expect(proximity(['cat', 'aaa', 'dog', 'mouse'], ['mouse'], 1)).toBeTruthy()
        expect(proximity(['cat', 'aaa', 'dog', 'mouse'], ['mouse', 'cat', 'dog'], 2)).toBeTruthy()
        expect(proximity(['cat', 'aaa', 'dog', 'mouse', 'bbb'], ['cat', 'dog', 'mouse'], 2)).toBeTruthy()
        expect(proximity(['cat', 'aaa', 'bbb', 'ccc', 'dog', 'eee', 'fff', 'mouse'], ['cat', 'dog', 'mouse'], 6)).toBeTruthy()
    })

    it('should not find proximity', () => {
        expect(proximity(['cat', 'aaa', 'dog', 'mouse'], ['cat', 'dog', 'mouse'], 1)).toBeFalsy()
        expect(proximity(['cat', 'aaa', 'bbb', 'ccc', 'dog', 'eee', 'fff', 'mouse'], ['cat', 'dog', 'mouse'], 5)).toBeFalsy()
    })

    it('should find quorom', () => {
        expect(quorom(['cat', 'dog', 'mouse'], ['cat', 'dog'], 1)).toBeTruthy()
        expect(quorom(['cat', 'dog', 'mouse'], ['cat', 'dog'], 2)).toBeTruthy()
    })

    it('should not find quorom', () => {
        expect(quorom(['cat', 'dog', 'mouse'], ['cat', 'dog'], 3)).toBeFalsy()
        expect(quorom(['cat', 'dog', 'mouse'], ['cat', 'dog', 'aaa'], 3)).toBeFalsy()
    })

    it('should insert into gaps array', () => {
        expect(insertIntoGapsArray([], 2)).toEqual([2])
        expect(insertIntoGapsArray([2], 1)).toEqual([1, 1])
        expect(insertIntoGapsArray([2], 3)).toEqual([2, 1])
        expect(insertIntoGapsArray([2, 3], 3)).toEqual([2, 1, 2])
        expect(insertIntoGapsArray([5, 5, 10, 10, 20], 25)).toEqual([5, 5, 10, 5, 5, 20])
        expect(insertIntoGapsArray([5, 5, 10, 10, 20], 6)).toEqual([5, 1, 4, 10, 10, 20])

        expect(insertIntoGapsArray([2, 3], 2)).toBeUndefined()
        expect(insertIntoGapsArray([2, 5], 2)).toBeUndefined()
    })

    it('should remove from gaps array', () => {
        expect(removeFromGapsArray([2, 1, 1], 3)).toEqual([2, 2])
        expect(removeFromGapsArray([2], 2)).toEqual([])
        expect(removeFromGapsArray([2, 1], 3)).toEqual([2])
        expect(removeFromGapsArray([2, 3, 1], 6)).toEqual([2, 3])
        expect(removeFromGapsArray([5, 5, 10, 10, 20], 5)).toEqual([10, 10, 10, 20])
        expect(removeFromGapsArray([2, 3], 3)).toBeUndefined()
    })
})
