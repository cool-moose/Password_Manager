import { randomBytes } from 'crypto';
import init, { sha256 } from './wasm/pkg/wasm_crypto.js';
import { printRed } from './prints';

/*
 * SRP-6a Parameters (2048-bit Group)
 * N = large safe prime
 * g = generator
 * H = SHA-256
 */

// 2048-bit MODP Group (RFC 5054)
const N_hex = "AC6BDB41324A9A9BF166DE5E1389582FAF72B6651987EE07FC3192943DB56050A37329CBB4A099ED8193E0757767A13DD52312AB4B03310DCD7F48A9DA04FD50E8083969EDB767B0CF6095179A163AB3661A05FBD5FAAAE82918A9962F0B93B855F97993EC975EEAA80D740ADBF4D6DB71577363ED7557A605FC81B2976D98DD719307281B7BB2C07971BA8675F5CF5D0E576B429A44CA431F75F6A931881B94AC25B2822B7E1B108929A88C1544DD7D3B5198AB29930D91D2702CB46820257B7B132C3A5576C71708A899C6A3644917C9B1093153545A25345914614A797A7C6B7B4B74044A5405608674F7565349282D20A10243166BE5E744116041C83F30C665672013";
const g_hex = "02";

const N = BigInt("0x" + N_hex);
const g = BigInt("0x" + g_hex);

// k = H(N, g)
let k: bigint = 0n;

export async function initSRP(wasmSource?: any) {
    if (wasmSource) {
        await init(wasmSource);
    } else {
        await init();
    }
    // Calculate k once after init
    k = await H(N, g);
}

// Helper: H(...) using WASM sha256
// We'll concatenate inputs into a single hex string for the WASM function
async function H(...args: (string | Buffer | BigInt)[]): Promise<bigint> {
    let fullBuffer = Buffer.alloc(0);

    for (const arg of args) {
        if (typeof arg === 'string') {
            fullBuffer = Buffer.concat([fullBuffer, Buffer.from(arg, 'utf8')]);
        } else if (Buffer.isBuffer(arg)) {
            fullBuffer = Buffer.concat([fullBuffer, arg]);
        } else if (typeof arg === 'bigint') {
            let hex = arg.toString(16);
            if (hex.length % 2 !== 0) hex = '0' + hex;
            fullBuffer = Buffer.concat([fullBuffer, Buffer.from(hex, 'hex')]);
        }
    }


    const hexInput = fullBuffer.toString('hex');
    const digestHex = sha256(hexInput);
    // Wait, if sha256 in WASM hashes the string bytes...
    // Comparing `node crypto.sha256(buf)` vs `wasm.sha256(buf.hex)` -> Different results.
    // But as long as ALL peers use `wasm.sha256(buf.hex)`, it works.

    return BigInt("0x" + digestHex);
}


// Special pad function for SRP (pad to N length)
function H_pad(num: bigint): Buffer {
    let hex = num.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    const buf = Buffer.from(hex, 'hex');
    if (buf.length < 256) {
        const padding = Buffer.alloc(256 - buf.length, 0);
        return Buffer.concat([padding, buf]);
    }
    return buf;
}

// Random BigInt helper
function randomBigInt(): bigint {
    const buf = randomBytes(32);
    return BigInt("0x" + buf.toString('hex'));
}

export class SRPClient {
    static async generateRegistration(password: string): Promise<{ salt: string; verifier: string }> {
        printRed("[SRP] Generating registration from")
        console.log("password: " + password)
        const salt = randomBytes(16).toString('hex');
        // x = H(salt, password) using WASM
        const x_hash = sha256(salt + password);
        const x = BigInt("0x" + x_hash);

        // v = g^x mod N
        const v = modPow(g, x, N);

        printRed("[SRP] Generated")
        console.log("salt: " + salt + "\nand verifier: " + v.toString(16))

        return {
            salt,
            verifier: v.toString(16)
        };
    }

    static async generateEphemeral(): Promise<{ a: string; A: string }> {
        printRed("[SRP] Generating ephemeral")
        const a_val = randomBigInt();
        const A_val = modPow(g, a_val, N);

        // Safety check: A cannot be 0 (mod N)
        // If 0, generate again. Probability is negligible.
        if (A_val % N === 0n) return SRPClient.generateEphemeral();

        printRed("[SRP]")
        console.log("a: " + a_val.toString(16) + "\nA: " + A_val.toString(16))
        return {
            a: a_val.toString(16),
            A: A_val.toString(16)
        };
    }

    static async computeSession(
        salt: string,
        username: string,
        password: string,
        a_hex: string,
        B_hex: string
    ): Promise<{ K: string; M1: string; M2: string }> {
        printRed("[SRP] Computing SRP session for")
        console.log("username: " + username + "\npassword: " + password + "\nsalt: " + salt + "\na_hex: " + a_hex + "\nB_hex: " + B_hex)
        const a = BigInt("0x" + a_hex);
        const B = BigInt("0x" + B_hex);

        // Security Check: B % N != 0
        if (B % N === 0n) throw new Error("Safety check failed: B is zero");

        const A = modPow(g, a, N);
        const u = await H(A, B);

        // x = H(salt, password)
        const x_hash = sha256(salt + password);
        const x = BigInt("0x" + x_hash);

        // S = (B - k * g^x)^(a + u * x) mod N
        // S = (B - k * v)^(a + ux)
        // First compute (B - kg^x)
        const v = modPow(g, x, N);
        let base = (B - (k * v) % N);
        while (base < 0n) base += N;

        const exp = a + u * x;
        const S = modPow(base, exp, N);

        // K = H(S)
        // H_pad(S)
        const K_hex = sha256(H_pad(S).toString('hex'));

        // M1 = H(A, B, K)
        const M1 = sha256(A.toString(16) + B.toString(16) + K_hex);

        // M2 = H(A, M1, S)
        const M2 = sha256(A.toString(16) + M1 + K_hex);
        
        printRed("[SRP] Computed")
        console.log("K: " + K_hex + "\nM1: " + M1 + "\nM2: " + M2)
        return { K: K_hex, M1, M2 };
    }
}

export class SRPServer {
    static async generateEphemeral(verifier: string): Promise<{ b: string; B: string }> {
        printRed("[SRPServer] Generating ephemeral from")
        console.log("verifier: " + verifier)
        const b_val = randomBigInt();
        const v = BigInt("0x" + verifier);

        // B = kv + g^b mod N
        const gb = modPow(g, b_val, N);
        const kv = (k * v) % N;
        const B_val = (kv + gb) % N;

        printRed("[SRPServer] Generated")
        console.log("b: " + b_val.toString(16) + "\nB: " + B_val.toString(16))

        return {
            b: b_val.toString(16),
            B: B_val.toString(16)
        };
    }

    static async verifySession(
        username: string,
        salt: string,
        verifier: string,
        A_hex: string,
        b_hex: string,
        M1_client: string
    ): Promise<{ K: string; M2: string }> {
        printRed("[SRPServer] Verifying session")
        console.log("verifier: " + verifier + "\nA_hex: " + A_hex + "\nb_hex: " + b_hex + "\nM1_client " + M1_client)
        const A = BigInt("0x" + A_hex);
        const b = BigInt("0x" + b_hex);
        const v = BigInt("0x" + verifier);

        if (A % N === 0n) throw new Error("Safety check failed: A is zero");

        const gb = modPow(g, b, N);
        const kv = (k * v) % N;
        const B = (kv + gb) % N;
        const B_val = B; // Keep BigInt

        const u = await H(A, B);

        // S = (A * v^u)^b mod N
        const vu = modPow(v, u, N);
        const base = (A * vu) % N;
        const S = modPow(base, b, N);

        const K_hex = sha256(H_pad(S).toString('hex'));

        const expectedM1 = sha256(A.toString(16) + B_val.toString(16) + K_hex);

        if (M1_client !== expectedM1) {
            throw new Error("Invalid proof");
        }
        // M2 = H(A, M1, S)
        const M2 = sha256(A.toString(16) + M1_client + K_hex);
        
        printRed("[SRPServer] Returning")
        console.log("K: " + K_hex + "\nM2: " + M2)
        return { K: K_hex, M2 };
    }
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let res = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) res = (res * base) % mod;
        base = (base * base) % mod;
        exp /= 2n;
    }
    return res;
}
