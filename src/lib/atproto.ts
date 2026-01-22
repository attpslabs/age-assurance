import { BrowserOAuthClient } from '@atproto/oauth-client-browser'
import { Agent } from '@atproto/api'

let oauthClient: BrowserOAuthClient | null = null

// Resolve handle from DID using public PLC directory
async function resolveHandleFromDid(did: string): Promise<string> {
  try {
    // Use PLC directory to resolve DID document
    const response = await fetch(`https://plc.directory/${did}`)
    if (!response.ok) {
      return did // Fallback to DID if resolution fails
    }
    const didDoc = (await response.json()) as {
      alsoKnownAs?: string[]
    }
    // The handle is in the alsoKnownAs field as at://handle
    const aka = didDoc.alsoKnownAs?.find((u) => u.startsWith('at://'))
    if (aka) {
      return aka.replace('at://', '')
    }
    return did
  } catch {
    return did // Fallback to DID on error
  }
}

export async function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (oauthClient) return oauthClient

  // Check if we're in the browser
  if (typeof window === 'undefined') {
    throw new Error('OAuth client can only be used in the browser')
  }

  const isLocalDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]'

  if (isLocalDev) {
    // Use loopback client for local development
    // Note: Only http://127.0.0.1 and http://[::1] work, not localhost
    // The library will auto-redirect from localhost to 127.0.0.1
    oauthClient = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      clientMetadata: undefined,
    })
  } else {
    // Production: load client metadata from public URL
    oauthClient = await BrowserOAuthClient.load({
      clientId: `${window.location.origin}/client-metadata.json`,
      handleResolver: 'https://bsky.social',
    })
  }

  return oauthClient
}

export async function signIn(handle: string): Promise<void> {
  const client = await getOAuthClient()
  await client.signIn(handle, {
    signal: new AbortController().signal,
  })
}

export async function handleCallback(): Promise<{
  did: string
  handle: string
  pdsUrl: string
} | null> {
  const client = await getOAuthClient()

  // Check if this is a callback (URL has oauth params)
  const params = new URLSearchParams(window.location.search)
  if (!params.has('code') && !params.has('error')) {
    return null
  }

  try {
    const result = await client.callback(params)
    const session = result.session

    // Resolve handle from DID using PLC directory
    const handle = await resolveHandleFromDid(session.did)

    // Get PDS URL from the server metadata issuer
    const pdsUrl = session.serverMetadata?.issuer || 'https://bsky.social'

    return {
      did: session.did,
      handle,
      pdsUrl,
    }
  } catch (error) {
    console.error('OAuth callback error:', error)
    throw error
  }
}

export async function restoreSession(): Promise<{
  did: string
  handle: string
  pdsUrl: string
  agent: Agent
} | null> {
  try {
    const client = await getOAuthClient()

    // Try to restore any existing session
    // This also handles OAuth callbacks from URL fragments
    const result = await client.init()

    if (result?.session) {
      const agent = new Agent(result.session)

      // Resolve handle from DID using PLC directory
      const handle = await resolveHandleFromDid(result.session.did)

      // Get PDS URL from the server metadata issuer
      const pdsUrl = result.session.serverMetadata?.issuer || 'https://bsky.social'

      return {
        did: result.session.did,
        handle,
        pdsUrl,
        agent,
      }
    }

    return null
  } catch (error) {
    console.error('Failed to restore session:', error)
    return null
  }
}

export async function getAgent(): Promise<Agent | null> {
  const restored = await restoreSession()
  return restored?.agent || null
}

export async function signOut(): Promise<void> {
  // Clear the OAuth client's internal state
  oauthClient = null

  // The BrowserOAuthClient stores sessions in IndexedDB
  // We can clear by re-initializing without restoring
  if (typeof window !== 'undefined') {
    // Clear IndexedDB for OAuth
    const databases = await indexedDB.databases()
    for (const db of databases) {
      if (db.name?.includes('atproto')) {
        indexedDB.deleteDatabase(db.name)
      }
    }
  }
}
