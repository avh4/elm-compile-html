#!/usr/bin/env node

var compile = require('./index.js');
var fs = require('fs');

var filename = process.argv[2];
var moduleName = filename.replace(/\.html?$/, '');

fs.readFile(filename, function(err,data) {
	if (err) throw err;
	compile(moduleName, data).then(function(result) {
		console.log(result);
	});
});
