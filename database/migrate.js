require("dotenv").config();
const sequelize = require("../config/dbConnection");
require("../models/userModel");
require("../models/bookModel");
require("../models/orderModel");
require("../models/reviewModel");


async function migrate() {
  await sequelize.sync({ alter: true });
  await sequelize.close();
}

module.exports = migrate;
