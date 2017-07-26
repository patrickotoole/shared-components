import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss'
import babel from 'rollup-plugin-babel';




export default {
  moduleId: 'component',
  moduleName: 'component',
  entry: 'build/bundle.js',
  targets: [{
      dest: 'build/component.js',
      format: "umd"
    },
    {
      dest: 'build/component.es.js',
      format: "es"
    }
  ],
  sourceMap: 'inline',
  format: 'umd',
  plugins: [ 
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs(),
    postcss(),
    babel({ 
      plugins: ['external-helpers'],
      externalHelpers: false,
    }),

  ]
};
