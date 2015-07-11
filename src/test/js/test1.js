'use strict';

var expect = require('expect');
var fs = require('fs');
var child_process = require('child_process');
var Q = require('kew');

var compile = require('../../../index.js');

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

var writeFile = function(filename, content) {
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

var check = function(html, done, expectedResult) {
  initElm()
  .then(function() {
    return cleanElm();
  }).then(function() {
    return compile('View', html);
  }).then(function(elmCode) {
    return writeFile('View.elm', elmCode);
  }).then(function() {
    return exec('elm-make ../src/test/elm/Main.elm');
  }).then(function() {
    return exec('../src/test/elm/elm-io.sh elm.js elmio.js');
  }).then(function() {
    return exec('node ./elmio.js');
  }).then(function(result) {
    expect(result).toEqual(expectedResult || html);
  }).then(function() { done(); }, function(e) { done(e); });
};

describe('main', function() {
  this.timeout(2*60*1000); // Only really necessary when ./elm-stuff/ doesn't exist
  
  it('should compile a single HTML tag', function(done) {
    check('<body></body>', done);
  });

  it('should compile a single self-closing tag', function(done) {
    check('<div/>', done, '<div></div>');
  });
});
