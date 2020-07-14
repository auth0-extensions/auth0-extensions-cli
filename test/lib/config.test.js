const { expect } = require('chai');
const config = require('../../lib/config');


const webtaskJson = { };

const pkg = {
  version: '1.0.0',
  name: 'MyTest',
  'auth0-extension': { ...webtaskJson }
};

const rootPath = './';
const args = {
  entryPoint: './index.js',
  destinationFolder: './dist'
};
const externals = {
  compatible: {}
};

const defaultWebpackConfig = {
  entry: 'index.js',
  mode: 'none',
  externals: {},
  module: {
    rules: [{
      test: /\.jsx?$/,
      // exclude: () => { },
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            [
              '@babel/preset-env',
              {
                shippedProposals: true,
                targets: {
                  node: '4.2.0'
                }
              }
            ]
          ],
          babelrc: false,
          plugins: [
            '@babel/plugin-proposal-class-properties',
            '@babel/plugin-proposal-export-default-from',
            '@babel/plugin-proposal-export-namespace-from',
            '@babel/plugin-transform-runtime',
            '@babel/plugin-syntax-dynamic-import'
          ]
        }
      }
    }]
  },
  output: {
    filename: `${pkg.name}.extension.${pkg.version}.js`,
    library: `${pkg.name}.extension`,
    libraryTarget: 'commonjs2',
    path: 'dist'
  },
  plugins: [
    {
      options: {
        cache: false,
        cacheKeys: () => {},
        minify: undefined,
        exclude: undefined,
        extractComments: false,
        include: undefined,
        parallel: false,
        sourceMap: false,
        test: /\.js(\?.*)?$/i,
        uglifyOptions: {
          compress: {
            dead_code: true,
            unused: true,
            warnings: false
          },
          ecma: 6,
          output: {
            comments: false
          }
        }
        // warningsFilter: () => { }
      }
    },
    {
      definitions: {
        'process.env': {
          CLIENT_VERSION: `"${pkg.version}"`,
          NODE_ENV: '"production"'
        }
      }
    },
    {
      options: {
        banner: '"use strict";',
        raw: true
      }
    }
  ],
  resolve: {
    alias: {},
    modules: [
      'node_modules',
      'node_modules/'
    ]
  },
  target: 'node'
};

describe('config', () => {
  describe('default webpack config', () => {
    it('generates a default webpack config', () => {
      const result = config(pkg, rootPath, args, externals);

      expect(result.module.rules[0].exclude).to.be.a('function');
      delete result.module.rules[0].exclude;

      expect(result.plugins[0].options.warningsFilter).to.be.a('function');
      delete result.plugins[0].options.warningsFilter;

      expect(result.plugins[2].banner).to.be.a('function');
      delete result.plugins[2].banner;
      expect(result).to.eql(defaultWebpackConfig);
    });
  });
  describe('externals parsing', () => {
    describe('bundleModules === false', () => {
      const noBundlePackage = Object.assign({}, pkg, {
        'auth0-extension': { ...webtaskJson, bundleModules: false },
        dependencies: {
          '@babel/core': '^7.0.0-beta.44',
          async: '^2.2.0'
        },
        devDependencies: {
          chai: '4.1.2'
        }
      });
      it('sets package.json dependencies as external', () => {
        const result = config(noBundlePackage, rootPath, args, externals);
        expect(result.externals).to.eql({
          '@babel/core': 'commonjs @babel/core',
          async: 'commonjs async'
        });
      });
    });

    [true, undefined].map(bundleModules =>
      describe(`bundleModules === ${bundleModules}`, () => {
        const bundlePackage = Object.assign({}, pkg, {
          'auth0-extension': {
            ...webtaskJson,
            bundleModules,
            externals: [
              // TODO: This library does not work with scoped package names such as @babel/core
              '@babel/core@^7.0.0-beta.44',
              '@babel/preset-env',
              'async@^2.3.0',
              'SomethingElse'

            ]
          },
          dependencies: { async: '^2.2.0' },
          devDependencies: { chai: '4.1.2' }
        });

        it('sets the externals as external', () => {
          const result = config(bundlePackage, rootPath, args, externals);
          expect(result.externals).to.eql({
            '@babel/core': 'commonjs @babel/core@^7.0.0-beta.44',
            '@babel/preset-env': 'commonjs @babel/preset-env',
            async: 'commonjs async@^2.3.0',
            SomethingElse: 'commonjs SomethingElse'
          });
        });
      })
    );
  });

  describe('nodeTarget', () => {
    [
      { target: '8.9.0', expectedEcma: 8 },
      { target: '^8', expectedEcma: 8, expectedTarget: '8.0.0' },
      { target: '8.11.1', expectedEcma: 8 },
      { target: '4.2.0', expectedEcma: 6 },
      { target: '4.9.1', expectedEcma: 6 },
      { target: 'notSemVer', expectedEcma: 6, expectedTarget: '4.2.0' },
      { target: '4', expectedEcma: 6, expectedTarget: '4.0.0' }
    ].map(test =>
      describe(`${test.target}`, () => {
        const targetPackage = Object.assign({}, pkg, {
          'auth0-extension': { ...webtaskJson, nodeTarget: test.target }
        });

        it('properly configures babel', () => {
          const result = config(targetPackage, rootPath, args, externals);
          const babelTarget = result.module.rules[0].use.options.presets[0][1].targets;

          const expected = test.expectedTarget || test.target;
          expect(babelTarget).to.eql({ node: expected });
        });

        it('properly configures uglify', () => {
          const result = config(targetPackage, rootPath, args, externals);
          expect(result.plugins[0].options.uglifyOptions.ecma).to.eql(test.expectedEcma);
        });
      })
    );
  });

  describe('useBabel', () => {
    [
      { useBabel: false, expected: false },
      { useBabel: undefined, expected: true },
      { useBabel: true, expected: true }
    ].map((test) => {
      describe(`when set to ${test.useBabel}`, () => {
        const targetPackage = Object.assign({}, pkg, {
          'auth0-extension': { ...webtaskJson, useBabel: test.useBabel }
        });
        it(`${test.expected ? 'does' : 'does not'} load babel`, () => {
          const result = config(targetPackage, rootPath, args, externals);
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
