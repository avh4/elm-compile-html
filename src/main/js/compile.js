'use strict';

var htmlparser = require('htmlparser2');
var Q = require('kew');

var quoteString = function(s) {
  return "\"" + s.replace(/\t/g, '\\t') + "\"";
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

  var indent = "    ";

  var parser = new htmlparser.Parser({
    onopentag: function(name, attribs) {
      if (stack.length == 0 && cur.closed == true) {
        needsOuterDiv = true;
      }
      var attrStrings = [];
      for (var attr in attribs) {
        attrStrings.push("Attr.attribute " + quoteString(attr) + " " + quoteString(attribs[attr]));
      }
      var attrString;
      if (attrStrings.length == 0) {
        attrString = "[]";
      } else if (attrStrings.length == 1) {
        attrString = "[ " + attrStrings[0] + " ]";
      } else {
        attrString = "[ " + attrStrings.join("\n" + indent + ", ") + "\n" + indent + "]";
      }
      openChild();
      result += "Html.node " + quoteString(name) + "\n" + indent + attrString + "\n" + indent + "[";
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
        "render : Html\n" +
        "render = " + result + "\n";
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