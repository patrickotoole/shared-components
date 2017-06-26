
export default {
  moduleId: 'filter',
  moduleName: 'filter',
  entry: 'index.js',
  //dest: 'build/filter.js',
  //format: 'iife',
  targets: [{
      dest: 'build/filter.js',
      format: 'umd'
    },
    {
      dest: 'build/filter.es.js',
      format: 'es'
    }
  ],

  external: ['d3'],
  globals: {
    d3: 'd3'
  },
  exports: "named"
};

