var path = require('path');
var fs = require('fs');

var filename = path.join(__dirname, '../elm/elm.js');
eval.apply(global, [fs.readFileSync(filename).toString()]);
Elm.Ast.make(Elm);
var ast = Elm.Ast.values;

module.exports = {
	start: function() { return ast.start; },
	text: function(a,b) { return ast.onText(a)(b); },
	openTag: function(a,b,c) { return ast.onOpenTag(a)(b)(c); },
	closeTag: function(a,b) { return ast.closeTag(a)(b); },
	end: ast.end,
	toElmCode: function(a) { return ast.toElmCode(a); }
};
