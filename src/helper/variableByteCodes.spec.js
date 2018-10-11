import { vbDecode, vbEncode } from './variableByteCodes'

describe('vb', () => {
    it('should encode 1 bit number', () => {
        expect(vbEncode([1]))
            .toEqual(new Uint8Array([129]))
    })

    it('should encode 32 bit number', () => {
        expect(vbEncode([0b11111111111111111111111111111111]))
            .toEqual(new Uint8Array([7, 127, 127, 127, 127, 129]))
    })

    it('should encode 8 bit number', () => {
        expect(vbEncode([0b11111111]))
            .toEqual(new Uint8Array([1, 255]))
    })

    it('should encode 7 bit number ', () => {
        expect(vbEncode([0b1111111]))
            .toEqual(new Uint8Array([255]))
    })

    const expectDecode = (arr = []) => expect(vbDecode(vbEncode(arr)))
        .toEqual(arr)

    it('should decode and encode numbers correctly', () => {
        expectDecode([128])
        expectDecode([1,128,2,128,3])
        expectDecode([5000, 100, 0])
        expectDecode([4294967295])
        expectDecode([17,1,1,1,1,1,1])
    })

    it('should decode and encode all unsigned 2 exponent numbers up to 51 bits correctly', () => {
        const array = []
        let onebit = 1
        let allbits = 1
        for (let i = 1; i <= 51; ++i) {
            onebit = onebit * 2
            allbits = onebit + (onebit - 1)
            array.push(onebit)
            array.push(allbits)
        }
        expectDecode(array)
    })
})

