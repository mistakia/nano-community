/**
 * COMMON WEBPACK CONFIGURATION
 */

import webpack from 'webpack'
import nib from 'nib'
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// SVGs under the inline limit become URL-encoded data URIs, which are smaller
// than base64 for text markup.
const svg_data_url = (content) =>
  `data:image/svg+xml,${encodeURIComponent(content.toString())}`

// style_loader: 'style-loader' injects CSS from the script (development and
// the self-contained task board client); the production site passes
// MiniCssExtractPlugin.loader. asset_filename names emitted fonts and media.
const base = ({
  style_loader = 'style-loader',
  asset_filename = '[contenthash][ext]',
  ...options
}) => ({
  mode: options.mode,
  entry: options.entry,
  output: Object.assign(
    {
      // Compile into js/build.js
      path: path.resolve(process.cwd(), 'build'),
      publicPath: '/',
      assetModuleFilename: asset_filename,
      clean: true
    },
    options.output
  ), // Merge with env dependent settings
  optimization: options.optimization,
  module: {
    rules: [
      {
        test: /\.m?jsx?$/, // Transform all .js, .mjs, and .jsx files required somewhere with Babel
        exclude: /node_modules\/(?!react-table)/,
        use: {
          loader: 'babel-loader',
          options: options.babelQuery
        }
      },
      {
        // Preprocess our own .css files
        // This is the place to add your own loaders (e.g. sass/less etc.)
        // for a list of loaders, see https://webpack.js.org/loaders/#styling
        test: /\.css$/,
        exclude: /node_modules/,
        use: [style_loader, 'css-loader']
      },
      {
        test: /\.styl$/,
        use: [
          style_loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          {
            loader: 'stylus-loader',
            options: {
              stylusOptions: {
                use: [nib()],
                import: [
                  'nib',
                  path.resolve(__dirname, '../src/styles/variables.styl')
                ],
                includeCSS: true
              }
            }
          }
        ]
      },
      {
        // Preprocess 3rd party .css files located in node_modules
        test: /\.css$/,
        include: /node_modules/,
        use: [style_loader, 'css-loader']
      },
      {
        test: /\.(eot|otf|ttf|woff|woff2)$/,
        type: 'asset/resource'
      },
      {
        test: /\.svg$/,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 10 * 1024 } },
        generator: { dataUrl: svg_data_url }
      },
      {
        test: /\.html$/,
        use: 'html-loader'
      },
      {
        test: /\.(mp4|webm)$/,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 10000 } }
      }
    ]
  },
  plugins: options.plugins.concat([
    // Always expose NODE_ENV to webpack, in order to use `process.env.NODE_ENV`
    // inside your code for any environment checks; Terser will automatically
    // drop any unreachable code.
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development'
    })
  ]),
  resolve: {
    modules: ['node_modules', 'app'],
    extensions: ['.js', '.jsx', '.react.js', '.mjs'],
    mainFields: ['browser', 'jsnext:main', 'main'],
    alias: {
      '@views': path.resolve(__dirname, '../src/views'),
      '@pages': path.resolve(__dirname, '../src/views/pages'),
      '@core': path.resolve(__dirname, '../src/core'),
      '@components': path.resolve(__dirname, '../src/views/components'),
      '@styles': path.resolve(__dirname, '../src/styles'),
      '#common': path.resolve(__dirname, '../common')
    }
  },
  devtool: options.devtool,
  target: 'web', // Make web variables accessible to webpack, e.g. window
  performance: options.performance || {}
})

export default base
