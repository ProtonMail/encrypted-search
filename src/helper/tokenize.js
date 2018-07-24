import latenize from 'latenize'

/**
 * Turn a string of words into tokens. All characters in the tokens are lowercased and normalized in their latin form.
 * NOTE: string.normalize is not supported by IE https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
 * so using a lookup table through latenize.
 * Transforms e.g. 'foo bàr' to ['foo', 'bar']
 * @param  {String} content
 * @return {Array}
 */
export default (content = '') =>
    latenize(content)
        .toLowerCase()
        .replace(/[!"#()%<>:;{}[\]/\\|?.,'`´*¨^]/g, ' ')
        .split(/[\s]+/)
        .map((s = '') => s.trim())
        .filter((s) => s.length > 1)
