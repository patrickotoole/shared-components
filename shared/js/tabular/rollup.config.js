import typescript from 'rollup-plugin-typescript';

export default {
    entry: 'main.ts',
    dest: 'bundle.js',
    plugins: [
        typescript()
    ]
};

