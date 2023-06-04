import { BitView } from './bit-buffer/BitView';
import {
    readASCIIString,
    readUTF8String,
    writeASCIIString,
    writeUTF8String
} from './utils';

/**
 * Small wrapper for a BitView to maintain position,
 * as well as to handle reading / writing of string data
 * to the underlying buffer.
 */
class BitStream {
    private readonly _view: BitView;

    private _startIndex: number;
    _length: number;
    _index: number;

    constructor (source: ArrayBuffer | Buffer | BitView, byteOffset?: number, byteLength?: number) {
        const isBuffer = source instanceof ArrayBuffer ||
            (typeof Buffer !== `undefined` && source instanceof Buffer);

        if (!(source instanceof BitView) && !isBuffer) {
            throw new Error(`Must specify a valid BitView, ArrayBuffer or Buffer`);
        }

        byteOffset = byteOffset ?? 0;
        byteLength = byteLength ?? ((source instanceof ArrayBuffer || source instanceof BitView) ? source.byteLength : source.length);

        this._view = !(source instanceof BitView)
            ? new BitView(source, byteOffset, byteLength)
            : source;

        this._index = 0;
        this._startIndex = 0;
        this._length = this._view.byteLength * 8;
    }

    get index (): number {
        return this._index - this._startIndex;
    }

    set index (val: number) {
        this._index = val + this._startIndex;
    }

    get length (): number {
        return this._length - this._startIndex;
    }

    set length (val: number) {
        this._length = val + this._startIndex;
    }

    get bitsLeft (): number {
        return this._length - this._index;
    }

    get byteIndex (): number {
        return Math.ceil(this._index / 8);
    }

    set byteIndex (val: number) {
        this._index = val * 8;
    }

    get buffer (): Buffer {
        return this._view.buffer;
    }

    get view (): BitView {
        return this._view;
    }

    get bigEndian (): boolean {
        return this._view.bigEndian;
    }

    set bigEndian (val: boolean) {
        this._view.bigEndian = val;
    }

    reader = (name: string, size: number) => (): number => {
        if (this._index + size > this._length) {
            throw new Error(`Trying to read past the end of the stream`);
        }

        const val = this._view[name](this._index);

        this._index += size;
        return val;
    };

    writer = (name: string, size: number) => (value: number): void => {
        this._view[name](this._index, value);
        this._index += size;
    };

    readBits = (bits: number, signed: boolean): number => {
        const val = this._view.getBits(this._index, bits, signed);

        this._index += bits;
        return val;
    };

    writeBits = (value: number, bits: number): void => {
        this._view.setBits(this._index, value, bits);
        this._index += bits;
    };

    readBoolean = this.reader(`getBoolean`, 1);
    readInt8 = this.reader(`getInt8`, 8);
    readInt16 = this.reader(`getInt16`, 16);
    readInt32 = this.reader(`getInt32`, 32);

    readUint8 = this.reader(`getUint8`, 8);
    readUint16 = this.reader(`getUint16`, 16);
    readUint32 = this.reader(`getUint32`, 32);

    readFloat32 = this.reader(`getFloat32`, 32);
    readFloat64 = this.reader(`getFloat64`, 64);

    writeBoolean = this.writer(`setBoolean`, 1);

    writeInt8 = this.writer(`setInt8`, 8);
    writeInt16 = this.writer(`setInt16`, 16);
    writeInt32 = this.writer(`setInt32`, 32);

    writeUint8 = this.writer(`setUint8`, 8);
    writeUint16 = this.writer(`setUint16`, 16);
    writeUint32 = this.writer(`setUint32`, 32);

    writeFloat32 = this.writer(`setFloat32`, 32);
    writeFloat64 = this.writer(`setFloat64`, 64);

    readASCIIString = (bytes: number): string => readASCIIString(this, bytes);
    readUTF8String = (bytes: number): string => readUTF8String(this, bytes);

    writeASCIIString = (string: string, bytes: number): void => {
        writeASCIIString(this, string, bytes);
    };

    writeUTF8String = (string: string, bytes: number): void => {
        writeUTF8String(this, string, bytes);
    };

    readBitStream = (bitLength: number): BitStream => {
        const slice = new BitStream(this._view);
        slice._startIndex = this._index;
        slice._index = this._index;
        slice.length = bitLength;

        this._index += bitLength;
        return slice;
    };

    writeBitStream = (stream: BitStream, length?: number): void => {
        if (length === undefined) length = stream.bitsLeft;

        let bitsToWrite: number;
        while (length > 0) {
            bitsToWrite = Math.min(length, 32);
            this.writeBits(stream.readBits(bitsToWrite, false), bitsToWrite);
            length -= bitsToWrite;
        }
    };

    readArrayBuffer = (byteLength: number): ArrayBuffer => {
        const buffer = this._view.getArrayBuffer(this._index, byteLength);

        this._index += (byteLength * 8);
        return buffer;
    };

    writeArrayBuffer = (buffer: Buffer, byteLength: number): void => {
        this.writeBitStream(new BitStream(buffer), byteLength * 8);
    };
}

export {
    BitStream
};
