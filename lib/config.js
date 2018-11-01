const _ = require('lodash');
const path = require('path');
const semver = require('semver');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const Webpack = require('webpack');

function convertDependenciesToCommonJS(dependencies) {
  return dependencies.reduce((acc, dep) => {
    const versionIndex = dep.lastIndexOf('@');

    if (versionIndex > 0) {
      acc[dep.substring(0, versionIndex)] = `commonjs ${dep}`;
    } else {
      acc[dep] = `commonjs ${dep}`;
    }
    return acc;
  }, {});
}

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

module.exports = (pkg, webtaskJson, rootPath, args, ext) => {
  const externals = Object.assign({}, ext);
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

  const activePlugins = [];
  const activeLoaders = [];

  let babelExclude;
  if (typeof extension.bundleModules !== 'undefined' && extension.bundleModules === false) {
    externals.compatible = convertDependenciesToCommonJS(Object.keys(dependencies));
    babelExclude = /node_modules/;
  } else {
    // Add custom mappings to externals.
    externals.compatible = convertDependenciesToCommonJS(mappings);
    babelExclude = excludeModules(excluded);
  }

  let ecma = 6;
  let nodeTarget = '4.2.0'; // 1st Node 4 LTS release
  const nodeTargetLoose = semver.coerce(extension.nodeTarget);
  if (nodeTargetLoose && semver.valid(nodeTargetLoose.version)) {
    nodeTarget = nodeTargetLoose.version;
    if (semver.satisfies(nodeTargetLoose, '8.x')) {
      ecma = 8;
    }
  }

  if (typeof extension.useBabel === 'undefined' || extension.useBabel === true) {
    activeLoaders.push({
      test: /\.jsx?$/,
      use: {
        loader: 'babel-loader',
        options: {
          babelrc: false,
          presets: [
            ['@babel/preset-env', {
              targets: {
                node: nodeTarget
              },
              shippedProposals: true
            }]
          ],
          plugins: [
            '@babel/plugin-proposal-class-properties',
            '@babel/plugin-proposal-export-default-from',
            '@babel/plugin-proposal-export-namespace-from',
            '@babel/plugin-transform-runtime',
            '@babel/plugin-syntax-dynamic-import'
          ]
        }
      },
      exclude: babelExclude
    });
  }

  activePlugins.push(
    new UglifyJSPlugin({
      uglifyOptions: {
        ecma,
        compress: {
          warnings: false,
          unused: true,
          dead_code: true
        },
        output: {
          comments: false
        }
      }
    })
  );

  activePlugins.push(
    new Webpack.DefinePlugin({
      'process.env': settings
    })
  );

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
