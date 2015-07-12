'use strict';

var expect = require('expect');
var helper = require('./integrationHelper');

var formatString = function(s) {
  return '"' + s + '"';
};

var formatRecord = function(vars) {
  var result = "{ ";
  for (var k in vars) {
    var v = vars[k];
    result += k + "=" + formatString(v);
  }
  result += " }";
  return result;
};

var check = function(html, vars, expectedResult) {
  return helper.compileHtml('Template', html)
  .then(function() {
    return helper.writeFile('View.elm', ''
      + 'module View where\n'
      + '\n'
      + 'import Template\n'
      + '\n'
      + 'render = Template.render ' + formatRecord(vars) + '\n'
      );
  }).then(function() {
    return helper.runElmIO('../src/test/elm/Main.elm');
  }).then(function(result) {
    expect(result).toEqual(expectedResult);
  });
};

describe('mustache', function() {
  this.timeout(2*60*1000); // Only really necessary when ./elm-stuff/ doesn't exist

  it('should compile string variables', function() {
    return check('{{x}}', { x: '10'}, '10');
  });
});