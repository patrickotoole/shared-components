import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import babel from 'rollup-plugin-babel';

export default {
  useStrict: false,
  moduleId: 'filter',
  moduleName: 'filter',
  entry: 'index.js',
  //dest: 'build/filter.js',
  //format: 'iife',

  targets: [
    {
      dest: 'build/filter.es.js',
      format: 'es'
    }
  ],
  plugins: [ 
    postcss(),
    resolve({
      main: true
    }),
    commonjs(),
    babel({ 
      plugins: ['external-helpers'],
      externalHelpers: false,
    }),
  ],
  exports: "named"
};

