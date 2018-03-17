module.exports = (sequelize, DataTypes) => {
	let PhoneNumber = sequelize.define('PhoneNumber', {
		number: {
			type: DataTypes.STRING,
			primaryKey: true
		},
		username: DataTypes.STRING
	});
	
	PhoneNumber.associate = function(models) {
		models.PhoneNumber.hasMany(models.Request, {
			foreignKey: 'phone_number'
		});
	};

	return PhoneNumber;
};
