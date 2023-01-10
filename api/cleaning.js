const { Cleaning } = require("../models/cleaning");
const { Room } = require("../models/room");
const { Center } = require("../models/center");
const { Account } = require("../models/account");
const { validate } = require("../utils/cleaning");
const { Op } = require("sequelize");
const {
  convertToDate,
  getCurrentDateTime,
  formatDateToString,
  getToday,
  isBefore,
} = require("../config/moment");
const sequelize = require("sequelize");
const controller = {};
const { existsOrError } = require("../helper/validator");

controller.save = async (req, res) => {
  const cleaning = { ...req.body };

  try {
    const { error } = validate(cleaning);
    if (error) throw error.details[0].message;

    const date = formatDateToString(cleaning.date);
    const today = getToday();

    if (isBefore(date, today)) throw "A data da limpeza não pode ser anterior à data atual";

    const roomFromDb = await Room.findByPk(cleaning.room_id, {
      include: [
        {
          model: Center,
          as: "center",
          attributes: ["id"],
        },
      ],
    });
    existsOrError(roomFromDb, "Sala não encontrada");
    const room = roomFromDb.toJSON();

    const accountFromDb = await Account.findByPk(cleaning.account_id);
    existsOrError(accountFromDb, "Conta não encontrada");
    const account = accountFromDb.toJSON();

    if (account.profile !== "staff") throw "Apenas a staff pode realizar limpezas";
    if (room.center) {
      if (!account.center_ids.includes(room.center.id))
        throw "O utilizador não tem permissões para limpar esta sala";
    }
  } catch (msg) {
    return res.status(400).send(msg);
  }

  cleaning.date = convertToDate(cleaning.date);

  Cleaning.create(cleaning)
    .then((data) => {
      Room.update(
        { last_cleaning: getCurrentDateTime() },
        { where: { id: cleaning.room_id }, individualHooks: true }
      );
      res.status(201).send();
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

controller.get = async (req, res) => {
  const room_id = req.query.room_id;
  const account_id = req.query.account_id;
  const start_date = req.query.start_date;
  const end_date = req.query.end_date;
  const date = req.query.date;
  let where = {};
  if (room_id) where.room_id = room_id;
  if (account_id) where.account_id = account_id;
  if (start_date && end_date) {
    where.date = { [Op.between]: [start_date, end_date] };
  } else {
    if (start_date) where.date = { [Op.gte]: start_date };
    else if (end_date) where.date = { [Op.lte]: end_date };
  }
  if (date) where.date = { [Op.eq]: date };
  Cleaning.findAll({
    include: [
      { model: Account, as: "account", attributes: ["name"] },
      { model: Room, as: "room", attributes: ["name"] },
    ],
    where: { ...where },
    order: [
      ["date", "ASC"],
      ["start_time", "ASC"],
    ],
  })
    .then((cleanings) => res.json(cleanings))
    .catch((error) => res.status(500).send(error));
};

controller.getById = async (req, res) => {
  Cleaning.findByPk(req.params.id, {
    include: [
      { model: Account, as: "account", attributes: ["name"] },
      { model: Room, as: "room", attributes: ["name"] },
    ],
  })
    .then((cleaning) => {
      if (!cleaning) res.status(400).send("Registo de limpeza não encontrado");
      else res.json(cleaning);
    })
    .catch((error) => res.status(500).send(error));
};

controller.remove = async (req, res) => {
  try {
    const id = req.params.id;

    Cleaning.destroy({
      where: { id: id },
      individualHooks: true,
    });
    return res.status(204).send();
  } catch (msg) {
    return res.status(400).send(msg);
  }
};

controller.duration = async (req, res) => {
  const account_id = req.query.account_id;
  const room_id = req.query.room_id;

  let where = {};
  if (account_id) where.account_id = account_id;
  if (room_id) where.room_id = room_id;

  await Cleaning.findAll({
    attributes: [
      [sequelize.fn("AVG", sequelize.col("duration")), "averageDuration"],
    ],
    where: {
      ...where,
    },
  })
    .then((result) => {
      const average = result[0].toJSON();
      const duration = parseFloat(average.averageDuration) || 0;
      res.json({
        averageDuration: parseFloat(duration.toFixed(2)),
      });
    })
    .catch((error) => res.status(500).send(error));
};

controller.count = async (req, res) => {
  const cleanings = {};
  const room_id = req.query.room_id;
  const account_id = req.query.account_id;
  const start_date = req.query.start_date;
  const end_date = req.query.end_date;

  let where = {};
  if (room_id) where.room_id = room_id;
  if (account_id) where.account_id = account_id;
  if (start_date && end_date) {
    where.date = { [Op.between]: [start_date, end_date] };
  } else {
    if (start_date) where.date = { [Op.gte]: start_date };
    else if (end_date) where.date = { [Op.lte]: end_date };
  }

  cleanings.total_cleanings = await Cleaning.count({ where: { ...where } });
  return res.json(cleanings);
};

module.exports = controller;
