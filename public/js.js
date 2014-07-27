'use strict'

var deviceTypeMap = {
	pc: 'computer',
	mac: 'computer',
	iphone: 'iphone',
	android: 'phone',
	ipad: 'ipad'
}

// Store the password globally
var password

addEventListener('load', function () {
	password = localStorage.getItem('wiir-password')

	// Interface init
	get('login').onsubmit = function (event) {
		event.preventDefault()
		password = get('password').value
		if (get('remember').checked) {
			localStorage.setItem('wiir-password', password)
		}
		init()
	}

	if (password) {
		init()
	}
})

// Alias for document.getElementById
function get(id) {
	return document.getElementById(id)
}

// Alias for document.createElement
function create(tag) {
	return document.createElement(tag)
}

// Start the interface
// Called after password has been set
function init() {
	get('login').style.display = 'none'

	request('getInfo', {}, function (err, data) {
		if (err) {
			return alert('Request error')
		}

		update(data)
	})
}

// Update the interface with the received data
// {name: string, type: string, mac: string, device: string, on: bool, lastSeen: Date?}
// {name: string, mac: string, on: bool, lastSeen: Date?}
function update(data) {
	// Extract people data
	var people = {}

	data.people.forEach(function (person) {
		var person2

		if (!(person.name in people)) {
			people[person.name] = {
				name: person.name,
				devices: [],
				on: false,
				lastSeen: ''
			}
		}

		person2 = people[person.name]
		person2.devices.push({
			type: person.type,
			mac: person.mac,
			name: person.device,
			on: person.on,
			lastSeen: person.lastSeen
		})
		person2.on = person2.on || person.on
		if (person.lastSeen > person2.lastSeen) {
			person2.lastSeen = person.lastSeen
		}
	})

	// Divide people in two groups (online and offline)
	var online = [],
		offline = [],
		name
	var sortOn = function (a, b) {
		return b.on - a.on
	}
	for (name in people) {
		people[name].devices.sort(sortOn)
		if (people[name].on) {
			online.push(people[name])
		} else {
			offline.push(people[name])
		}
	}

	// Sort both arrays
	online.sort(function (a, b) {
		return a.name > b.name ? 1 : -1
	})
	offline.sort(function (a, b) {
		return a.lastSeen < b.lastSeen ? 1 : -1
	})

	// Extract unknown data
	var unknown = data.unknown.filter(function (each) {
		return each.on
	}).sort(function (a, b) {
		return a.name > b.name ? 1 : -1
	})

	updateOnline(online)
	updateOffline(offline)
	updateUnknown(unknown)
}

// Visually update the list of online people
function updateOnline(people) {
	var el = get('peopleList')
	el.innerHTML = ''

	people.forEach(function (person) {
		var personEl = create('div')
		personEl.className = 'person'
		el.appendChild(personEl)

		var nameEl = create('div')
		nameEl.className = 'name'
		nameEl.textContent = person.name
		personEl.appendChild(nameEl)

		person.devices.forEach(function (device) {
			var deviceEl = create('div'),
				spanEl
			deviceEl.className = 'device'
			deviceEl.classList.add(deviceTypeMap[device.type] + '-' + (device.on ? 'on' : 'off'))
			deviceEl.textContent = device.name

			if (device.lastSeen && !device.on) {
				spanEl = create('span')
				spanEl.className = 'last-seen'
				spanEl.textContent = lastSeenEnhance(device.lastSeen)
				deviceEl.appendChild(spanEl)
			}

			personEl.appendChild(deviceEl)
		})
	})
}

// Visually update the list of offline people
function updateOffline(people) {
	var el = get('offlineList')
	el.innerHTML = ''

	people.forEach(function (person) {
		var personEl = create('div')
		personEl.className = 'person'
		el.appendChild(personEl)

		var nameEl = create('div')
		nameEl.className = 'name'
		nameEl.textContent = person.name
		personEl.appendChild(nameEl)

		person.devices.forEach(function (device) {
			var deviceEl = create('span')
			deviceEl.className = 'icon-' + deviceTypeMap[device.type] + '-off'
			nameEl.appendChild(deviceEl)
		})

		if (person.lastSeen) {
			var lastSeenEl = create('div')
			lastSeenEl.className = 'last-seen'
			lastSeenEl.textContent = lastSeenEnhance(person.lastSeen)
			personEl.appendChild(lastSeenEl)
		}
	})
}

// Visually update the list of unkown people
function updateUnknown(devices) {
	var el = get('unknownList')
	el.innerHTML = ''

	devices.forEach(function (device) {
		var deviceEl = create('div')
		deviceEl.className = 'person'
		el.appendChild(deviceEl)

		var nameEl = create('div')
		nameEl.className = 'name'
		nameEl.textContent = device.name
		deviceEl.appendChild(nameEl)

		var macEl = create('div')
		macEl.className = 'mac'
		macEl.textContent = device.mac
		deviceEl.appendChild(macEl)
	})
}

// Returns a human readable string of the time the user was offline
// lastSeen is a string on format yyyy-mm-ddThh:mm:ss
function lastSeenEnhance(lastSeen) {
	var date = new Date(lastSeen),
		diff = Date.now() - date.getTime(),
		minutes = Math.floor(diff /= 1000 * 60) % 60,
		hours = Math.floor(diff /= 60) % 24,
		days = Math.floor(diff /= 24) % 30,
		months = Math.floor(diff /= 30.4345) % 12,
		years = Math.floor(diff /= 12),
		string = 'Last seen ',
		s = function (n) {
			return n === 1 ? '' : 's'
		}

	if (years) {
		string += 'more than 1 year'
	} else if (months) {
		string += months + ' month' + s(months)
		string += ' and ' + days + ' day' + s(days)
	} else if (days) {
		string += days + ' day' + s(days)
		string += ' and ' + hours + ' hour' + s(hours)
	} else if (hours) {
		string += hours + ' hour' + s(hours)
		string += ' and ' + minutes + ' minute' + s(minutes)
	} else if (minutes) {
		string += minutes + ' minute' + s(minutes)
	} else {
		string += 'less than 1 minute'
	}

	return string + ' ago'
}

// Make a call to the API
// callback(err, data) will be called when done
function request(action, body, callback) {
	body.password = password
	var ajax = new XMLHttpRequest
	ajax.open('POST', '/api/' + action)
	ajax.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	ajax.onload = function () {
		if (ajax.status != 200) {
			return callback(new Error('Got status ' + ajax.status))
		}

		var response
		try {
			response = JSON.parse(ajax.responseText)
		} catch (err) {
			return callback(err)
		}

		if (response.success) {
			callback(null, response.data)
		} else {
			localStorage.removeItem('wiir-password')
			callback(new Error('API returned error'))
		}
	}
	ajax.onerror = function (err) {
		callback(err)
	}
	ajax.send(JSON.stringify(body))
}