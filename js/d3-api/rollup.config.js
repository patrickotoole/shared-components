import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import babel from 'rollup-plugin-babel';



export default {
  useStrict: false,
  moduleName: 'api',
  entry: 'build/bundle.js',
  targets: [{
      dest: 'build/api.js',
      format: "umd"
    },
    {
      dest: 'build/api.es.js',
      format: "es"
    }
  ],
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
