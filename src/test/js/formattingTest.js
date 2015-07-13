'use strict';

var expect = require('expect');

var compile = require('../../../src/main/js/compile.js');

describe.skip('formatting', function() {
  it('should put empty node on one line', function() {
    return compile('View', '<div></div>').then(function(result) {
      expect(result).toContain('render = Html.node "div" [] []');
    });
  });

  it('should put space around a single attribute', function() {
    return compile('View', '<div class="link"></div>').then(function(result) {
      expect(result).toContain('[ Attr.attribute "class" "link" ]');
    });
  });

  it('should indent multiple attributes', function() {
    return compile('View', '<div class="link" data-tooltip="example"></div>').then(function(result) {
      expect(result).toContain('render = Html.node "div"\n    [ Attr.attribute "class" "link"\n    , Attr.attribute "data-tooltip" "example"\n    ]\n    []');
    });
  });

  it('should put space around a single child', function() {
    return compile('View', '<div>Hi</div>').then(function(result) {
      expect(result).toContain('[ Html.text "Hi" ]');
    });
  });

  it('should indent multiple children', function() {
    return compile('View', '<div><a></a><b></b></div>').then(function(result) {
      expect(result).toContain('render = Html.node "div"\n    []\n    [ Html.node "a" [] []\n    , Html.node "b" [] []\n    ]');
    });
  });

  it('should indent nested children', function() {
    return compile('View', '<div><a>Hi<i></i></a><b></b></div>').then(function(result) {
      expect(result).toContain('render = Html.node "div"\n    []\n    [ Html.node "a"\n        []\n        [ Html.text "Hi"\n        , Html.node "i" [] []\n        ]\n    , Html.node "b" [] []\n    ]');
    });
  });

  it('should escape newlines', function() {
    return compile('View', '<div>\n</div>').then(function(result) {
      expect(result).toContain('Html.text "\\n"');
    });
  });

  it('should escape carriage returns', function() {
    return compile('View', '<div>\r\n</div>').then(function(result) {
      expect(result).toContain('Html.text "\\r\\n"');
    });
  });
});