const path = require('path');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

const getConfig = require('./client-config.js');

console.info('Running development webpack server...');

module.exports = (rootPath, entry, destination, port = 3000, proxyPort = 3001) => {
  const mode = 'development';
  const compiler = webpack(getConfig({ name: 'dev-client', version: '0' }, rootPath, mode, entry, destination));
  const options = {
    publicPath: `http://localhost:${port}/app/`,
    disableHostCheck: true,
    hot: true,
    inline: true,
    historyApiFallback: true,
    proxy: [
      {
        context: () => true,
        target: {
          port: proxyPort
        }
      }
    ],

    quiet: false,
    noInfo: true,
    watchOptions: {
      aggregateTimeout: 300,
      poll: 1000
    },

    stats: { colors: true },
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  };

  new WebpackDevServer(compiler, options)
    .listen(port, 'localhost',
      (err) => {
        if (err) {
          console.error(err);
        } else {
          console.info(`Development server listening on: http://localhost:${port}`);

          // Start the actual webserver.
          require(path.join(rootPath, 'index.js'));
        }
      });
};
