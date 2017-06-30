import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss'


export default {
  moduleId: 'table',
  moduleName: 'table',
  entry: 'index.js',
  //dest: 'build/table.js',
  //format: 'iife',
  targets: [{
      dest: 'build/table.js',
      format: 'umd'
    },
    {
      dest: 'build/table.es.js',
      format: 'es'
    }
  ],

  external: ['d3'],
  globals: {
    d3: 'd3'
  },
  plugins: [ 
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs(),
    postcss()
  ],
  exports: "named"
};

