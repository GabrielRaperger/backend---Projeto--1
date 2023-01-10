const Joi = require("joi");
const { Op } = require("sequelize");
const { Reserve } = require("../models/reserve");
const { Room } = require("../models/room");
const { setReserveStatus } = require("./reserve");
const { getToday, convertToSeconds } = require("../config/moment");

const validate = (room) => {
  const schema = Joi.object({
    allow_capacity: Joi.number()
      .integer()
      .min(1)
      .max(Joi.ref("max_capacity"))
      .required(),
    max_capacity: Joi.number().integer().min(1).max(100).required(),
    min_time_cleaning: Joi.number().integer().min(0).max(60).multiple(15),
    name: Joi.string().min(3).max(255).required(),
    status_id: Joi.number().integer(),
    center_id: Joi.string()
      .guid({
        version: ["uuidv4"],
      })
      .required(),
    id: Joi.string().optional().allow(null).allow(""),
    created_at: Joi.string().optional().allow(null).allow(""),
    clean: Joi.number().integer().min(0).max(100).optional(),
    last_cleaning: Joi.string().optional().allow(null).allow(""),
    next_cleaning: Joi.string().optional().allow(null).allow(""),
  });
  return schema.validate(room);
};

const checkDependencies = async (roomId) => {
  const reserves = await Reserve.findOne({ where: { room_id: roomId } });
  if (reserves)
    return `A sala ${roomId} não pode ser excluída pois possui reservas associadas!`;
};

const setRoomStatus = async (roomId, status) => {
  // 100 104 105
  const reserve_status = status == 100 ? 100 : 108;
  const today = getToday();
  const result = await Reserve.findAll({
    where: {
      room_id: roomId,
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
  await Room.update(
    { status_id: status },
    { where: { id: roomId }, individualHooks: true }
  );
};

module.exports = {
  validate,
  setRoomStatus,
  checkDependencies,
};
