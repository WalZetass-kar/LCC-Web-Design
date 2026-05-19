import express from 'express'
import { authRouter } from './authRouter.js'

export function createBackendApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '64kb' }))
  app.use('/auth', authRouter)

  return app
}
