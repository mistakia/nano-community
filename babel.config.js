module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false
      }
    ],
    '@babel/preset-react'
  ],
  plugins: [
    // aliases
    [
      require('babel-plugin-module-resolver'),
      {
        root: ['./'],
        alias: {
          '@views': './src/views',
          '@pages': './src/views/pages',
          '@core': './src/core',
          '@components': './src/views/components',
          '@styles': './src/styles'
        }
      }
    ],
    ['@babel/plugin-proposal-class-properties']
  ]
}
