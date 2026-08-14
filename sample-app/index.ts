import { VerixaSDK } from '../sdk/src/index';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

async function main() {
  // Start the SDK demonstration
  console.log("🚀 Starting Verixa SDK Demo");

  // Generate a temporary Ed25519 keypair for this demo.
  // In production, the secret key should be securely stored and never
  // generated or exposed directly in application code.
  const keyPair = nacl.sign.keyPair();

  // Encode the keys using Base58 so they can be safely passed to the SDK.
  const secretKey = bs58.encode(keyPair.secretKey);
  const publicKey = bs58.encode(keyPair.publicKey);

  console.log(`🔑 Initialized Wallet: ${publicKey}`);

  // Initialize the Verixa SDK.
  // The sandbox network connects to the local development server
  // running on localhost:5001.
  const sdk = new VerixaSDK({
    network: 'sandbox',
    secretKey: secretKey
  });

  try {
    // 1. Authenticate with the Verixa protocol.
    // The SDK uses the configured secret key to obtain an
    // authentication token for subsequent API requests.
    console.log("⏳ Authenticating...");

    const token = await sdk.auth.authenticate();
    sdk.setToken(token);

    console.log("✅ Authentication successful");

    // 2. Register a webhook to receive real-time execution events.
    // This example subscribes to the EXECUTION_COMPLETED event.
    console.log("⏳ Registering Webhook...");

    await sdk.events.registerWebhook(
      'https://my-app.com/webhook',
      ['EXECUTION_COMPLETED']
    );

    console.log("✅ Webhook registered");

    // 3. Create a cross-chain execution rule.
    // The rule defines the condition that must be satisfied
    // before the specified action can be executed.
    console.log("⏳ Deploying Rule...");

    const rule = await sdk.rules.create(
      "Demo SDK Rule",
      "balance > 100",
      "releaseFunds"
    );

    console.log("✅ Rule deployed:", rule);

    // 4. Generate a cryptographic proof for the deployed rule.
    // The proof can be used to verify that the rule's conditions
    // have been satisfied without relying on a centralized intermediary.
    console.log("⏳ Generating Proof...");

    const proof = await sdk.proofs.generate(rule._id);

    console.log("✅ Proof generated:", proof);

    // 5. Connect to the real-time WebSocket event stream.
    // The public key identifies this SDK client on the event channel.
    console.log("⏳ Connecting to event stream...");

    sdk.events.connect(publicKey);

    // Listen for protocol events received through the WebSocket.
    sdk.events.on('join_protocol', (data: any) => {
      console.log('📡 Realtime Event received:', data);
    });

  } catch (err: any) {
    // Handle SDK/API errors and display the server response when available.
    console.error(
      "❌ SDK Error:",
      err.response?.data || err.message
    );
  }
}

// Execute the SDK demonstration.
main();
