const Joi = require("joi");

const validate = (cleaning) => {
  const schema = Joi.object({
    date: Joi.date().iso().required(),
    end_time: Joi.number()
      .integer()
      .min(0)
      .max(86400)
      .greater(Joi.ref("start_time"))
      .required(),
    start_time: Joi.number().integer().min(0).max(86400).required(),
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
    duration: Joi.number().integer().min(0).required()
  });
  return schema.validate(cleaning);
};

module.exports = {
  validate,
};
