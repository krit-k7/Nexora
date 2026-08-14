# verixa-sdk

> Official TypeScript SDK for the Verixa Protocol

## Installation

```bash
npm install verixa-sdk
```

## Usage

```typescript
import { VerixaSDK } from 'verixa-sdk';

const sdk = new VerixaSDK({
  network: 'sandbox',
  secretKey: 'YOUR_ED25519_SECRET_KEY_BASE58'
});

const token = await sdk.auth.authenticate();
sdk.setToken(token);

const rule = await sdk.rules.create('My Rule', 'balance > 100', 'releaseFunds');
const proof = await sdk.proofs.generate(rule._id);
```

## Modules

| Module | Description |
|--------|-------------|
| `sdk.auth` | Wallet-based JWT authentication |
| `sdk.rules` | Logic rule deployment |
| `sdk.proofs` | Cross-chain proof generation |
| `sdk.execution` | Rule execution triggering |
| `sdk.events` | Real-time WebSocket + Webhooks |

## Build

```bash
npm run build
```

## License
MIT
