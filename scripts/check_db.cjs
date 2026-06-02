const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../sistem_pos.db');
const db = new Database(dbPath);

try {
  const row = db.prepare('SELECT license_server_url, license_admin_token FROM mediasoft_identitas LIMIT 1').get();
  console.log('Database license config:', row);
} catch (err) {
  console.error('Error reading database:', err);
}
