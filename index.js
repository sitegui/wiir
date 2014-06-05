'use strict'

var watcher = require('./watcher')
var http = require('http')
var config = require('./config.js')

watcher.init()

http.createServer(function (req, res) {
	res.end(JSON.stringify(watcher.getInfo(), null, '\t'))
}).listen(config.port)
