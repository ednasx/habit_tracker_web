import jwt from 'jsonwebtoken'

/**
 * Middleware to verify JWT issued by Supabase.
 * Expects header: Authorization: Bearer <token>
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Missing Authorization header' })
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    console.warn('[Auth] SUPABASE_JWT_SECRET not set')
    return res.status(500).json({ message: 'Auth not configured' })
  }

  try {
    const decoded = jwt.verify(token, secret)

    // Attach basic user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      ...decoded, // keep full payload available if needed
    }

    return next()
  } catch (err) {
    console.error('[Auth] JWT verification failed:', err.message)
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
