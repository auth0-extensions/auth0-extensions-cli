const _ = require('lodash');
const path = require('path');
const Webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const excludeModules = list =>
  (modulePath) => {
    if (modulePath.indexOf('node_modules') < 0) {
      return false;
    }

    let isIncluded = true;

    _.each(list, (module) => {
      if (modulePath.indexOf(path.join('node_modules', module)) >= 0) {
        isIncluded = false;
      }
    });

    return isIncluded;
  };

module.exports = (pkg, webtaskJson, rootPath, args, externals) => {
  const extension = pkg['auth0-extension'] || { };
  const dependencies = pkg.dependencies;
  const mappings = extension.externals || [];
  const excluded = extension.excluded || ['express-conditional-middleware', 'pino'];
  const settings = _.assign(extension.settings, {
    NODE_ENV: 'production',
    CLIENT_VERSION: webtaskJson.version
  });

  // Transform to JSON.
  Object.keys(settings).forEach((k) => {
    settings[k] = JSON.stringify(settings[k]);
  });
  
  if (process.env.PR_NUMBER) settings.PR_NUMBER = process.env.PR_NUMBER;

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
          ecma: 7,
          compress: {
            dead_code: true,
            unused: true,
            warnings: false,
          },
          output: {
            comments: false,
          }
        }
      })
    );
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
      loader: 'babel-loader',
      exclude: excludeModules(excluded)
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
    target: 'node',
    output: {
      path: path.join(rootPath, args.destinationFolder),
      filename: `${webtaskJson.name}.extension.${webtaskJson.version}.js`,
      library: '${webtaskJson.name}.extension',
      libraryTarget: 'commonjs2'
    },
    externals: externals.compatible,
    module: {
      loaders: activeLoaders
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
