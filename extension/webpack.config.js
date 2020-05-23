// node.js core path module
const path = require('path');

// Copy files (like html) to build dir
const CopyWebpackPlugin = require('copy-webpack-plugin');

// to access built-in plugins
const webpack = require('webpack');

module.exports = {
	// https://webpack.js.org/configuration/mode
	//mode: 'production',
	mode: 'development',
	// Can't use eval-based source map in content.js.
	devtool: 'source-map',
	// Declare entries to bundle (modules)
	// https://webpack.js.org/concepts/entry-points/
	entry: {
		// the background page js imports
		background: './src/background.js',
		// JS used in content script
		content: './src/content.js',
	},
	// Where to output bundled files
	// https://webpack.js.org/concepts/#output
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].bundle.js'
	},
	plugins: [
		//https://webpack.js.org/concepts/#plugins
		// CopyWebPack
		// https://webpack.js.org/plugins/copy-webpack-plugin/
		new CopyWebpackPlugin({
			patterns: [
				{from: 'src/background.html', to: 'background.html'},
				{from: 'src/manifest.json', to: 'manifest.json'},
			],
		}),
	],
};
