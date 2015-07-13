var path = require('path');
var fs = require('fs');

var filename = path.join(__dirname, '../elm/elm.js');
eval.apply(global, [fs.readFileSync(filename).toString()]);
Elm.Ast.make(Elm);
var ast = Elm.Ast.values;

module.exports = {
	start: function(a) { return ast.start(a); },
	text: function(a,b) { return ast.onText(a)(b); },
	openTag: function(a,b,c) { return ast.onOpenTag(a)(b)(c); },
	closeTag: function(a,b) { return ast.closeTag(a)(b); },
	end: function(a) { return ast.end(a); },
	toElmCode: function(a) { return ast.toElmCode(a); }
};
