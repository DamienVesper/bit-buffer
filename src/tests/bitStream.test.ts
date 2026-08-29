/*
 * boom2d (https://github.com/leia-uwu/boom2d)
 * Copyright (C) 2026 leia-uwu
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { expect, test } from "bun:test";

import { BitStream } from "../BitStream.ts";

test("Byte-aligned Unsigned Integers", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeUint8(99);
    stream.writeUint16(999);
    stream.writeUint32(9999);

    stream.index = 0;

    expect(stream.readUint8()).toBe(99);
    expect(stream.readUint16()).toBe(999);
    expect(stream.readUint32()).toBe(9999);
});

test("Byte-aligned Signed Integers", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeInt8(-99);
    stream.writeInt16(-999);
    stream.writeInt32(-9999);

    stream.index = 0;

    expect(stream.readInt8()).toBe(-99);
    expect(stream.readInt16()).toBe(-999);
    expect(stream.readInt32()).toBe(-9999);
});

test("Non-byte-aligned Unsigned Integers", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeBits(9, 5);
    stream.writeUint8(99);
    stream.writeBits(99, 10);
    stream.writeUint16(999);
    stream.writeBits(999, 20);
    stream.writeUint32(9999);

    stream.index = 0;

    expect(stream.readBits(5)).toBe(9);
    expect(stream.readUint8()).toBe(99);
    expect(stream.readBits(10)).toBe(99);
    expect(stream.readUint16()).toBe(999);
    expect(stream.readBits(20)).toBe(999);
    expect(stream.readUint32()).toBe(9999);
});

test("Non-byte-aligned Signed Integers", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeBits(-9, 5);
    stream.writeInt8(-99);
    stream.writeBits(-99, 10);
    stream.writeInt16(-999);
    stream.writeBits(-999, 20);
    stream.writeInt32(-9999);

    stream.index = 0;

    expect(stream.readBits(5, true)).toBe(-9);
    expect(stream.readInt8()).toBe(-99);
    expect(stream.readBits(10, true)).toBe(-99);
    expect(stream.readInt16()).toBe(-999);
    expect(stream.readBits(20, true)).toBe(-999);
    expect(stream.readInt32()).toBe(-9999);
});

function equalAbs(a: number, b: number): boolean {
    return Math.abs(a - b) < 0.00001;
}

test("Floating-point Values", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeFloat32(69.42);
    stream.writeFloat64(Math.PI);

    stream.index = 0;

    expect(equalAbs(stream.readFloat32(), 69.42)).toBe(true);
    expect(stream.readFloat64()).toBe(Math.PI);
});

test("ASCII Strings", () => {
    const stream = new BitStream(new ArrayBuffer(100));
    const str = "bananas123";

    stream.writeASCIIString(str);
    stream.index = 0;

    expect(stream.readASCIIString()).toBe(str);
});

test("UTF-8 Strings", () => {
    const stream = new BitStream(new ArrayBuffer(100));
    const str = "bananas123 🏳️‍⚧️ 🏳️‍🌈 💜";

    stream.writeUTF8String(str);
    stream.index = 0;

    expect(stream.readUTF8String()).toBe(str);
});
