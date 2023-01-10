const { DataTypes } = require("sequelize");
const { Status } = require("./status");
const { Center } = require("./center");
const database = require("../config/database");
const collections = require("../config/firestore");
const StatusCodes = require("../helper/status-codes");

const Room = database.define(
  "room",
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    allow_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    next_cleaning: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_cleaning: {
      type: DataTypes.STRING,
    },
    max_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    min_time_cleaning: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "rooms",
    timestamps: false,
  }
);

Room.belongsTo(Status, {
  foreignKey: "status_id",
});

Room.belongsTo(Center, {
  foreignKey: "center_id",
});

Room.afterCreate((room, options) => {
  try {
    const roomToCreate = { ...room.dataValues };
    const status = StatusCodes.filter((x) => x.code == roomToCreate.status_id);
    roomToCreate.status = status[0];
    collections.rooms.doc(roomToCreate.id).set(roomToCreate);
  } catch (error) {
    throw error;
  }
});

Room.afterUpdate((room, options) => {
  try {
    const roomToCreate = { ...room.dataValues };
    const status = StatusCodes.filter((x) => x.code == roomToCreate.status_id);
    roomToCreate.status = status[0];
    collections.rooms.doc(roomToCreate.id).update(roomToCreate);
  } catch (error) {
    throw error;
  }
});

Room.afterDestroy((room, options) => {
  try {
    const roomToDestroy = { ...room.dataValues };
    collections.rooms.doc(roomToDestroy.id).delete();
  } catch (error) {
    throw error;
  }
});

module.exports = {
  Room,
};
