import {
  SelfBackendVerifier,
  DefaultConfigStore,
  AllIds,
} from '@selfxyz/core'
import type { BigNumberish } from 'ethers'
import { getStore } from '@netlify/blobs'

// Initialize the Self Protocol verifier with proper configuration
const configStore = new DefaultConfigStore({
  minimumAge: 18,
  excludedCountries: [],
  ofac: false,
})

const selfVerifier = new SelfBackendVerifier(
  'attps-age-assurance', // scope (must match frontend QR config)
  'https://attps.social/api/assure', // endpoint (updated in prod)
  true, // mockPassport - true for testnet/dev, false for mainnet
  AllIds, // allowed attestation types (passport, ID card, etc.)
  configStore, // verification config
  'uuid' // user identifier type
)

// Verification data stored in Netlify Blobs
interface VerificationData {
  verifiedAt: number
  used: boolean
}

// Type for the proof payload from Self
interface SelfProofPayload {
  attestationId: 1 | 2 | 3
  proof: {
    a: [BigNumberish, BigNumberish]
    b: [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish]]
    c: [BigNumberish, BigNumberish]
  }
  publicSignals: BigNumberish[]
  userContextData?: string // Contains the user's UUID
}

// Sign the attestation payload using Ed25519
async function signAttestation(
  payload: object,
  privateKeyBase64: string
): Promise<string> {
  // Import the raw Ed25519 private key
  const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64), (c) =>
    c.charCodeAt(0)
  )

  // Ed25519 raw private key is 32 bytes, we need to create a CryptoKey
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'Ed25519' },
    false,
    ['sign']
  )

  // Create canonical JSON of the payload
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))

  // Sign the payload
  const signature = await crypto.subtle.sign('Ed25519', cryptoKey, payloadBytes)

  // Return base64-encoded signature
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

// POST: Self relayers call this with the proof
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SelfProofPayload
    const { attestationId, proof, publicSignals, userContextData } = body

    if (!attestationId || !proof || !publicSignals) {
      return Response.json(
        { status: 'error', result: false, reason: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the zk-proof
    const result = await selfVerifier.verify(
      attestationId,
      proof,
      publicSignals,
      userContextData || ''
    )

    if (!result.isValidDetails.isValid) {
      return Response.json(
        {
          status: 'error',
          result: false,
          reason: 'Verification failed',
        },
        { status: 400 }
      )
    }

    // Check age requirement specifically
    if (!result.isValidDetails.isMinimumAgeValid) {
      return Response.json(
        {
          status: 'error',
          result: false,
          reason: 'Age requirement not met',
        },
        { status: 400 }
      )
    }

    // Store verification result in Netlify Blobs (persists across function instances)
    if (userContextData) {
      try {
        console.log('Storing verification for UUID:', userContextData)
        const store = getStore('verifications')
        await store.setJSON(userContextData, {
          verifiedAt: Date.now(),
          used: false,
        } as VerificationData)
        console.log('Successfully stored verification')
      } catch (blobError) {
        console.error('Failed to store verification in Netlify Blobs:', blobError)
        // Continue anyway - the proof was verified successfully
      }
    }

    // Return success - Self SDK will trigger the frontend onSuccess callback
    return Response.json({ status: 'success', result: true })
  } catch (error) {
    console.error('Verification error:', error)

    // Provide user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    let userMessage = 'Verification failed'

    if (errorMessage.includes('InvalidMinimumAge')) {
      userMessage = 'Age requirement not met. You must be 18 or older.'
    } else if (errorMessage.includes('InvalidProof')) {
      userMessage = 'Invalid proof. Please try scanning again.'
    }

    return Response.json(
      {
        status: 'error',
        result: false,
        reason: userMessage,
      },
      { status: 400 }
    )
  }
}

// GET: Frontend calls this after onSuccess to get the signed attestation
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const did = url.searchParams.get('did')
    const uuid = url.searchParams.get('uuid')

    if (!did || !uuid) {
      return Response.json(
        { success: false, error: 'Missing DID or UUID parameter' },
        { status: 400 }
      )
    }

    // Check if this user was recently verified (lookup by UUID from Netlify Blobs)
    let verification: VerificationData | null = null
    let store: ReturnType<typeof getStore>
    try {
      console.log('Looking up verification for UUID:', uuid)
      store = getStore('verifications')
      verification = await store.get(uuid, { type: 'json' }) as VerificationData | null
      console.log('Verification lookup result:', verification)
    } catch (blobError) {
      console.error('Failed to read from Netlify Blobs:', blobError)
      return Response.json(
        { success: false, error: 'Storage error - please try again' },
        { status: 500 }
      )
    }

    if (!verification) {
      return Response.json(
        { success: false, error: 'No verification found for this user' },
        { status: 404 }
      )
    }

    // Check if verification is still fresh (within 5 minutes)
    if (Date.now() - verification.verifiedAt > 5 * 60 * 1000) {
      await store.delete(uuid)
      return Response.json(
        { success: false, error: 'Verification expired' },
        { status: 410 }
      )
    }

    // Check if already used
    if (verification.used) {
      return Response.json(
        { success: false, error: 'Verification already used' },
        { status: 409 }
      )
    }

    // Mark as used
    await store.setJSON(uuid, { ...verification, used: true } as VerificationData)

    // Get the private key from environment
    const privateKey = process.env.ATTESTATION_PRIVATE_KEY

    if (!privateKey) {
      console.error('ATTESTATION_PRIVATE_KEY not configured')
      return Response.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create the attestation payload (what gets signed)
    const assuredAt = new Date().toISOString()
    const payload = {
      subject: did,
      ageAtLeast18: true,
      assuredAt,
      assurer: 'did:plc:uh7zr6mlwxneec773o5dkcrl', // @attps.social
    }

    // Sign the payload
    const sig = await signAttestation(payload, privateKey)

    // Return the signed attestation
    return Response.json({
      success: true,
      attestation: {
        ...payload,
        sig,
        sigKey: 'attps-age-v1',
      },
    })
  } catch (error) {
    console.error('Attestation signing error:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
