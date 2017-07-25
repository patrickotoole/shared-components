import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import babel from 'rollup-plugin-babel';



export default {
  //moduleId: 'helpers',
  useStrict: false,
  moduleName: 'helpers',
  entry: 'build/bundle.js',
  dest: 'build/helpers.js',
  sourceMap: 'inline',
  format: 'umd',
  plugins: [ 
    postcss(),

    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs(),

    babel({ 
      plugins: ['external-helpers'],
      externalHelpers: false,
    }),
  ]
};
