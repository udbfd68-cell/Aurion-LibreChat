'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fs = require('fs');
var json = require('@rollup/plugin-json');
var replace = require('@rollup/plugin-replace');
var commonjs = require('@rollup/plugin-commonjs');
var resolve = require('@rollup/plugin-node-resolve');
var typescript = require('@rollup/plugin-typescript');
var peerDepsExternal = require('rollup-plugin-peer-deps-external');

// rollup.config.js

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', 'file:///C:/Users/33627/Downloads/Aurion-LibreChat-master/Aurion-LibreChat-master/packages/api/rollup.config.js'), 'utf8'));

/**
 * Check if we're in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development';

const plugins = [
  peerDepsExternal(),
  resolve({
    preferBuiltins: true,
    skipSelf: true,
  }),
  replace({
    __IS_DEV__: isDevelopment,
    preventAssignment: true,
  }),
  commonjs({
    transformMixedEsModules: true,
    requireReturnsDefault: 'auto',
  }),
  typescript({
    tsconfig: './tsconfig.build.json',
    outDir: './dist',
    sourceMap: true,
    /**
     * Remove inline sourcemaps - they conflict with external sourcemaps
     */
    inlineSourceMap: false,
    /**
     * Always include source content in sourcemaps for better debugging
     */
    inlineSources: true,
  }),
  json(),
];

const cjsBuild = {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
    sourcemap: true,
    exports: 'named',
    entryFileNames: '[name].js',
    /**
     * Always include sources in sourcemap for better debugging
     */
    sourcemapExcludeSources: false,
  },
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})],
  preserveSymlinks: true,
  plugins,
};

exports.default = cjsBuild;
