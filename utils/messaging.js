const Joi = require("joi");

const validate = (messaging) => {
  const schema = Joi.object({
    account_id: Joi.string()
      .guid({
        version: ["uuidv4"],
      })
      .required(),
    token: Joi.string().required(),
    modified_at: Joi.string().optional().allow(null)
  });
  return schema.validate(messaging);
};

module.exports = {
  validate,
};
