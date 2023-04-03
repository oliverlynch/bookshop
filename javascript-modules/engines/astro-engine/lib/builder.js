import * as fs from "fs";
import { transform } from "@astrojs/compiler";
import AstroPluginVite from "@bookshop/vite-plugin-astro-bookshop"
import * as esbuild from 'esbuild'

export const extensions = [".astro", ".jsx"];

const { transform: bookshopTransform } = AstroPluginVite()

export const buildPlugins = [
  {
    name: "bookshop-astro",
    setup(build) {
      build.onLoad({ filter: /\.astro$/, namespace:'style' }, async (args) => {
        let text = await fs.promises.readFile(args.path, "utf8");
        let transformed = await transform(text, {
          internalURL: "astro/runtime/server/index.js",
          filename: args.path
        });
        return {
          contents: transformed.css[0],
          loader: "css",
        };
      });
      build.onLoad({ filter: /\.astro$/ }, async (args) => {
        let text = await fs.promises.readFile(args.path, "utf8");
        let tsResult = await transform(text, {
          internalURL: "astro/runtime/server/index.js",
          filename: args.path.replace(process.cwd(), ''),
        });
        let jsResult = await esbuild.transform(tsResult.code, {
          loader: 'ts',
          target: 'esnext',
          sourcemap: false,
        })
        let result = await bookshopTransform(jsResult.code, args.path.replace(process.cwd(), ''))

        return {
          contents: result.code,
          loader: "js",
        };
      });
      build.onLoad({ filter: /\.jsx$/ }, async (args) => {
        let text = await fs.promises.readFile(args.path, "utf8");
        text = `import React from 'react';\n${text}`
        let jsResult = await esbuild.transform(text, {
          loader: 'jsx',
          target: 'esnext',
          sourcemap: false
        })

        return {
          contents: jsResult.code,
          loader: "js",
        };
      });
      build.onLoad({ filter: /astro\/dist\/runtime\/server\/index.js$/}, async (args) => {
        let text = await fs.promises.readFile(args.path, "utf8");
        return {
          contents: text+"export function createMetadata(){};",
          loader: "js"
        }
      })
      build.onResolve({ filter: /\?astro&type=style/, namespace: 'file' }, async (args) => {
        return {  path: args.importer, namespace: 'style' };
      });
    },
  },
];

export const esbuildConfigFn = (esbuildOptions, options) => {};
