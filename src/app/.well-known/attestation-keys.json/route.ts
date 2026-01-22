// Public keys for verifying ATTPS attestation signatures
// Verifiers fetch this to get the public key for signature verification

export async function GET() {
  const keys = {
    keys: [
      {
        id: 'attps-age-v1',
        algorithm: 'Ed25519',
        publicKey: 'leokAN4223aRGnoRpl9/soBafqIEGC8h+DTGiP5JKBE=',
        createdAt: '2026-01-21T00:00:00.000Z',
      },
    ],
  }

  return Response.json(keys, {
    headers: {
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*', // Allow cross-origin access
    },
  })
}
