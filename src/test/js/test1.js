'use strict';

var expect = require('expect');
var fs = require('fs');
var child_process = require('child_process');
var Q = require('kew');

var compile = require('../../../src/main/js/compile.js');

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
  if (!done) throw new Error('Forgot to pass done');
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

  it('should compile nested tags', function(done) {
    check('<strong><i></i></strong>', done);
  });

  it('should compile text', function(done) {
    check('<b>B</b>', done);
  });

  it('should compile multiple children', function(done) {
    check('<h1><i></i><b></b></h1>', done);
  });

  it('should compile multiple children at different levels', function(done) {
    check('<h1><i><a></a></i><b><a></a></b></h1>', done);
  });

  it('should compile multiple children with text', function(done) {
    check('<h1>I<i></i>IB<b></b>B</h1>', done);
  });

  it('should compile attributes', function(done) {
    check('<a href="http://example.com">Example</a>', done);
  });

  it('should compile multiple attributes', function(done) {
    check('<a href="http://example.com" name="link">Example</a>', done);
  });

  it('should compile class attributes', function(done) {
    check('<a class="button">Example</a>', done);
  });

  it('should wrap multiple root elements in a div', function(done) {
    check('<a></a><b></b>', done, '<div><a></a><b></b></div>');
  });
});
