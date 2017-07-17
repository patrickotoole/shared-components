import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';



export default {
  //moduleId: 'dashboard',
  useStrict: false,
  moduleName: 'dashboard',
  entry: 'build/bundle.js',
  dest: 'build/dashboard.js',
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
