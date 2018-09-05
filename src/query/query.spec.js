import { create as createIndex, tokenize, query, parse } from '../index.esm'
import createEncryptionHelper, { transformer } from '../../example/helper/encryptionHelper'

const indexKey = new Uint8Array(32)
const indexSalt = new Uint8Array(32)

const encryptionHelper = createEncryptionHelper(indexKey, indexSalt)
const createTransformer = transformer(encryptionHelper)

describe('query', () => {
    const getIndex = () => createIndex({ createTransformer })

    let index

    beforeAll(async () => {
        index = await getIndex()

        await index.store('123', tokenize('hello world!'))
        await index.store('124', tokenize('cat aaa bbb ccc mouse ddd dog'))
        await index.store('125', tokenize('cat aaa bbb mouse ccc dog'))
        await index.store('126', tokenize('cat aaa mouse bbb dog'))
        await index.store('127', tokenize('cat aaa mouse dog'))
        await index.store('128', tokenize('aaa mouse cat'))
        await index.store('129', tokenize('hello'))

        await index.store('200', tokenize('1 2 3 4 5 6 7', 0))
        await index.store('201', tokenize('1 4 5 7', 0))
        await index.store('202', tokenize('5 6 7 1 2 3 4', 0))
        await index.store('203', tokenize('7 6 5 4 3 2 1', 0))
        await index.store('204', tokenize('1 2 3 4 5 6 7 8 9 10', 0))
        await index.store('205', tokenize('1 2 3 4 5 6 7 10 9 8', 0))
        await index.store('206', tokenize('11 12 13 14 15 16', 0))
        await index.store('207', tokenize('12 13 14 15 16', 0))

        await index.store('300', tokenize('Achilles catches the tortoise', 0))
        await index.store('301', tokenize('Tortoise caught by Achilles', 0))
        await index.store('302', tokenize('Achilles caught the green tortoise', 0))
        await index.store('303', tokenize('rock paper scissor', 0))
        await index.store('304', tokenize('rock paper etc scissor', 0))
    })

    afterAll(async () => {
        await index.clear()
        index.close()
    })

    const mapIds = (result = []) => result.map(({ id }) => id)

    const search = async (string) => mapIds(await query(index.search, index.wildcard, parse(string)))

    it('should return results for a simple word', async () => {
        expect(await search('hello'))
            .toEqual(['123', '129'])
    })

    it('should return results for a wildcard query', async () => {
        expect(await search('he*'))
            .toEqual(['123', '129'])
    })

    it('should return results for a wildcard query with AND', async () => {
        expect(await search('ro* *sso*'))
            .toEqual(['303', '304'])
    })

    it('should return results for a wildcard query with OR', async () => {
        expect(await search('to* | *ell*'))
            .toEqual(['300', '301', '302', '123', '129'])
    })

    it('should return results for a AND query', async () => {
        expect(await search('hello world'))
            .toEqual(['123'])
    })

    it('should return results for a AND NOT query', async () => {
        expect(await search('hello !world'))
            .toEqual(['129'])
    })

    it('should return results for a AND NOT query with wildcard', async () => {
        expect(await search('he* !wor*'))
            .toEqual(['129'])
    })

    it('should return results for keyword modifiers query', async () => {
        expect(await search('^hello$'))
            .toEqual(['129'])
        expect(await search('^aaa'))
            .toEqual(['128'])
        expect(await search('cat$'))
            .toEqual(['128'])
    })

    it('should return results for a OR query', async () => {
        expect(await search('hello | cat'))
            .toEqual(['123', '129', '124', '125', '126', '127', '128'])
    })

    it('should return results for a PHRASE query with single wildcard', async () => {
        expect(await search('"cat * mouse"'))
            .toEqual(['126', '127'])
    })

    it('should return results for a PHRASE query with wildcard', async () => {
        expect(await search('"ca* * *mou*"'))
            .toEqual(['126', '127'])
    })

    it('should return results for a PHRASE query with phrase modifier', async () => {
        expect(await search('"^he*$"'))
            .toEqual(['129'])
        expect(await search('"^hello$"'))
            .toEqual(['129'])
        expect(await search('"^5 6"'))
            .toEqual(['202'])
        expect(await search('"6 7$"'))
            .toEqual(['200'])
        expect(await search('"^12 13 14 15 16$"'))
            .toEqual(['207'])
    })

    it('should return results for a PHRASE query', async () => {
        expect(await search('"cat aaa mouse"'))
            .toEqual(['126', '127'])
    })

    it('should return results for a PROXIMITY query', async () => {
        expect(await search('"achilles tortoise"~3'))
            .toEqual(['300', '301'])
        expect(await search('"rock paper scissor"~1'))
            .toEqual(['303'])
    })

    it('should return results for a QUOROM query', async () => {
        expect(await search('"achilles tortoise"/2'))
            .toEqual(['300', '301', '302'])
    })

    it('should return empty results for a QUOROM query', async () => {
        expect(await search('"achilles tortoise rock"/3'))
            .toEqual([])
    })

    it('should return results for a BEFORE and PHRASE query', async () => {
        expect(await search('cat << "aaa mouse"'))
            .toEqual(['126', '127'])
    })

    it('should return results for a BEFORE and PHRASE query with wildcard', async () => {
        expect(await search('ca* << "aa* *ous*"'))
            .toEqual(['126', '127'])
    })

    it('should return results for a PHRASE and BEFORE query', async () => {
        expect(await search('"aaa mouse" << dog'))
            .toEqual(['126', '127'])
    })

    it('should return results for a BEFORE query', async () => {
        expect(await search('mouse << bbb'))
            .toEqual(['126'])
        expect(await search('mouse << cat'))
            .toEqual(['128'])
    })

    it('should return results for a complex BEFORE query', async () => {
        expect(await search('1 << 4 << 5 << (6 | 7)'))
            .toEqual(['200', '201', '204', '205'])
    })

    it('should return results for a complex query', async () => {
        expect(await search('1 << ((4 << (5 << ((6 !10) | (7 !10) | "8 9 10"))))'))
            .toEqual(['200', '201', '204'])
        expect(await search('(1 << 4 << 5) << ((6 !10)| (7 !10) | "8 9 10")'))
            .toEqual(['200', '201', '204'])
    })

    it('should return results for a OR, keyword and AND query', async () => {
        expect(await search('hello | (cat ddd)'))
            .toEqual(['123', '129', '124'])
    })

    it('should return results for a OR, AND and AND query', async () => {
        expect(await search('(hello world) | (cat ddd)'))
            .toEqual(['123', '124'])
    })

    it('should return empty results for a AND and AND query', async () => {
        expect(await search('hello world cat ddd'))
            .toEqual([])
    })

    it('should return results for a AND, AND and OR query', async () => {
        expect(await search('cat ddd (cat | ddd)'))
            .toEqual(['124'])
    })
})
