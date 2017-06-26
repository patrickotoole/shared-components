import resolve from 'rollup-plugin-node-resolve';

export default {
  moduleId: 'dashboard',
  moduleName: 'dashboard',
  entry: 'build/bundle.js',
  dest: 'build/dashboard.js',
  format: 'umd',
  plugins: [ resolve({
        jsnext: true
      }) ]
};
