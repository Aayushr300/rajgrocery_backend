// //
// const mysql = require("mysql2/promise");

// // Create a connection pool (recommended for production)
// const pool = mysql.createPool({
//   host: "localhost",
//   user: "admin",
//   password: "ayush123456790",
//   database: "grocery",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// module.exports = pool;

// Import mysql2 with promise support
const mysql = require("mysql2/promise");

// Create a connection pool to AWS RDS MySQL
const pool = mysql.createPool({
  host: "grocery.cl4ik0q64efb.ap-south-1.rds.amazonaws.com", // ✅ Your RDS endpoint
  user: "admin", // ✅ Your RDS master username
  password: "ayush123456790", // ✅ Your RDS password
  database: "grocery", // ✅ Database name you created/imported
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export the pool for use in your app
module.exports = pool;
