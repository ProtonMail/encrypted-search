/**
 * Get the unique value
 * Example: ['toto', 'toto'].filter(onlyUnique)
 * Return: ['toto']
 */
const unique = (value, index, self) => self.indexOf(value) === index
export const onlyUnique = (array = []) => array.filter(unique)

/**
 * Helper to not import lodash in the web worker
 * Example: flatten([1, [2, [3, [4]], 5]])
 * => [1, 2, [3, [4]], 5]
 * @param {Array} array
 * @return {Array}
 */
export const flatten = (array = []) => Array.prototype.concat(...array)
