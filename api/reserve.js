const { Op } = require("sequelize");
const { Reserve } = require("../models/reserve");
const { Status } = require("../models/status");
const { Room } = require("../models/room");
const { Account } = require("../models/account");
const { Center } = require("../models/center");
const { validate, setReserveStatus, isBettween } = require("../utils/reserve");
const schedule = require("node-schedule");
const { sendNotification } = require("../config/messaging");
const randstring = require("randomstring");
const {
  getCurrentDateTime,
  formatDateToString,
  getToday,
  isBefore,
  convertToSeconds,
  isSameDay,
  convertToDate,
  getNumberOfDaysInMonth,
  setDayToDate,
  formatDateToISO,
  convertSecondsToHoursAndMinutes,
  isAfter,
  getCurrentAsISO,
  formatDateTimeToString,
  formatStringToISODate,
} = require("../config/moment");
const { existsOrError, notExistsOrError } = require("../helper/validator");
const sequelize = require("sequelize");
const { Messaging } = require("../models/messaging");
const controller = {};

controller.save = async (req, res) => {
  const reserve = { ...req.body };
  const id = req.params.id;

  if (!reserve.status_id) reserve.status_id = 100;
  let interval = 0;
  var next_cleaning = null;

  try {
    const { error } = validate(reserve);
    if (error) throw error.details[0].message;

    const date = formatDateToString(reserve.date);
    const today = getToday();

    if (isBefore(date, today)) throw "A data da reserva deve ser posterior à data atual";
    else if (isSameDay(date, today)) {
      const currentSecs = convertToSeconds();
      if (currentSecs > reserve.start_time)
        throw "A hora da reserva deve ser posterior à hora atual";
    }

    const roomFromDb = await Room.findByPk(reserve.room_id, {
      include: [
        {
          model: Center,
          as: "center",
          attributes: ["opening", "closure", "id"],
        },
      ],
    });
    existsOrError(roomFromDb, "Sala não encontrada");
    const room = roomFromDb.toJSON();

    interval = room.min_time_cleaning;
    if (room.next_cleaning)
      next_cleaning = formatStringToISODate(room.next_cleaning);
    else next_cleaning = null;
    if (room.status_id !== 100) throw "A sala está inativa";
    if (room.center) {
      var start = reserve.start_time;
      var end = reserve.end_time;
      var centerOpening = room.center.opening;
      var centerClosure = room.center.closure;
      if (!(start >= centerOpening && start <= centerClosure))
        throw "A sala encontra-se encerrada devido ao horário do centro geográfico";
      if (!(end >= centerOpening && end <= centerClosure))
        throw "A sala encontra-se encerrada devido ao horário do centro geográfico";
    }

    const accountFromDb = await Account.findByPk(reserve.account_id);
    existsOrError(accountFromDb, "Conta não encontrada");
    const account = accountFromDb.toJSON();

    if (account.status_id !== 100) throw "A conta está inativa";
    if (account.profile === "staff") throw "A staff não pode efetuar reservas";
    else if (account.profile === "user") {
      if (room.center) {
        if (!account.center_ids.includes(room.center.id))
          throw "O utilizador não tem permissões para reservar esta sala"; 
      }
    }

    if (!id) {
      // conta o número de reservas ativas (com data/hora igual ou superior a atual) do utilizador
      const numberOfReservations = await Reserve.count({
        where: {
          account_id: reserve.account_id,
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
      if (account.profile === "user" && numberOfReservations >= 5)
        throw "Limite de reservas atingido (5)";
      else if (account.profile === "admin" && numberOfReservations >= 8)
        throw "Limite de reservas atingido (8)";

      // encontra uma reserva simultanea (no mesmo dia/hora) do mesmo utilizador
      const userSimReservations = await Reserve.findOne({
        where: {
          account_id: reserve.account_id,
          date: { [Op.eq]: reserve.date },
          [Op.or]: [
            {
              [Op.and]: [
                {
                  start_time: { [Op.lte]: reserve.start_time },
                },
                {
                  end_time: { [Op.gt]: reserve.start_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.lt]: reserve.end_time },
                },
                {
                  end_time: { [Op.gte]: reserve.end_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.lte]: reserve.start_time },
                },
                {
                  end_time: { [Op.gte]: reserve.end_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.gte]: reserve.start_time },
                },
                {
                  end_time: { [Op.lte]: reserve.end_time },
                },
              ],
            },
          ],
        },
      });
      notExistsOrError(
        userSimReservations,
        "O utilizador possui uma reserva agendada para a mesma hora"
      );

      // encontra uma reserva simultanea (no mesmo dia/hora) para a mesma sala
      const roomSimReservations = await Reserve.findOne({
        where: {
          room_id: reserve.room_id,
          date: { [Op.eq]: reserve.date },
          [Op.or]: [
            {
              [Op.and]: [
                {
                  start_time: { [Op.lte]: reserve.start_time },
                },
                {
                  end_time: { [Op.gt]: reserve.start_time - interval },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.lt]: reserve.end_time },
                },
                {
                  end_time: { [Op.gte]: reserve.end_time - interval },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.lte]: reserve.start_time },
                },
                {
                  end_time: { [Op.gte]: reserve.end_time - interval },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.gte]: reserve.start_time },
                },
                {
                  end_time: { [Op.lte]: reserve.end_time - interval },
                },
              ],
            },
          ],
        },
      });
      notExistsOrError(
        roomSimReservations,
        "A sala possui uma reserva agendada para a mesma hora"
      );
    } else {
      // encontra uma reserva simultanea (no mesmo dia/hora) do mesmo utilizador
      const userSimReservations = await Reserve.findOne({
        where: {
          id: { [Op.ne]: id },
          account_id: reserve.account_id,
          date: { [Op.eq]: reserve.date },
          [Op.or]: [
            {
              [Op.and]: [
                {
                  start_time: { [Op.lte]: reserve.start_time },
                },
                {
                  end_time: { [Op.gt]: reserve.start_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.lt]: reserve.end_time },
                },
                {
                  end_time: { [Op.gte]: reserve.end_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.lte]: reserve.start_time },
                },
                {
                  end_time: { [Op.gte]: reserve.end_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.gte]: reserve.start_time },
                },
                {
                  end_time: { [Op.lte]: reserve.end_time },
                },
              ],
            },
          ],
        },
      });
      notExistsOrError(
        userSimReservations,
        "User already have a reservation at the same time"
      );

      // encontra uma reserva simultanea (no mesmo dia/hora) para a mesma sala
      const roomSimReservations = await Reserve.findOne({
        where: {
          id: { [Op.ne]: id },
          room_id: reserve.room_id,
          date: { [Op.eq]: reserve.date },
          [Op.or]: [
            {
              [Op.and]: [
                {
                  start_time: { [Op.lte]: reserve.start_time },
                },
                {
                  end_time: { [Op.gt]: reserve.start_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.lt]: reserve.end_time },
                },
                {
                  end_time: { [Op.gte]: reserve.end_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.lte]: reserve.start_time },
                },
                {
                  end_time: { [Op.gte]: reserve.end_time },
                },
              ],
            },
            {
              [Op.and]: [
                {
                  start_time: { [Op.gte]: reserve.start_time },
                },
                {
                  end_time: { [Op.lte]: reserve.end_time },
                },
              ],
            },
          ],
        },
      });
      notExistsOrError(
        roomSimReservations,
        "Room already have a reservation at the same time"
      );
    }
  } catch (msg) {
    return res.status(400).send(msg);
  }

  reserve.date = convertToDate(reserve.date);
  reserve.duration = reserve.end_time - reserve.start_time;
  if (reserve.reminder_time) reserve.reminder_name = randstring.generate(34);
  else reserve.reminder_name = null;

  if (id) {
    Reserve.update(reserve, { where: { id: id }, individualHooks: true })
      .then((data) => {
        if (data[0] > 0) {
          // update new cleaning
          const new_cleaning = formatDateToISO(
            `${formatDateToString(
              reserve.date
            )} ${convertSecondsToHoursAndMinutes(reserve.end_time)}`
          );
          const current = getCurrentAsISO();
          if (
            !next_cleaning ||
            isBefore(next_cleaning, current) ||
            (isAfter(new_cleaning, current) &&
              isBefore(new_cleaning, next_cleaning))
          ) {
            Room.update(
              { next_cleaning: formatDateTimeToString(new_cleaning) },
              { where: { id: reserve.room_id }, individualHooks: true }
            );
          }
          // cancel prev notification
          const prev = data[1][0]._previousDataValues;
          if (prev.reminder_name) {
            const prevJob = schedule.scheduledJobs[prev.reminder_name];
            if (prevJob) {
              prevJob.cancel();
            }
          }
          // schedule new notification
          if (reserve.reminder_time) {
            const reminderDate = convertToDate(reserve.reminder_time);
            const job = schedule.scheduleJob(
              reserve.reminder_name,
              reminderDate,
              async function () {
                var tokens = [];
                const messagings = await Messaging.findOne({
                  where: { account_id: reserve.account_id },
                });
                if (messagings) {
                  var messaging = messagings.toJSON();
                  if (!tokens.includes(messaging.token))
                    tokens.push(messaging.token);
                  const data = {
                    title: `${reserve.title}`,
                    body: `A tua reserva está próxima`,
                  };
                  if (tokens.length > 0) sendNotification(data, tokens);
                }
              }
            );
            console.log(`Job scheduled to ${reminderDate}`);
          }
          res.status(204).send();
        } else res.status(400).send("Reserva não encontrada");
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send(error);
      });
  } else {
    reserve.created_at = getCurrentDateTime();
    Reserve.create(reserve)
      .then((data) => {
        // update new cleaning
        const new_cleaning = formatDateToISO(
          `${formatDateToString(
            reserve.date
          )} ${convertSecondsToHoursAndMinutes(reserve.end_time)}`
        );
        const current = getCurrentAsISO();
        if (
          !next_cleaning ||
          isBefore(next_cleaning, current) ||
          (isAfter(new_cleaning, current) &&
            isBefore(new_cleaning, next_cleaning))
        ) {
          Room.update(
            { next_cleaning: formatDateTimeToString(new_cleaning) },
            { where: { id: reserve.room_id }, individualHooks: true }
          );
        }
        // schedule notification
        if (reserve.reminder_time) {
          const reminderDate = convertToDate(reserve.reminder_time);
          const job = schedule.scheduleJob(
            reserve.reminder_name,
            reminderDate,
            async function () {
              var tokens = [];
              const messagings = await Messaging.findOne({
                where: { account_id: reserve.account_id },
              });
              if (messagings) {
                var messaging = messagings.toJSON();
                if (!tokens.includes(messaging.token))
                  tokens.push(messaging.token);
                const data = {
                  title: `${reserve.title}`,
                  body: `A tua reserva está próxima`,
                };
                if (tokens.length > 0) sendNotification(data, tokens);
              }
            }
          );
          console.log(`Job scheduled to ${reminderDate}`);
        }
        res.status(201).send();
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send(error);
      });
  }
};

controller.get = async (req, res) => {
  const active = req.query.active === "true";
  const room_id = req.query.room_id;
  const account_id = req.query.account_id;
  const start_date = req.query.start_date;
  const end_date = req.query.end_date;
  const date = req.query.date;
  let where = {};
  if (active) {
    const today = getToday();
    where.status_id = 100;
    where[Op.or] = [
      {
        [Op.and]: [
          {
            date: { [Op.eq]: today },
          },
          {
            end_time: { [Op.gte]: convertToSeconds() },
          },
        ],
      },
      {
        date: { [Op.gt]: today },
      },
    ];
  }
  if (room_id) where.room_id = room_id;
  if (account_id) where.account_id = account_id;
  if (start_date && end_date) {
    where.date = { [Op.between]: [start_date, end_date] };
  } else {
    if (start_date) where.date = { [Op.gte]: start_date };
    else if (end_date) where.date = { [Op.lte]: end_date };
  }
  if (date) where.date = { [Op.eq]: date };
  Reserve.findAll({
    include: [
      { model: Status, as: "status" },
      { model: Account, as: "account", attributes: ["name"] },
      { model: Room, as: "room", attributes: ["name"] },
    ],
    where: { ...where },
    order: [
      ["date", "ASC"],
      ["start_time", "ASC"],
    ],
  })
    .then((reserves) => res.json(reserves))
    .catch((error) => res.status(500).send(error));
};

controller.getById = async (req, res) => {
  Reserve.findByPk(req.params.id, {
    include: [
      { model: Status, as: "status" },
      { model: Account, as: "account", attributes: ["name"] },
      { model: Room, as: "room", attributes: ["name"] },
    ],
  })
    .then((reserve) => {
      if (!reserve) res.status(400).send("Reserva não encontrada");
      else res.json(reserve);
    })
    .catch((error) => res.status(500).send(error));
};

controller.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const reserveFromDb = await Reserve.findByPk(id);
    if (reserveFromDb) {
      const reserve = reserveFromDb.toJSON();
      if (reserve.reminder_name) {
        const prevJob = schedule.scheduledJobs[reserve.reminder_name];
        if (prevJob) prevJob.cancel();
      }
      reserveFromDb
        .destroy()
        .then(() => {
          return res.status(204).send();
        })
        .catch((error) => {
          res.status(500).send(error)
        });
    }
  } catch (msg) {
    return res.status(400).send(msg);
  }
};

controller.setStatus = async (req, res) => {
  try {
    const id = req.params.id;
    if (!req.query.status) throw "Requisição inválida";

    const status = parseInt(req.query.status);
    if (status !== 100 && status !== 106 && status !== 107)
      throw "Status inválido";

    setReserveStatus(id, status);

    return res.status(204).send();
  } catch (msg) {
    return res.status(400).send(msg);
  }
};

controller.count = async (req, res) => {
  const today = getToday();
  const reserves = {};
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

  reserves.total_reserves = await Reserve.count({ where: { ...where } });
  reserves.pending_reserves = await Reserve.count({
    where: {
      ...where,
      status_id: 100,
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
  reserves.completed_reserves =
    reserves.total_reserves - reserves.pending_reserves;
  return res.json(reserves);
};

controller.duration = async (req, res) => {
  const account_id = req.query.account_id;
  if (!account_id) return res.status(500).send("O Id da conta é obrigatório");

  await Reserve.findAll({
    attributes: [
      [sequelize.fn("AVG", sequelize.col("duration")), "averageDuration"],
    ],
    where: {
      account_id: account_id,
    },
  })
    .then((result) => {
      const average = result[0].toJSON();
      const duration = parseFloat(average.averageDuration);
      res.json({
        averageDuration: parseFloat(duration.toFixed(2)),
      });
    })
    .catch((error) => res.status(500).send(error));
};

controller.ocupation = async (req, res) => {
  const time = req.query.time;
  const room_id = req.query.room_id;
  if (!time || !room_id)
    return res
      .status(500)
      .send("Requisição inválida! O Id da sala e o time são parametros obrigatórios");
  const today = getToday();

  const roomFromDb = await Room.findByPk(room_id, {
    include: [
      {
        model: Center,
        as: "center",
        attributes: ["opening", "closure"],
      },
    ],
  });
  try {
    existsOrError(roomFromDb, "Sala não encontrada");
  } catch (msg) {
    return res.status(400).send(msg);
  }
  const room = roomFromDb.toJSON();
  const schedule = room.center.closure - room.center.opening;

  const ocupation = {};

  if (time === "month") {
    const daysInMonth = getNumberOfDaysInMonth();

    for (var i = 1; i <= daysInMonth; i++) {
      const day = formatDateToString(setDayToDate(today, i));
      const sum = await Reserve.findAll({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("duration")), "sumDuration"],
        ],
        where: {
          status_id: 100,
          room_id: room_id,
          date: { [Op.eq]: day },
        },
      });
      const sumDuration = sum[0].toJSON();
      const duration = parseInt(sumDuration.sumDuration) || 0;
      const percent = (duration / schedule) * 100;
      ocupation[`${i}`] = parseFloat(percent.toFixed(2));
    }

    return res.json({ ocupation: ocupation });
  } else if (time === "day") {
    for (var i = 0; i < 24; i++) {
      ocupation[`${i}`] = 0;
      var x = 3600 * i;
      var y = (i + 1) * 3600;

      const reservesFromDb = await Reserve.findAll({
        attributes: ["start_time", "end_time", "duration"],
        where: {
          status_id: 100,
          room_id: room_id,
          date: { [Op.eq]: today },
          [Op.or]: [
            { start_time: { [Op.between]: [x, y] } },
            { end_time: { [Op.between]: [x, y] } },
          ],
        },
      });
      reservesFromDb.forEach((element) => {
        const reserve = element.toJSON();
        var busySecs = 0;
        if (
          isBettween(reserve.start_time, x, y) &&
          isBettween(reserve.end_time, x, y)
        )
          busySecs += reserve.duration;
        else if (isBettween(reserve.start_time, x, y))
          busySecs += y - reserve.start_time;
        else if (isBettween(reserve.end_time, x, y))
          busySecs += reserve.end_time - x;
        var percent = (busySecs / 3600) * 100;
        ocupation[`${i}`] = parseFloat(percent.toFixed(2));
      });
    }
    return res.json({ ocupation: ocupation });
  } else {
    return res.status(400).send("Requisição inválida");
  }
};

module.exports = controller;
