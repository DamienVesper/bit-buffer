/**
 * An interface provision to the standard DataView,
 * but with support for bit-level reads / writes.
 */
class BitView {
    private readonly _view: Uint8Array;

    // Used to massage fp values so they can be operated upon at the bit level.
    private readonly _scratch = new DataView(new ArrayBuffer(8));

    bigEndian: boolean;

    constructor (source: ArrayBuffer | Buffer | BitView, byteOffset?: number, byteLength?: number) {
        const isBuffer = source instanceof ArrayBuffer ||
            (typeof Buffer !== `undefined` && source instanceof Buffer);

        if (!isBuffer) {
            throw new Error(`Must specify a valid ArrayBuffer or Buffer`);
        }

        byteOffset = byteOffset ?? 0;
        byteLength = byteLength ?? (source instanceof ArrayBuffer ? source.byteLength : source.length);

        this._view = new Uint8Array(source instanceof Buffer ? source.buffer : source, byteOffset, byteLength);
        this.bigEndian = false;
    }

    get buffer (): Buffer {
        return Buffer?.from(this._view.buffer) ?? this._view.buffer;
    }

    get byteLength (): number {
        return this._view.length;
    }

    private readonly _setBit = (offset: number, on: boolean): void => {
        on
            ? this._view[offset >> 3] |= 1 << (offset & 7)
            : this._view[offset >> 3] &= ~(1 << (offset & 7));
    };

    getBits = (offset: number, bits: number, signed: boolean): number => {
        const available = (this._view.length * 8 - offset);
        if (bits > available) {
            throw new Error(`Cannot get ${bits} bit(s) from offset ${offset}, ${available} available`);
        }

        let value = 0;
        for (let i = 0; i < bits;) {
            const remaining = bits - i;
            const bitOffset = offset & 7;
            const currentByte = this._view[offset >> 3];

            // The maximum number of bits that can be read from the current byte.
            const read = Math.min(remaining, 8 - bitOffset);

            let mask: number;
            let readBits: number;

            if (this.bigEndian) {
                // Create a mask with the correct bit width.
                mask = ~(0xFF << read);

                // Shift the bits wanted to the start of the byte and mask off the rest.
                readBits = (currentByte >> (8 - read - bitOffset)) & mask;

                value <<= read;
                value |= readBits;
            } else {
                // Create a mask with the correct bit width.
                mask = ~(0xFF << read);

                // Shift the bits wanted to the start of the byte and mask off the rest.
                readBits = (currentByte >> bitOffset) & mask;

                value |= readBits << i;
            }

            offset += read;
            i += read;
        }

        if (signed) {
            /**
             * If not working with a full 32 bits, check the
             * imaginary MSB for this bit count and convert to a
             * valid 32-bit signed value, if set.
             */
            if (bits !== 32 && Boolean(value & (1 << bits - 1))) {
                value |= -1 ^ ((1 << bits) - 1);
            }

            return value;
        }

        return value >>> 0;
    };

    setBits = (offset: number, value: number, bits: number): void => {
        const available = (this._view.length * 8 - offset);
        if (bits > available) {
            throw new Error(`Cannot set ${bits} bit(s) from offset ${offset}, ${available} available`);
        }

        for (let i = 0; i < bits;) {
            const remaining = bits - i;
            const bitOffset = offset & 7;
            const byteOffset = offset >> 3;
            const wrote = Math.min(remaining, 8 - bitOffset);

            let mask: number;
            let writeBits: number;
            let destMask: number;

            if (this.bigEndian) {
                // Create a mask with the correct bit width.
                mask = ~(~0 << wrote);

                // Shift the bits wanted to the start of the byte and mask off the rest.
                writeBits = (value >> (bits - i - wrote)) & mask;

                const destShift = 8 - bitOffset - wrote;

                // Destination mask to zero all the bits being changed first.
                destMask = ~(mask << destShift);

                this._view[byteOffset] =
                    (this._view[byteOffset] & destMask) |
                    (writeBits << destShift);
            } else {
                // Create a mask with the correct bit width.
                mask = ~(0xFF << wrote);

                // Shift the bits wanted to the start of the byte and mask off the rest.
                writeBits = value & mask;
                value >>= wrote;

                // Destination mask to zero all the bits being changed first.
                destMask = ~(mask << bitOffset);

                this._view[byteOffset] =
                    (this._view[byteOffset] & destMask) |
                    (writeBits << bitOffset);
            }

            offset += wrote;
            i += wrote;
        }
    };

    getBoolean = (offset: number): boolean => this.getBits(offset, 1, false) !== 0;

    getInt8 = (offset: number): number => this.getBits(offset, 8, true);
    getInt16 = (offset: number): number => this.getBits(offset, 16, true);
    getInt32 = (offset: number): number => this.getBits(offset, 32, true);

    getUint8 = (offset: number): number => this.getBits(offset, 8, false);
    getUint16 = (offset: number): number => this.getBits(offset, 16, false);
    getUint32 = (offset: number): number => this.getBits(offset, 32, false);

    getFloat32 = (offset: number): number => {
        this._scratch.setUint32(0, this.getUint32(offset));
        return this._scratch.getFloat32(0);
    };

    getFloat64 = (offset: number): number => {
        this._scratch.setUint32(0, this.getUint32(offset));

        // DataView offset is in bytes.
        this._scratch.setUint32(4, this.getUint32(offset + 32));
        return this._scratch.getFloat64(0);
    };

    setBoolean = (offset: number, value: boolean): void => {
        this.setBits(offset, value ? 1 : 0, 1);
    };

    setInt8 = (offset: number, value: number): void => {
        this.setBits(offset, value, 8);
    };

    setInt16 = (offset: number, value: number): void => {
        this.setBits(offset, value, 16);
    };

    setInt32 = (offset: number, value: number): void => {
        this.setBits(offset, value, 32);
    };

    setUint8 = this.setInt8;
    setUint16 = this.setInt16;
    setUint32 = this.setInt32;

    setFloat32 = (offset: number, value: number): void => {
        this._scratch.setFloat32(0, value);
        this.setBits(offset, this._scratch.getUint32(0), 32);
    };

    setFloat64 = (offset: number, value: number): void => {
        this._scratch.setFloat64(0, value);
        this.setBits(offset, this._scratch.getUint32(0), 32);
        this.setBits(offset, this._scratch.getUint32(4), 32);
    };

    getArrayBuffer = (offset: number, byteLength: number): ArrayBuffer => {
        const buffer = new Uint8Array(byteLength);
        for (let i = 0; i < byteLength; i++) {
            buffer[i] = this.getUint8(offset + (i * 8));
        }

        return buffer;
    };
}

export {
    BitView
};
