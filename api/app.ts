import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDatabase } from './db/init.js'
import authRoutes from './routes/auth.js'
import plotRoutes from './routes/plots.js'
import claimRoutes from './routes/claims.js'
import journalRoutes from './routes/journal.js'
import announcementRoutes from './routes/announcements.js'
import shareRoutes from './routes/shares.js'
import billRoutes from './routes/bills.js'
import uploadRoutes from './routes/upload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

async function startApp() {
  await initDatabase()
}
startApp()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/plots', plotRoutes)
app.use('/api/claims', claimRoutes)
app.use('/api/journal', journalRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/shares', shareRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/upload', uploadRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
