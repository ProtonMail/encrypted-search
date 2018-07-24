import createIndex from '../src/index'
import createEncryptionHelper from './helper/encryptionHelper'

const key = new Uint8Array(32)
const salt = new Uint8Array(32)

const init = async () => {
    const encryptionHelper = createEncryptionHelper(key, salt)
    const index = await createIndex({ encryptionHelper })
    await index.store('123', ['abc'], { hej: true })
    const results = await index.search(['abc'])
    console.log(results)
}

document.addEventListener('DOMContentLoaded', init)
