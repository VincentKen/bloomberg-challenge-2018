const Sequelize = require('sequelize');
const sequelize = new Sequelize('database', {
	host: 'localhost',
	dialect: 'sqlite',
	storage: 'database/database.sqlite'
});

sequelize.authenticate()
	.then(() => {
		console.log('Connection to database has been established');
	})
	.catch((err) => {
		console.error('Unable to connect to the database', err);
	});
