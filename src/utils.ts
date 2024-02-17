import type { BitStream } from './BitStream';

const readString = (stream: BitStream, length: number, index: number, utf8: boolean, bytes?: number): string => {
    if (bytes === 0) return ``;

    let i = 0;
    const chars: Array<number | boolean> = [];

    let append = true;
    const fixedLength = Boolean(bytes);

    if (bytes === undefined) bytes = Math.floor(length - index);

    // Read while space is still available, or until parser has hit the fixed byte length.
    while (i < bytes) {
        const c = stream.readUint8();

        // Stop appending chars once parser hits 0x00.
        if (c === 0x00) {
            append = false;

            // If there is no fixed length to read, break out of the loop.
            if (!fixedLength) break;
        }

        if (append) chars.push(c);
        i++;
    }

    const string = String.fromCharCode.apply(null, chars);
    if (utf8) {
        try {
            return decodeURIComponent(escape(string));
        } catch (err) {
            console.warn(err);
            return string;
        }
    } else return string;
};

/**
 * Converts a unicode string to a byte array.
 * @param str The string to convert.
 * @link https://gist.github.com/volodymyr-mykhailyk/2923227
 */
export const stringToByteArray = (str: string): number[] => {
    const b: number[] = [];
    let unicode: number;

    for (let i = 0; i < str.length; i++) {
        unicode = str.charCodeAt(i);

        if (unicode <= 0x7f) {
            // 0x00000000 - 0x0000007f -> 0xxxxxxx
            b.push(unicode);
        } else if (unicode <= 0x7ff) {
            // 0x00000080 - 0x000007ff -> 110xxxxx 10xxxxxx
            b.push((unicode >> 6) | 0xc0);
            b.push((unicode & 0x3F) | 0x80);
        } else if (unicode <= 0xffff) {
            // 0x00000800 - 0x0000ffff -> 1110xxxx 10xxxxxx 10xxxxxx
            b.push((unicode >> 12) | 0xe0);
            b.push(((unicode >> 6) & 0x3f) | 0x80);
            b.push((unicode & 0x3f) | 0x80);
        } else {
            // 0x00010000 - 0x001fffff -> 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
            b.push((unicode >> 18) | 0xf0);
            b.push(((unicode >> 12) & 0x3f) | 0x80);
            b.push(((unicode >> 6) & 0x3f) | 0x80);
            b.push((unicode & 0x3f) | 0x80);
        }
    }

    return b;
};

export const readASCIIString = (stream: BitStream, length: number, index: number, bytes?: number): string => readString(stream, length, index, false, bytes);
export const readUTF8String = (stream: BitStream, length: number, index: number, bytes?: number): string => readString(stream, length, index, true, bytes);

export const writeASCIIString = (stream: BitStream, string: string, bytes?: number): void => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const length = (bytes ?? 0) || string.length + 1; // +1 for null.

    for (let i = 0; i < length; i++) {
        stream.writeUint8(i < string.length ? string.charCodeAt(i) : 0x00);
    }
};

export const writeUTF8String = (stream: BitStream, string: string, bytes?: number): void => {
    const byteArray = stringToByteArray(string);

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const length = (bytes ?? 0) || byteArray.length + 1; // +1 for null.

    for (let i = 0; i < length; i++) {
        stream.writeUint8(i < byteArray.length ? byteArray[i] : 0x00);
    }
};
