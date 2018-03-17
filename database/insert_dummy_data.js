const models = require('./models');

const dummy_number = '+31624776676';
const dummy_username = 'Vincent Kenbeek';

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
		console.log(created);
		models.Request.bulkCreate(requests).then((err, res) => {
			console.log(err);
			console.log(res);
		});
	});
});
