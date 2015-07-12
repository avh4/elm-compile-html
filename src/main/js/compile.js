'use strict';

var htmlparser = require('htmlparser2');
var Q = require('kew');
var format = require('./format');

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
  var cur = { children:[], indent:"" };
  var stack = [];
  var vars = {};

  var openChild = function() {
    stack.push(cur);
    cur = { children:[], indent: cur.indent+"    " };
  };
  var closeChild = function() {
    var closed = cur;
    cur = stack.pop();

    if (closed.type == "Html.text") {
      cur.children.push(closed.value.toElm());
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
      cur.value = new MustacheNode(text);
      vars = cur.value.vars;
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
      var module = format.htmlModule(moduleName, vars, root);
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