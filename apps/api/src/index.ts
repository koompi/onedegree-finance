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

const app = new Hono()

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'] }))
app.use('*', logger())

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/auth', auth)
app.route('/companies', companies)
app.route('/companies', accounts)
app.route('/companies', categories)
app.route('/companies', transactions)
app.route('/companies', receivables)
app.route('/companies', payables)
app.route('/companies', reports)

export default {
  port: parseInt(process.env.PORT || '3001'),
  fetch: app.fetch,
}
