const { expect } = require('chai');
const config = require('../../lib/config');

const pkg = {
  'auth0-extension': {
  }
};

const webtaskJson = {
  version: '1.0.0',
  name: 'MyTest'
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
  externals: {},
  mode: 'none',
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
          ]
        }
      }
    }]
  },
  output: {
    filename: `${webtaskJson.name}.extension.${webtaskJson.version}.js`,
    library: `${webtaskJson.name}.extension`,
    libraryTarget: 'commonjs2',
    path: 'dist'
  },
  plugins: [
    {
      options: {
        cache: false,
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
          CLIENT_VERSION: `"${webtaskJson.version}"`,
          NODE_ENV: '"production"'
        }
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
      const result = config(pkg, webtaskJson, rootPath, args, externals);

      expect(result.module.rules[0].exclude).to.be.a('function');
      delete result.module.rules[0].exclude;

      expect(result.plugins[0].options.warningsFilter).to.be.a('function');
      delete result.plugins[0].options.warningsFilter;
      expect(result).to.eql(defaultWebpackConfig);
    });
  });
  describe('externals parsing', () => {
    describe('bundleModules === false', () => {
      const noBundlePackage = Object.assign({}, pkg, {
        'auth0-extension': { bundleModules: false },
        dependencies: {
          '@babel/core': '^7.0.0-beta.44',
          async: '^2.2.0'
        },
        devDependencies: {
          chai: '4.1.2'
        }
      });
      it('sets package.json dependencies as external', () => {
        const result = config(noBundlePackage, webtaskJson, rootPath, args, externals);
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
          const result = config(bundlePackage, webtaskJson, rootPath, args, externals);
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
});
