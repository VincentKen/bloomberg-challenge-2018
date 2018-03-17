module.exports = (sequelize, DataTypes) => {
	let PhoneNumber = sequelize.define('PhoneNumber', {
		number: DataTypes.STRING,
		username: DataTypes.STRING
	});
	
	PhoneNumber.associate = function(models) {
		models.PhoneNumber.associate(models.Request);
	};

	return PhoneNumber;
};
