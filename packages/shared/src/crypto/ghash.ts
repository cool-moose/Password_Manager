/**
 * GHASH - Galois Hash Function for GCM Mode
 * 
 * References:
 * - NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: GCM
 *   https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf
 * - Section 6.4: GHASH Function
 * 
 * GHASH is a universal hash function used in GCM for authentication.
 * It performs polynomial multiplication in GF(2^128).
 * 
 * @author Hubert Czernicki
 */

// ============================================================================
// GF(2^128) MULTIPLICATION
// Polynomial: x^128 + x^7 + x^2 + x + 1 (reducing polynomial R)
// ============================================================================

/**
 * Represents a 128-bit value as two 64-bit BigInts (high and low)
 * This is necessary because JavaScript numbers lose precision above 2^53
 */
export class GF128 {
    high: bigint;
    low: bigint;

    constructor(high: bigint = 0n, low: bigint = 0n) {
        this.high = high & 0xffffffffffffffffn;
        this.low = low & 0xffffffffffffffffn;
    }

    /**
     * Create from a 16-byte buffer (big-endian)
     */
    static fromBytes(bytes: Uint8Array): GF128 {
        if (bytes.length !== 16) {
            throw new Error(`Expected 16 bytes, got ${bytes.length}`);
        }
        
        let high = 0n;
        let low = 0n;
        
        // First 8 bytes -> high
        for (let i = 0; i < 8; i++) {
            high = (high << 8n) | BigInt(bytes[i]);
        }
        
        // Last 8 bytes -> low
        for (let i = 8; i < 16; i++) {
            low = (low << 8n) | BigInt(bytes[i]);
        }
        
        return new GF128(high, low);
    }

    /**
     * Convert to 16-byte buffer (big-endian)
     */
    toBytes(): Uint8Array {
        const result = new Uint8Array(16);
        
        let h = this.high;
        let l = this.low;
        
        // High part -> first 8 bytes
        for (let i = 7; i >= 0; i--) {
            result[i] = Number(h & 0xffn);
            h >>= 8n;
        }
        
        // Low part -> last 8 bytes
        for (let i = 15; i >= 8; i--) {
            result[i] = Number(l & 0xffn);
            l >>= 8n;
        }
        
        return result;
    }

    /**
     * XOR two GF128 values
     */
    xor(other: GF128): GF128 {
        return new GF128(
            this.high ^ other.high,
            this.low ^ other.low
        );
    }

    /**
     * Check if zero
     */
    isZero(): boolean {
        return this.high === 0n && this.low === 0n;
    }

    /**
     * Get bit at position (0 = MSB of high, 127 = LSB of low)
     */
    getBit(pos: number): boolean {
        if (pos < 64) {
            return ((this.high >> BigInt(63 - pos)) & 1n) === 1n;
        } else {
            return ((this.low >> BigInt(127 - pos)) & 1n) === 1n;
        }
    }

    /**
     * Shift right by 1 bit
     */
    shiftRight(): GF128 {
        const newLow = (this.low >> 1n) | ((this.high & 1n) << 63n);
        const newHigh = this.high >> 1n;
        return new GF128(newHigh, newLow);
    }
}

// ============================================================================
// Reducing polynomial R for GF(2^128)
// R = x^128 + x^7 + x^2 + x + 1
// When we reduce after multiplication, we XOR with: 0xe1 << 120 = 0xe1000...000 (128 bits)
// This is represented as high = 0xe100000000000000, low = 0
// ============================================================================
const R = new GF128(0xe100000000000000n, 0n);

/**
 * Multiply two elements in GF(2^128)
 * Algorithm from NIST SP 800-38D Section 6.3
 * 
 * Uses the "shift and xor" method with reduction by polynomial R
 * 
 * @param X - First operand
 * @param Y - Second operand (typically the hash subkey H)
 * @returns X • Y in GF(2^128)
 */
export function gf128Multiply(X: GF128, Y: GF128): GF128 {
    let Z = new GF128(0n, 0n);
    let V = new GF128(Y.high, Y.low);

    // Iterate through each bit of X (from MSB to LSB)
    for (let i = 0; i < 128; i++) {
        // If bit i of X is 1, add V to Z
        if (X.getBit(i)) {
            Z = Z.xor(V);
        }

        // Check if LSB of V is 1 (for reduction)
        const lsb = (V.low & 1n) === 1n;

        // Right shift V
        V = V.shiftRight();

        // If LSB was 1, XOR with R (reduction)
        if (lsb) {
            V = V.xor(R);
        }
    }

    return Z;
}

// ============================================================================
// GHASH FUNCTION
// ============================================================================

/**
 * GHASH - Universal hash function
 * NIST SP 800-38D Section 6.4
 * 
 * GHASH_H(X) computes:
 *   Y_0 = 0^128
 *   Y_i = (Y_{i-1} ⊕ X_i) • H    for i = 1, ..., m
 *   return Y_m
 * 
 * Where:
 *   H is the hash subkey (AES_K(0^128))
 *   X is the input (divided into 128-bit blocks)
 *   • denotes multiplication in GF(2^128)
 * 
 * @param H - Hash subkey (16 bytes) - computed as AES_K(0^128)
 * @param data - Input data (must be padded to multiple of 16 bytes)
 * @returns GHASH result (16 bytes)
 */
export function ghash(H: Uint8Array, data: Uint8Array): Uint8Array {
    if (H.length !== 16) {
        throw new Error(`Invalid H length: expected 16 bytes, got ${H.length}`);
    }
    if (data.length % 16 !== 0) {
        throw new Error(`Data must be padded to multiple of 16 bytes, got ${data.length}`);
    }

    const hashKey = GF128.fromBytes(H);
    let Y = new GF128(0n, 0n); // Y_0 = 0^128

    // Process each 16-byte block
    const numBlocks = data.length / 16;
    for (let i = 0; i < numBlocks; i++) {
        const block = data.slice(i * 16, (i + 1) * 16);
        const X = GF128.fromBytes(block);
        
        // Y_i = (Y_{i-1} ⊕ X_i) • H
        Y = gf128Multiply(Y.xor(X), hashKey);
    }

    return Y.toBytes();
}

/**
 * Pad data to a multiple of 16 bytes with zeros
 * Used for AAD and ciphertext padding before GHASH
 */
export function padTo16(data: Uint8Array): Uint8Array {
    const remainder = data.length % 16;
    if (remainder === 0) {
        return data;
    }
    
    const padded = new Uint8Array(data.length + (16 - remainder));
    padded.set(data);
    // Rest is already zeros
    return padded;
}

/**
 * Create the final GHASH input block containing lengths
 * [len(A) in bits as 64-bit || len(C) in bits as 64-bit]
 * 
 * @param aadLength - Length of Additional Authenticated Data in bytes
 * @param ciphertextLength - Length of ciphertext in bytes
 * @returns 16-byte length block
 */
export function createLengthBlock(aadLength: number, ciphertextLength: number): Uint8Array {
    const block = new Uint8Array(16);
    
    // Convert to bits (multiply by 8)
    const aadBits = BigInt(aadLength) * 8n;
    const cipherBits = BigInt(ciphertextLength) * 8n;
    
    // Write AAD length (bits) as 64-bit big-endian in first 8 bytes
    let a = aadBits;
    for (let i = 7; i >= 0; i--) {
        block[i] = Number(a & 0xffn);
        a >>= 8n;
    }
    
    // Write ciphertext length (bits) as 64-bit big-endian in last 8 bytes
    let c = cipherBits;
    for (let i = 15; i >= 8; i--) {
        block[i] = Number(c & 0xffn);
        c >>= 8n;
    }
    
    return block;
}
