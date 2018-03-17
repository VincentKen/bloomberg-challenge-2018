module.exports = (sequelize, DataTypes) => {
	let Request = sequelize.define('Request', {
		id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
		phone_number: DataTypes.STRING,
		location: DataTypes.STRING,
		requested_resource: DataTypes.STRING,
		completed: {
			type: DataTypes.BOOLEAN
			default: true
		},
		longitude: DataTypes.STRING,
		latitude: DataTypes.STRING
	});
	
	Request.associate = function (models) {
		models.Request.belongsTo(models.PhoneNumber, {
			onDelete: 'CASCADE',
			foreignKey: 'phone_number'
		});
	};

	return Request;
};

