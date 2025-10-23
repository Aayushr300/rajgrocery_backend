const pool = require("./config/db");

async function testConnection() {
  try {
    const [rows] = await pool.query("SELECT NOW() AS now");
    console.log("✅ Connected to RDS! Current time:", rows[0].now);
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  } finally {
    pool.end();
  }
}

testConnection();
