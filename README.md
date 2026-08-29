# @damienvesper/bit-buffer

BitBuffer provides two objects, `BitView` and `BitStream`. `BitView` is a wrapper for ArrayBuffers, similar to JavaScript's [DataView](https://developer.mozilla.org/en-US/docs/JavaScript/Typed_arrays/DataView), but with support for bit-level reads and writes. `BitStream` is a wrapper for a `BitView` used to help maintain your current buffer position, as well as to provide higher-level read / write operations such as for ASCII strings.
