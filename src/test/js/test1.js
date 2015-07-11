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

var elmPackageInstall = function(packageName) {
  return exec('elm-package install --yes ' + packageName);
}

var initElm = function() {
  var defer = Q.defer();
  defer.resolve();
  if (fs.existsSync('./elm-stuff')) {
    return defer.promise;
  } else {
    return defer.promise.then(function() {
      return elmPackageInstall('maxsnew/IO');
    });
  }
};

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

var elmMake = function(filename) {
  return exec('elm-make ' + filename);
}

var check = function(html, done) {
  var elmCode = compile('View', html);
  initElm().then(function() {
    return writeFile('View.elm', elmCode);
  }).then(function() {
    return elmMake('Main.elm');
  }).then(function() {
    return exec('./elm-io.sh elm.js elmio.js');
  }).then(function() {
    return exec('node ./elmio.js');
  }).then(function(result) {
    expect(result).toEqual(html);
  }).then(function() { done(); }, function(e) { done(e); });
};

describe('main', function() {
  this.timeout(2*60*1000); // Only really necessary when ./elm-stuff/ doesn't exist
  
  it('should compile a single HTML tag', function(done) {
    check('<body></body>', done);
  });
  // it('should compile a single self-closing tag', function() {
  //  expect(compile('View', '<div/>'))
  //  .toEqual(
  //    'module View where\n' +
  //    '\n' +
  //    ''
  //    );
  // });
  // describe('single HTML node', function() {

  // });
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function () {
      expect([1,2,3].indexOf(5)).toEqual(-1);
      expect([1,2,3].indexOf(0)).toEqual(-1);
    });
  });
});