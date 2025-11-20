import jwt from 'jsonwebtoken'

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization

  // 1) No Authorization header at all
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing Authorization header' })
  }

  // 2) Malformed header (not "Bearer <token>")
  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization header format' })
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    console.warn('[Auth] SUPABASE_JWT_SECRET not set')
    return res.status(500).json({ message: 'Auth not configured' })
  }

  try {
    const decoded = jwt.verify(token, secret)

    // Supabase puts the user id in "sub"
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      ...decoded,
    }

    return next()
  } catch (err) {
    console.error('[Auth] JWT verification failed:', err.message)
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
