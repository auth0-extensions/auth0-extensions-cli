const _ = require("lodash");
const path = require("path");
const semver = require("semver");
const Webpack = require("webpack");

function convertDependenciesToCommonJS(dependencies) {
  return dependencies.reduce((acc, dep) => {
    const versionIndex = dep.lastIndexOf("@");

    if (versionIndex > 0) {
      acc[dep.substring(0, versionIndex)] = `commonjs ${dep}`;
    } else {
      acc[dep] = `commonjs ${dep}`;
    }
    return acc;
  }, {});
}

const excludeModules = (list) => (modulePath) => {
  if (modulePath.indexOf("node_modules") < 0) {
    return false;
  }

  let isIncluded = true;

  _.each(list, (module) => {
    if (modulePath.indexOf(path.join("node_modules", module)) >= 0) {
      isIncluded = false;
    }
  });

  return isIncluded;
};

module.exports = (pkg, rootPath, externals, args, opts) => {
  const extension = pkg["auth0-extension"] || {};
  const dependencies = pkg.dependencies;
  const mappings = extension.externals || [];
  const excluded = extension.excluded || [
    "express-conditional-middleware",
    "pino",
  ];
  const additionalSettings = _.pickBy(
    process.env,
    (val, key) => key.startsWith("A0EXT_") || key === "PR_NUMBER"
  );
  const settings = _.assign(
    extension.settings,
    {
      NODE_ENV: "production",
      CLIENT_VERSION: pkg.version,
    },
    additionalSettings
  );

  // Transform to JSON.
  Object.keys(settings).forEach((k) => {
    settings[k] = JSON.stringify(settings[k]);
  });

  const activePlugins = [];
  const activeLoaders = [];

  let babelExclude;
  if (
    typeof extension.bundleModules !== "undefined" &&
    extension.bundleModules === false
  ) {
    externals.compatible = convertDependenciesToCommonJS(
      Object.keys(dependencies)
    );
    babelExclude = /node_modules/;
  } else {
    // Add custom mappings to externals.
    externals.compatible = convertDependenciesToCommonJS(mappings);
    babelExclude = excludeModules(excluded);
  }

  const nodeTarget = semver.coerce(extension.nodeTarget)?.version ?? '12.13.0'; // 1st Node 12 LTS release

  if (
    typeof extension.useBabel === "undefined" ||
    extension.useBabel === true
  ) {
    activeLoaders.push({
      test: /\.jsx?$/,
      use: {
        loader: "babel-loader",
        options: {
          babelrc: false,
          presets: [
            [
              "@babel/preset-env",
              {
                targets: {
                  node: nodeTarget,
                },
              },
            ],
          ],
          plugins: [
            require("@babel/plugin-proposal-export-default-from"),
            require("@babel/plugin-transform-runtime"),
            require("@babel/plugin-syntax-dynamic-import"),
          ],
        },
      },
      exclude: babelExclude,
    });
  }

  activePlugins.push(
    new Webpack.DefinePlugin({
      "process.env": settings,
    })
  );

  // add "use strict" to the very beginning of the bundle to avoid some of node4 issues
  activePlugins.push(
    new Webpack.BannerPlugin({
      banner: '"use strict";',
      raw: true,
    })
  );

  // Return config.
  return {
    entry: path.join(rootPath, args.entry),
    mode: opts.mode ?? 'none',
    target: "node",
    output: {
      path: path.join(rootPath, args.destination),
      filename: `${pkg.name}.extension.${pkg.version}.js`,
      library: {
        type: "commonjs2",
      },
    },
    externals: externals.compatible,
    module: {
      rules: activeLoaders,
    },
    plugins: activePlugins,
    resolve: {
      modules: ["node_modules", path.join(rootPath, "./node_modules/")],
      alias: {},
    },
  };
};
