const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const StatsWriterPlugin = require("webpack-stats-plugin").StatsWriterPlugin;

const productionMode = "production";
const developmentMode = "development";

module.exports = ({ name, version }, rootPath, args, { mode }) => {
  const destination = path.join(rootPath, args.destination);
  const config = {
    mode,

    // Capture a "profile" of the application, including statistics and hints, which can then be dissected using the Analyze tool.
    // Use the StatsPlugin for more control over the generated profile.
    profile: mode === developmentMode,

    entry: {
      app: path.resolve(rootPath, args.entry),
    },

    output: {
      chunkFilename: `${name}.ui.[name].${version}.js`,
      filename: `${name}.ui.${version}.js`,
      path: destination,
      publicPath: "/app/",
    },

    resolve: {
      extensions: [".json", ".js", ".jsx"],
    },

    // Load all modules.
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: {
                      browsers: ["last 2 versions"],
                    },
                  },
                ],
                "@babel/preset-react",
              ],
              plugins: [
                require("@babel/plugin-proposal-export-default-from"),
                require("@babel/plugin-transform-runtime"),
                require("@babel/plugin-syntax-dynamic-import"),
              ],
              ignore: ["./node_modules/**/*.js"],
            },
          },
          exclude: path.join(rootPath, "node_modules/"),
        },
        {
          test: /\.(png|ttf|svg|jpg|gif)/,
          type: "asset",
        },
        {
          test: /\.(woff|woff2|eot)/,
          type: "asset",
        },
        {
          test: /\.css$/,
          use: [
            mode === developmentMode ? "style-loader" : "css-loader",
            {
              loader: "postcss-loader",
              options: {
                plugins: [
                  require("postcss-simple-vars")(),
                  require("postcss-focus")(),
                  require("autoprefixer")({
                    browsers: ["last 2 versions", "IE > 8"],
                  }),
                  require("postcss-reporter")({
                    clearMessages: true,
                  }),
                ],
              },
            },
          ],
        },
      ],
    },

    plugins: [
      new webpack.ProvidePlugin({
        React: "react",
      }),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(mode === developmentMode),
        "process.env": {
          BROWSER: JSON.stringify(true),
          NODE_ENV: JSON.stringify(mode),
        },
        __CLIENT__: JSON.stringify(true),
        __SERVER__: JSON.stringify(false),
      }),
    ],

    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/].*\.js$/, // we don't want css to be splitted
            chunks: "all",
            name: "vendors",
            priority: 10,
            enforce: true,
          },
        },
      },
    },
  };

  const extractCSS = () => {
    const cssRule = config.module.rules.find((rule) =>
      rule.test.test("foo.css")
    );
    cssRule.use.unshift(MiniCssExtractPlugin.loader);

    config.plugins.push(
      new MiniCssExtractPlugin({
        filename: `${name}.ui.${version}.css`,
        allChunks: true,
      })
    );
  };

  switch (mode) {
    case productionMode:
      config.optimization.minimize = true;
      config.plugins.push(
        new StatsWriterPlugin({
          filename: "manifest.json",
          transform: function transformData(data) {
            const chunks = {
              style: data.assetsByChunkName.app[0],
              app: data.assetsByChunkName.app[1],
              vendors: data.assetsByChunkName.vendors,
            };
            return JSON.stringify(chunks);
          },
        })
      );

      extractCSS();
      break;
    case developmentMode:
    default:
      config.optimization = {};
      config.output = {
        path: destination,
        filename: "bundle.js",
        publicPath: "http://localhost:3000/app/",
      };
      break;
  }

  return config;
};
