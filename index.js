'use strict';

var htmlparser = require('htmlparser2');
var Q = require('kew');

var quoteString = function(s) {
  return "\"" + s + "\"";
};

var compile = function(moduleName, html) {
  var defer = Q.defer();
  var result = "" +
    "module " + moduleName + " where\n" +
    "\n" +
    "import Html exposing (Html)\n" +
    "\n" +
    "view : Html\n" +
    "view = ";
  var cur = {};
  var stack = [];

  var openChild = function() {
    if (cur.closed) {
      result += ', ';
    }
    stack.push(cur);
    cur = {};
  };
  var closeChild = function() {
    cur = stack.pop();
    cur.closed = true;
  };

  var parser = new htmlparser.Parser({
    onopentag: function(name, attribs) {
      openChild();
      result += "Html." + name + " [] [";
    },
    ontext: function(text){
      openChild();
      result += "Html.text " + quoteString(text);
      closeChild();
    },
    onclosetag: function(tagname){
      result += "]";
      closeChild();
    },
    onend: function() {
      defer.resolve(result);
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