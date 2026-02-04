/**
 * Latin to Thaana transliteration utility
 * Handles phonetic mapping for Dhivehi input
 */

const latinToThaanaMap: Record<string, string> = {
    'a': 'ަ', 'b': 'ބ', 'c': 'ޗ', 'd': 'ދ', 'e': 'ެ', 'f': 'ފ', 'g': 'ގ',
    'h': 'ހ', 'i': 'ި', 'j': 'ޖ', 'k': 'ކ', 'l': 'ލ', 'm': 'މ', 'n': 'ނ',
    'o': 'ޮ', 'p': 'ޕ', 'q': 'ް', 'r': 'ރ', 's': 'ސ', 't': 'ތ', 'u': 'ު',
    'v': 'ވ', 'w': 'އ', 'x': 'ޘ', 'y': 'ޔ', 'z': 'ޒ',
    'A': 'ާ', 'B': 'ޞ', 'C': 'ޝ', 'D': 'ޑ', 'E': 'ޭ', 'F': 'ﷲ', 'G': 'ޣ', 'H': 'ޙ',
    'I': 'ީ', 'J': 'ޛ', 'K': 'ޚ', 'L': 'ޅ', 'M': 'ޟ', 'N': 'ޏ', 'O': 'ޯ', 'P': '',
    'Q': 'ޤ', 'R': 'ޜ', 'S': 'ށ', 'T': 'ޓ', 'U': 'ޫ', 'V': 'ޥ', 'W': 'ޢ', 'X': 'ޘ',
    'Y': 'ޠ', 'Z': 'ޡ',
}

// User specified 'P': '', so it will be consumed and result in no output.

export function latinToThaana(text: string): string {
    let result = ''
    for (const char of text) {
        if (char in latinToThaanaMap) {
            result += latinToThaanaMap[char]
        } else {
            result += char
        }
    }
    return result
}