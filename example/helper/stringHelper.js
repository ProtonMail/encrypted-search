/**
 * Convert a native javascript string to a string of utf8 bytes
 * @param {String} str The string to convert
 * @returns {String} A valid squence of utf8 bytes
 */
export const encodeUtf8 = (str) => unescape(encodeURIComponent(str))

/**
 * Convert a string of utf8 bytes to a native javascript string
 * @param {String} utf8 A valid squence of utf8 bytes
 * @returns {String} A native javascript string
 */
export const decodeUtf8 = (utf8) => {
    try {
        return decodeURIComponent(escape(utf8))
    } catch (e) {
        return utf8
    }
}
