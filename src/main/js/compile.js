'use strict';

var htmlparser = require('htmlparser2');
var Q = require('kew');
var ast = require('./ast');

var compile = function(moduleName, html) {
  var defer = Q.defer();
  var vars = {};
  var a = ast.start(moduleName);

  var unwrapResult = function(result) {
    if (result.ctor == 'Ok') {
      return result._0;
    } else if (result.ctor == 'Err') {
      throw new Error(result._0);
    } else {
      throw new Error("Internal error: not a Result: " + result);
    }
  };

  var parser = new htmlparser.Parser({
    onopentag: function(tagname, attribs) {
      var attrs = { ctor: '[]' };
      for (var key in attribs) {
        var value = attribs[key];
        var tuple = { ctor: '_Tuple2', _0: key, _1: value };
        attrs = { ctor: '::', _0: tuple,  _1: attrs };
      }
      a = ast.openTag(tagname, attrs, a);
    },
    ontext: function(text){
      a = ast.text(text, a);
    },
    onclosetag: function(tagname) {
      a = unwrapResult(ast.closeTag(tagname, a));
    },
    onend: function() {
      var module = ast.toElmCode(unwrapResult(ast.end(a)));
      defer.resolve(module);
    },
    onerror: function(error) {
      defer.reject(error);
    }
  }, {decodeEntities: true});
  parser.write(html);
  parser.end();

  return defer.promise;
};

module.exports = compile;
