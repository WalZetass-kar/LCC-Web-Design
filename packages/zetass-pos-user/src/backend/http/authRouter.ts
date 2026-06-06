import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { AuthController } from '../controllers/AuthController.js'
import type { AuthDeviceInfo } from '../models/AuthSessionModel.js'

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  deviceId: z.string().trim().max(128).optional(),
  deviceName: z.string().trim().max(128).optional(),
})

const pinLoginSchema = z.object({
  username: z.string().trim().min(1),
  pin: z.string().regex(/^\d{4,8}$/),
  deviceId: z.string().trim().max(128).optional(),
  deviceName: z.string().trim().max(128).optional(),
})

const logoutSchema = z.object({
  username: z.string().trim().min(1),
  sessionToken: z.string().min(16).optional(),
  deviceId: z.string().trim().max(128).optional(),
  deviceName: z.string().trim().max(128).optional(),
})

function requestDevice(req: Request, body: { deviceId?: string; deviceName?: string }): AuthDeviceInfo {
  return {
    ipAddress: req.ip,
    deviceId: body.deviceId ?? null,
    deviceName: body.deviceName ?? null,
    userAgent: req.get('user-agent') ?? null,
  }
}

function sendAuthResponse(res: Response, result: Awaited<ReturnType<typeof AuthController.login>>) {
  const status = result.success ? 200 : 401
  res.status(status).json(result)
}

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, message: parsed.error.errors[0]?.message ?? 'Payload login tidak valid' })
    return
  }

  const result = await AuthController.login(
    parsed.data.username,
    parsed.data.password,
    requestDevice(req, parsed.data),
  )
  sendAuthResponse(res, result)
})

authRouter.post('/pin-login', async (req, res) => {
  const parsed = pinLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Payload PIN login tidak valid' })
    return
  }

  const result = await AuthController.loginWithPin(
    parsed.data.username,
    parsed.data.pin,
    requestDevice(req, parsed.data),
  )
  sendAuthResponse(res, result as Awaited<ReturnType<typeof AuthController.login>>)
})

authRouter.post('/logout', (req, res) => {
  const parsed = logoutSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Payload logout tidak valid' })
    return
  }

  const result = AuthController.logout(
    parsed.data.username,
    parsed.data.sessionToken,
    requestDevice(req, parsed.data),
  )
  res.json(result)
})
