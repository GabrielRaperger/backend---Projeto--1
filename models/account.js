const { DataTypes } = require("sequelize");
const { Status } = require("./status");
const { Center } = require("./center");
const database = require("../config/database");
const collections = require("../config/firestore");
const StatusCodes = require("../helper/status-codes");

const Account = database.define(
  "account",
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    center_ids: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    last_login: {
      type: DataTypes.STRING,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
    },
    profile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "accounts",
    timestamps: false,
    individualHooks: true,
  }
);

Account.belongsTo(Status, {
  foreignKey: "status_id",
});

Account.belongsToMany(Center, {
  through: "accounts_centers",
  timestamps: false,
});

Account.afterCreate((account, options) => {
  try {
    const accountToCreate = { ...account.dataValues };
    const status = StatusCodes.filter(
      (x) => x.code == accountToCreate.status_id
    );
    accountToCreate.status = status[0];
    collections.accounts.doc(accountToCreate.id).set(accountToCreate);
  } catch (error) {
    throw error;
  }
});

Account.afterUpdate((account, options) => {
  try {
    const accountToUpdate = { ...account.dataValues };
    const status = StatusCodes.filter(
      (x) => x.code == accountToUpdate.status_id
    );
    accountToUpdate.status = status[0];
    collections.accounts.doc(accountToUpdate.id).update(accountToUpdate);
  } catch (error) {
    throw error;
  }
});

Account.afterDestroy((account, options) => {
  try {
    const accountToDestroy = {...account.dataValues}
    collections.accounts.doc(accountToDestroy.id).delete()
  } catch (error) {
    throw error;
  }
});

module.exports = {
  Account,
};
