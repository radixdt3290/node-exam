const { DataTypes } = require("sequelize");
const sequelize = require("../config/dbConnection");

const User = sequelize.define("users", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("admin", "user"), defaultValue: "user" },
});

module.exports = User;
