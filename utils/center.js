const Joi = require("joi");
const { Op } = require("sequelize");
const { Room } = require("../models/room");
const { Account } = require("../models/account");
const { setRoomStatus } = require("./room");
const { Center } = require("../models/center");

const validate = (center) => {
  const schema = Joi.object({
    address: Joi.string().min(3).max(255).required(),
    closure: Joi.number()
      .integer()
      .min(0)
      .max(86400)
      .multiple(15)
      .greater(Joi.ref("opening")),
    country: Joi.string().min(3).max(255).required(),
    email: Joi.string().optional().allow(null).allow(""),
    name: Joi.string().min(3).max(255).required(),
    opening: Joi.number().integer().min(0).max(86400).multiple(15),
    phone_primary: Joi.string().optional().allow(null).allow(""),
    phone_secondary: Joi.string().optional().allow(null).allow(""),
    postal_code: Joi.string().min(4).max(10).required(),
    region: Joi.string().min(3).max(255).required(),
    website_url: Joi.string().optional().allow(null).allow(""),
    status_id: Joi.number().integer(),
    id: Joi.string().optional().allow(null).allow(""),
    created_at: Joi.string().optional().allow(null).allow(""),
  });
  return schema.validate(center);
};

const checkDependencies = async (centerId) => {
  const rooms = await Room.findOne({ where: { center_id: centerId } });
  if (rooms)
    return `O centro geográfico ${centerId} não pode ser excluído pois possui uma sala associada com o nome ${rooms.name}!`;

  const accounts = await Account.findOne({
    where: { center_ids: { [Op.contains]: [centerId] } },
  });
  if (accounts)
    return `O centro geográfico ${centerId} não pode ser excluído pois possui um utilizador associada com o nome ${accounts.name}!`;
};

const setCenterStatus = async (centerId, status) => {
  // 100 103
  const room_status = status == 100 ? 100 : 105;
  const result = await Room.findAll({ where: { center_id: centerId } });
  result.forEach((element) => {
    var room = element.toJSON();
    setRoomStatus(room.id, room_status);
  });
  // set status
  await Center.update(
    { status_id: status },
    { where: { id: centerId }, individualHooks: true }
  );
};

module.exports = {
  validate,
  checkDependencies,
  setCenterStatus,
};
