'use strict'

var password

addEventListener('load', function () {
	password = prompt('Please enter the password')
	
	setTimeout(getInfo, 60e3)
	getInfo()
})

// Load peer info from the server
function getInfo() {
	request('getInfo', {}, function (err, data) {
		if (err)
			return alert('Login error')
		console.log(data)
	})
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
