const Joi = require("joi");
const { Op } = require("sequelize");
const { Reserve } = require("../models/reserve");
const { getToday, convertToSeconds } = require("../config/moment");

const validate = (reserve) => {
  const schema = Joi.object({
    date: Joi.date().iso().required(),
    description: Joi.string().allow(null).allow(""),
    end_time: Joi.number()
      .integer()
      .min(0)
      .max(86400)
      .multiple(15)
      .greater(Joi.ref("start_time"))
      .required(),
    start_time: Joi.number()
      .integer()
      .min(0)
      .max(86400)
      .multiple(15)
      .required(),
    title: Joi.string().min(3).max(255).required(),
    status_id: Joi.number().integer(),
    account_id: Joi.string()
      .guid({
        version: ["uuidv4"],
      })
      .required(),
    room_id: Joi.string()
      .guid({
        version: ["uuidv4"],
      })
      .required(),
    id: Joi.string().optional().allow(null).allow(""),
    created_at: Joi.string().optional().allow(null).allow(""),
    duration: Joi.number().integer().optional().allow(null),
    reminder_name: Joi.string().optional().allow(null).allow(""),
    reminder_time: Joi.number().optional().allow(null),
    reminder_minutes: Joi.number().optional().allow(null),
  });
  return schema.validate(reserve);
};

const setReserveStatus = async (reserveId, status) => {
  // 100 106 107 108 109
  const today = getToday();
  await Reserve.update(
    { status_id: status },
    {
      where: {
        id: reserveId,
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
      individualHooks: true,
    }
  );
};

const isBettween = (number, min, max) => {
  if (number >= min && number <= max) return true;
  else return false;
};

module.exports = {
  validate,
  setReserveStatus,
  isBettween,
};
