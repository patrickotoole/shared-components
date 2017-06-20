import babel from 'rollup-plugin-babel';
import buble from 'rollup-plugin-buble';

import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import postcss from 'rollup-plugin-postcss'
 
export default {
   entry:  'src/main.js',
   dest:   'build/compiled.js',
   format: 'iife',
   moduleName: 'funnel',
   sourceMap: true,
   external: ['d3'],
   plugins:
   [
      postcss({ extensions: ['.css'] }),
      babel({}),
      nodeResolve({ jsnext: true }),
      commonjs({
         include: 'node_modules/**',
         namedExports:
         {
            './node_modules/react/react.js': 
            [
               'cloneElement', 
               'createElement', 
               'PropTypes', 
               'Children', 
               'Component'
            ],
         }
      }),
   ]
}
