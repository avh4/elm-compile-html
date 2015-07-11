
var compile = function() {
	return "" +
		"module View where\n" +
		"\n" +
		"import Html exposing (Html)\n" +
		"\n" +
		"view : Html\n" +
		"view = Html.body [] []\n" +
		"";
};

module.exports = compile;