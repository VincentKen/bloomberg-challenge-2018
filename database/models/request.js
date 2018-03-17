module.exports = (sequelize, DataTypes) => {
	let Request = sequelize.define('Request', {
		id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
		phone_number: DataTypes.STRING,
		location: DataTypes.STRING,
		requested_resource: DataTypes.STRING
	});
	
	Request.associate = function (models) {
		models.Request.belongsTo(models.PhoneNumber, {
			foreignKey: 'phone_number'
		});
	};

	return Request;
};

