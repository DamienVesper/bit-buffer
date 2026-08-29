/*
 * MIT License
 *
 * Copyright (c) 2020 bit-buffer developers (https://github.com/inolen/bit-buffer)
 * Copyright (c) 2026 DamienVesper
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { BitView } from "./BitView.ts";

export class BitStream<T extends ArrayBufferLike = ArrayBuffer> {
    protected _view: BitView<T>;
    protected _index = 0;
    protected _startIndex = 0;
    protected _length: number;

    constructor(source: T, byteOffset?: number, byteLength?: number) {
        this._view = new BitView(source, byteOffset, byteLength);
        this._length = this._view.byteLength * 8;
    }

    get index(): number {
        return this._index - this._startIndex;
    }

    set index(val: number) {
        this._index = val + this._startIndex;
    }

    get length(): number {
        return this._length - this._startIndex;
    }

    set length(val: number) {
        this._length = val + this._startIndex;
    }

    get bitsLeft(): number {
        return this._length - this._index;
    }

    get byteIndex(): number {
        // Ceil the returned value, overcompensating for the number of bits written to the stream.
        return Math.ceil(this._index / 8);
    }

    set byteIndex(val: number) {
        this._index = val * 8;
    }

    get buffer(): T {
        return this._view.buffer;
    }

    get view(): BitView<T> {
        return this._view;
    }

    readBits(bits: number, signed?: boolean): number {
        const val = this._view.getBits(this._index, bits, signed);
        this._index += bits;

        return val;
    }

    writeBits(value: number, bits: number): void {
        this._view.setBits(this._index, value, bits);
        this._index += bits;
    }

    declare readBoolean: () => boolean;
    declare readInt8: () => number;
    declare readInt16: () => number;
    declare readInt32: () => number;
    declare readUint8: () => number;
    declare readUint16: () => number;
    declare readUint32: () => number;
    declare readFloat32: () => number;
    declare readFloat64: () => number;

    declare writeBoolean: (value: boolean) => void;
    declare writeInt8: (value: number) => void;
    declare writeInt16: (value: number) => void;
    declare writeInt32: (value: number) => void;
    declare writeUint8: (value: number) => void;
    declare writeUint16: (value: number) => void;
    declare writeUint32: (value: number) => void;
    declare writeFloat32: (value: number) => void;
    declare writeFloat64: (value: number) => void;

    readASCIIString(bytes?: number): string {
        return readString(this, bytes, false);
    }

    readUTF8String(bytes?: number): string {
        return readString(this, bytes, true);
    }

    writeASCIIString(string: string, bytes?: number): void {
        const length = bytes || string.length + 1; // + 1 for NULL

        for (let i = 0; i < length; i++) this.writeUint8(i < string.length ? string.charCodeAt(i) : 0x00);
    }

    writeUTF8String(string: string, bytes?: number): void {
        const byteArray = encoder.encode(string);

        const length = bytes || byteArray.length + 1; // + 1 for NULL
        for (let i = 0; i < length; i++) this.writeUint8(i < byteArray.length ? byteArray[i] : 0x00);
    }
}

BitStream.prototype.readBoolean = reader("getBoolean", 1);
BitStream.prototype.readInt8 = reader("getInt8", 8);
BitStream.prototype.readInt16 = reader("getInt16", 16);
BitStream.prototype.readInt32 = reader("getInt32", 32);
BitStream.prototype.readUint8 = reader("getUint8", 8);
BitStream.prototype.readUint16 = reader("getUint16", 16);
BitStream.prototype.readUint32 = reader("getUint32", 32);
BitStream.prototype.readFloat32 = reader("getFloat32", 32);
BitStream.prototype.readFloat64 = reader("getFloat64", 64);

BitStream.prototype.writeBoolean = writer("setBoolean", 1);
BitStream.prototype.writeInt8 = writer("setInt8", 8);
BitStream.prototype.writeInt16 = writer("setInt16", 16);
BitStream.prototype.writeInt32 = writer("setInt32", 32);
BitStream.prototype.writeUint8 = writer("setUint8", 8);
BitStream.prototype.writeUint16 = writer("setUint16", 16);
BitStream.prototype.writeUint32 = writer("setUint32", 32);
BitStream.prototype.writeFloat32 = writer("setFloat32", 32);
BitStream.prototype.writeFloat64 = writer("setFloat64", 64);

type StreamTypes = "Boolean" | "Int8" | "Int16" | "Int32" | "Uint8" | "Uint16" | "Uint32" | "Float32" | "Float64";

type GetFn = `get${StreamTypes}`;
type SetFn = `set${StreamTypes}`;

function reader<Name extends GetFn, T extends ArrayBufferLike = ArrayBuffer>(name: Name, size: number) {
    return function (this: BitStream<T>) {
        if (this._index + size > this._length) throw new Error("Trying to read past the end of the stream");

        const val = this._view[name](this._index);
        this._index += size;
        return val as ReturnType<BitView[Name]>;
    };
}

function writer<Name extends SetFn>(name: SetFn, size: number) {
    return function (this: BitStream, value: Parameters<BitView[Name]>[1]) {
        (this._view[name] as (index: number, v: typeof value) => void)(this._index, value);
        this._index += size;
    };
}

function readString<T extends ArrayBufferLike = ArrayBuffer>(
    stream: BitStream<T>,
    bytes?: number,
    utf8?: boolean
): string {
    if (bytes === 0) return "";

    let i = 0;
    const chars: number[] = [];
    let append = true;
    const fixedLength = !!bytes;
    if (!bytes) bytes = Math.floor((stream.length - stream.index) / 8);

    // Read while we still have space available, or until we've
    // hit the fixed byte length passed in.
    while (i < bytes) {
        const c = stream.readUint8();

        // Stop appending chars once we hit 0x00.
        if (c === 0x00) {
            append = false;

            // If we don't have a fixed length to read, break out now.
            if (!fixedLength) break;
        }

        if (append) chars.push(c);
        i++;
    }

    if (utf8) return decoder.decode(new Uint8Array(chars));
    return String.fromCharCode.apply(null, chars);
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();
