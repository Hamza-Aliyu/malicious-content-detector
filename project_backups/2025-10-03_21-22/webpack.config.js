const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    content: './src/content.js',
    popup: './src/popup.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'src/popup.html',
          to: 'popup.html'
        },
        {
          from: 'src/styles.css',
          to: 'styles.css'
        },
        {
          from: 'src/icons',
          to: 'icons'
        },
        {
          from: 'src/test_pages',
          to: 'test_pages'
        }
      ]
    })
  ],
  resolve: {
    extensions: ['.js']
  }
};
