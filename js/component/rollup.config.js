import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss'



export default {
  moduleId: 'component',
  moduleName: 'component',
  entry: 'build/bundle.js',
  dest: 'build/component.js',
  sourceMap: 'inline',
  format: 'umd',
  plugins: [ 
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs(),
    postcss()
  ]
};