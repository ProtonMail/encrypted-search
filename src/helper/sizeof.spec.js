import sizeof from './sizeof'

describe('sizeof', () => {
    it('should get sizeof for string', () => {
        expect(sizeof('str')).toBe(2 * 3)
    })

    it('should get sizeof for number', () => {
        expect(sizeof(552)).toBe(8)
    })

    it('should get sizeof for array', () => {
        expect(sizeof(['str', 552])).toBe(8 + 6)
    })

    it('should get sizeof for object', () => {
        expect(sizeof({ 'str': 552 })).toBe(8 + 6)
    })

    it('should get sizeof for typed array', () => {
        expect(sizeof(new ArrayBuffer(32))).toBe(32)
        expect(sizeof(new Uint8Array(32))).toBe(32)
        expect(sizeof(new Int32Array(32))).toBe(128)
    })
})
