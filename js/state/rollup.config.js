import babel from 'rollup-plugin-babel';

export default {
  moduleId: 'state',
  moduleName: 'state',
  entry: 'index.js',
  //dest: 'build/state.js',
  //format: 'iife',
  targets: [{
      dest: 'build/state.js',
      format: 'umd'
    },
    {
      dest: 'build/state.es.js',
      format: 'es'
    }
  ],

  external: ['d3'],
  globals: {
    d3: 'd3'
  },
  plugins: [
    babel({ 
      plugins: ['external-helpers'],
      externalHelpers: false,
    }),
  ],
  exports: "named"
};

