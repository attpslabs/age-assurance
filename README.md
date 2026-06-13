![ATTPS Age Verification](public/assets/banner.png)

# privacy-frst zero-knowledge passport data verification for DIDs

Prove to be 18 or older using zero-knowledge proofs (using the [self protocol](https://services.google.com/fh/files/misc/self_case_study.pdf) iOS/Android app), and receive a cryptographically signed attestation written to your PDS.

**Live:** [attps.social](https://attps.social)
**Assurer DID:** `did:plc:uh7zr6mlwxneec773o5dkcrl` (@attps.social)

## How It Works

1. **Sign in** with OAuth
2. **Consent steps** to prove one is 18 or older. No other information is attested to, but Self Protocol can be used to attest to further credentials like country, or sex.
3. **QR code displayed** containing verification endpoint and user's DID
4. **User scans QR** with Self app on their phone
5. **Self app generates ZK proof** from passport (proves age without revealing personal data) using google TEE (see [whitepaper/case-study](https://services.google.com/fh/files/misc/self_case_study.pdf) 2026)
6. **Self relayer sends proof** to backend (`POST /api/assure`)
7. **Backend verifies proof** using Self SDK and stores verification status
8. **Browser fetches signed attestation** (`GET /api/assure?did=...`)
9. **User reviews** the attestation
10. **User writes attestation** to their PDS

## DID to UUID Mapping

The Self SDK requires a UUID for user identification, but AT Protocol uses DIDs. We use deterministic UUID generation to bridge these systems.

### Conversion

DIDs are converted to UUIDs using UUIDv5 with the DNS namespace:

```typescript
import { v5 as uuidv5 } from 'uuid'

const DID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' // DNS namespace
const userUuid = uuidv5(session.did, DID_NAMESPACE)
```

This ensures the same DID always generates the same UUID, allowing the backend to match verification results to users.

### Self SDK UUID Format

When the Self SDK stores verification data, it transforms the UUID into a longer format:

```
000000000000000000000000000000000000000000000000000000000000a4ec + 00000000000000000000000000000000 + uuid_without_dashes
```

The backend reconstructs this format when looking up verification results.

## Attestation Record

Written to `social.attps.ageassurance` collection with rkey `self`:

```json
{
  "$type": "social.attps.ageassurance",
  "subject": "did:plc:user...",
  "ageAtLeast18": true,
  "assuredAt": "2025-01-21T12:00:00.000Z",
  "assurer": "did:plc:uh7zr6mlwxneec773o5dkcrl",
  "sig": "base64-ed25519-signature...",
  "sigKey": "attps-age-v1"
}
```

## Cryptography

**Self Protocol (age verification):** The Self app reads the user's passport via NFC, extracts the date of birth, and generates a zero-knowledge proof that the user is 18+ without revealing their actual birthdate or any other personal data.

**ATTPS signature (attestation integrity):** Our Ed25519 signature attests that we verified a valid Self Protocol proof for this user. It prevents forged attestations and proves the attestation came from a trusted assurer.

## Verifying Attestations

Apps can verify attestations by:

1. Fetch the attestation from user's PDS
2. Check `assurer` is a trusted DID (e.g., `did:plc:uh7zr6mlwxneec773o5dkcrl`)
3. Fetch public key from `https://attps.social/.well-known/attestation-keys.json`
4. Verify Ed25519 signature over `{subject, ageAtLeast18, assuredAt, assurer}`

```typescript
const payload = { subject, ageAtLeast18, assuredAt, assurer }
const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
const isValid = await crypto.subtle.verify('Ed25519', publicKey, sig, payloadBytes)
```

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

Set the private key as a Netlify environment variable:
- Go to Site Settings > Environment Variables
- Add `ATTESTATION_PRIVATE_KEY` with the base64 private key

Update the public key in `src/app/.well-known/attestation-keys.json/route.ts`.

### Production vs Playground

The app has two modes:

- **Production** (`/assure`) - Requires real passport verification
- **Playground** (`/playground/assure`) - Uses mock passports for testing

## Deployment

Deployed on Netlify. Push to `main` to deploy:

```bash
git push origin main
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── assure/page.tsx             # Production age verification
│   ├── attestations/page.tsx       # View/delete attestations
│   ├── callback/page.tsx           # OAuth callback
│   ├── playground/
│   │   ├── page.tsx                # Playground landing
│   │   └── assure/page.tsx         # Playground verification (mock)
│   ├── api/
│   │   ├── assure/route.ts         # Production verification + signing
│   │   └── playground/assure/route.ts  # Playground verification
│   └── .well-known/
│       └── attestation-keys.json/  # Public keys endpoint
├── components/
│   ├── AppHeader.tsx               # App navigation header
│   ├── Header.tsx                  # Landing page header
│   ├── LoginButton.tsx             # OAuth login button
│   └── magicui/                    # UI components
│       └── sphere-mask.tsx         # Animated sphere background
└── lib/
    ├── atproto.ts                  # AT Protocol OAuth client
    ├── session.ts                  # Session management
    ├── logo.ts                     # Base64 logo for Self QR
    └── utils.ts                    # Utility functions
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/assure` | Receives ZK proof from Self relayer, verifies it |
| `GET /api/assure?did=...&uuid=...` | Returns signed attestation for verified user |
| `POST /api/playground/assure` | Playground verification (mock passports) |
| `GET /api/playground/assure?did=...&uuid=...` | Playground signed attestation |
| `GET /.well-known/attestation-keys.json` | Public keys for signature verification |


## License

This project is dual-licensed under MIT and Apache 2.0 terms:

- MIT license ([LICENSE-MIT.txt](https://github.com/attpslabs/age-assurance/blob/main/LICENSE-MIT.txt) or http://opensource.org/licenses/MIT)
- Apache License, Version 2.0, ([LICENSE-APACHE.txt](https://github.com/attpslabs/age-assurance/blob/main/LICENSE-APACHE.txt) or http://www.apache.org/licenses/LICENSE-2.0)

Downstream projects and end users may choose either license individually, or both together, at their discretion. The motivation for this dual-licensing is the additional software patent assurance provided by Apache 2.0.
