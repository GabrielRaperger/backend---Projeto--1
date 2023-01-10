const Sequelize = require("sequelize");

var database;

if (process.env.NODE_ENV !== "production") {
  database = new Sequelize(process.env.DEV_DATABASE, {
    dialect: "postgres",
    logging: false,
  });
} else {
  database = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
  });
}

module.exports = database;
