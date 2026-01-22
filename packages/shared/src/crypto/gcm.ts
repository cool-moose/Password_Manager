import {printRed} from "../../../client/src/client_backend/prints"
/**
 * AES-256-GCM (Galois/Counter Mode) Implementation
 * 
 * References:
 * - NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: GCM
 *   https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf
 * - RFC 5116: An Interface and Algorithms for Authenticated Encryption
 *   https://datatracker.ietf.org/doc/html/rfc5116
 * 
 * GCM provides both:
 * - Confidentiality (encryption using AES-CTR mode)
 * - Authenticity (authentication tag using GHASH)
 * 
 * @author Hubert Czernicki
 */

import { keyExpansion, encryptBlock, AES_BLOCK_SIZE } from './aes';
import { ghash, padTo16, createLengthBlock } from './ghash';

// ============================================================================
// GCM CONSTANTS
// ============================================================================
const GCM_IV_SIZE = 12;      // 96 bits (recommended IV size)
const GCM_TAG_SIZE = 16;     // 128 bits (full tag)
const BLOCK_SIZE = 16;       // 128 bits

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Increment the rightmost 32 bits of a 128-bit counter block
 * NIST SP 800-38D Section 6.2 (inc_32 function)
 */
function incrementCounter(counter: Uint8Array): Uint8Array {
    const result = new Uint8Array(counter);

    // Increment last 4 bytes as big-endian 32-bit integer
    for (let i = 15; i >= 12; i--) {
        result[i]++;
        if (result[i] !== 0) break; // No overflow, stop
    }

    return result;
}

/**
 * XOR two byte arrays of equal length
 */
function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}

/**
 * Generate the initial counter block (J0) from IV
 * NIST SP 800-38D Section 7.1
 * 
 * For 96-bit IV: J0 = IV || 0^31 || 1
 * For other IV sizes: J0 = GHASH_H(IV || 0^s || len(IV))
 */
function generateJ0(iv: Uint8Array, H: Uint8Array): Uint8Array {
    if (iv.length === GCM_IV_SIZE) {
        // Simple case: 96-bit IV
        // J0 = IV || 0^31 || 1
        const J0 = new Uint8Array(BLOCK_SIZE);
        J0.set(iv);           // First 12 bytes = IV
        J0[15] = 1;           // Last 4 bytes = 0x00000001
        return J0;
    } else {
        // General case: other IV lengths
        // J0 = GHASH_H(IV || pad || len(IV))
        const paddedIV = padTo16(iv);
        const lengthBlock = createLengthBlock(0, iv.length); // 0 for AAD length here

        // Concatenate: paddedIV || lengthBlock
        const ghashInput = new Uint8Array(paddedIV.length + 16);
        ghashInput.set(paddedIV);
        ghashInput.set(lengthBlock, paddedIV.length);

        return ghash(H, ghashInput);
    }
}

/**
 * AES-CTR mode encryption/decryption using GCTR
 * NIST SP 800-38D Section 6.5
 * 
 * GCTR encrypts data by XORing with AES-encrypted counter blocks
 */
function gctr(
    roundKeys: Uint8Array[],
    icb: Uint8Array,           // Initial Counter Block
    data: Uint8Array
): Uint8Array {
    if (data.length === 0) {
        return new Uint8Array(0);
    }

    const result = new Uint8Array(data.length);
    const numFullBlocks = Math.floor(data.length / BLOCK_SIZE);
    let counter = new Uint8Array(icb);

    // Process full blocks
    for (let i = 0; i < numFullBlocks; i++) {
        const keystream = encryptBlock(counter, roundKeys);
        const plaintextBlock = data.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE);
        const ciphertextBlock = xorBytes(plaintextBlock, keystream);
        result.set(ciphertextBlock, i * BLOCK_SIZE);
        counter = incrementCounter(counter) as any;
    }

    // Process partial last block (if any)
    const remainder = data.length % BLOCK_SIZE;
    if (remainder > 0) {
        const keystream = encryptBlock(counter, roundKeys);
        const lastBlockStart = numFullBlocks * BLOCK_SIZE;
        for (let i = 0; i < remainder; i++) {
            result[lastBlockStart + i] = data[lastBlockStart + i] ^ keystream[i];
        }
    }

    return result;
}

// ============================================================================
// GCM ENCRYPTION/DECRYPTION
// ============================================================================

export interface GCMEncryptResult {
    ciphertext: Uint8Array;
    tag: Uint8Array;
}

/**
 * AES-256-GCM Encryption
 * NIST SP 800-38D Section 7.1 (Algorithm 4)
 * 
 * @param key - 256-bit (32 bytes) encryption key
 * @param iv - Initialization Vector (96 bits / 12 bytes recommended)
 * @param plaintext - Data to encrypt
 * @param aad - Additional Authenticated Data (optional, not encrypted but authenticated)
 * @returns Object containing ciphertext and authentication tag
 */
export function encrypt(
    key: Uint8Array,
    iv: Uint8Array,
    plaintext: Uint8Array,
    aad: Uint8Array = new Uint8Array(0)
): GCMEncryptResult {
    printRed("[AES] Encrypting")
    console.log("string: " + plaintext + "\nwith iv: " + iv + "\nusing key: " + key)
    
    // Step 1: Generate round keys from the encryption key
    const roundKeys = keyExpansion(key);

    // Step 2: Compute hash subkey H = AES_K(0^128)
    const zeroBlock = new Uint8Array(BLOCK_SIZE);
    const H = encryptBlock(zeroBlock, roundKeys);

    // Step 3: Generate initial counter block J0
    const J0 = generateJ0(iv, H);

    // Step 4: Compute counter for encryption (J0 + 1)
    const ICB = incrementCounter(J0);

    // Step 5: Encrypt plaintext using GCTR
    const ciphertext = gctr(roundKeys, ICB, plaintext);

    // Step 6: Compute authentication tag using GHASH
    // GHASH input: AAD || pad(AAD) || C || pad(C) || len(AAD) || len(C)
    const paddedAAD = padTo16(aad);
    const paddedCiphertext = padTo16(ciphertext);
    const lengthBlock = createLengthBlock(aad.length, ciphertext.length);

    const ghashInput = new Uint8Array(paddedAAD.length + paddedCiphertext.length + 16);
    ghashInput.set(paddedAAD, 0);
    ghashInput.set(paddedCiphertext, paddedAAD.length);
    ghashInput.set(lengthBlock, paddedAAD.length + paddedCiphertext.length);

    const S = ghash(H, ghashInput);

    // Step 7: Tag = GCTR_K(J0, S) - encrypt S with counter J0
    const tag = gctr(roundKeys, J0, S);
    
    printRed("[AES]")
    console.log("Ciphertext: " + ciphertext + "\ntag: " + tag)
    return { ciphertext, tag };
}

/**
 * AES-256-GCM Decryption
 * NIST SP 800-38D Section 7.2 (Algorithm 5)
 * 
 * @param key - 256-bit (32 bytes) encryption key
 * @param iv - Initialization Vector (must match encryption IV)
 * @param ciphertext - Data to decrypt
 * @param tag - Authentication tag to verify
 * @param aad - Additional Authenticated Data (must match encryption AAD)
 * @returns Decrypted plaintext
 * @throws Error if authentication fails
 */
export function decrypt(
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    aad: Uint8Array = new Uint8Array(0)
): Uint8Array {
    printRed("[AES] Decrypting")
    console.log("ciphertext: " + ciphertext + "\nwith iv: " + iv + "\nand tag: " + tag + "\nusing key: " + key)
    if (tag.length !== GCM_TAG_SIZE) {
        throw new Error(`Invalid tag size: expected ${GCM_TAG_SIZE} bytes, got ${tag.length}`);
    }

    // Step 1: Generate round keys from the encryption key
    const roundKeys = keyExpansion(key);

    // Step 2: Compute hash subkey H = AES_K(0^128)
    const zeroBlock = new Uint8Array(BLOCK_SIZE);
    const H = encryptBlock(zeroBlock, roundKeys);

    // Step 3: Generate initial counter block J0
    const J0 = generateJ0(iv, H);

    // Step 4: Recompute authentication tag
    const paddedAAD = padTo16(aad);
    const paddedCiphertext = padTo16(ciphertext);
    const lengthBlock = createLengthBlock(aad.length, ciphertext.length);

    const ghashInput = new Uint8Array(paddedAAD.length + paddedCiphertext.length + 16);
    ghashInput.set(paddedAAD, 0);
    ghashInput.set(paddedCiphertext, paddedAAD.length);
    ghashInput.set(lengthBlock, paddedAAD.length + paddedCiphertext.length);

    const S = ghash(H, ghashInput);
    const computedTag = gctr(roundKeys, J0, S);

    // Step 5: Verify tag (constant-time comparison)
    let tagValid = true;
    for (let i = 0; i < GCM_TAG_SIZE; i++) {
        if (computedTag[i] !== tag[i]) {
            tagValid = false;
            // Don't break early - constant time comparison to prevent timing attacks
        }
    }

    if (!tagValid) {
        throw new Error('Authentication failed: invalid tag');
    }

    // Step 6: Decrypt ciphertext using GCTR
    const ICB = incrementCounter(J0);
    const plaintext = gctr(roundKeys, ICB, ciphertext);
    printRed("[AES] Decrypted")
    console.log("plaintext: " + plaintext)
    return plaintext;
}

// ============================================================================
// CONVENIENCE CLASS
// ============================================================================

/**
 * AES-256-GCM class for convenient encryption/decryption
 */
export class AES256GCM {
    private roundKeys: Uint8Array[];
    private H: Uint8Array;

    /**
     * Create an AES-256-GCM instance with a key
     * @param key - 256-bit (32 bytes) encryption key
     */
    constructor(key: Uint8Array) {
        if (key.length !== 32) {
            throw new Error(`Invalid key size: expected 32 bytes, got ${key.length}`);
        }
        this.roundKeys = keyExpansion(key);
        const zeroBlock = new Uint8Array(BLOCK_SIZE);
        this.H = encryptBlock(zeroBlock, this.roundKeys);
    }

    /**
     * Encrypt data
     * @param plaintext - Data to encrypt
     * @param iv - 12-byte initialization vector
     * @param aad - Optional additional authenticated data
     */
    encrypt(plaintext: Uint8Array, iv: Uint8Array, aad?: Uint8Array): GCMEncryptResult {
        const J0 = generateJ0(iv, this.H);
        const ICB = incrementCounter(J0);
        const ciphertext = gctr(this.roundKeys, ICB, plaintext);

        const paddedAAD = aad ? padTo16(aad) : new Uint8Array(0);
        const paddedCiphertext = padTo16(ciphertext);
        const lengthBlock = createLengthBlock(aad?.length || 0, ciphertext.length);

        const ghashInput = new Uint8Array(paddedAAD.length + paddedCiphertext.length + 16);
        ghashInput.set(paddedAAD, 0);
        ghashInput.set(paddedCiphertext, paddedAAD.length);
        ghashInput.set(lengthBlock, paddedAAD.length + paddedCiphertext.length);

        const S = ghash(this.H, ghashInput);
        const tag = gctr(this.roundKeys, J0, S);

        return { ciphertext, tag };
    }

    /**
     * Decrypt data
     * @param ciphertext - Data to decrypt
     * @param iv - 12-byte initialization vector (must match encryption)
     * @param tag - 16-byte authentication tag
     * @param aad - Optional additional authenticated data (must match encryption)
     */
    decrypt(ciphertext: Uint8Array, iv: Uint8Array, tag: Uint8Array, aad?: Uint8Array): Uint8Array {
        if (tag.length !== GCM_TAG_SIZE) {
            throw new Error(`Invalid tag size: expected ${GCM_TAG_SIZE} bytes, got ${tag.length}`);
        }

        const J0 = generateJ0(iv, this.H);

        // Verify tag first
        const paddedAAD = aad ? padTo16(aad) : new Uint8Array(0);
        const paddedCiphertext = padTo16(ciphertext);
        const lengthBlock = createLengthBlock(aad?.length || 0, ciphertext.length);

        const ghashInput = new Uint8Array(paddedAAD.length + paddedCiphertext.length + 16);
        ghashInput.set(paddedAAD, 0);
        ghashInput.set(paddedCiphertext, paddedAAD.length);
        ghashInput.set(lengthBlock, paddedAAD.length + paddedCiphertext.length);

        const S = ghash(this.H, ghashInput);
        const computedTag = gctr(this.roundKeys, J0, S);

        // Constant-time tag comparison
        let tagValid = true;
        for (let i = 0; i < GCM_TAG_SIZE; i++) {
            if (computedTag[i] !== tag[i]) tagValid = false;
        }

        if (!tagValid) {
            throw new Error('Authentication failed: invalid tag');
        }

        // Decrypt
        const ICB = incrementCounter(J0);
        return gctr(this.roundKeys, ICB, ciphertext);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================
export { GCM_IV_SIZE, GCM_TAG_SIZE };
