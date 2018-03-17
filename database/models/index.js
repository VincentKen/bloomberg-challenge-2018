const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const basename = path.basename(__filename);

const sequelize = new Sequelize('bloomberg-2018', {
	storage: 'database/database.sqlite'
});

fs
	.readdirSync(__dirname)
	.filter(file => {
		return (file.indexOf('.') !== 0) && (file !== basename) && (file.slize(-3) === '.js');
	})
	.forEach(file => {
		let model = sequelize['import'](path.join(__dirname, file));
		db[model.name] = model;
	});

Object.keys(db0.forEach(modelName => {
	if (db[modelName].associate) {
		db[modelName].associate(db);
	}
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

