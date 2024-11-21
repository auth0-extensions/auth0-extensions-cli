const fs = require("fs/promises");
const path = require("path");
const _ = require("lodash");
const { glob } = require("glob");
const semver = require("semver");

const LIST_MODULES_URL = "https://auth0-internal.us8.webtask.io/canirequire";
const url = new URL(LIST_MODULES_URL);
url.searchParams.append("json", "true");

module.exports = async (searchPath, runtime = "node12") => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-wt-runtime": runtime,
    },
  });
  const data = await response.json();
  const webtaskModules = _.orderBy(
    data.modules,
    ["name", "version"],
    ["asc", "desc"]
  );

  const matches = await glob("**/package.json", { cwd: searchPath });
  const results = await Promise.all(
    matches.map((file) => fs.readFile(path.join(searchPath, file), "utf-8"))
  );

  // Flatten all dependencies.
  const allDependencies = results.map((file) => JSON.parse(file).dependencies);
  const dependencyTree = _.reduce(
    allDependencies,
    (output, dependencies) => {
      _.keys(dependencies).forEach((moduleName) => {
        const version = dependencies[moduleName];
        const versions = output[moduleName] || [];
        if (versions.indexOf(version) === -1) {
          versions.push(version);
        }
        output[moduleName] = versions;
      });
      return output;
    },
    {}
  );

  // Calculate externals.
  const externals = _.reduce(
    dependencyTree,
    (output, versions, moduleName) => {
      const modules = _.filter(
        webtaskModules,
        (module) => module.name === moduleName && module.version !== "native"
      );
      if (!versions || versions.length !== 1 || _.isEmpty(modules)) {
        output.incompatible[moduleName] = {
          local: versions,
          webtask: "N/A",
        };
        return output;
      }

      const webtaskModule = _.find(modules, (module) =>
        semver.satisfies(module.version, versions[0])
      );
      if (webtaskModule) {
        output.compatible[
          moduleName
        ] = `${moduleName}@${webtaskModule.version}`;
      } else {
        output.incompatible[moduleName] = {
          local: versions,
          webtask: _.map(modules, "version"),
        };
      }

      return output;
    },
    { compatible: {}, incompatible: {} }
  );

  return externals;
};
