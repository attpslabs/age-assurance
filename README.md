# ATTPS Age Assurance

Privacy first age assurance service for AT Protocol users. Users prove they are 18 or older using Self Protocol's zero-knowledge proofs, and receive a cryptographically signed attestation written to their PDS.

**Live:** [attps.social](https://attps.social)
**Assurer DID:** `did:plc:uh7zr6mlwxneec773o5dkcrl` (@attps.social)

## How It Works

1. **User signs in** via AT Protocol OAuth
2. **User consents** to proving they are 18+
3. **QR code displayed** containing our verification endpoint and the user's DID
4. **User scans QR** with Self app on their phone
5. **Self app generates ZK proof** from the user's passport (proves age without revealing any personal identifiable information to anyone)
6. **Self relayer sends proof** to our backend (`POST /api/assure`)
7. **Backend verifies proof** using Self SDK and stores verification status
8. **Browser fetches signed attestation** (`GET /api/assure?did=...`)
9. **User reviews** the attestation that will be written
10. **User writes attestation** to their PDS via AT Protocol

## Attestation Record

Written to `social.attps.assurance.age` collection with rkey `self`:

```json
{
  "$type": "social.attps.assurance.age",
  "subject": "did:plc:user...",
  "ageAtLeast18": true,
  "assuredAt": "2026-01-21T12:00:00.000Z",
  "assurer": "did:plc:uh7zr6mlwxneec773o5dkcrl",
  "sig": "base64-ed25519-signature...",
  "sigKey": "attps-age-v1"
}
```

## Cryptography

There are two layers of cryptography in this system:

**Self Protocol (age verification):** The actual age verification happens via Self Protocol. The Self app reads the user's passport via NFC, extracts the date of birth, and generates a zero-knowledge proof that the user is 18+ without revealing their actual birthdate or any other personal data. This is the core cryptographic work that proves the user's age.

**ATTPS signature (attestation integrity):** Our Ed25519 signature simply attests that we verified a valid Self Protocol proof for this user. It prevents users from forging attestations by writing `ageAtLeast18: true` directly to their PDS without actually completing the verification. The signature proves the attestation came from a trusted assurer who validated the ZK proof.

## Verifying Attestations

Apps can verify attestations by:

1. Fetch the attestation from user's PDS
2. Check `assurer` is a trusted DID (e.g., `did:plc:uh7zr6mlwxneec773o5dkcrl`)
3. Fetch public key from `https://attps.social/.well-known/attestation-keys.json`
4. Verify Ed25519 signature over `{subject, ageAtLeast18, assuredAt, assurer}`

```typescript
// Pseudocode for verification
const payload = { subject, ageAtLeast18, assuredAt, assurer }
const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
const isValid = await crypto.subtle.verify('Ed25519', publicKey, sig, payloadBytes)
```

Note: Apps are trusting that @attps.social properly verified the Self Protocol ZK proof. The Ed25519 signature verifies the attestation hasn't been tampered with and was issued by the assurer - it does not re-verify the underlying age proof.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Configuration

Generate a signing keypair:

```bash
npx tsx scripts/generate-keypair.ts
```

Set the private key as a Cloudflare secret:

```bash
npx wrangler secret put ATTESTATION_PRIVATE_KEY
# Paste the base64 private key when prompted
```

Update the public key in `src/app/.well-known/attestation-keys.json/route.ts`.

### Production vs Development

In `src/app/assure/page.tsx`:
- `devMode: true` - Uses Self Protocol testnet (mock passports)
- `devMode: false` - Uses Self Protocol mainnet (real passports)

In `src/app/api/assure/route.ts`:
- `mockPassport: true` - Accepts test passports
- `mockPassport: false` - Requires real passport verification

## Deployment

```bash
npm run build && npm run deploy
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing/login page
│   ├── assure/page.tsx             # Age verification flow
│   ├── manage/page.tsx             # View/delete attestations
│   ├── callback/page.tsx           # OAuth callback
│   ├── api/assure/route.ts         # Self verification + signing
│   └── .well-known/
│       └── attestation-keys.json/  # Public keys endpoint
├── lib/
│   ├── atproto.ts                  # AT Protocol OAuth client
│   └── session.ts                  # Session management
└── docs/
    └── lexicons/                   # Lexicon schema documentation
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/assure` | Receives ZK proof from Self relayer, verifies it |
| `GET /api/assure?did=...` | Returns signed attestation for verified user |
| `GET /.well-known/attestation-keys.json` | Public keys for signature verification |

## License

MIT
