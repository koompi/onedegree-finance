import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { exchangeRateService, initExchangeRate } from './services/exchangeRate'
import auth from './routes/auth'
import companies from './routes/companies'
import accounts from './routes/accounts'
import categories from './routes/categories'
import transactions from './routes/transactions'
import receivables from './routes/receivables'
import payables from './routes/payables'
import reports from './routes/reports'
import inventory from './routes/inventory'
import uploads from './routes/uploads'
import internal from './routes/internal'
import recurring from './routes/recurring'

const app = new Hono()

let dbReady = false

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'] }))
app.use('*', logger())

app.onError((err, c) => {
  console.error('[ERROR]', c.req.method, c.req.path, err.message, err.stack)
  return c.json({ error: err.message }, 500)
})

// Block all business routes until DB migrations are done
app.use('/companies/*', async (c, next) => {
  if (!dbReady) return c.json({ error: 'Server is starting up, please retry' }, 503)
  return next()
})
app.use('/auth/*', async (c, next) => {
  if (!dbReady) return c.json({ error: 'Server is starting up, please retry' }, 503)
  return next()
})

app.get('/', (c) => c.json({ service: '1° OneDegree Finance API', status: 'ok', version: '1.0.0' }))
app.get('/health', (c) => c.json({ status: dbReady ? 'ok' : 'starting', timestamp: new Date().toISOString() }))

// GET exchange rate
app.get('/exchange-rate', (c) => {
  return c.json({
    usd_to_khr: exchangeRateService.getRate(),
    last_updated: new Date().toISOString()
  })
})

app.route('/auth', auth)
app.route('/companies', companies)
app.route('/companies', accounts)
app.route('/companies', categories)
app.route('/companies', transactions)
app.route('/companies', receivables)
app.route('/companies', payables)
app.route('/companies', reports)
app.route('/companies', inventory)
app.route('/companies', uploads)
app.route('/companies', recurring)
app.route('/internal', internal)

import { serve } from '@hono/node-server'
import { initDb } from './db/client'

const port = parseInt(process.env.PORT || '3001')
serve({ fetch: app.fetch, port }, async () => {
  try {
    await initDb()
    await initExchangeRate()
  } catch (err) {
    console.error('Startup error (server still running):', err)
  }
  dbReady = true
  console.log(`1° OneDegree API running on port ${port}`)
})
