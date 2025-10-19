import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from 'rollup-plugin-typescript2';

function onwarn(warning) {
  console.log(warning.toString());
}

export default {
  onwarn,
  input: 'src/index.ts',
  output: {
    file: 'dist/index.mjs',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [resolve({ preferBuiltins: false, browser: true }), commonjs(), json(), typescript()],
};
