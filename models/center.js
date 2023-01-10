const { DataTypes } = require("sequelize");
const { Status } = require("./status");
const database = require("../config/database");
const collections = require("../config/firestore");
const StatusCodes = require("../helper/status-codes");

const Center = database.define(
  "center",
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    closure: {
      type: DataTypes.INTEGER,
      defaultValue: 84600,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    opening: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    phone_primary: {
      type: DataTypes.STRING,
    },
    phone_secondary: {
      type: DataTypes.STRING,
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    website_url: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "centers",
    timestamps: false,
  }
);

Center.belongsTo(Status, {
  foreignKey: "status_id",
});

Center.afterCreate((center, options) => {
  try {
    const centerToCreate = { ...center.dataValues };
    const status = StatusCodes.filter(
      (x) => x.code == centerToCreate.status_id
    );
    centerToCreate.status = status[0];
    collections.centers.doc(centerToCreate.id).set(centerToCreate);
  } catch (error) {
    throw error;
  }
});

Center.afterUpdate((center, options) => {
  try {
    const centerToUpdate = { ...center.dataValues };
    const status = StatusCodes.filter(
      (x) => x.code == centerToUpdate.status_id
    );
    centerToUpdate.status = status[0];
    collections.centers.doc(centerToUpdate.id).update(centerToUpdate);
  } catch (error) {
    throw error;
  }
});

Center.afterDestroy((center, options) => {
  try {
    const centerToDestroy = {...center.dataValues}
    collections.centers.doc(centerToDestroy.id).delete()
  } catch (error) {
    throw error;
  }
});

module.exports = {
  Center,
};
