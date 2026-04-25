const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "nodejs_crud",
  process.env.DB_USERNAME || "root",
  process.env.DB_PASSWORD || "deep70",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: "mysql",
    logging: false,
  }
);

module.exports = sequelize;
