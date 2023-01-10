const { Op } = require("sequelize");
const { Account } = require("../models/account");
const { Status } = require("../models/status");
const { Center } = require("../models/center");
const { Room } = require("../models/room");
const controller = {};

controller.dashboard = async (req, res) => {
  // número de utilizadores
  const accounts = {};
  accounts.total_accounts = await Account.count();
  accounts.active_accounts = await Account.count({
    where: {
      status_id: 100,
    },
  });
  accounts.inactive_accounts = await Account.count({
    where: {
      status_id: { [Op.ne]: 100 },
    },
  });
  const rooms = {};
  rooms.total_rooms = await Room.count();
  rooms.active_rooms = await Room.count({
    where: {
      status_id: 100,
    },
  });
  rooms.inactive_rooms = await Room.count({
    where: {
      status_id: { [Op.ne]: 100 },
    },
  });
  const result = { accounts: { ...accounts }, rooms: { ...rooms } };
  return res.json(result);
};

module.exports = controller;
