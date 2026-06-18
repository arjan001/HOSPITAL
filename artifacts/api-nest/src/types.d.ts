declare global {
  namespace Express {
    interface Request {
      sessionId: string
      adminUser?: {
        id: string
        role: string
        name?: string
        email?: string
        permissions?: string[]
      }
    }
  }
}

export {}
