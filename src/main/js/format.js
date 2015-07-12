'use strict';

var string = module.exports.string = function(s) {
  return "\"" + s
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    + "\"";
};

var list = function(list, indent) {
  if (list.length == 0) {
    return "[]";
  } else if (list.length == 1) {
    return "[ " + list[0] + " ]";
  } else {
    return "[ " + list.join("\n" + indent + ", ") + "\n" + indent + "]";
  }
};

var function_ = function(name, type, vars, body) {
  return name + " : " + type + "\n" +
         name + (vars.length > 0 ? " " : "") + vars + " = " + body + "\n";
};

var module_ = function(name, body) {
  return "module " + name + " where\n" +
        "\n" +
        "import Html exposing (Html)\n" +
        "import Html.Attributes as Attr\n" +
        "\n" +
        body + "\n";
};

var typeAlias = function(name, definition) {
  return "type alias " + name + " =" + definition;
};

var recordType = function(fields) {
  var entries = [];
  for (var k in fields) {
    var v = fields[k];
    entries.push(k + " : " + v);
  }
  return "{ " + entries.join(", ") + " }";
};

module.exports.node = function(name, attrs, children, indent) {
  var formattedAttrs = list(attrs, indent);
  var formattedChildren = list(children, indent);
  if (attrs.length == 0 && children.length == 0) {
    return "Html.node " + string(name) + " [] []";
  } else if (formattedAttrs.indexOf('\n') == -1 && formattedChildren.indexOf('\n') == -1 && indent.length + formattedAttrs.length + formattedChildren.length < 100) {
    return "Html.node " + string(name) + " " + formattedAttrs + " " + formattedChildren;
  } else {
    return "Html.node " + string(name) + "\n"
        + indent + formattedAttrs + "\n"
        + indent + formattedChildren;
  }
};

module.exports.text = function(value) {
  return "Html.text " + value;
};

module.exports.attribute = function(name, value) {
  return "Attr.attribute " + string(name) + " " + string(value);
};

module.exports.htmlModule = function(name, vars, root) {
  if (Object.keys(vars).length == 0) {
    var render = function_("render", "Html", "", root);
    return module_(name, render);
  } else {
    var model = typeAlias("Model", recordType({x:"String"}));
    var render = function_("render", "Model -> Html", "model", root);
    return module_(name, model + "\n\n" + render);
  }
};
