# Auth0 Extensions CLI

Command-line tool allowing you to build a Node.js backend as an Auth0 Extension

> yarn add --dev auth0-extensions-cli

## Usage

### Building the backend

In order to compile your Node.js backend into an Auth0 Extension you can add a script similar to this one to your `package.json` file

```json
{
  "name": "my-extension",
  ...
  "scripts": {
    "extension:build": "a0-ext build:server ./webtask.js ./dist",
    ...
  }
}
```

Then simply run `npm run extension:build` to compile the extension. This will then take the `webtask.js` file as the entrypoint and place the output in the `./dist` folder.

#### Additional Configuration

You can add an `auth0-extension` node to your `package.json` file to specify specific versions of Node.js modules which are available on the Webtask platform (as a result these modules will not be bundled in the extension itself). And it's also possible to define settings which will be available in the extension under `process.env`.

```json
{
  "name": "my-extension",
  ...
  "scripts": {
    "extension:build": "a0-ext build:server ./webtask.js ./dist",
    ...
  },
  "auth0-extension": {
    "externals": [
      "async@2.1.2",
      "auth0@2.4.0",
      "bluebird@3.4.6",
      "body-parser@1.12.4",
      "ejs@2.3.1",
      "express@4.14.0",
      "iconv-lite@0.4.10",
      "jsonwebtoken@7.1.9",
      "jwks-rsa@1.1.1",
      "lodash@3.10.1",
      "lru-memoizer@1.10.0",
      "node-uuid@1.4.3",
      "morgan@1.5.3",
      "request@2.67.0",
      "superagent@1.2.0",
      "tough-cookie@2.2.2",
      "webtask-tools",
      "winston@1.0.0"
    ],
    "nodeTarget": "8.9.0",
    "bundleModules": false,
    "settings": {
      "WARN_DB_SIZE": 409600,
      "MAX_MULTISELECT_USERS": 5,
      "MULTISELECT_DEBOUNCE_MS": 250,
      "PER_PAGE": 10
    }
  }
}
```

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

For auth0 related questions/support please use the [Support Center](https://support.auth0.com).

## Author

[Auth0](auth0.com)

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
