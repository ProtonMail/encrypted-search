# encrypted-search

This library provides encrypted-search functionality for the browser.

The library requires the the support of Promises, async/await, modules, and IndexedDB

## Browser support
Chrome, Safari, Firefox, Edge, IE11

## Usage

```javascript
import { create, query, parse, tokenize } from 'encrypted-search'

// The encryption helpers. The hash is used for the key name. Encrypt and decrypt for the values.
const transformers = {
    property: (tableId, input) => input
    serialize: (tableId, key, value) => value
    deserialize: (tableId, key, value) => value
}

const index = create({ transformers })

await index.store('123', tokenize('this is a long string that can be searched'))

const searchString = '(this << is & "long string") | can'
const results = await query(index.search, index.wildcard, parse(searchString))
// Returns 
[
  {
    "id": "123",
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
TODO


## Example

Example available in the example/ folder

## Author

Mattias Svanström (@mmso) - ProtonMail
