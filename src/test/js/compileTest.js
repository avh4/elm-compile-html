'use strict';

var expect = require('expect');
var helper = require('./integrationHelper');

var check = function(html, expectedResult) {
  return helper.compileHtml('View', html)
  .then(function() {
    return helper.runElmIO('../src/test/elm/Main.elm');
  }).then(function(result) {
    expect(result).toEqual(expectedResult || html);
  });
};

describe('compile', function() {
  this.timeout(2*60*1000); // Only really necessary when ./elm-stuff/ doesn't exist
  
  it('should compile a single HTML tag', function() {
    return check('<body></body>');
  });

  it('should compile a single self-closing tag', function() {
    return check('<div/>', '<div></div>');
  });

  it('should compile nested tags', function() {
    return check('<strong><i></i></strong>');
  });

  it('should compile text', function() {
    return check('<b>B</b>');
  });

  it('should compile multiple children', function() {
    return check('<h1><i></i><b></b></h1>');
  });

  it('should compile multiple children at different levels', function() {
    return check('<h1><i><a></a></i><b><a></a></b></h1>');
  });

  it('should compile multiple children with text', function() {
    return check('<h1>I<i></i>IB<b></b>B</h1>');
  });

  it('should compile attributes', function() {
    return check('<a href="http://example.com">Example</a>');
  });

  it('should compile multiple attributes', function() {
    return check('<a href="http://example.com" name="link">Example</a>');
  });

  it('should compile class attributes', function() {
    return check('<a class="button">Example</a>');
  });

  it('should wrap multiple root elements in a div', function() {
    return check('<a></a><b></b>', '<div><a></a><b></b></div>');
  });

  it('should compile style tags', function() {
    return check('<style>//</style>');
  });

  it('should compile style attributes', function() {
    return check('<div style="background: red"></div>');
  });

  it('should escape tabs', function() {
    return check('<div>\t</div>');
  });

  it('should escape multiple tabs', function() {
    return check('<div>\t\t</div>');
  });
});
