const { DataTypes } = require("sequelize");
const { Account } = require("./account");
const { Room } = require("./room");
const database = require("../config/database");
const collections = require("../config/firestore");
const { formatDateToString } = require("../config/moment");

const Cleaning = database.define(
  "cleaning",
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
    },
    end_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "cleanings",
    timestamps: false,
  }
);

Cleaning.belongsTo(Account, {
  foreignKey: "account_id",
});

Cleaning.belongsTo(Room, {
  foreignKey: "room_id",
});

Cleaning.afterCreate((cleaning, options) => {
  try {
    const cleaningToCreate = { ...cleaning.dataValues };
    cleaningToCreate.date = formatDateToString(cleaningToCreate.date);
    collections.cleanings.doc(cleaningToCreate.id).set(cleaningToCreate);
  } catch (error) {
    throw error;
  }
});

Cleaning.afterUpdate((cleaning, options) => {
  try {
    const cleaningToUpdate = { ...cleaning.dataValues };
    collections.cleanings.doc(cleaningToUpdate.id).update(cleaningToUpdate);
  } catch (error) {
    throw error;
  }
});

Cleaning.afterDestroy((cleaning, options) => {
  try {
    const cleaningToDestroy = { ...cleaning.dataValues };
    collections.cleaningToDestroy.doc(cleaningToDestroy.id).delete();
  } catch (error) {
    throw error;
  }
});

module.exports = {
  Cleaning,
};
