var string = function(s) {
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

module.exports.text = function(text) {
  return "Html.text " + string(text);
};

module.exports.attribute = function(name, value) {
  return "Attr.attribute " + string(name) + " " + string(value);
};
