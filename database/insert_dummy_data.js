const models = require('./models');
const NodeGeocoder = require('node-geocoder');

models.sequelize.sync({force: true}).then(() => {

	const dummy_number = '+31624776676';
	const dummy_username = 'Vincent Kenbeek';

	const geocoder_options = {
		provider: 'google',
		apiKey: 'AIzaSyCaSU54kzkY9TqNt9SyxfL3IW2exENdOGE'
	};

	const geocoder = NodeGeocoder(geocoder_options);

	const requests = [
		{
			phone_number: dummy_number,
			location: 'Torenallee 36',
			requested_resource: 'food',
		},
		{
			phone_number: dummy_number,
			location: 'Torenallee 36',
			requested_resource: 'blanket'
		},
		{
			phone_number: dummy_number,
			location: 'Kastanjelaan',
			requested_resource: 'food'
		}
	];


	let requests_geocoded = 0;

	for (let i = 0; i < requests.length; i++) {
		geocoder.geocode(requests[i].location).then((res) => {
			requests[i].latitude = res[0].latitude;
			requests[i].longitude = res[0].longitude;
			requests_geocoded++;
		});
	}

	let t = setInterval(() => {
		if (requests_geocoded === requests.length) {
			clearInterval(t);
			models.PhoneNumber.destroy({
		                where: {
                		        number: dummy_number
		                }
		        }).then(() => {
                		models.PhoneNumber.findOrCreate({
		                        where: {
                		                number: dummy_number
		                        },
                		        defaults: {
                                		number: dummy_number,
		                                username: dummy_username
                		        }
		                }).spread((phone_number, created) => {
                		        console.log(phone_number.get({
                                		plain: true
		                        }));

	
        		                models.Request.bulkCreate(requests).then((res) => {
		                                //console.log(res);
						console.log('Requests created');
                		        });
		                });
		        });

		}
	}, 100);

});
