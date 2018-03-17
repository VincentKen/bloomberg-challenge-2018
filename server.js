const express = require('express');
const twilio = require('twilio');
const bodyParser = require('body-parser');
const NodeGeocoder = require('node-geocoder');

const models = require('./database/models');
const config = require('./config');

const twilioClient = twilio(config.twilio.accountSID, config.twilio.authToken);
const MessagingResponse = twilio.twiml.MessagingResponse;

const app = express();

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => res.send('Hello World'));

app.get('/requests', (req, res) => {
	models.Request.findAll({
		include: [ {model: models.PhoneNumber, attributes: ['username']} ],
		attributes: ['id', 'location', 'longitude', 'latitude', 'createdAt', 'updatedAt']
	}).then(requests => {
		res.json(requests);
	});
});

app.post('/twilio/sms', (req, res) => {
	let twiml = new MessagingResponse();
	let body = req.body.Body;
	let type = body.split(" ")[0];
	let number = req.body.From;
	let t = new Date().getTime();

	let instructions = '\n\tTo make a request type "Request: " followed by your request.\n\n' +
		'\tTo change your name type "Name: " followed by your name\n\n' +
		'\tTo change the location of your last made request type "Location: " followed by the name of the street you\'re currently on\n\n' +
		'\tTo show the instructions again type "?"';

	console.log('Received text message');
	res.writeHead(200, {'Content-Type': 'text/xml'});

	function handleGreeting() {
		console.log('Handling Greeting');
		// first check if phone number is already registered
		models.PhoneNumber.findOne({where: {number: number}}).then(phoneNumber => {
			if (!phoneNumber || !phoneNumber.dataValues.username) { // number is not registered or has no username
				console.log('Number is not registered or has no username');
				// Ask user for his name
				twiml.message(
					'\nHi!\n' + 
					'It looks like we haven\'t met yet.\n' +
					'Could you please tell me your name by replying with "Name: " followed by your name?'
				);
				// register phone number
				if (!phoneNumber) {
					console.log('Saving number');
					models.PhoneNumber.create({number: number}).catch(err => {
						// TODO implement error handling
					});
				}				
			} else {
				console.log('Phonenumber has username, sending greetings');
				twiml.message(
					`\nHey ${phoneNumber.dataValues.username}, how can I help you?\n` +
					'Please reply with "Request: " followed by your request.'
					);
			}
			console.log('ENDING REQUEST');
			console.log(new Date().getTime() - t);
			console.log(twiml.toString());
			res.end(twiml.toString());
		}).catch(err => {
			// TODO implement error handling
		});
	}

	function handleName() {
		console.log('Handling name');
		let name = body.split(' ').splice(1).join(' ');
		if (name === '') {
			console.log('Received empty name');
			twiml.message(`\nIt looks like you forgot to add your name to the end of your message. Please try again.`);
			console.log('ENDING REQUEST');
			console.log(new Date().getTime() - t);
			console.log(twiml.toString());
			res.end(twiml.toString());
			return;
		}
		console.log('Finding phone number');
		models.PhoneNumber.findOne({where: {number: number}}).then(phoneNumber => {
			twiml.message(
				`\nHey ${name}, how can I help you?\n` +
				'Please reply with "Request: "  followed by you request.\n'
			);
			if (!phoneNumber) {
				console.log('No phonenumber found, creating phone number and saving name');
				models.PhoneNumber.create({number: number, username: name}).then(res => {
					console.log('ENDING REQUEST');
					console.log(new Date().getTime() - t);
					console.log(twiml.toString());
					res.end(twiml.toString());
				}).catch(err => {
					// TODO implement error handling
				});
				return;
			} else {
				console.log('found phonenumber, setting username');
				phoneNumber.username = name;
				console.log('Set username to ' + name);
				phoneNumber.save().then(_ => {
					console.log('ENDING REQUEST');
					console.log(new Date().getTime() - t);
					console.log(twiml.toString());
					res.end(twiml.toString());
				}).catch(err => {
					console.log(err);
				});
			}
		}).catch(err => {
			// TODO implement error handling
		});
		
	}

	function handleRequestedResource() {
		console.log('Handling Requested Resource');
		let request = body.split(' ').splice(1).join(' ');
		if (request === '') {
			console.log('Received empty request');
			twiml.message(`\nIt looks like you forgot to add your request to the end of your message. Please try again.`);
			console.log('ENDING REQUEST');
			console.log(new Date().getTime() - t);
			console.log(twiml.toString());
			res.end(twiml.toString());
			return;
		}
		console.log('Create request');
		models.Request.create({phone_number: number, requested_resource: request, completed: false}).then(req => {
			console.log('Request created');
			twiml.message(
				'\nYour request has been placed, where can our volunteers find you?\n' +
				'Please replay with "Location: " followed by your location'
			);
			console.log('ENDING REQUEST');
			console.log(new Date().getTime() - t);
			console.log(twiml.toString());
			res.end(twiml.toString());
		}).catch(err => {
			// TODO implement error handling
		});
	}

	function handleLocation() {
		console.log('Handling Location');
		let location = body.split(' ').splice(1).join(' ');
		let geocoder = NodeGeocoder({
			provider: config.geocoder.provider,
			apiKey: config.geocoder.apiKey
		});
		if (location === '') {
			console.log('Received empty location');
			twiml.message(`\nIt looks like you forgot to add your location to the end of your message. Please try again.`);
			console.log('ENDING REQUEST');
			console.log(new Date().getTime() - t);
			console.log(twiml.toString());
			res.end(twiml.toString());
			return;
		}
		console.log('Search for latest created request');
		models.Request.findOne({where: {phone_number: number}, order: [['createdAt', 'DESC']]}).then(request => {
			if (!request) {
				console.log('No request found');
				twiml.message(`\nIt looks like you haven't made a request yet, do so first by replying with "Hello"`);
				console.log('ENDING REQUEST');
				console.log(new Date().getTime() - t);
				console.log(twiml.toString());
				res.end(twiml.toString());
				return;
			}
			console.log('Search for coordinates');
			geocoder.geocode(location).then((geo_data) => {
				console.log('Received geo data');
				console.log(geo_data);
				if (geo_data.length > 1) {
					console.log('Multiple cities');
					let city_list = [];
					for (let i = 0; i < geo_data.length; i++) {
						city_list.push(geo_data[i].city);
					}
					twiml.message(`\nPlease specify your city by entering one of the following cities behind your street name: ${city_list.join(',')}`);
					console.log('ENDING REQUEST');
					console.log(new Date().getTime() - t);
					console.log(twiml.toString());
					res.end(twiml.toString());
					return;
				} else if (geo_data.length === 0) {
					console.log('No location found');
					twiml.message(`
						We could not find your location. Do you make a typo?
					`);
					console.log('ENDING REQUEST');
					console.log(new Date().getTime() - t);
					console.log(twiml.toString());
					res.end(twiml.toString());
					return;
				} else {
					console.log('Found location');
					request.location = location;
					request.latitude = geo_data[0].latitude;
					request.longitude = geo_data[0].longitude;
					twiml.message(`\nWe have notified our nearby volunteers. Hang tight, someone will be there soon`);
					console.log('ENDING REQUEST');
					console.log(new Date().getTime() - t);
					console.log(twiml.toString());
					res.end(twiml.toString());
					console.log('saving location');
					request.save();
				}
			});

			
		}).catch(err => {
			console.error(err);
			// TODO implement error handling
		});
	}

	switch(type.toLowerCase()) {
		case 'hello':
			handleGreeting();
			break;
		case 'name:':
			handleName();
			break;
		case 'request:':
			handleRequestedResource();
			break;
		case 'location:':
			handleLocation();
			break;
		case '?':
			twiml.message(instructions);
			res.end(twiml.toString());
			break;
		default:
			twiml.message(`\nSorry we couldn't process you request. To make a request start by saying Hello.`);
			res.end(twiml.toString());
			break;
			
	}
});

app.listen(3000, () => console.log('Listening on port 3000'));

/*twilioClient.messages.create({
	to: '+31624776676',
	from: config.twilio.number,
	body: 'Test message'
}, (err, message) => {
	if (err) {
		console.error(err);
	}
	console.log(message.sid);
});*/
