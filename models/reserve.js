const { DataTypes } = require("sequelize");
const { Status } = require("./status");
const { Account } = require("./account");
const { Room } = require("./room");
const database = require("../config/database");
const collections = require("../config/firestore");
const { formatDateToString } = require("../config/moment");
const StatusCodes = require("../helper/status-codes");

const Reserve = database.define(
  "reserve",
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    created_at: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reminder_name: {
      type: DataTypes.STRING,
    },
    reminder_time: {
      type: DataTypes.BIGINT,
    },
    reminder_minutes: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "reserves",
    timestamps: false,
  }
);

Reserve.belongsTo(Status, {
  foreignKey: "status_id",
});

Reserve.belongsTo(Account, {
  foreignKey: "account_id",
});

Reserve.belongsTo(Room, {
  foreignKey: "room_id",
});

Reserve.afterCreate((reserve, options) => {
  try {
    const reserveToCreate = { ...reserve.dataValues };
    reserveToCreate.date = formatDateToString(reserveToCreate.date);
    const status = StatusCodes.filter(
      (x) => x.code == reserveToCreate.status_id
    );
    reserveToCreate.status = status[0];
    collections.reserves.doc(reserveToCreate.id).set(reserveToCreate);
  } catch (error) {
    throw error;
  }
});

Reserve.afterUpdate((reserve, options) => {
  try {
    const reserveToUpdate = { ...reserve.dataValues };
    reserveToUpdate.date = formatDateToString(reserveToUpdate.date);
    const status = StatusCodes.filter(
      (x) => x.code == reserveToUpdate.status_id
    );
    reserveToUpdate.status = status[0];
    collections.reserves.doc(reserveToUpdate.id).update(reserveToUpdate);
  } catch (error) {
    throw error;
  }
});

Reserve.afterDestroy((reserve, options) => {
  try {
    const reserveToDestroy = { ...reserve.dataValues };
    collections.reserves.doc(reserveToDestroy.id).delete();
  } catch (error) {
    throw error;
  }
});

module.exports = {
  Reserve,
};
