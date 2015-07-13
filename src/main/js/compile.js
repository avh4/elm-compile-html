'use strict';

var htmlparser = require('htmlparser2');
var Q = require('kew');
var format = require('./format');
var ast = require('./ast');

var MustacheNode = function(text) {
  this.vars = {};
  var match = /((?:.|[\r\n])*?){{([^}]+)}}/.exec(text);
  if (match) {
    if (match[2][0] == '#') {
      var match = /((?:.|[\r\n])*?){{([^}]+)}}((?:.|[\r\n])*?){{\//.exec(text);
      var name = match[2].slice(1);
      this.vars[name] = 'Bool';
      this.toElm = function() {
        return 'if model.' + name + ' then ' + format.string(match[3]) + ' else ""';
      };
    } else if (match[2][0] == '/') {
      throw new Error();
    } else {
      var match = /((?:.|[\r\n])*?){{([^}]+)}}((?:.|[\r\n])*)/.exec(text);
      var name = match[2];
      this.vars[name] = 'String';
      this.toElm = function() {
        return format.text(
          format.infix(
            format.infix(
              format.string(match[1]), "++", "model." + name),
            "++", format.string(match[3]))
          );
      };
    }
  } else {
    this.toElm = function() {
      return format.text(format.string(text));
    };
  }
};

var compile = function(moduleName, html) {
  var defer = Q.defer();
  var vars = {};
  var a = ast.start();

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
      // console.log(a);
      // openChild();
      // cur.type = "Html.text";
      // cur.value = new MustacheNode(text);
      // vars = cur.value.vars;
      // closeChild();
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
