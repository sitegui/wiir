'use strict'

var password

addEventListener('load', function () {
	password = prompt('Please enter the password')
	
	setTimeout(getInfo, 60e3)
	getInfo()
	
	document.getElementById('show-all-people').onchange = function () {
		var div = document.getElementById('people')
		this.checked ? div.classList.add('show-all') : div.classList.remove('show-all')
	}
	document.getElementById('show-all-unknown').onchange = function () {
		var div = document.getElementById('unknown')
		this.checked ? div.classList.add('show-all') : div.classList.remove('show-all')
	}
})

// Load peer info from the server
function getInfo() {
	request('getInfo', {}, function (err, data) {
		if (err)
			return alert('Login error')
		
		populatePeople(data.people)
		populateUnknown(data.unknown)
	})
}

function populatePeople(data) {
	var el = document.getElementById('people')
	el.innerHTML = ''
	
	// Group by person name
	var people = {}
	data.forEach(function (person) {
		if (!(person.name in people)) {
			people[person.name] = []
			people[person.name].on = false
		}
		people[person.name].push(person)
		people[person.name].on = people[person.name].on || person.on
	})
	
	Object.keys(people).sort().forEach(function (name) {
		el.appendChild(getPersonDiv(name, people[name]))
	})
}

function getPersonDiv(name, devices) {
	var div = document.createElement('div')
	var h3 = document.createElement('h3')
	var devicesSpan = document.createElement('span')
	h3.textContent = name
	h3.appendChild(devicesSpan)
	div.classList.add('person')
	if (!devices.on)
		div.classList.add('off')
	div.appendChild(h3)
	div.onclick = function () {
		this.classList.toggle('show')
	}

	devices.sort(function (a, b) {
		return b.on-a.on
	}).forEach(function (device) {
		var p = document.createElement('p'), span
		p.appendChild(getImage(device))
		p.appendChild(document.createTextNode(device.device))
		if (!device.on) {
			p.classList.add('off')
			span = document.createElement('span')
			span.textContent = device.lastSeen
			p.appendChild(span)
		}
		div.appendChild(p)
		devicesSpan.appendChild(getImage(device))
	})
	
	return div
}

function populateUnknown(data) {
	var el = document.getElementById('unknown')
	el.innerHTML = ''
	
	data.sort(function (a, b) {
		return a.name>b.name ? 1 : -1
	}).forEach(function (device) {
		var span, div, h3, p
		div = document.createElement('div')
		h3 = document.createElement('h3')
		p = document.createElement('p')
		
		div.classList.add('device')
		div.onclick = function () {
			this.classList.toggle('show')
		}
		if (!device.on)
			div.classList.add('off')
		div.appendChild(h3)
		div.appendChild(p)
		h3.textContent = device.name
		p.textContent = device.mac
		
		if (!device.on) {
			span = document.createElement('span')
			span.textContent = device.lastSeen
			p.appendChild(span)
		}
		
		el.appendChild(div)
	})
}

function getImage(device) {
	var img = new Image
	var src = device.type=='pc' || device.type=='mac' ? 'pc' : 'mobile'
	src += device.on ? '_on.png' : '_off.png'
	img.src = src
	return img
}

// Make a call to the API
// callback(err, data) will be called when done
function request(action, body, callback) {
	body.password = password
	var ajax = new XMLHttpRequest
	ajax.open('POST', '/api/'+action)
	ajax.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	ajax.onload = function () {
		if (ajax.status != 200)
			return callback(new Error('Got status '+ajax.status))
		
		var response
		try {
			response = JSON.parse(ajax.responseText)
		} catch (err) {
			return callback(err)
		}
		
		if (response.success)
			callback(null, response.data)
		else
			callback(new Error('API returned error'))
	}
	ajax.onerror = function (err)  {
		callback(err)
	}
	ajax.send(JSON.stringify(body))
}
