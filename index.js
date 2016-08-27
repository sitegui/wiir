'use strict'

let watcher = require('./watcher'),
	https = require('https'),
	http = require('http'),
	config = require('./config.js'),
	express = require('express'),
	bodyParser = require('body-parser'),
	fs = require('fs')

watcher.init()

// Basic express app
var app = express()
app.use(express.static('public'))
app.use('/api', bodyParser.json())

// Utility res.success() and res.error()
app.use('/api', function (req, res, next) {
	res.success = function (data) {
		res.json({
			success: true,
			data: data
		})
	}
	res.error = function () {
		res.json({
			success: false
		})
	}
	next()
})

// Check password
// ...(password: string)
app.use('/api', function (req, res, next) {
	var password = req.body.password
	if (password != config.password) {
		return res.error()
	}
	next()
})

// Return info about connected peers
// getInfo -> unknown[]: (), people[]: ()
app.post('/api/getInfo', function (req, res) {
	res.success(watcher.getInfo())
})

// Turn one unknown into a person
// savePerson(mac: string, name: string, type: string)
app.post('/api/savePerson', function (req, res) {
	var mac = req.body.mac || ''
	var name = req.body.name || ''
	var type = req.body.type || ''
	if (watcher.savePerson(mac, name, type)) {
		res.success()
	} else {
		res.error()
	}
})

if (config.key) {
	https.createServer({
		key: fs.readFileSync(config.key),
		cert: fs.readFileSync(config.cert)
	}, app).listen(config.port, function () {
		console.log('Listening on port ' + config.port + ' (https enabled)')
	})
} else {
	http.createServer(app).listen(config.port, function () {
		console.log('Listening on port ' + config.port)
		console.log('[WARN] https disabled')
	})
}