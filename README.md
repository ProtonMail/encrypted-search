# encrypted-search

This library provides encrypted-search functionality for the browser.

The library requires the the support of Promises, async/await, modules, and IndexedDB

## Browser support
Chrome, Safari, Firefox, Edge, IE11

## Usage

```javascript
import { create, query, parse, tokenize } from 'encrypted-search'

// The encryption helpers. The hash is used for the key name. Encrypt and decrypt for the values.
const hash = (input) => input
const encrypt = (key, value) => value
const decrypt = (key, value) => value

const index = create({ hash, encrypt, decrypt })

await index.store('123', tokenize('this is a long string that can be searched'), { data: { etc: 1 } })

const searchString = '(this << is & "long string") | can'
const results = await query(index.search, index.wildcard, parse(searchString))
// Returns 
[
  {
    "id": "123",
    "data": {
      "data": {
        "etc": 1
      }
    },
    "keywords": [
      "this",
      "is",
      "long",
      "string",
      "that",
      "can",
      "be",
      "searched"
    ],
    "match": [
      "this",
      "is",
      "long",
      "string"
    ]
  }
]

//
index.close()
```

## Query syntax
It has support for multiple search operators.

| Operator       | Example                                                 | Matches documents that|
|-------------|---------------------------------------------------------|-------------------------------------------------------------------|
| AND         | these words must appear / these & words & must & appear | contain all keywords                                         |
| OR          | these &#124; words &#124; can &#124; appear             | contain any keywords                                         |
| PHRASE      | "these words appear in order"                           | contain all keywords in exact order                          |
| NOT         | hello !world                                            | contain hello but not world                                  |
| QUORUM      | "good fast cheap"/2                                     | contain at least 2 keywords                                  |
| PROXIMITY   | "close by"~2                                            | contain all keywords with no less than 2 words between them  |
| BEFORE      | before << after                                         | contain all keywords and in order                            |
| WILDCARD    | af*                                                     | contain the wildcarded keyword                            | 
| COMBINATION | (these words &#124; any o*der) << after                 | fulfil the query in combination                              |

## Default Options

```javascript
{
    dbName: 'index', // 
    dataName: 'data', // The name of the data object store.
    keywordsName: 'keywords', // The name of the keywords object store.
    wildcardsName: 'wildcards', // The name of the wildcards object store.
    metadataName: 'metadata', // The name of the metadata object store.
    closeTimeout: 15000 // Timeout before closing the indexedDB connection.
}
```

## Example

Example available in the example/ folder

## Author

Mattias Svanström (@mmso) - ProtonMail
