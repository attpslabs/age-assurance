# ATTPS Age Assurance Service - Implementation Plan

## Overview

A standalone Next.js web application where users authenticate with their AT Protocol (Bluesky) account, complete age assurance via Self Protocol, and have a permanent attestation written to their AT Protocol repository. Other apps (like Batesky) can then read this attestation to confirm age.

**Domain:** attps.social
**Hosting:** Cloudflare Pages

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  attps.social (Next.js)                     │
│                                                             │
│  1. User authenticates via AT Protocol OAuth                │
│  2. User scans passport via Self Protocol QR                │
│  3. Backend verifies zk-proof (age ≥ 18)                    │
│  4. Attestation written to user's PDS                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 User's AT Protocol PDS                      │
│                                                             │
│  Collection: xyz.attps.assurance.age                        │
│  Record Key: "self"                                         │
│                                                             │
│  {                                                          │
│    "$type": "xyz.attps.assurance.age",                      │
│    "isAdult": true,                                         │
│    "assuredAt": "2026-01-21T12:00:00.000Z",                 │
│    "assurer": "did:plc:attps-age-assurance-service",        │
│    "proofHash": "sha256:abc123..."                          │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│      Batesky        │     │    Other Apps       │
│                     │     │                     │
│  Read attestation   │     │  Read attestation   │
│  at login time      │     │  at login time      │
└─────────────────────┘     └─────────────────────┘
```

---

## Phase 1: Lexicon Design

### Collection: `xyz.attps.assurance.age`

**File:** `docs/lexicons/xyz.attps.assurance.age.json`

```json
{
  "lexicon": 1,
  "id": "xyz.attps.assurance.age",
  "defs": {
    "main": {
      "type": "record",
      "description": "Age assurance attestation proving user is 18+",
      "key": "self",
      "record": {
        "type": "object",
        "required": ["isAdult", "assuredAt", "assurer", "proofHash"],
        "properties": {
          "isAdult": {
            "type": "boolean",
            "description": "Whether user is assured as 18 or older"
          },
          "assuredAt": {
            "type": "string",
            "format": "datetime",
            "description": "ISO 8601 timestamp of when assurance occurred"
          },
          "assurer": {
            "type": "string",
            "format": "did",
            "description": "DID of the assurance service that performed age assurance"
          },
          "proofHash": {
            "type": "string",
            "description": "SHA-256 hash of the zk-proof for audit purposes"
          }
        }
      }
    }
  }
}
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Key: `"self"` | Singleton record - one attestation per user |
| No `expiresAt` | Age only increases; once 18+, always 18+ |
| `proofHash` not full proof | Privacy: store hash for audit, not raw proof |
| `assurer` DID | Identifies which service assured (for trust chains) |

---

## Phase 2: Assurance Service (Next.js)

### Project Structure

```
/Users/dave/Documents/attps/age-assurance/
├── docs/
│   ├── plan.md                    # This file
│   └── lexicons/
│       └── xyz.attps.assurance.age.json
├── src/
│   └── app/
│       ├── layout.tsx             # Root layout
│       ├── page.tsx               # Landing/home page
│       ├── globals.css            # Global styles
│       ├── assure/
│       │   └── page.tsx           # Assurance flow page
│       ├── callback/
│       │   └── page.tsx           # OAuth callback handler
│       └── api/
│           ├── auth/
│           │   ├── login/route.ts     # Initiate OAuth
│           │   └── callback/route.ts  # OAuth callback
│           └── assure/
│               └── route.ts           # Self assurance endpoint
├── lib/
│   ├── atproto.ts                 # AT Protocol utilities
│   ├── self.ts                    # Self Protocol utilities
│   └── session.ts                 # Session management
├── components/
│   ├── LoginButton.tsx            # AT Protocol login
│   ├── AssuranceQR.tsx            # Self QR code display
│   └── AssuranceStatus.tsx        # Show current status
├── public/
│   └── client-metadata.json       # OAuth client metadata
├── package.json
├── next.config.ts
├── tsconfig.json
├── wrangler.jsonc                 # Cloudflare Workers config
└── .env.example
```

### Dependencies

```json
{
  "dependencies": {
    "next": "15.1.9",
    "react": "^19.0",
    "react-dom": "^19.0",
    "@atproto/api": "^0.15",
    "@atproto/oauth-client-browser": "^0.3",
    "@selfxyz/qrcode": "latest",
    "@selfxyz/core": "latest"
  }
}
```

**Node.js:** v22.x (as required by Self Protocol)
**Runtime:** Cloudflare Workers (edge runtime)
**OAuth:** Using `@atproto/oauth-client-browser` for edge/browser compatibility

> ⚠️ **SECURITY: CVE-2025-66478** (Critical CVSS 10.0)
>
> A critical RCE vulnerability affects Next.js App Router applications via the React Server Components protocol.
> - **Affected:** Next.js 15.x, 16.x (all versions before patch)
> - **Not affected:** Edge Runtime, Pages Router, Next.js 13.x/14.x stable
> - **Patched versions:** 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, 16.0.7
> - **Our mitigation:** Using 15.1.9 (patched) + Cloudflare Edge Runtime (not affected)
>
> See: https://nextjs.org/blog/CVE-2025-66478

### Environment Variables

```bash
# .env.example

# AT Protocol OAuth
NEXT_PUBLIC_ATP_CLIENT_ID=https://attps.social/client-metadata.json
ATP_REDIRECT_URI=https://attps.social/callback

# Self Protocol
NEXT_PUBLIC_SELF_APP_NAME=ATTPS Age Assurance
NEXT_PUBLIC_SELF_SCOPE=attps-age-assurance
NEXT_PUBLIC_SELF_ENDPOINT=https://attps.social/api/assure

# Service Identity (Bluesky account @attps.social)
ASSURER_DID=did:plc:uh7zr6mlwxneec773o5dkcrl

# Session: Using browser sessionStorage (no server-side storage needed)
```

### Session Strategy

**Approach:** Browser-only sessions + minimal server-side KV

| Setting | Value |
|---------|-------|
| **OAuth Session** | Browser `sessionStorage` (3 hours) |
| **Verification Results** | Cloudflare KV (5 min TTL, one-time use) |
| **Persistence** | Tab/window only (cleared on close) |

**Why KV for verifications?**
- Self relayers POST to backend, but OAuth tokens are in browser
- Backend stores temporary "verified" flag in KV
- Frontend polls KV, then writes to PDS using browser tokens
- KV entry deleted after one use (prevents replay)

**Implementation:**
```typescript
// lib/session.ts
const SESSION_KEY = 'atproto_session'
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000  // 3 hours

interface Session {
  did: string
  accessToken: string
  refreshToken: string
  pdsUrl: string
  expiresAt: number
}

export function saveSession(session: Omit<Session, 'expiresAt'>): void {
  const data: Session = {
    ...session,
    expiresAt: Date.now() + SESSION_DURATION_MS
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

export function getSession(): Session | null {
  const data = sessionStorage.getItem(SESSION_KEY)
  if (!data) return null

  const session: Session = JSON.parse(data)
  if (Date.now() > session.expiresAt) {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
  return session
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
```

**Rationale:**
- Age verification is a one-time action users complete immediately
- No need for persistent sessions or server-side storage
- Simpler architecture, better privacy (nothing stored server-side)
- OAuth flow state also uses `sessionStorage` for CSRF protection

---

## Phase 2a: AT Protocol OAuth Flow

### Step 1: OAuth Client Metadata

**File:** `public/client-metadata.json`

```json
{
  "client_id": "https://attps.social/client-metadata.json",
  "client_name": "ATTPS Age Assurance",
  "client_uri": "https://attps.social",
  "logo_uri": "https://attps.social/logo.png",
  "redirect_uris": ["https://attps.social/callback"],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

### Step 2: Login Initiation

**File:** `app/api/auth/login/route.ts`

```typescript
import { NodeOAuthClient } from '@atproto/oauth-client-node'

const client = new NodeOAuthClient({
  clientMetadata: {
    client_id: process.env.NEXT_PUBLIC_ATP_CLIENT_ID!,
    // ... metadata
  },
  stateStore: /* session store */,
  sessionStore: /* session store */,
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const handle = url.searchParams.get('handle')

  if (!handle) {
    return Response.json({ error: 'Handle required' }, { status: 400 })
  }

  const authUrl = await client.authorize(handle, {
    scope: 'atproto transition:generic',
  })

  return Response.redirect(authUrl)
}
```

### Step 3: OAuth Callback

**File:** `app/api/auth/callback/route.ts`

```typescript
export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = url.searchParams

  const { session } = await client.callback(params)

  // Store session, set cookie
  // session.did contains the user's DID
  // session can be used to make authenticated requests

  return Response.redirect('/assure')
}
```

---

## Phase 2b: Self Protocol Integration

### Architecture: Frontend Polls, Browser Writes

**Why this approach:**
- OAuth tokens stay in browser (never sent to backend or Self relayers)
- Backend only verifies proofs, stores temporary result in KV
- Frontend polls for verification, then writes to PDS directly
- Safest and simplest architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │  Self App   │     │ Your API    │     │  User's PDS │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  1. Show QR       │                   │                   │
       │  (with user DID)  │                   │                   │
       │──────────────────>│                   │                   │
       │                   │  2. User scans    │                   │
       │                   │  passport         │                   │
       │                   │  3. POST proof    │                   │
       │                   │──────────────────>│                   │
       │                   │                   │  4. Verify proof  │
       │                   │                   │  Store in KV      │
       │                   │<──────────────────│                   │
       │                   │                   │                   │
       │  5. Poll: GET /api/assure?did=...     │                   │
       │──────────────────────────────────────>│                   │
       │<──────────────────────────────────────│                   │
       │     { verified: true, proofHash }     │                   │
       │                   │                   │                   │
       │  6. Write attestation using tokens from sessionStorage    │
       │───────────────────────────────────────────────────────────>
       │                   │                   │                   │
```

### Cloudflare KV Setup (for temporary verification results)

```bash
# Create KV namespace for verification results
npx wrangler kv namespace create "VERIFICATIONS"
```

Add to `wrangler.jsonc`:
```json
{
  "kv_namespaces": [
    { "binding": "VERIFICATIONS", "id": "your-namespace-id" }
  ]
}
```

### Step 1: Assurance Page with QR Code and Polling

**File:** `src/app/assure/page.tsx`

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { SelfAppBuilder, SelfQRcodeWrapper } from '@selfxyz/qrcode'
import { AtpAgent } from '@atproto/api'
import { getSession } from '@/lib/session'

export default function AssurePage() {
  const [selfApp, setSelfApp] = useState(null)
  const [status, setStatus] = useState<'idle' | 'scanning' | 'verified' | 'writing' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const session = getSession()

  // Poll for verification result
  const pollForVerification = useCallback(async () => {
    if (!session) return

    const response = await fetch(`/api/assure?did=${encodeURIComponent(session.did)}`)
    const data = await response.json()

    if (data.verified) {
      setStatus('writing')

      // Write attestation to PDS using tokens from sessionStorage
      try {
        const agent = new AtpAgent({ service: session.pdsUrl })
        agent.session = {
          did: session.did,
          accessJwt: session.accessToken,
          refreshJwt: session.refreshToken,
        }

        await agent.com.atproto.repo.putRecord({
          repo: session.did,
          collection: 'xyz.attps.assurance.age',
          rkey: 'self',
          record: {
            $type: 'xyz.attps.assurance.age',
            isAdult: true,
            assuredAt: new Date().toISOString(),
            assurer: 'did:plc:uh7zr6mlwxneec773o5dkcrl',
            proofHash: data.proofHash,
          },
        })

        setStatus('done')
      } catch (err) {
        setError('Failed to write attestation to your account')
        setStatus('error')
      }
    }
  }, [session])

  // Start polling when QR is shown
  useEffect(() => {
    if (status !== 'scanning' || !session) return

    const interval = setInterval(pollForVerification, 2000)  // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [status, session, pollForVerification])

  useEffect(() => {
    if (!session) return

    const app = new SelfAppBuilder({
      appName: 'ATTPS Age Assurance',
      scope: 'attps-age-assurance',
      endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT!,
      userId: session.did,  // User's AT Protocol DID
      disclosures: {
        minimumAge: 18,
      },
    }).build()

    setSelfApp(app)
    setStatus('scanning')
  }, [session])

  if (!session) {
    return <div>Please log in first</div>
  }

  return (
    <div>
      <h1>Age Assurance</h1>

      {status === 'scanning' && selfApp && (
        <SelfQRcodeWrapper selfApp={selfApp} onSuccess={() => {}} />
      )}

      {status === 'writing' && <p>Writing attestation to your account...</p>}
      {status === 'done' && <p>Success! Your age has been verified.</p>}
      {status === 'error' && <p>Error: {error}</p>}
    </div>
  )
}
```

### Step 2: Backend Assurance Endpoint (Verify + Store)

**File:** `src/app/api/assure/route.ts`

> **Self Protocol Endpoint Configuration**
>
> The `SelfBackendVerifier` second parameter is YOUR backend endpoint URL (where Self's relayers send proofs), not a Self network URL.
>
> | Parameter | Value | Description |
> |-----------|-------|-------------|
> | `scope` | `'attps-age-assurance'` | Must match frontend QR config |
> | `endpoint` | `'https://attps.social/api/assure'` | Your API route |
> | `mockPassport` | `false` (prod) / `true` (dev) | Testnet vs mainnet |
> | `userIdType` | `'uuid'` | User identifier format |
>
> **Development:** Use [ngrok](https://ngrok.com) to expose local endpoint to Self relayers:
> ```bash
> ngrok http 3000
> # Then use https://abc123.ngrok.io/api/assure as endpoint
> ```

```typescript
import { SelfBackendVerifier, DefaultConfigStore, AllIds } from '@selfxyz/core'
import { createHash } from 'crypto'

const selfVerifier = new SelfBackendVerifier(
  'attps-age-assurance',                      // scope (must match frontend)
  'https://attps.social/api/assure',          // YOUR backend endpoint
  false,                                       // false = mainnet, true = testnet
  AllIds,
  new DefaultConfigStore({
    minimumAge: 18,
    excludedCountries: [],
    ofac: false,
  }),
  'uuid'                                       // user identifier type
)

// POST: Self relayers call this with the proof
export async function POST(request: Request) {
  const env = (request as any).cf?.env  // Cloudflare env bindings

  const {
    attestationId,
    proof,
    publicSignals,
    userContextData  // Contains the user's DID
  } = await request.json()

  // 1. Verify the zk-proof
  const result = await selfVerifier.verify(
    attestationId,
    proof,
    publicSignals,
    userContextData
  )

  if (!result.isValidDetails.isValid) {
    return Response.json({
      success: false,
      error: 'Verification failed'
    }, { status: 400 })
  }

  if (!result.isValidDetails.isOlderThanValid) {
    return Response.json({
      success: false,
      error: 'Age requirement not met'
    }, { status: 400 })
  }

  // 2. Store verification result in KV (5 minute TTL)
  const proofHash = `sha256:${createHash('sha256')
    .update(JSON.stringify(proof))
    .digest('hex')}`

  await env.VERIFICATIONS.put(
    `verified:${userContextData}`,
    JSON.stringify({ proofHash, verifiedAt: Date.now() }),
    { expirationTtl: 300 }  // 5 minutes
  )

  return Response.json({ success: true })
}

// GET: Browser polls this to check verification status
export async function GET(request: Request) {
  const env = (request as any).cf?.env
  const url = new URL(request.url)
  const did = url.searchParams.get('did')

  if (!did) {
    return Response.json({ verified: false, error: 'Missing DID' }, { status: 400 })
  }

  const result = await env.VERIFICATIONS.get(`verified:${did}`)

  if (!result) {
    return Response.json({ verified: false })
  }

  // Delete after reading (one-time use)
  await env.VERIFICATIONS.delete(`verified:${did}`)

  const { proofHash } = JSON.parse(result)
  return Response.json({ verified: true, proofHash })
}
```

---

## Phase 3: Documentation

### User Documentation

**File:** `docs/user-guide.md`

Contents:
- What is age assurance
- How to get assured (step-by-step with screenshots)
- What data is stored (privacy explanation)
- FAQ

### Developer Documentation

**File:** `docs/developer-guide.md`

Contents:
- How to read attestations in your app
- Example code for checking assurance
- Trusted assurer DIDs
- Lexicon reference

### Reading Attestation (for other apps)

```typescript
// Example: How Batesky checks age assurance

import { AtpAgent } from '@atproto/api'

async function checkAgeAssurance(userDid: string): Promise<boolean> {
  const agent = new AtpAgent({ service: 'https://public.api.bsky.app' })

  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: userDid,
      collection: 'xyz.attps.assurance.age',
      rkey: 'self',
    })

    const attestation = response.data.value

    // Check the attestation
    if (!attestation.isAdult) return false

    // Optionally check it came from a trusted assurer
    const trustedAssurers = ['did:plc:attps-age-assurance-service']
    if (!trustedAssurers.includes(attestation.assurer)) {
      console.warn('Attestation from untrusted assurer')
      return false
    }

    return true
  } catch (error) {
    // Record doesn't exist = not assured
    return false
  }
}
```

---

## Implementation Order

### Step 1: Setup Project
- [ ] Initialize Next.js project in `/attps/self/`
- [ ] Install dependencies
- [ ] Create environment configuration
- [ ] Setup basic layout and pages

### Step 2: AT Protocol OAuth
- [ ] Create client-metadata.json
- [ ] Implement OAuth login flow
- [ ] Implement OAuth callback
- [ ] Session storage (cookies or database)
- [ ] Test login with Bluesky account

### Step 3: Self Protocol Integration
- [ ] Add Self SDK packages
- [ ] Create assurance page with QR code
- [ ] Implement backend assurance endpoint
- [ ] Test with Self app (mock passport)

### Step 4: Attestation Writing
- [ ] Implement PDS record writing
- [ ] Test attestation appears in user's repo
- [ ] Handle errors (network, auth expiry)

### Step 5: UI/UX Polish
- [ ] Landing page explaining the service
- [ ] Assurance status page
- [ ] Success/error states
- [ ] Mobile-responsive design

### Step 6: Documentation
- [ ] User guide
- [ ] Developer integration guide
- [ ] API reference

### Step 7: Deployment
- [ ] Deploy to Cloudflare Pages
- [ ] Configure domain (attps.social)
- [ ] Test end-to-end flow

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Fake attestations | Users can write anything to their repo, but apps check `assurer` DID |
| Session hijacking | Browser `sessionStorage` only, 3-hour expiry, cleared on tab close |
| CSRF attacks | OAuth state parameter with cryptographic randomness via SDK |
| Replay attacks | Self Protocol handles via attestationId; OAuth state deleted after use |
| Rate limiting | Implement on assurance endpoint |

---

## Service DID Configuration

The `assurer` field in attestations identifies which service performed the verification. Other apps check this to establish trust.

### Using Bluesky Account: `@attps.social`

| Field | Value |
|-------|-------|
| **Handle** | `@attps.social` |
| **DID** | `did:plc:uh7zr6mlwxneec773o5dkcrl` |
| **Profile** | https://bsky.app/profile/attps.social |

**Why this approach:**
- No key generation or DID document setup needed
- Bluesky handles key management
- `did:plc` is portable (can migrate if needed)
- Handle `@attps.social` establishes domain trust visually
- Resolving the DID shows the verified domain handle

**Attestation example:**
```json
{
  "$type": "xyz.attps.assurance.age",
  "isAdult": true,
  "assuredAt": "2026-01-21T12:00:00.000Z",
  "assurer": "did:plc:uh7zr6mlwxneec773o5dkcrl",
  "proofHash": "sha256:abc123..."
}
```

**How consumer apps verify trust:**
1. Read `assurer` field from attestation
2. Resolve `did:plc:uh7zr6mlwxneec773o5dkcrl` via AT Protocol
3. See handle is `@attps.social` (domain-verified)
4. Trust established

---

## CSRF Protection

The `@atproto/oauth-client-browser` SDK handles CSRF protection automatically via the OAuth `state` parameter.

**How it works:**
1. SDK generates cryptographically secure random state
2. State stored in `sessionStorage` before redirect
3. On callback, SDK validates returned state matches stored state
4. State deleted after use (prevents replay)

**Our implementation uses `sessionStorage`** which provides:
- Automatic cleanup on tab close
- No server-side storage needed
- State isolated per tab (prevents cross-tab attacks)

---

## Open Questions

1. ~~**Assurer DID**: Need to create/register a DID for the service~~ → Using `did:plc:uh7zr6mlwxneec773o5dkcrl` (@attps.social)
2. **Design**: Any branding guidelines for UI?

---

## Success Criteria

- [ ] User can log in with any Bluesky/AT Protocol account
- [ ] User can complete Self assurance flow
- [ ] Attestation appears in user's AT Protocol repo
- [ ] Other apps can read and validate the attestation
- [ ] Documentation is clear and complete
