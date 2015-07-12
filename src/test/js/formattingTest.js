'use strict';

var expect = require('expect');

var compile = require('../../../src/main/js/compile.js');

describe('formatting', function() {
  it('should indent parameters', function() {
    return compile('View', '<div></div>').then(function(result) {
      expect(result).toContain('render = Html.node "div"\n    []\n    []');
    });
  });
});