'use strict'

module.exports = {
	// Data to access the local router
	// Tested with D-Link DSL-2750B
	router: {
		ip: '192.168.1.1',
		port: 23,
		user: 'admin',
		password: 'router-pass',
		command: 'lanhosts show all'
	},

	// Router access timeout
	timeout: 10e3,

	// Refresh interval
	refresh: 600e3,

	// Public interface port
	port: 81,

	// API password
	password: 'api-pass',

	// Key and certificate (for https)
	// Leave blank to use basic http
	// Note: the password is sent in the clear,
	// use normal http on your own risk!
	key: 'keys/server.key',
	cert: 'keys/server.crt'
}