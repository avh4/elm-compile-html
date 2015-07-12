'use strict';

var htmlparser = require('htmlparser2');
var Q = require('kew');
var format = require('./format');

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
      cur.children.push(format.text(closed.value));
    } else if (closed.type == "Html.node") {
      cur.children.push(format.node(closed.name, closed.attrStrings, closed.children, closed.indent));
    } else {
      throw new Error("Internal error: invalid cur.type: " + closed.type);
    }
  };

  var parser = new htmlparser.Parser({
    onopentag: function(tagname, attribs) {
      openChild();
      var attrStrings = [];
      for (var attr in attribs) {
        attrStrings.push(format.attribute(attr, attribs[attr]));
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
      var root;
      if (cur.children.length == 1) {
        root = cur.children[0];
      } else {
        root = format.node("div", [], cur.children, "  ");
      }
      var module = format.htmlModule(moduleName, root);
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