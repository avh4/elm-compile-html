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
    var args = formatRecord(vars);
    if (args.replace(/ /g, '') == '{}') args = '';
    return helper.writeFile('View.elm', ''
      + 'module View where\n'
      + '\n'
      + 'import Template\n'
      + '\n'
      + 'render = Template.render ' + args + '\n'
      );
  }).then(function() {
    return helper.runElmIO('../src/test/elm/Main.elm');
  }).then(function(result) {
    expect(result).toEqual(expectedResult);
  });
};

var mustacheSpec = function(specFile, specName) {
  it(specFile + ' : ' + specName, function() {
    return helper.readYaml('../submodules/mustache-spec/specs/' + specFile + '.yml')
    .then(function(yml) {
      var foundTest = undefined;
      yml.tests.forEach(function(t) {
        if (t.name == specName) {
          if (!!foundTest) throw new Error('Found multiple mustache specs: ' + specFile + '/' + specName);
          foundTest = t;
        }
      });
      if (!foundTest) throw new Error('No such mustache spec: ' + specFile + '/' + specName);

      return check(foundTest.template, foundTest.data, foundTest.expected);
    });
  });
};

describe('mustache', function() {
  this.timeout(2*60*1000); // Only really necessary when ./elm-stuff/ doesn't exist

  it('should compile string variables', function() {
    return check('{{x}}', { x: '10'}, '10');
  });

  describe('official mustache spec', function() {
    mustacheSpec('interpolation', 'No Interpolation');
  });
});