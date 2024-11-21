const { expect } = require("chai");
const config = require("../../lib/config");

const webtaskJson = {};

const pkg = {
  version: "1.0.0",
  name: "MyTest",
  "auth0-extension": { ...webtaskJson },
};

const rootPath = "./";
const args = {
  entry: "./index.js",
  destination: "./dist",
};
const externals = {
  compatible: {},
};

const defaultWebpackConfig = {
  entry: "index.js",
  mode: "development",
  externals: {},
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        // exclude: () => { },
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    node: "12.13.0",
                  },
                },
              ],
            ],
            babelrc: false,
            plugins: [
              require("@babel/plugin-proposal-export-default-from"),
              require("@babel/plugin-transform-runtime"),
              require("@babel/plugin-syntax-dynamic-import"),
            ],
          },
        },
      },
    ],
  },
  output: {
    filename: `${pkg.name}.extension.${pkg.version}.js`,
    library: {
      name: `${pkg.name}.extension`,
      type: "commonjs2",
    },
    path: "dist",
  },
  plugins: [
    {
      definitions: {
        "process.env": {
          CLIENT_VERSION: `"${pkg.version}"`,
          NODE_ENV: '"production"',
        },
      },
    },
    {
      options: {
        banner: '"use strict";',
        raw: true,
      },
    },
  ],
  resolve: {
    alias: {},
    modules: ["node_modules", "node_modules/"],
  },
  target: "node",
};

describe("config", () => {
  describe("default webpack config", () => {
    it("generates a default webpack config", () => {
      const result = config(pkg, rootPath, externals, args, {});

      expect(result.module.rules[0].exclude).to.be.a("function");
      delete result.module.rules[0].exclude;

      expect(result.plugins[1].banner).to.be.a("function");
      delete result.plugins[1].banner;

      expect(result.mode).to.deep.equal("development");
      expect(result.entry).to.deep.equal(defaultWebpackConfig.entry);
      expect(result.mode).to.deep.equal(defaultWebpackConfig.mode);
      expect(result.target).to.deep.equal(defaultWebpackConfig.target);
      expect(result.output).to.deep.equal(defaultWebpackConfig.output);
      expect(result.externals).to.deep.equal(defaultWebpackConfig.externals);
      expect(result.module).to.deep.equal(defaultWebpackConfig.module);
      expect(JSON.parse(JSON.stringify(result.plugins))).to.eql(
        defaultWebpackConfig.plugins
      );
      expect(result.resolve).to.deep.equal(defaultWebpackConfig.resolve);
    });

    it("generates a production config", () => {
      const result = config(pkg, rootPath, externals, args, {
        mode: "production",
      });

      expect(result.mode).to.deep.equal("production");
    });
  });

  describe("externals parsing", () => {
    describe("bundleModules === false", () => {
      const noBundlePackage = Object.assign({}, pkg, {
        "auth0-extension": { ...webtaskJson, bundleModules: false },
        dependencies: {
          "@babel/core": "^7.0.0-beta.44",
          async: "^2.2.0",
        },
        devDependencies: {
          chai: "4.1.2",
        },
      });
      it("sets package.json dependencies as external", () => {
        const result = config(noBundlePackage, rootPath, externals, args, {});
        expect(result.externals).to.eql({
          "@babel/core": "commonjs @babel/core",
          async: "commonjs async",
        });
      });
    });

    [true, undefined].map((bundleModules) =>
      describe(`bundleModules === ${bundleModules}`, () => {
        const bundlePackage = Object.assign({}, pkg, {
          "auth0-extension": {
            ...webtaskJson,
            bundleModules,
            externals: [
              // TODO: This library does not work with scoped package names such as @babel/core
              "@babel/core@^7.0.0-beta.44",
              "@babel/preset-env",
              "async@^2.3.0",
              "SomethingElse",
            ],
          },
          dependencies: { async: "^2.2.0" },
          devDependencies: { chai: "4.1.2" },
        });

        it("sets the externals as external", () => {
          const result = config(bundlePackage, rootPath, externals, args, {});
          expect(result.externals).to.eql({
            "@babel/core": "commonjs @babel/core@^7.0.0-beta.44",
            "@babel/preset-env": "commonjs @babel/preset-env",
            async: "commonjs async@^2.3.0",
            SomethingElse: "commonjs SomethingElse",
          });
        });
      })
    );
  });

  describe("nodeTarget", () => {
    [
      { target: "8.9.0" },
      { target: "^8", expectedTarget: "8.0.0" },
      { target: "8.11.1" },
      { target: "4.2.0" },
      { target: "4.9.1" },
      { target: "notSemVer", expectedTarget: "12.13.0" },
      { target: "4", expectedTarget: "4.0.0" },
    ].map((test) =>
      describe(`${test.target}`, () => {
        const targetPackage = Object.assign({}, pkg, {
          "auth0-extension": { ...webtaskJson, nodeTarget: test.target },
        });

        it("properly configures babel", () => {
          const result = config(targetPackage, rootPath, externals, args, {});
          const babelTarget =
            result.module.rules[0].use.options.presets[0][1].targets;

          const expected = test.expectedTarget || test.target;
          expect(babelTarget).to.eql({ node: expected });
        });
      })
    );
  });

  describe("useBabel", () => {
    [
      { useBabel: false, expected: false },
      { useBabel: undefined, expected: true },
      { useBabel: true, expected: true },
    ].map((test) => {
      describe(`when set to ${test.useBabel}`, () => {
        const targetPackage = Object.assign({}, pkg, {
          "auth0-extension": { ...webtaskJson, useBabel: test.useBabel },
        });
        it(`${test.expected ? "does" : "does not"} load babel`, () => {
          const result = config(targetPackage, rootPath, externals, args, {});
          const rules = result.module.rules;

          if (test.expected) {
            expect(rules).to.not.be.empty;
          } else {
            expect(rules).to.be.empty;
          }
        });
      });
    });
  });
});
