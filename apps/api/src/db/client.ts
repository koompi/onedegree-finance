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
    const schemaPath = path.join(__dirname, 'schema.sql')
    if (fs.existsSync(schemaPath)) {
      console.log('Applying schema from schema.sql...')
      const sql = fs.readFileSync(schemaPath, 'utf8')
      await client.query(sql)
      console.log('Schema applied successfully.')
    } else {
      console.warn('schema.sql not found at', schemaPath)
    }
  } catch (err) {
    console.error('Error during database initialization:', err)
  } finally {
    client.release()
  }
}

export default pool
