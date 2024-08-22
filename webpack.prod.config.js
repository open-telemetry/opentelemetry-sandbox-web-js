const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const path = require('path');

const directory = path.resolve(__dirname);

module.exports = {
  mode: 'production',
  entry: {
    'web-sdk': 'examples/web-sdk/index.js',
    'manual': 'examples/manual/index.js',
    'config-all': 'examples/config-all/index.js',
    'config-trace': 'examples/config-trace/index.js',
    'config-events': 'examples/config-events/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    sourceMapFilename: '[file].map',
  },
  target: 'web',
  optimization: {
    usedExports: true, // This is necessary for tree shaking
    // minimize: true,
    // minimizer: [new TerserPlugin()],
  },
  resolve: {
    mainFields: ['module', 'main'], // Prioritizes `module` field over `main`
  },
  module: {
    rules: [
      {
        test: /\.js[x]?$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.ts$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'ts-loader',
        },
      },
    ],
  },
  resolve: {
    modules: [
      path.resolve(directory),
      'node_modules'
    ],
    extensions: ['.ts', '.js', '.jsx', '.json'],
  },
};
