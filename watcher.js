// Continuously watch for connected peers
'use strict'

var config = require('./config.js')
var net = require('net')
var fs = require('fs')
var types = ['pc', 'mac', 'iphone', 'android', 'ipad']
var people = [] // {name: string, type: string, mac: string, device: string, on: bool, lastSeen: Date?}
var unknown = [] // {name: string, mac: string, on: bool, lastSeen: Date?}

// Run this module
module.exports.init = function () {
	init()
	setInterval(updatePeopleStatus, config.refresh)
	updatePeopleStatus()
}

// Return info about connected peers
module.exports.getInfo = function () {
	return {
		people: people,
		unknown: unknown
	}
}

// Save a unknown peer as a person
module.exports.savePerson = function (mac, name, type) {
	var i, person
	
	// Find the unkown
	for (i=0; i<unknown.length; i++)
		if (unknown[i].mac == mac) {
			person = unknown[i]
			unknown.splice(i, 1)
			break
		}
	
	if (!person)
		return console.error('Could not find a person with mac: '+mac)
	if (!~types.indexOf(type))
		return console.error('Invalid type: '+type)
	
	person.device = person.name
	person.name = name
	person.type = type
	people.push(person)
	save()
}

// Load people values from people.json and unknown.json
function init() {
	var json
	try {
		json = fs.readFileSync('people.json', {encoding: 'utf8'})
		people = JSON.parse(json)
	} catch (e) {
		if (e.code == 'ENOENT')
			people = []
		else
			throw e
	}
	
	try {
		json = fs.readFileSync('unknown.json', {encoding: 'utf8'})
		unknown = JSON.parse(json)
	} catch (e) {
		if (e.code == 'ENOENT')
			unknown = []
		else
			throw e
	}
}

// Save current data in people.json and unknown.json
function save() {
	fs.writeFileSync('people.json', JSON.stringify(people, null, '\t'))
	fs.writeFileSync('unknown.json', JSON.stringify(unknown, null, '\t'))
}

// Update the people status
function updatePeopleStatus() {
	getConnectedHosts(function (err, hosts) {
		if (err)
			return console.error(err)
		
		// Set every body as offline
		people.forEach(function (each) {
			each.on = false
		})
		unknown.forEach(function (each) {
			each.on = false
		})
		
		// Saved loaded data
		hosts.forEach(function (host) {
			var i, now = new Date()
			
			// Try to find a person
			for (i=0; i<people.length; i++)
				if (people[i].mac == host.mac) {
					people[i].device = host.name
					people[i].on = true
					people[i].lastSeen = now
					return
				}
			
			// Try to update an unknown
			for (i=0; i<unknown.length; i++)
				if (unknown[i].mac == host.mac) {
					unknown[i].name = host.name
					unknown[i].on = true
					unknown[i].lastSeen = now
					return
				}
			
			// Add as unknown
			unknown.push({
				name: host.name,
				mac: host.mac,
				on: true,
				lastSeen: now
			})
		})
		
		save()
	})
}

// Return the list given by the router
// callback(err, hosts) will be called at the end
// hosts is an array of elements {mac: string, name: string}
function getConnectedHosts(callback) {
	var conn = net.connect(config.router.port, config.router.ip)
	var step = 0, done = false
	var response = ''

	// Set timeout
	var interval = setTimeout(function () {
		if (!done) {
			done = true
			conn.destroy()
			callback(new Error('Timeout'), null)
		}
	}, config.timeout)
	
	// Process the final response
	var processResponse = function () {
		if (done)
			return
		done = true
		clearTimeout(interval)
		
		var hosts = []
		response.split(/\r?\n/).forEach(function (line) {
			var match = line.match(/^((?:[0-9a-f]{2}:){5}[0-9a-f]{2})\s+[^\s]+\s+(\d+)\s+(.*)$/i)
			if (match && Number(match[2]))
				hosts.push({
					mac: match[1],
					name: match[3]
				})
		})
		callback(null, hosts)
	}
	
	// Do each step:
	// login > password > command > close
	// everything returned after command will be saved on response
	conn.on('readable', function () {
		var data = conn.read()
		if (data) {
			data = data.toString()
			if (!step && data.indexOf('Login') != -1) {
				conn.write(config.router.user+'\n')
				step++
			} else if (step == 1 && data.indexOf('Password') != -1) {
				conn.write(config.router.password+'\n')
				step++
			} else if (step == 2 && data.indexOf('>') != -1) {
				conn.write(config.router.command+'\n')
				step++
			} else if (step == 3) {
				response += data
				if (data.indexOf('>') != -1) {
					conn.end()
					processResponse()
				}
			}
		}
	})

	conn.on('error', function (err) {
		if (!done) {
			done = true
			clearTimeout(interval)
			callback(err, null)
		}
	})
}
