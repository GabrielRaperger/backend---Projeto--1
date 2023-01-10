const { DataTypes } = require("sequelize");
const { Account } = require("./account");
const database = require("../config/database");
const collections = require("../config/firestore");

const Messaging = database.define(
  "messaging",
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modified_at: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "messaging",
    timestamps: false,
  }
);

Messaging.belongsTo(Account, {
  foreignKey: "account_id",
});

Messaging.afterCreate((messaging, options) => {
  try {
    const messagingToCreate = { ...messaging.dataValues };
    collections.messaging.doc(messagingToCreate.id).set(messagingToCreate);
  } catch (error) {
    throw error;
  }
});

Messaging.afterUpdate((messaging, options) => {
  try {
    const messagingToUpdate = { ...messaging.dataValues };
    collections.messaging.doc(messagingToUpdate.id).update(messagingToUpdate);
  } catch (error) {
    throw error;
  }
});

Messaging.afterDestroy((messaging, options) => {
  try {
    const messagingToDestroy = { ...messaging.dataValues };
    collections.messaging.doc(messagingToDestroy.id).delete()
  } catch (error) {
    throw error;
  }
});

module.exports = {
  Messaging,
};
