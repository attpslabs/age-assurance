const SESSION_KEY = 'atproto_session'
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000 // 3 hours

export interface Session {
  did: string
  handle: string
  pdsUrl: string
  expiresAt: number
}

export function saveSession(session: Omit<Session, 'expiresAt'>): void {
  if (typeof window === 'undefined') return

  const data: Session = {
    ...session,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null

  const data = sessionStorage.getItem(SESSION_KEY)
  if (!data) return null

  try {
    const session: Session = JSON.parse(data)
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
}
