
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
  exports: "named"
};

