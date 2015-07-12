'use strict';

var expect = require('expect');

var compile = require('../../../src/main/js/compile.js');

describe('formatting', function() {
  it('should indent parameters', function() {
    return compile('View', '<div></div>').then(function(result) {
      expect(result).toContain('render = Html.node "div"\n    []\n    []');
    });
  });

  it('should put space around a single attribute', function() {
    return compile('View', '<div class="link"></div>').then(function(result) {
      expect(result).toContain('render = Html.node "div"\n    [ Attr.attribute "class" "link" ]\n    []');
    });
  });
});