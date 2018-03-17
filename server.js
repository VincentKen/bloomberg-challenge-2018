const express = require('express');
const twilio = require('twilio');
const bodyParser = require('body-parser');
const NodeGeocoder = require('node-geocoder');
const validator = require('validator');

const models = require('./database/models');
const config = require('./config');

const twilioClient = twilio(config.twilio.accountSID, config.twilio.authToken);
const MessagingResponse = twilio.twiml.MessagingResponse;

models.sequelize.sync();

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => res.send('Hello World'));

app.get('/requests', (req, res) => {
	models.Request.findAll({
		include: [ {model: models.PhoneNumber, attributes: ['username']} ],
		attributes: ['id', 'location', 'longitude', 'latitude', 'createdAt', 'updatedAt', 'requested_resource']
	}).then(requests => {
		res.json(requests);
	});
});

app.post('/requests/:id/offer', (req, res) => {
	let requestId = req.params.id;
	console.log(req.body);
	if (!req.body.message || req.body.message === '' || req.body.message.length < 10) {
		res.json({
			message: 'message needs to be atleast 10 characters long'
		}, 400);
		return;
	}
	if (req.body.message.length > 255) {
		res.json({
			message: 'message can be no longer then 255 characters'
		}, 400);
		return;
	}
	if (!validator.isMobilePhone(req.body.phone_number, 'any')) {
		res.json({
			message: 'phone_number is not a valid phone number'
		}, 400);
		return;
	}
	models.Request.findById(requestId, {include: [ models.PhoneNumber ]}).then(request => {
		if (!request) {
			res.json({
				message: 'request not found'
			}, 404);
			return;
		}
		models.Offer.create({
			request_id: requestId,
			message: req.body.message,
			phone_number: req.body.phone_number
		}).then(offer => {
			res.json(offer);
			twilioClient.messages.create({
				to: request.PhoneNumber.number,
				from: config.twilio.number,
				body: 'Someone has offered to help you!\n' +
					`If you want to accept this persons help enter "${offer.id}: "` +
					'followed by a message which helps the volunteer find you, this may include your phone number if you don\'t mind giving it away to a stranger.\n' +
					'Please keep in mind that you can only accept one offer.\n\n' + 
					req.body.message
			}, (err, message) => {
				if (err) {
					console.error(err);
					// TODO implement error handling
				}
			});
		}).catch(err => {
			console.error(err);
			// TODO implement error handling
		});
	}).catch(err => {
		console.error(err);
		// TODO implement error handling
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
					twiml.message(`\nPlease specify your city by replying "Location: " + the street you currently on + one of the following cities: ${city_list.join(',')}`);
					console.log('ENDING REQUEST');
					console.log(new Date().getTime() - t);
					console.log(twiml.toString());
					res.end(twiml.toString());
					return;
				} else if (geo_data.length === 0) {
					console.log('No location found');
					twiml.message(`
						We could not find your location. Did you make a typo?
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

	function acceptOffer(offerID) {
		models.Offer.findById(offerID, {
			include: [{
				model: models.Request,
				include: [ models.PhoneNumber ]
			}]
		}).then(offer => {
			if (offer.Request.phone_number !== number) {
				twiml.message('Oops! it looks like you entered an invalid offer number, please try again.');
				res.end(twiml.toString());
				return;
			}
			offer.accepted = true;
			offer.save().then(_ => {
				twilioClient.messages.create({
					to: offer.phone_number,
					from: config.twilio.number,
					body: `Your offer to ${offer.Request.PhoneNumber.username} has been accepted!\n` +
						`${offer.Request.PhoneNumber.username} requested '${offer.Request.requested_resource}'.\n` +
						`And sends you this message:\n\n${body.split(' ').splice(1).join(' ')}`
				}, (err, message) => {
					if (err) {
						console.error(err);
						// TODO implement error handling
						return;
					}
					twiml.message('Your message has been sent');
					res.end(twiml.toString());
				});
			});
		}).catch(err => {
			console.error(err);
			// TODO implement error handling
		});
	}
	console.log(' TEST' );
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
			console.log('Default');
			if (type.toLowerCase().test(/^([0-9]+)\: /)){
				acceptOffer(type.toLowerCase().match(/^([0-9]+)\: /)[1]);
				break;
			}
			console.log('Send response');
			twiml.message(`\nThere seems to be something wrong with your message, please try again. Reply with "?" to get help`);
			res.end(twiml.toString());
			break;
			
	}
});

app.listen(80, () => console.log('Listening on port 80'));

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
