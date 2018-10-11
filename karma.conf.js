process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = (config) => {
    config.set({
        basePath: '.',
        frameworks: ['jasmine'],
        client: {
            jasmine: {
                random: true,
                stopOnFailure: false,
                failFast: false,
                timeoutInterval: 2000
            }
        },
        files: [
            'src/**/*.spec.js'
        ],
        preprocessors: {
            'src/**/*.spec.js': ['rollup']
        },
        rollupPreprocessor: {
            output: {
                format: 'iife',
                name: 'Test',
                sourcemap: 'inline'
            },
            plugins: [
                require('rollup-plugin-node-resolve')({
                }),
                require('rollup-plugin-commonjs')({
                    ignoreGlobal: true,
                    ignore: [ 'crypto' ]
                })
            ]
        },
        logLevel: config.LOG_INFO,
        autoWatch: false,
        browsers: ['ChromeHeadless'],
        singleRun: true
    })
}
