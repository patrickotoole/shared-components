import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import babel from 'rollup-plugin-babel';



export default {
  //moduleId: 'dashboard',
  useStrict: false,
  moduleName: 'dashboard',
  entry: 'build/bundle.js',
  dest: 'build/dashboard.js',
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
