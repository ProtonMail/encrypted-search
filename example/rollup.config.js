import serve from 'rollup-plugin-serve'

export default [
    {
        input: './example.js',
        output: {
            name: 'MasterTabExample',
            file: 'dist/example.js',
            format: 'iife',
            interop: false,
            strict: false
        },
        plugins: [
            require('rollup-plugin-node-resolve')({
            }),
            require('rollup-plugin-commonjs')({
                ignoreGlobal: true,
                ignore: [ 'crypto' ]
            }),
            serve('')
        ]
    }
]
