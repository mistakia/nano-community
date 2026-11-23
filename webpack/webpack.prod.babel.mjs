// Production site build. Every script, stylesheet, font and media file is
// emitted under build/assets/ named by content hash, so the server can send it
// as immutable. HTML is the only mutable output; scripts/finalize-client-build.mjs
// compresses everything after react-snap prerenders the pages.
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import webpack from 'webpack'

import base from './webpack.base.babel.mjs'

import * as constants from '#constants'

// node_modules/<name> or node_modules/@<scope>/<name>
const PACKAGE_NAME_REGEX = /[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/

// Writes chunk-groups.json: each named chunk group (the entry and every
// webpackChunkName route page) with the JS files it loads. The finalize step
// reads it to budget each page's route chunk, then deletes it.
class ChunkGroupManifestPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'ChunkGroupManifestPlugin',
      (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'ChunkGroupManifestPlugin',
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
          },
          () => {
            const groups = {}
            for (const [name, group] of compilation.namedChunkGroups) {
              groups[name] = group
                .getFiles()
                .filter((file) => file.endsWith('.js'))
            }
            compilation.emitAsset(
              'chunk-groups.json',
              new webpack.sources.RawSource(JSON.stringify(groups, null, 2))
            )
          }
        )
      }
    )
  }
}

export default base({
  mode: 'production',
  style_loader: MiniCssExtractPlugin.loader,
  asset_filename: 'assets/[name].[contenthash][ext]',

  entry: [path.join(process.cwd(), 'src/index.js')],

  output: {
    filename: 'assets/[name].[contenthash].js',
    chunkFilename: 'assets/[name].[contenthash].chunk.js'
  },

  optimization: {
    nodeEnv: 'production',
    sideEffects: true,
    concatenateModules: true,
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          // JavaScript only: vendor CSS stays with the chunk that imports it
          // rather than becoming one render-blocking stylesheet per package.
          type: /javascript/,
          name(module) {
            const package_name = module.context.match(PACKAGE_NAME_REGEX)[1]
            return `npm.${package_name.replace('@', '').replace(/[\\/]/, '.')}`
          }
        }
      }
    }
  },

  plugins: [
    // Minify and optimize the index.html
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      favicon: 'static/favicon.ico',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      inject: true
    }),

    new MiniCssExtractPlugin({
      filename: 'assets/[name].[contenthash].css',
      chunkFilename: 'assets/[name].[contenthash].chunk.css',
      // A route chunk's stylesheet goes before main.css, as style-loader
      // ordered it: page styles lose to the global styles in main.css and to
      // the MUI styles emotion appends at runtime. Appended at the end of
      // head, a stylesheet loaded on client-side navigation would override
      // both.
      insert: function (link_tag) {
        const main_css = document.querySelector('link[href*="/assets/main."]')
        if (main_css) main_css.parentNode.insertBefore(link_tag, main_css)
        else document.head.appendChild(link_tag)
      }
    }),

    new ChunkGroupManifestPlugin(),

    new webpack.DefinePlugin({
      IS_DEV: false,
      REPO: JSON.stringify(constants.repo)
    })
  ],

  performance: {
    assetFilter: (assetFilename) =>
      !/(\.map$)|(^assets\/(main\.|favicon\.))|chunk-groups\.json$/.test(
        assetFilename
      )
  }
})
