import latenize from 'latenize'

/**
 * Transform a string into a token.
 * @param content
 * @returns {string}
 */
export const transform = (content = '') =>
    latenize(content)
        .toLowerCase()
        .trim()

/**
 * Turn a string of words into tokens. All characters in the tokens are lowercased and normalized in their latin form.
 * NOTE: string.normalize is not supported by IE https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
 * so using a lookup table through latenize.
 * Transforms e.g. 'foo bàr' to ['foo', 'bar']
 * @param  {String} content
 * @param {Number} len
 * @param {Boolean} stripSpecial
 * @return {Array}
 */
export default (content = '', len = 1, stripSpecial = true) =>
    (stripSpecial ? content.replace(/[!"#()%<>:;{}[\]/\\|?.,'`´*¨°^±≈§∞$£@©€™~–…›‹¸˛]/g, ' ') : content)
        .split(/[\s]+/)
        .map(transform)
        .filter((s) => s.length > len)
