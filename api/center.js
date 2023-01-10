const { Op } = require("sequelize");
const { Center } = require("../models/center");
const { Status } = require("../models/status");
const { Account } = require("../models/account");
const { Room } = require("../models/room");
const {
  validate,
  checkDependencies,
  setCenterStatus,
} = require("../utils/center");
const { getCurrentDateTime } = require("../config/moment");
const {
  notExistsOrError,
  isEmailOrError,
  isPhoneOrError,
  isUrlOrError,
} = require("../helper/validator");
const controller = {};

controller.save = async (req, res) => {
  const center = { ...req.body };
  const id = req.params.id;

  if (!center.status_id) center.status_id = 100;
  if (!center.opening) center.opening = 0;
  if (!center.closure) center.closure = 86400;
  if (center.opening === 86400) center.opening = 0;

  try {
    const { error } = validate(center);
    if (error) throw error.details[0].message;

    if (
      !center.phone_primary &&
      !center.phone_secondary &&
      !center.email &&
      !center.website_url
    )
      throw "O centro geográfico deve ter pelo menos um método de contacto";

    if (center.phone_primary)
      isPhoneOrError(center.phone_primary, "Telefone 1 não é válido");
    if (center.phone_secondary)
      isPhoneOrError(center.phone_secondary, "Telefone 2 não é válido");
    if (center.email) isEmailOrError(center.email, "O e-mail não é válido");
    if (center.website_url)
      isUrlOrError(center.website_url, "A url do webiste não é válida");

    if (center.status_id)
      if (center.status_id !== 100 && center.status_id !== 103)
        throw "Status inválido";

    if (!id) {
      const centerFromDb = await Center.findOne({
        where: { name: center.name },
      });
      notExistsOrError(centerFromDb, "Já existe um centro geográfico com o mesmo nome");
    }
  } catch (msg) {
    return res.status(400).send(msg);
  }

  if (id) {
    Center.update(center, { where: { id: id }, individualHooks: true })
      .then((data) => {
        if (data[0] > 0) res.status(204).send();
        else res.status(400).send("Centro geográfico não encontrado");
      })
      .catch((error) => res.status(500).send(error));
  } else {
    center.created_at = getCurrentDateTime();
    Center.create(center)
      .then(() => res.status(201).send())
      .catch((error) => res.status(500).send(error));
  }
};

controller.get = (req, res) => {
  const attributes = [
    "id",
    "address",
    "closure",
    "created_at",
    "name",
    "opening",
    "region",
  ];
  Center.findAll({
    attributes: attributes,
    include: [{ model: Status, as: "status" }],
  })
    .then((centers) => res.json(centers))
    .catch((error) => res.status(500).send(error));
};

controller.getById = (req, res) => {
  Center.findByPk(req.params.id, {
    include: { model: Status, as: "status" },
  })
    .then(async (center) => {
      if (!center) res.status(400).send("Centro geeográfico não encontrado");
      else {
        center = center.toJSON();
        const accounts = await Account.count({
          where: { center_ids: { [Op.contains]: [req.params.id] } },
        });
        const rooms = await Room.count({ where: { center_id: req.params.id } });
        const result = {
          ...center,
          total_accounts: accounts,
          total_rooms: rooms,
        };
        return res.json(result);
      }
    })
    .catch((error) => res.status(500).send(error));
};

controller.remove = async (req, res) => {
  const id = req.params.id;
  checkDependencies(id)
    .then((msg) => {
      if (msg) return res.status(400).send(msg);
      else {
        Center.destroy({
          where: { id: id },
          individualHooks: true,
        })
          .then(() => res.status(204).send())
          .catch((error) => res.status(500).send(error));
      }
    })
    .catch((error) => res.status(400).send(error));
};

controller.setStatus = async (req, res) => {
  try {
    const id = req.params.id;
    if (!req.query.status) throw "Requisição inválida";

    const status = parseInt(req.query.status);
    if (status !== 100 && status !== 103) throw "Status inválido";

    setCenterStatus(id, status);

    return res.status(204).send();
  } catch (msg) {
    return res.status(400).send(msg);
  }
};

module.exports = controller;
