import esbuild from "esbuild";
import { resolve } from "node:path";

/**
 * @type {import('esbuild').BuildOptions[]}
 */
const outputs = [
  {
    format: "esm",
    outfile: "./dist/slother.esm.js",
    target: "es2020",
  },
  {
    format: "cjs",
    outfile: "./dist/slother.js",
    target: "es6",
  },
];

outputs.forEach((output) => {
  esbuild.build({
    ...output,
    entryPoints: [resolve("./src/index.ts")],
    bundle: true,
    minify: true,
    platform: "browser",
  });
});
