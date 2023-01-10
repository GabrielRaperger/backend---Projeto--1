const { Messaging } = require("../models/messaging");
const { Account } = require("../models/account");
const { validate } = require("../utils/messaging");
const { existsOrError } = require("../helper/validator");
const { getCurrentDateTime } = require("../config/moment");
const controller = {};

controller.save = async (req, res) => {
  const token = req.body.token;
  const account_id = req.body.account_id;
  const modified_at = getCurrentDateTime();

  try {
    if (!token || !account_id) throw "Requisição inválida";

    const accountFromDb = await Account.findByPk(account_id);
    existsOrError(accountFromDb, "Conta não encontrada");
  } catch (msg) {
    return res.status(400).send(msg);
  }

  const messageFromDb = await Messaging.findOne({
    where: { account_id: account_id },
  });

  if (messageFromDb) {
    // update
    Messaging.update(
      {
        token: token,
        account_id: account_id,
        modified_at: modified_at,
      },
      {
        where: { account_id: account_id },
        individualHooks: true,
      }
    ).then((data) => {
      if (data[0] > 0) {
        return res.status(204).send();
      } else return res.status(400).send("Token não encontrado");
    });
  } else {
    // create
    Messaging.create({
      token: token,
      account_id: account_id,
      modified_at: modified_at,
    })
      .then(() => res.status(201).send())
      .catch((error) => res.status(500).send(error));
  }
};

controller.get = async (req, res) => {
  Messaging.findAll({
    include: [{ model: Account, as: "account", attributes: ["name"] }],
  })
    .then((messagings) => res.json(messagings))
    .catch((error) => res.status(500).send(error));
};

controller.getById = async (req, res) => {
  Messaging.findByPk(req.params.id, {
    include: [{ model: Account, as: "account", attributes: ["name"] }],
  })
    .then((messaging) => {
      if (!messaging) res.status(400).send("Token não encontrado");
      else res.json(messaging);
    })
    .catch((error) => res.status(500).send(error));
};

controller.remove = async (req, res) => {
  Messaging.destroy({
    where: { id: req.params.id },
    individualHooks: true,
  })
    .then(() => res.status(204).send())
    .catch((error) => res.status(500).send(error));
};

module.exports = controller;
