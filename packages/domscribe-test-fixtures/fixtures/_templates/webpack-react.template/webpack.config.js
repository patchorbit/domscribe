const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {
  DomscribeWebpackPlugin,
  webpackLoader,
} = require('@domscribe/transform');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
            },
            {
              loader: webpackLoader,
              options: {
                enabled: isDevelopment,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
      new DomscribeWebpackPlugin({
        enabled: isDevelopment,
      }),
    ],
    devServer: {
      port: 3000,
      hot: true,
    },
    devtool: 'source-map',
  };
};
