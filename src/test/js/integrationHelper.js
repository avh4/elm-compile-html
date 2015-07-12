var child_process = require('child_process');
var Q = require('kew');
var fs = require('fs');
var yaml = require('js-yaml');
var compile = require('../../../src/main/js/compile');

var exec = function(command) {
  var defer = Q.defer();
  child_process.exec(command, function(error, stdout, stderr) {
    if (error) {
      console.log(stdout);
      console.log(stderr);
      defer.reject(error);
    } else {
      defer.resolve(stdout);
    }
  });
  return defer.promise;
};

var initElm = function() {
  var defer = Q.defer();
  defer.resolve();
  if (fs.existsSync('./elm-stuff')) {
    return defer.promise;
  } else {
    return defer.promise.then(function() {
      return exec('elm-package install --yes');
    });
  }
};

var cleanElm = function() {
  return exec('rm -Rf ./elm-stuff/build-artifacts/USER');
}

var writeFile = module.exports.writeFile = function(filename, content) {
  var defer = Q.defer();
  fs.writeFile(filename, content, function(err) {
    if (err) {
      defer.reject(err);
    } else {
      defer.resolve();
    }
  });
  return defer.promise;
};

module.exports.compileHtml = function(module, html) {
  return initElm()
  .then(function() {
    return cleanElm();
  }).then(function() {
    return compile(module, html);
  }).then(function(elmCode) {
    return writeFile(module + '.elm', elmCode);
  });
};

module.exports.runElmIO = function(file) {
  return exec('elm-make ' + file)
  .then(function() {
    return exec('../src/test/elm/elm-io.sh elm.js elmio.js');
  }).then(function() {
    return exec('node ./elmio.js');
  });
};

module.exports.readYaml = function(filename) {
  var defer = Q.defer();
  var doc = yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
  defer.resolve(doc);
  return defer.promise;
};
