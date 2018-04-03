const _ = require('lodash');
const path = require('path');
const Webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = (pkg, webtaskJson, rootPath, args, externals) => {
  const extension = pkg['auth0-extension'] || { };
  const dependencies = pkg.dependencies;
  const mappings = extension.externals || [];
  const settings = _.assign(extension.settings, {
    NODE_ENV: 'production',
    CLIENT_VERSION: webtaskJson.version
  });

  // Transform to JSON.
  Object.keys(settings).forEach((k) => {
    settings[k] = JSON.stringify(settings[k]);
  });

  const activePlugins = [];
  const activeLoaders = [];

  if (typeof extension.bundleModules !== 'undefined' && extension.bundleModules === false) {
    externals.compatible = {};
    Object.keys(dependencies).forEach((k) => {
      externals.compatible[k] = `commonjs ${k}`;
    });
  } else {
    // Add custom mappings to externals.
    mappings.forEach((mapping) => {
      if (mapping.indexOf('@') > -1) {
        externals.compatible[mapping.split('@')[0]] = mapping;
      } else {
        externals.compatible[mapping] = true;
      }
    });

    // Transform to commonjs.
    Object.keys(externals.compatible).forEach((k) => {
      if (typeof externals.compatible[k] === 'string') {
        externals.compatible[k] = `commonjs ${externals.compatible[k]}`;
      } else {
        externals.compatible[k] = `commonjs ${k}`;
      }
    });
  }

  if (typeof extension.useBabel !== 'undefined' && extension.useBabel === false) {
    activePlugins.push(
      new UglifyJSPlugin({
        uglifyOptions: {
          ecma: 8,
          compress: {
            dead_code: true,
            unused: true,
            warnings: false
          },
          output: {
            comments: false
          }
        }
      })
    );

    // This is required until Webpack supports object spread.
    activeLoaders.push({
      test: /\.jsx?$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', {
              targets: {
                node: '8.9.0'
              },
              shippedProposals: true
            }]
          ]
        }
      },
      exclude: /node_modules/
    });
  } else {
    activePlugins.push(
      new Webpack.optimize.UglifyJsPlugin({
        compress: {
          screw_ie8: true,
          warnings: false,
          unused: true,
          dead_code: true
        },
        mangle: {
          screw_ie8: true
        },
        output: {
          comments: false,
          screw_ie8: true
        }
      })
    );

    activeLoaders.push({
      test: /\.jsx?$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', {
              targets: {
                node: '4.2.0'
              }
            }]
          ]
        }
      },
      exclude(modulePath) {
        return /node_modules/.test(modulePath) &&
          !/node_modules\/express-conditional-middleware/.test(modulePath) &&
          !/node_modules\/pino/.test(modulePath);
      }
    });
  }

  activePlugins.push(
    new Webpack.DefinePlugin({
      'process.env': settings
    })
  );

  activeLoaders.push({
    test: /\.json$/,
    loader: 'json-loader'
  });

  // Return config.
  return {
    entry: path.join(rootPath, args.entryPoint),
    mode: 'none',
    target: 'node',
    output: {
      path: path.join(rootPath, args.destinationFolder),
      filename: `${webtaskJson.name}.extension.${webtaskJson.version}.js`,
      library: `${webtaskJson.name}.extension`,
      libraryTarget: 'commonjs2'
    },
    externals: externals.compatible,
    module: {
      rules: activeLoaders
    },
    plugins: activePlugins,
    resolve: {
      modules: [
        'node_modules',
        path.join(rootPath, './node_modules/')
      ],
      alias: { }
    }
  };
};
