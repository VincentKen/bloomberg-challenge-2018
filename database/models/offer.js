module.exports = (sequelize, DataTypes) => {
	let Offer = sequelize.define('Offer', {
		id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
		request_id: DataTypes.INTEGER,
		message: DataTypes.STRING(255),
		phone_number: DataTypes.STRING,
		accepted: DataTypes.BOOLEAN
	});

	Offer.associate = function (models) {
		models.Offer.belongsTo(models.Request, {
			onDelete: 'CASCADE',
			foreignKey: 'request_id'
		});
	}

	return Offer;
};
