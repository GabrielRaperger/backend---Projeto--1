const bcrypt = require("bcrypt");
const Joi = require("joi");
const { Op } = require("sequelize");
const { Account } = require("../models/account");
const { Reserve } = require("../models/reserve");
const { setReserveStatus } = require("./reserve");
const { getToday, convertToSeconds } = require("../config/moment");

const validate = (account) => {
  const schema = Joi.object({
    center_ids: Joi.array().unique().required(),
    email: Joi.string().min(3).max(255).required(),
    name: Joi.string().min(3).max(255).required(),
    password: Joi.string().min(3).max(255),
    phone: Joi.string().allow(null).allow(""),
    profile: Joi.string(),
    status_id: Joi.number().integer(),
    id: Joi.string().optional().allow(null).allow(""),
    created_at: Joi.string().optional().allow(null).allow(""),
    last_login: Joi.string().optional().allow(null).allow(""),
  });
  return schema.validate(account);
};

const encryptPassword = (password) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};

const generatePassword = (length) => {
  var chars =
    "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var password = "";
  for (var i = 0; i < length; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    password += chars.substring(randomNumber, randomNumber + 1);
  }
  return password;
};

const checkDependencies = async (accountId) => {
  const reserves = await Reserve.findOne({ where: { account_id: accountId } });
  if (reserves)
    return `A conta ${accountId} não pode ser excluída pois possui uma reserva com o título ${reserves.title}!`;
};

const setAccountStatus = async (accountId, status) => {
  // 100 101
  const reserve_status = status == 100 ? 100 : 109;
  const today = getToday();
  const result = await Reserve.findAll({
    where: {
      account_id: accountId,
      [Op.or]: [
        {
          [Op.and]: [
            {
              date: { [Op.eq]: today },
            },
            {
              start_time: { [Op.gte]: convertToSeconds() },
            },
          ],
        },
        {
          date: { [Op.gt]: today },
        },
      ],
    },
  });
  result.forEach((element) => {
    var reserve = element.toJSON();
    setReserveStatus(reserve.id, reserve_status);
  });
  //set status
  await Account.update(
    { status_id: status },
    { where: { id: accountId }, individualHooks: true }
  );
};

module.exports = {
  validate,
  encryptPassword,
  generatePassword,
  setAccountStatus,
  checkDependencies,
};
