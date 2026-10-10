// Standalone task board client: one self-contained build/task-board-client/index.html.
// Everything (scripts and styles, which style-loader injects from the script)
// is inlined, and module ids are content hashes, so two builds from the same
// commit produce the same bytes and anyone can verify a copy by its sha256.

import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import HtmlInlineScriptPlugin from 'html-inline-script-webpack-plugin'
import webpack from 'webpack'

import base from './webpack.base.babel.mjs'

export default base({
  mode: 'production',
  entry: [path.join(process.cwd(), 'src/task-board-client.js')],
  output: {
    path: path.resolve(process.cwd(), 'build/task-board-client'),
    filename: 'task-board-client.js',
    publicPath: ''
  },
  optimization: {
    nodeEnv: 'production',
    sideEffects: true,
    concatenateModules: true,
    splitChunks: false,
    runtimeChunk: false,
    moduleIds: 'deterministic',
    chunkIds: 'deterministic'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/task-board-client.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        minifyJS: true,
        minifyCSS: true
      },
      inject: 'body'
    }),
    new HtmlInlineScriptPlugin(),
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })
  ],
  performance: { hints: false }
})
