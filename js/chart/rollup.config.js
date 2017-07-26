import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import babel from 'rollup-plugin-babel';

export default {
  useStrict: false,
  moduleName: 'chart',
  entry: 'build/bundle.js',
  sourceMap: 'inline',
  targets: [{
      dest: 'build/chart.js',
      format: 'umd'
    },
    {
      dest: 'build/chart.es.js',
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
  ]
};
