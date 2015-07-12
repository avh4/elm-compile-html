'use strict';

var htmlparser = require('htmlparser2');
var Q = require('kew');

var quoteString = function(s) {
  return "\"" + s + "\"";
};

var compile = function(moduleName, html) {
  var defer = Q.defer();
  var result = "";
  var cur = {};
  var stack = [];
  var needsOuterDiv = false;

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
      if (stack.length == 0 && cur.closed == true) {
        needsOuterDiv = true;
      }
      var attrString = "";
      for (var attr in attribs) {
        if (attrString[0]) {
          attrString += ",";
        }
        attrString += "Attr." + attr + " " + quoteString(attribs[attr]);
      }
      openChild();
      result += "Html." + name + " [" + attrString + "] [";
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
      if (needsOuterDiv) {
        result = "Html.div [] [" + result + "]";
      }
      result = "" +
        "module " + moduleName + " where\n" +
        "\n" +
        "import Html exposing (Html)\n" +
        "import Html.Attributes as Attr\n" +
        "\n" +
        "view : Html\n" +
        "view = " + result + "\n";
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