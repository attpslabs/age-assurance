/**
 * Generate an Ed25519 keypair for attestation signing.
 *
 * Run with: npx tsx scripts/generate-keypair.ts
 *
 * This will output:
 * 1. The private key (base64) - store as Cloudflare secret: wrangler secret put ATTESTATION_PRIVATE_KEY
 * 2. The public key (base64) - add to /.well-known/attestation-keys.json
 */

import { generateKeyPairSync } from 'crypto'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')

// Export as raw bytes in base64
const privateKeyBytes = privateKey.export({ type: 'pkcs8', format: 'der' })
const publicKeyBytes = publicKey.export({ type: 'spki', format: 'der' })

// For Ed25519, the raw 32-byte keys are at specific offsets in the DER encoding
// PKCS8 private key: last 32 bytes after the header
// SPKI public key: last 32 bytes after the header
const privateKeyRaw = privateKeyBytes.slice(-32)
const publicKeyRaw = publicKeyBytes.slice(-32)

console.log('=== ATTPS Attestation Signing Keypair ===\n')

console.log('PRIVATE KEY (base64) - Store as Cloudflare secret:')
console.log(`  wrangler secret put ATTESTATION_PRIVATE_KEY`)
console.log(`  Then paste: ${privateKeyRaw.toString('base64')}\n`)

console.log('PUBLIC KEY (base64) - Add to well-known endpoint:')
console.log(`  ${publicKeyRaw.toString('base64')}\n`)

console.log('For /.well-known/attestation-keys.json:')
console.log(
  JSON.stringify(
    {
      keys: [
        {
          id: 'attps-age-v1',
          algorithm: 'Ed25519',
          publicKey: publicKeyRaw.toString('base64'),
          createdAt: new Date().toISOString(),
        },
      ],
    },
    null,
    2
  )
)
