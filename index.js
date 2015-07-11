'use strict';

var Q = require('kew');

var compile = function(html) {
  var defer = Q.defer();

  var result = "" +
    "module View where\n" +
    "\n" +
    "import Html exposing (Html)\n" +
    "\n" +
    "view : Html\n" +
    "view = Html.body [] []\n" +
    "";
  defer.resolve(result);

  return defer.promise;
};

module.exports = compile;