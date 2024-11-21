const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");

const getConfig = require("./client-config.js");

module.exports = (rootPath, entry, destination, port = 3000) => {
  const pkg = { name: "dev-client", version: "0" };
  const args = { entry, destination };
  const opts = { mode: "development" };

  const config = getConfig(pkg, rootPath, args, opts);
  const compiler = webpack(config);
  const server = new WebpackDevServer(
    {
      host: "localhost",
      port,
      hot: true,
      inline: true,
      liveReload: true,
      historyApiFallback: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
    compiler
  );

  return new Promise((resolve, reject) => {
    server.startCallback((err) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.info(
          `Development server listening on: http://localhost:${port}`
        );
        resolve();
      }
    });
  });
};
