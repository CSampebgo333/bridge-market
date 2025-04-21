const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'agrimarket',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function to execute SQL queries
async function query(sql, params) {
  try {
    const [rows, fields] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to get a single record
async function getOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0];
}

// Helper function to insert a record and return the inserted ID
async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  
  try {
    const result = await pool.execute(sql, values);
    return result[0].insertId;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

// Helper function to update a record
async function update(table, data, condition) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  const whereClause = Object.keys(condition).map(key => `${key} = ?`).join(' AND ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  
  try {
    const result = await pool.execute(sql, [...values, ...Object.values(condition)]);
    return result[0].affectedRows;
  } catch (error) {
    console.error('Database update error:', error);
    throw error;
  }
}

// Helper function to delete a record
async function remove(table, condition) {
  const whereClause = Object.keys(condition).map(key => `${key} = ?`).join(' AND ');
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  
  try {
    const result = await pool.execute(sql, Object.values(condition));
    return result[0].affectedRows;
  } catch (error) {
    console.error('Database delete error:', error);
    throw error;
  }
}

// Helper function to begin a transaction
async function beginTransaction() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

// Helper function to commit a transaction
async function commitTransaction(connection) {
  await connection.commit();
  connection.release();
}

// Helper function to rollback a transaction
async function rollbackTransaction(connection) {
  await connection.rollback();
  connection.release();
}

module.exports = {
  query,
  getOne,
  insert,
  update,
  remove,
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};