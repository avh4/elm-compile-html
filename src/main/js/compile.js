'use strict';

var htmlparser = require('htmlparser2');
var Q = require('kew');

var quoteString = function(s) {
  return "\"" + s
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    + "\"";
};

var formatList = function(list, indent) {
  if (list.length == 0) {
    return "[]";
  } else if (list.length == 1) {
    return "[ " + list[0] + " ]";
  } else {
    return "[ " + list.join("\n" + indent + ", ") + "\n" + indent + "]";
  }
};

var formatNode = function(name, attrs, children, indent) {
  var formattedAttrs = formatList(attrs, indent);
  var formattedChildren = formatList(children, indent);
  if (attrs.length == 0 && children.length == 0) {
    return "Html.node " + quoteString(name) + " [] []";
  } else if (formattedAttrs.indexOf('\n') == -1 && formattedChildren.indexOf('\n') == -1 && indent.length + formattedAttrs.length + formattedChildren.length < 100) {
    return "Html.node " + quoteString(name) + " " + formattedAttrs + " " + formattedChildren;
  } else {
    return "Html.node " + quoteString(name) + "\n"
        + indent + formattedAttrs + "\n"
        + indent + formattedChildren;
  }
};

var formatText = function(text) {
  return "Html.text " + quoteString(text);
};

var formatAttribute = function(name, value) {
  return "Attr.attribute " + quoteString(name) + " " + quoteString(value);
};

var compile = function(moduleName, html) {
  var defer = Q.defer();
  var cur = { children:[], indent:"" };
  var stack = [];

  var openChild = function() {
    stack.push(cur);
    cur = { children:[], indent: cur.indent+"    " };
  };
  var closeChild = function() {
    var closed = cur;
    cur = stack.pop();

    if (closed.type == "Html.text") {
      cur.children.push(formatText(closed.value));
    } else if (closed.type == "Html.node") {
      cur.children.push(formatNode(closed.name, closed.attrStrings, closed.children, closed.indent));
    } else {
      throw new Error("Internal error: invalid cur.type: " + closed.type);
    }
  };

  var parser = new htmlparser.Parser({
    onopentag: function(tagname, attribs) {
      openChild();
      var attrStrings = [];
      for (var attr in attribs) {
        attrStrings.push(formatAttribute(attr, attribs[attr]));
      }
      cur.attrStrings = attrStrings;
    },
    ontext: function(text){
      openChild();
      cur.type = "Html.text";
      cur.value = text;
      closeChild();
    },
    onclosetag: function(tagname){
      cur.type = "Html.node";
      cur.name = tagname;
      closeChild();
    },
    onend: function() {
      var result;
      if (cur.children.length == 1) {
        result = cur.children[0];
      } else {
        result = formatNode("div", [], cur.children, "  ");
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