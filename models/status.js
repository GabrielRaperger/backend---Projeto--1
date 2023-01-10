const { DataTypes } = require("sequelize");
const database = require("../config/database");
const Joi = require("joi");

const Status = database.define(
  "status",
  {
    code: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "status",
    timestamps: false,
  }
);

const validate = (status) => {
  const schema = Joi.object({
    code: Joi.number().integer().min(100).required(),
    message: Joi.string().max(255).required(),
  });
  return schema.validate(status);
};

module.exports = {
  Status,
  validate,
};
