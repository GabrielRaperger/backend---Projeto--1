const { Op } = require("sequelize");
const { Room } = require("../models/room");
const { Center } = require("../models/center");
const { Reserve } = require("../models/reserve");
const { Status } = require("../models/status");
const { validate, setRoomStatus, checkDependencies } = require("../utils/room");
const { notExistsOrError, existsOrError } = require("../helper/validator");
const {
  getCurrentDateTime,
  convertToSeconds,
  getToday,
} = require("../config/moment");
const { sendNotification } = require("../config/messaging");
const sequelize = require("sequelize");
const database = require("../config/database");
const { Account } = require("../models/account");
const { Messaging } = require("../models/messaging");
const controller = {};

controller.save = async (req, res) => {
  const room = { ...req.body };
  const id = req.params.id;

  try {
    const { error } = validate(room);
    if (error) throw error.details[0].message;

    if (room.status_id)
      if (
        room.status_id !== 100 &&
        room.status_id !== 104 &&
        room.status_id !== 105
      )
        throw "Status inválido";

    const centerFromDb = await Center.findByPk(room.center_id);
    existsOrError(centerFromDb, "Centro geográfico não encontrado");

    if (!id) {
      const roomFromDb = await Room.findOne({
        where: { name: room.name, center_id: room.center_id },
      });
      notExistsOrError(
        roomFromDb,
        "O centro geográfico já possui uma sala com o mesmo nome"
      );
    }
  } catch (msg) {
    return res.status(400).send(msg);
  }

  if (!room.min_time_cleaning) room.min_time_cleaning = 0;
  if (!room.status_id) room.status_id = 100;

  if (id) {
    Room.update(room, { where: { id: id }, individualHooks: true })
      .then((data) => {
        if (data[0] > 0) res.status(204).send();
        else res.status(400).send("Sala não encontrada");
      })
      .catch((error) => res.status(500).send(error));
  } else {
    room.created_at = getCurrentDateTime();
    Room.create(room)
      .then((data) => res.status(201).send())
      .catch((error) => res.status(500).send(error));
  }
};

controller.get = async (req, res) => {
  const account_id = req.query.account_id;
  let account = null;
  if (account_id) {
    const accountFromDb = await Account.findByPk(account_id, {
      attributes: ["center_ids", "profile"],
    });
    account = accountFromDb.toJSON();
  }
  const active = req.query.active === "true";
  let where = {};
  if (active) where.status_id = 100;
  Room.findAll({
    include: [
      { model: Status, as: "status" },
      { model: Center, as: "center", attributes: ["name"] },
    ],
    where: { ...where },
  })
    .then((rooms) => {
      if (account && account.profile !== "admin") {
        var filterRooms = rooms.filter((item) => {
          return account.center_ids.includes(item.center_id);
        });
        res.json(filterRooms);
      } else res.json(rooms);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

controller.getById = (req, res) => {
  Room.findByPk(req.params.id, {
    include: [
      { model: Status, as: "status" },
      {
        model: Center,
        as: "center",
        attributes: ["name", "opening", "closure"],
      },
    ],
  })
    .then((room) => {
      if (!room) res.status(400).send("Sala não encontrada");
      else res.json(room);
    })
    .catch((error) => res.status(500).send(error));
};

controller.getByCenter = (req, res) => {
  Room.findAll({
    include: [
      { model: Status, as: "status" },
      { model: Center, as: "center", attributes: ["name"] },
    ],
    where: { center_id: req.params.id },
  })
    .then((rooms) => res.json(rooms))
    .catch((error) => res.status(500).send(error));
};

controller.remove = async (req, res) => {
  try {
    const id = req.params.id;

    checkDependencies(id)
      .then((msg) => {
        if (msg) return res.status(400).send(msg);
        else
          Room.destroy({
            where: { id: id },
            individualHooks: true,
          });
        return res.status(204).send();
      })
      .catch((error) => res.status(500).send(error));
  } catch (msg) {
    return res.status(400).send(msg);
  }
};

controller.setStatus = async (req, res) => {
  try {
    const id = req.params.id;
    if (!req.query.status) throw "Requisição inválida";

    const message = req.query.message || null;

    const status = parseInt(req.query.status);
    if (status !== 100 && status !== 104) throw "Status inválido";

    const roomFromDb = await Room.findByPk(id);
    existsOrError(roomFromDb, "Sala não encontrada");
    const room = roomFromDb.toJSON();

    setRoomStatus(id, status);

    const today = getToday();
    // gives me the reserves for that room
    const result = await Reserve.findAll({
      where: {
        room_id: id,
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
    var tokens = [];
    // for each reserve get the messaging token related to the account that has made the reserve
    for (var i = 0; i < result.length; i++) {
      var element = result[i];
      var reserve = element.dataValues;
      const messagings = await Messaging.findOne({
        where: { account_id: reserve.account_id },
      });
      var messaging = messagings.toJSON();
      if (!tokens.includes(messaging.token)) tokens.push(messaging.token);
    }
    
    if (tokens.length > 0) {
      if (status === 104 && message != null) {
        const data = {
          title: `A Sala '${room.name}' ficou indisponível`,
          body: `Motivo: ${message}`,
        };
        sendNotification(data, tokens);
      } else if (status === 100) {
        const data = {
          title: `A Sala '${room.name}' está novamente disponível`,
          body: "",
        };
        sendNotification(data, tokens);
      }
    }

    return res.status(204).send();
  } catch (msg) {
    console.log(msg);
    return res.status(400).send(msg);
  }
};

controller.mostUsed = async (req, res) => {
  const account_id = req.query.account_id;
  const profile = req.query.profile;
  if (account_id && profile) {
    if (profile === "staff") {
      await database
        .query(
          'SELECT "room"."id", "room"."name", "room"."allow_capacity", "room"."next_cleaning", "room"."last_cleaning", "room"."min_time_cleaning", (SELECT COUNT(*) FROM cleanings WHERE cleanings.room_id = room.id AND cleanings.account_id = :account_id) AS "cleaningCount", "status"."code" AS "status.code", "status"."message" AS "status.message", "center"."id" AS "center.id", "center"."name" AS "center.name" FROM "rooms" AS "room" LEFT OUTER JOIN "status" AS "status" ON "room"."status_id" = "status"."code" LEFT OUTER JOIN "centers" AS "center" ON "room"."center_id" = "center"."id" WHERE (SELECT COUNT(*) FROM cleanings WHERE cleanings.room_id = room.id AND cleanings.account_id = :account_id) > 0 ORDER BY "cleaningCount" DESC LIMIT 5;',
          {
            nest: true,
            replacements: { account_id: account_id },
            type: sequelize.QueryTypes.SELECT,
          }
        )
        .then((results) => res.json(results))
        .catch((error) => res.status(500).send(error));
    } else {
      await database
        .query(
          'SELECT "room"."id", "room"."name", "room"."allow_capacity", "room"."next_cleaning", "room"."last_cleaning", "room"."min_time_cleaning", (SELECT COUNT(*) FROM reserves WHERE reserves.room_id = room.id AND reserves.account_id = :account_id) AS "reserveCount", "status"."code" AS "status.code", "status"."message" AS "status.message", "center"."id" AS "center.id", "center"."name" AS "center.name" FROM "rooms" AS "room" LEFT OUTER JOIN "status" AS "status" ON "room"."status_id" = "status"."code" LEFT OUTER JOIN "centers" AS "center" ON "room"."center_id" = "center"."id" WHERE (SELECT COUNT(*) FROM reserves WHERE reserves.room_id = room.id AND reserves.account_id = :account_id) > 0 ORDER BY "reserveCount" DESC LIMIT 5;',
          {
            nest: true,
            replacements: { account_id: account_id },
            type: sequelize.QueryTypes.SELECT,
          }
        )
        .then((results) => res.json(results))
        .catch((error) => res.status(500).send(error));
    }
  } else {
    await database
      .query(
        'SELECT "room"."id", "room"."name", "room"."allow_capacity", "room"."next_cleaning", "room"."last_cleaning", "room"."min_time_cleaning", (SELECT COUNT(*) FROM reserves WHERE reserves.room_id = room.id) AS "reserveCount", "status"."code" AS "status.code", "status"."message" AS "status.message", "center"."id" AS "center.id", "center"."name" AS "center.name" FROM "rooms" AS "room" LEFT OUTER JOIN "status" AS "status" ON "room"."status_id" = "status"."code" LEFT OUTER JOIN "centers" AS "center" ON "room"."center_id" = "center"."id" WHERE (SELECT COUNT(*) FROM reserves WHERE reserves.room_id = room.id) > 0 ORDER BY "reserveCount" DESC LIMIT 10;',
        {
          nest: true,
          type: sequelize.QueryTypes.SELECT,
        }
      )
      .then((results) => {
        res.json(results);
      })
      .catch((error) => {
        res.status(500).send(error);
      });
  }
};

module.exports = controller;
