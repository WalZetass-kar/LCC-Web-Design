#!/usr/bin/env node
/**
 * Standalone script to add missing password_hash_type column
 * Run this AFTER closing the Electron app and SQLite Browser
 * 
 * Usage: node add_password_column.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'sistem_pos.db');

console.log('🔧 Database Migration Script');
console.log('📁 Database:', dbPath);
console.log('');

try {
  const db = new Database(dbPath);
  
  // Check current columns
  console.log('Checking current schema...');
  const columns = db.prepare("PRAGMA table_info(mediasoft_pengguna)").all();
  const hasPasswordHashType = columns.some(col => col.name === 'password_hash_type');
  
  if (hasPasswordHashType) {
    console.log('✓ password_hash_type column already exists!');
    console.log('');
    console.log('Current columns:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
  } else {
    console.log('⚠️  password_hash_type column is missing');
    console.log('Adding column...');
    
    db.exec(`ALTER TABLE mediasoft_pengguna ADD COLUMN password_hash_type TEXT DEFAULT 'sha1';`);
    db.exec(`UPDATE mediasoft_pengguna SET password_hash_type = 'sha1' WHERE password_hash_type IS NULL;`);
    
    console.log('✓ Column added successfully!');
    console.log('');
    
    // Verify
    const newColumns = db.prepare("PRAGMA table_info(mediasoft_pengguna)").all();
    console.log('Updated columns:');
    newColumns.forEach(col => {
      const marker = col.name === 'password_hash_type' ? ' ← NEW' : '';
      console.log(`  - ${col.name} (${col.type})${marker}`);
    });
  }
  
  db.close();
  console.log('');
  console.log('✅ Migration completed successfully!');
  console.log('You can now restart your Electron app.');
  
} catch (error) {
  console.error('');
  console.error('❌ Error:', error.message);
  console.error('');
  
  if (error.message.includes('database is locked')) {
    console.error('The database is currently locked. Please:');
    console.error('1. Close the Electron app');
    console.error('2. Close SQLite Browser (if open)');
    console.error('3. Run this script again');
  } else if (error.message.includes('duplicate column')) {
    console.error('The column already exists! You can safely restart your app.');
  } else {
    console.error('Unexpected error occurred.');
  }
  
  process.exit(1);
}
