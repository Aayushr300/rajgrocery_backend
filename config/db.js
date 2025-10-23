//
const mysql = require("mysql2/promise");

// Create a connection pool (recommended for production)
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "grocery",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
