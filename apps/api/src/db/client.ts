import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.com') ? { rejectUnauthorized: false } : false,
  max: 20,
})

export async function initDb() {
  console.log('--- Database Initialization ---')
  let client: any
  try {
    client = await pool.connect()
  } catch (err) {
    console.error('Database connection refused during init — server will still run:', err.message)
    return
  }
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
  const statements = splitSql(sql)
  for (const statement of statements) {
    try {
      await client.query(statement)
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn(`Statement failed: ${statement.substring(0, 50)}...`, err.message)
      }
    }
  }
}

// Split SQL on semicolons while respecting dollar-quoted strings ($$...$$)
function splitSql(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let dollarTag: string | null = null
  let i = 0

  while (i < sql.length) {
    // Check for start/end of a dollar-quoted block (e.g. $$ or $tag$)
    if (dollarTag === null) {
      const tagMatch = sql.slice(i).match(/^(\$[^$]*\$)/)
      if (tagMatch) {
        dollarTag = tagMatch[1]
        current += dollarTag
        i += dollarTag.length
        continue
      }
    } else if (sql.slice(i).startsWith(dollarTag)) {
      current += dollarTag
      i += dollarTag.length
      dollarTag = null
      continue
    }

    const ch = sql[i]
    if (ch === ';' && dollarTag === null) {
      const trimmed = current.trim()
      if (trimmed) statements.push(trimmed)
      current = ''
    } else {
      current += ch
    }
    i++
  }

  const trimmed = current.trim()
  if (trimmed) statements.push(trimmed)
  return statements
}

export default pool
