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

import { min } from "./utils/math.ts";

/**
 * Similar to `DataView`, excepts allows bit-level reads/writes rather than byte-level. Internally uses `DataView` for
 * data storage.
 */
export class BitView<T extends ArrayBufferLike = ArrayBuffer> {
    /**
     * `DataView` used to massage floating-point values so that they can be operated upon at the bit level.
     */
    protected static _scratch = new DataView(new ArrayBuffer(8));

    /**
     * The current byte pointed to by the DataView.
     */
    protected _view: Uint8Array<T>;

    /**
     * Create a new `BitView`.
     * @param source The source buffer, must be of type `ArrayBufferLike`.
     * @param byteOffset Optional byte offset.
     * @param byteLength Length of the source buffer.
     */
    constructor(source: T, byteOffset = 0, byteLength = source.byteLength) {
        this._view = new Uint8Array(source, byteOffset, byteLength);
    }

    /**
     * @returns The underlying `Uint8Array`.
     */
    get view(): Uint8Array<T> {
        return this._view;
    }

    /**
     * @returns The underlying `ArrayBufferLike`.
     */
    get buffer(): T {
        return this._view.buffer;
    }

    /**
     * @returns The number of bytes in the `Uint8Array`.
     */
    get byteLength(): number {
        return this._view.length;
    }

    /**
     * Get bits in the `BitView`.
     * @param offset The number of don't care values at the beginning of the index.
     * @param bits The number of bits to read.
     * @param signed Whether to read back as a signed or unsigned integer.
     */
    getBits(offset: number, bits: number, signed = false): number {
        const available = this._view.length * 8 - offset;
        if (bits > available) throw new Error(`Cannot get ${bits} bit(s) [offset ${offset}], ${available} available.`);

        let value = 0;
        for (let i = 0; i < bits;) {
            const remaining = bits - i;
            const bitOffset = offset & 7;
            const currentByte = this._view[offset >> 3];

            // The maximum number of bits we can read from the current byte.
            const max = min(remaining, 8 - bitOffset);

            // Create a mask with the correct bit width.
            const mask = (1 << max) - 1;

            // Shift the bits we want to the start of the byte and mask off the rest.
            const readBits = (currentByte >> bitOffset) & mask;
            value |= readBits << i;

            offset += max;
            i += max;
        }

        if (signed) {
            /**
             * If not working with a full 32 bits, check the imaginary MSB for this bit count and convert to a valid
             * 32-bit signed value if set. The signed value will be in two's complement form (invert all bits and add
             * one).
             */
            if (bits !== 32 && value & (1 << (bits - 1))) value |= -1 ^ ((1 << bits) - 1);
            return value;
        }

        return value >>> 0;
    }

    setBits(offset: number, value: number, bits: number): void {
        const available = this._view.length * 8 - offset;
        if (bits > available) throw new Error(`Cannot set ${bits} bit(s) [offset ${offset}], ${available} available.`);

        for (let i = 0; i < bits;) {
            let wrote: number;

            // Write an entire byte, if possible.
            if (bits - i >= 8 && (offset & 7) === 0) {
                this._view[offset >> 3] = value & 0xff;
                wrote = 8;
            } else {
                const remaining = bits - i;
                const bitOffset = offset & 7;
                const byteOffset = offset >> 3;

                wrote = min(remaining, 8 - bitOffset);

                // Create a mask with the correct bit width.
                const mask = ~(0xff << wrote);

                // Shift the bits we want to the start of the byte and mask off the rest.
                const writeBits = value & mask;

                // Destination mask to zero all the bits we are changing.
                const destMask = ~(mask << bitOffset);
                this._view[byteOffset] = (this._view[byteOffset] & destMask) | (writeBits << bitOffset);
            }

            value >>= wrote;
            offset += wrote;
            i += wrote;
        }
    }

    getBoolean(offset: number): boolean {
        return this.getBits(offset, 1, false) !== 0;
    }

    getInt8(offset: number): number {
        return this.getBits(offset, 8, true);
    }

    getInt16(offset: number): number {
        return this.getBits(offset, 16, true);
    }

    getInt32(offset: number): number {
        return this.getBits(offset, 32, true);
    }

    getUint8(offset: number): number {
        return this.getBits(offset, 8, false);
    }

    getUint16(offset: number): number {
        return this.getBits(offset, 16, false);
    }

    getUint32(offset: number): number {
        return this.getBits(offset, 32, false);
    }

    getFloat32(offset: number): number {
        BitView._scratch.setUint32(0, this.getUint32(offset));
        return BitView._scratch.getFloat32(0);
    }

    getFloat64(offset: number): number {
        BitView._scratch.setUint32(0, this.getUint32(offset));
        BitView._scratch.setUint32(4, this.getUint32(offset + 32));

        return BitView._scratch.getFloat64(0);
    }

    setBoolean(offset: number, value: boolean): void {
        this.setBits(offset, value ? 1 : 0, 1);
    }

    setInt8(offset: number, value: number): void {
        this.setBits(offset, value, 8);
    }

    setInt16(offset: number, value: number): void {
        this.setBits(offset, value, 16);
    }

    setInt32(offset: number, value: number): void {
        this.setBits(offset, value, 32);
    }

    setUint8(offset: number, value: number): void {
        this.setBits(offset, value, 8);
    }

    setUint16(offset: number, value: number): void {
        this.setBits(offset, value, 16);
    }

    setUint32(offset: number, value: number): void {
        this.setBits(offset, value, 32);
    }

    setFloat32(offset: number, value: number): void {
        BitView._scratch.setFloat32(0, value);
        this.setBits(offset, BitView._scratch.getUint32(0), 32);
    }

    setFloat64(offset: number, value: number): void {
        BitView._scratch.setFloat64(0, value);

        this.setBits(offset, BitView._scratch.getUint32(0), 32);
        this.setBits(offset + 32, BitView._scratch.getUint32(4), 32);
    }
}
