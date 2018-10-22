import { create, query, parse, tokenize } from '../src/index.esm'
import createEncryptionHelper from './helper/encryptionHelper'

const key = new Uint8Array(32)
const salt = new Uint8Array(32)

const createKeydownHandler = (index, $results) => {
    return async (e) => {
        const { key, target } = e
        if (key !== 'Enter') {
            return
        }
        e.preventDefault()

        const value = target.value
        target.value = ''

        const results = await query(index.search, index.wildcard, parse(value))
        $results.innerHTML = JSON.stringify(results, null, 2)
    }
}

const init = async () => {
    document.body.innerHTML = `
        <input name="input" placeholder="search string, e.g: this"/>
        <div class="results" style="white-space: pre-wrap"></div>
    `

    const transformers = createEncryptionHelper(key, salt)
    const index = create({ transformers })

    await index.store('123', tokenize('this is a long string that can be searched'))
    await index.store('124', tokenize('this is another document that is inserted into the index'))
    await index.store('125', tokenize('this is the last document'))

    const $input = document.body.querySelector('input')
    const $results = document.body.querySelector('.results')

    const onKeydown = createKeydownHandler(index, $results)
    $input.addEventListener('keydown', onKeydown)
    $input.focus()
}

document.addEventListener('DOMContentLoaded', init)
