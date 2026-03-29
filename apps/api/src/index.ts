import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import auth from './routes/auth'
import companies from './routes/companies'
import accounts from './routes/accounts'
import categories from './routes/categories'
import transactions from './routes/transactions'
import receivables from './routes/receivables'
import payables from './routes/payables'
import reports from './routes/reports'
import inventory from './routes/inventory'

const app = new Hono()

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'] }))
app.use('*', logger())

app.get('/', (c) => c.json({ service: '1° OneDegree Finance API', status: 'ok', version: '1.0.0' }))
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/auth', auth)
app.route('/companies', companies)
app.route('/companies', accounts)
app.route('/companies', categories)
app.route('/companies', transactions)
app.route('/companies', receivables)
app.route('/companies', payables)
app.route('/companies', reports)
app.route('/companies', inventory)

import { serve } from '@hono/node-server'

const port = parseInt(process.env.PORT || '3001')
serve({ fetch: app.fetch, port }, () => {
  console.log(`1° OneDegree API running on port ${port}`)
})
