import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import babel from 'rollup-plugin-babel';

export default {
  useStrict: false,
  moduleName: 'helpers',
  entry: 'build/bundle.js',
  targets: [{
      dest: 'build/helpers.js',
      format: 'umd'
    },
    {
      dest: 'build/helpers.es.js',
      format: 'es'
    }
  ],
  sourceMap: 'inline',
  format: 'es',
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
