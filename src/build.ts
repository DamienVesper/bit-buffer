/*
 * NOTE: NOT A SOURCE FILE!!!
 * This file is only used as a build script to copy the package.json and README over to the build directory.
 *
 * The remainder of this file will be me trolling about performance.
 */

import { resolve } from "node:path";

// This is the first time I've ever imported a tsconfig into a TypeScript file. Maybe there's a reason I don't do that often.
import tsconfig from "../tsconfig.build.json";

const files = ["package.json", "README.md"];
const length = files.length; // Clearly optimal for ensuring this is not re-evaluated each iteration of the loop. Definitely not irrelevant for 2 iterations.

// ++i is sometimes faster and never slower than i++.
for (let i = 0; i < length; ++i) {
    // To save one index operation.
    const filename = files[i];

    const source = Bun.file(resolve(import.meta.dirname, `../${filename}`));
    const target = Bun.file(resolve(import.meta.dirname, `../${tsconfig.compilerOptions.outDir}/${filename}`));

    // This is also the first time I've used top-level await since its introduction in Node.js 14.
    // `.arrayBuffer()` is much faster than `.text()`, so that's why we use it here.
    await Bun.write(target, await source.arrayBuffer());
}
