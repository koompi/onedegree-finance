import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 20,
})

export async function initDb() {
  console.log('--- Database Initialization ---')
  const client = await pool.connect()
  try {
    // 1. Core Schema
    const schemaPath = path.join(__dirname, 'schema.sql')
    if (fs.existsSync(schemaPath)) {
      console.log('Applying schema from schema.sql...')
      const sql = fs.readFileSync(schemaPath, 'utf8')
      await applySqlStatements(client, sql)
    }

    // 2. Migrations
    const migrationsDir = path.join(__dirname, '../../migrations')
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
      
      for (const file of migrationFiles) {
        console.log(`Applying migration: ${file}...`)
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        await applySqlStatements(client, sql)
      }
    }

    console.log('Database initialization finished.')
  } catch (err) {
    console.error('Error during database initialization:', err)
  } finally {
    client.release()
  }
}

async function applySqlStatements(client: any, sql: string) {
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  for (const statement of statements) {
    try {
      await client.query(statement)
    } catch (err) {
      // Don't log if it's "already exists" error to keep logs clean
      if (!err.message.includes('already exists')) {
        console.warn(`Statement failed: ${statement.substring(0, 50)}...`, err.message)
      }
    }
  }
}

export default pool
