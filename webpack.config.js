const webpack = require('webpack')

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    modules: [__dirname, 'node_modules'],
  },
  devServer: {
    contentBase: 'dist',
    historyApiFallback: true,
  },
}
