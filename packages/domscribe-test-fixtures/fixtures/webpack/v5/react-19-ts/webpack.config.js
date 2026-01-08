const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DomscribeWebpackPlugin } = require('@domscribe/react/webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: './src/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    symlinks: false,
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        enforce: 'pre',
        use: [
          {
            loader: '@domscribe/transform/webpack-loader',
            options: {
              enabled: isDevelopment,
            },
          },
        ],
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new DomscribeWebpackPlugin({
      enabled: isDevelopment,
      debug: false,
      overlay: true,
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
    client: {
      overlay: false,
    },
  },
  devtool: 'source-map',
};
