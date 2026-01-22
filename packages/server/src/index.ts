import express from 'express';
import cors from 'cors';
import { SRPServer, initSRP } from '@password-manager/shared/src/srp';
import fs from 'fs';
import path from 'path';
import { printYellow } from './prints';
// For CommonJS (ts-node default), __dirname is available.
// If this project is ESM, we'd use import.meta. But linter complained.
const wasmPath = path.resolve(__dirname, '../../shared/src/wasm/pkg/wasm_crypto_bg.wasm');

// Init WASM
if (fs.existsSync(wasmPath)) {
  const wasmBuffer = fs.readFileSync(wasmPath);
  initSRP(wasmBuffer).then(() => console.log("WASM Initialized"));
} else {
  console.warn("WASM File not found at:", wasmPath);
}

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' })); // Increased limit for vault data
app.use(cors());

// In-memory user storage (for demo purposes)
const users: Record<string, {
  salt: string;
  verifier: string;
  vault?: {
    version: number;
    updatedAt: string;
    data: string;
  }
}> = {};

// In-memory session storage (username -> temporary login state)
const sessions: Record<string, { b: string; B: string; salt: string; verifier: string }> = {};

app.get('/', (req, res) => {
  res.send('Password Manager Server');
});

// Step 1: Register
app.post('/register', (req, res) => {
    
  const { username, salt, verifier } = req.body;
  if (!username || !salt || !verifier) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (users[username]) {
    return res.status(400).json({ error: "User already exists" });
  }
  users[username] = { salt, verifier };
  printYellow(`[SERVER] User ${username} registered.`);
  res.json({ success: true });
});

// Step 2: Login Init
app.post('/login/init', async (req, res) => {
  const { username, A } = req.body;
  const user = users[username];

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Generate server ephemeral
  const { b, B } = await SRPServer.generateEphemeral(user.verifier);

  // Store session state
  sessions[username] = {
    b,
    B,
    salt: user.salt,
    verifier: user.verifier
  };

  printYellow(`[SERVER] User ${username} started login.`);
  res.json({ salt: user.salt, B });
});

// Step 3: Login Verify
app.post('/login/verify', async (req, res) => {
  const { username, A, M1 } = req.body;
  const session = sessions[username];

  if (!session) {
    return res.status(400).json({ error: "No active session" });
  }

  try {
    const { K, M2 } = await SRPServer.verifySession(
      username,
      session.salt,
      session.verifier,
      A,
      session.b,
      M1 // Client proof
    );

    printYellow(`[SERVER] User ${username} successfully authenticated.`);

    // Generate simple token (In production use JWT)
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    tokens[token] = username;

    // Clear session ephemeral data
    delete sessions[username];

    res.json({ M2, token });
  } catch (error) {
    console.error(`[Login Fail] User ${username} failed auth: ${error}`);
    res.status(401).json({ error: "Authentication failed" });
  }
});

// Vault Sync Endpoints

// In-memory vault storage (username -> encrypted blob)
const vaults: Record<string, any> = {};
// Active tokens
const tokens: Record<string, string> = {};

app.get('/vault', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !tokens[token]) return res.status(401).json({ error: "Unauthorized" });

  const username = tokens[token];
  const vault = vaults[username];



  if (!vault) return res.status(404).json({ error: "No vault found" });
printYellow("[SERVER] Returned vault for user: " + username)
console.log("Vault: " + JSON.stringify(vault))
  res.json(vault);
});

app.post('/vault', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !tokens[token]) return res.status(401).json({ error: "Unauthorized" });

  const username = tokens[token];
  vaults[username] = req.body; // Store the encrypted blob

  printYellow(`[SERVER] Updated vault for ${username}`);
console.log('Vault: ' +  JSON.stringify(req.body))
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// Password Change - Update SRP credentials
app.post('/password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !tokens[token]) return res.status(401).json({ error: "Unauthorized" });

  const username = tokens[token];
  const { salt, verifier } = req.body;

printYellow("[SERVER] Updating SRP credentials for user: " + username )

  if (!salt || !verifier) {
    return res.status(400).json({ error: "Missing salt or verifier" });
  }

  if (!users[username]) {
    return res.status(404).json({ error: "User not found" });
  }

  // Update user's SRP credentials
  users[username] = { ...users[username], salt, verifier };

  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

