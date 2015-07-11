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

  var parser = new htmlparser.Parser({
    onopentag: function(name, attribs){
      result += "Html." + name + " [] [";
    },
    ontext: function(text){
      result += "Html.text " + quoteString(text);
    },
    onclosetag: function(tagname){
      result += "]";
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