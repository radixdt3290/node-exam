require("dotenv").config();
const mysql = require("mysql2/promise");
const migrate = require("./database/migrate");
// const seed = require("./database/seed");

const DB_NAME = process.env.DB_NAME || "bookstore";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "deep70";
const DB_HOST = process.env.DB_HOST || "127.0.0.1";

async function setup() {

  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);

  await conn.end();

  await migrate();

//   await seed();
}

setup().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
