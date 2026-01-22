/**
 * AES-256 Block Cipher Implementation (From Scratch)
 * 
 * References:
 * - FIPS 197: Advanced Encryption Standard (AES)
 *   https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf
 * 
 * AES-256 Parameters:
 * - Key size: 256 bits (32 bytes)
 * - Block size: 128 bits (16 bytes)
 * - Number of rounds: 14
 * - Key schedule: 15 round keys (each 128 bits)
 * 
 * @author Hubert Czernicki
 */

// ============================================================================
// S-BOX (Substitution Box)
// Pre-computed lookup table for SubBytes transformation
// Defined in FIPS 197 Section 5.1.1
// Each byte is replaced by its multiplicative inverse in GF(2^8),
// then an affine transformation is applied
// ============================================================================
const S_BOX: readonly number[] = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
];

// ============================================================================
// INVERSE S-BOX
// Used for decryption (InvSubBytes)
// FIPS 197 Section 5.3.2
// ============================================================================
const INV_S_BOX: readonly number[] = [
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
    0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
    0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
    0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
    0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
    0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
    0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
    0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
    0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
    0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
    0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d
];

// ============================================================================
// RCON (Round Constants)
// Used in Key Schedule (FIPS 197 Section 5.2)
// Rcon[i] = [x^(i-1), 0, 0, 0] where x is in GF(2^8)
// ============================================================================
const RCON: readonly number[] = [
    0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
];

// ============================================================================
// AES BLOCK SIZE AND KEY SIZE CONSTANTS
// ============================================================================
const BLOCK_SIZE = 16;  // 128 bits = 16 bytes
const KEY_SIZE = 32;    // 256 bits = 32 bytes (AES-256)
const NUM_ROUNDS = 14;  // AES-256 uses 14 rounds
const NK = 8;           // Number of 32-bit words in key (256/32 = 8)
const NB = 4;           // Number of 32-bit words in block (128/32 = 4)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Multiply two bytes in GF(2^8) with the irreducible polynomial x^8 + x^4 + x^3 + x + 1
 * Used in MixColumns transformation
 * FIPS 197 Section 4.2
 */
function gmul(a: number, b: number): number {
    let result = 0;
    for (let i = 0; i < 8; i++) {
        if ((b & 1) !== 0) {
            result ^= a;
        }
        const highBit = a & 0x80;
        a = (a << 1) & 0xff;
        if (highBit !== 0) {
            a ^= 0x1b; // x^8 + x^4 + x^3 + x + 1 (0x11b, but we only need lower byte)
        }
        b >>= 1;
    }
    return result;
}

/**
 * Rotate a 4-byte word left by one byte
 * Used in Key Schedule
 */
function rotWord(word: number[]): number[] {
    return [word[1], word[2], word[3], word[0]];
}

/**
 * Apply S-Box to each byte of a word
 * Used in Key Schedule
 */
function subWord(word: number[]): number[] {
    return word.map(b => S_BOX[b]);
}

// ============================================================================
// KEY EXPANSION (Key Schedule)
// FIPS 197 Section 5.2
// Expands the 256-bit key into 15 round keys (each 128 bits)
// ============================================================================
export function keyExpansion(key: Uint8Array): Uint8Array[] {
    if (key.length !== KEY_SIZE) {
        throw new Error(`Invalid key size: expected ${KEY_SIZE} bytes, got ${key.length}`);
    }

    // Total words needed: Nb * (Nr + 1) = 4 * 15 = 60 words
    const totalWords = NB * (NUM_ROUNDS + 1);
    const w: number[][] = [];

    // First Nk words are the key itself
    for (let i = 0; i < NK; i++) {
        w[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
    }

    // Generate remaining words
    for (let i = NK; i < totalWords; i++) {
        let temp = [...w[i - 1]];
        
        if (i % NK === 0) {
            // Apply RotWord, SubWord, and XOR with Rcon
            temp = subWord(rotWord(temp));
            temp[0] ^= RCON[(i / NK) - 1];
        } else if (NK > 6 && i % NK === 4) {
            // For AES-256: additional SubWord application
            temp = subWord(temp);
        }
        
        // XOR with word Nk positions back
        w[i] = [
            w[i - NK][0] ^ temp[0],
            w[i - NK][1] ^ temp[1],
            w[i - NK][2] ^ temp[2],
            w[i - NK][3] ^ temp[3]
        ];
    }

    // Convert words to round keys (each 16 bytes)
    const roundKeys: Uint8Array[] = [];
    for (let round = 0; round <= NUM_ROUNDS; round++) {
        const roundKey = new Uint8Array(BLOCK_SIZE);
        for (let word = 0; word < NB; word++) {
            for (let byte = 0; byte < 4; byte++) {
                roundKey[word * 4 + byte] = w[round * NB + word][byte];
            }
        }
        roundKeys.push(roundKey);
    }

    return roundKeys;
}

// ============================================================================
// AES TRANSFORMATIONS
// ============================================================================

/**
 * AddRoundKey - XOR state with round key
 * FIPS 197 Section 5.1.4
 */
function addRoundKey(state: Uint8Array, roundKey: Uint8Array): void {
    for (let i = 0; i < BLOCK_SIZE; i++) {
        state[i] ^= roundKey[i];
    }
}

/**
 * SubBytes - Substitute each byte using S-Box
 * FIPS 197 Section 5.1.1
 */
function subBytes(state: Uint8Array): void {
    for (let i = 0; i < BLOCK_SIZE; i++) {
        state[i] = S_BOX[state[i]];
    }
}

/**
 * InvSubBytes - Inverse substitution using inverse S-Box
 * FIPS 197 Section 5.3.2
 */
function invSubBytes(state: Uint8Array): void {
    for (let i = 0; i < BLOCK_SIZE; i++) {
        state[i] = INV_S_BOX[state[i]];
    }
}

/**
 * ShiftRows - Cyclically shift rows of state
 * FIPS 197 Section 5.1.2
 * 
 * State is organized as 4x4 matrix (column-major):
 * [0,4,8,12]    Row 0: no shift
 * [1,5,9,13]    Row 1: shift left by 1
 * [2,6,10,14]   Row 2: shift left by 2
 * [3,7,11,15]   Row 3: shift left by 3
 */
function shiftRows(state: Uint8Array): void {
    // Row 1: shift left by 1
    const temp1 = state[1];
    state[1] = state[5];
    state[5] = state[9];
    state[9] = state[13];
    state[13] = temp1;

    // Row 2: shift left by 2
    const temp2a = state[2];
    const temp2b = state[6];
    state[2] = state[10];
    state[6] = state[14];
    state[10] = temp2a;
    state[14] = temp2b;

    // Row 3: shift left by 3 (= shift right by 1)
    const temp3 = state[15];
    state[15] = state[11];
    state[11] = state[7];
    state[7] = state[3];
    state[3] = temp3;
}

/**
 * InvShiftRows - Inverse of ShiftRows
 * FIPS 197 Section 5.3.1
 */
function invShiftRows(state: Uint8Array): void {
    // Row 1: shift right by 1
    const temp1 = state[13];
    state[13] = state[9];
    state[9] = state[5];
    state[5] = state[1];
    state[1] = temp1;

    // Row 2: shift right by 2
    const temp2a = state[2];
    const temp2b = state[6];
    state[2] = state[10];
    state[6] = state[14];
    state[10] = temp2a;
    state[14] = temp2b;

    // Row 3: shift right by 3 (= shift left by 1)
    const temp3 = state[3];
    state[3] = state[7];
    state[7] = state[11];
    state[11] = state[15];
    state[15] = temp3;
}

/**
 * MixColumns - Matrix multiplication in GF(2^8)
 * FIPS 197 Section 5.1.3
 * 
 * Each column is multiplied by fixed polynomial:
 * [2 3 1 1]
 * [1 2 3 1]
 * [1 1 2 3]
 * [3 1 1 2]
 */
function mixColumns(state: Uint8Array): void {
    for (let col = 0; col < 4; col++) {
        const i = col * 4;
        const s0 = state[i];
        const s1 = state[i + 1];
        const s2 = state[i + 2];
        const s3 = state[i + 3];

        state[i]     = gmul(2, s0) ^ gmul(3, s1) ^ s2 ^ s3;
        state[i + 1] = s0 ^ gmul(2, s1) ^ gmul(3, s2) ^ s3;
        state[i + 2] = s0 ^ s1 ^ gmul(2, s2) ^ gmul(3, s3);
        state[i + 3] = gmul(3, s0) ^ s1 ^ s2 ^ gmul(2, s3);
    }
}

/**
 * InvMixColumns - Inverse matrix multiplication
 * FIPS 197 Section 5.3.3
 * 
 * Inverse matrix:
 * [14 11 13  9]
 * [ 9 14 11 13]
 * [13  9 14 11]
 * [11 13  9 14]
 */
function invMixColumns(state: Uint8Array): void {
    for (let col = 0; col < 4; col++) {
        const i = col * 4;
        const s0 = state[i];
        const s1 = state[i + 1];
        const s2 = state[i + 2];
        const s3 = state[i + 3];

        state[i]     = gmul(14, s0) ^ gmul(11, s1) ^ gmul(13, s2) ^ gmul(9, s3);
        state[i + 1] = gmul(9, s0) ^ gmul(14, s1) ^ gmul(11, s2) ^ gmul(13, s3);
        state[i + 2] = gmul(13, s0) ^ gmul(9, s1) ^ gmul(14, s2) ^ gmul(11, s3);
        state[i + 3] = gmul(11, s0) ^ gmul(13, s1) ^ gmul(9, s2) ^ gmul(14, s3);
    }
}

// ============================================================================
// AES-256 ENCRYPTION/DECRYPTION
// ============================================================================

/**
 * Encrypts a single 128-bit block using AES-256
 * FIPS 197 Section 5.1
 * 
 * @param plaintext - 16 bytes to encrypt
 * @param roundKeys - Expanded key schedule (15 round keys)
 * @returns Encrypted 16 bytes
 */
export function encryptBlock(plaintext: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
    if (plaintext.length !== BLOCK_SIZE) {
        throw new Error(`Invalid block size: expected ${BLOCK_SIZE} bytes, got ${plaintext.length}`);
    }

    // Copy input to state
    const state = new Uint8Array(plaintext);

    // Initial round key addition
    addRoundKey(state, roundKeys[0]);

    // Main rounds (1 to Nr-1)
    for (let round = 1; round < NUM_ROUNDS; round++) {
        subBytes(state);
        shiftRows(state);
        mixColumns(state);
        addRoundKey(state, roundKeys[round]);
    }

    // Final round (no MixColumns)
    subBytes(state);
    shiftRows(state);
    addRoundKey(state, roundKeys[NUM_ROUNDS]);

    return state;
}

/**
 * Decrypts a single 128-bit block using AES-256
 * FIPS 197 Section 5.3
 * 
 * @param ciphertext - 16 bytes to decrypt
 * @param roundKeys - Expanded key schedule (15 round keys)
 * @returns Decrypted 16 bytes
 */
export function decryptBlock(ciphertext: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
    if (ciphertext.length !== BLOCK_SIZE) {
        throw new Error(`Invalid block size: expected ${BLOCK_SIZE} bytes, got ${ciphertext.length}`);
    }

    // Copy input to state
    const state = new Uint8Array(ciphertext);

    // Initial round key addition (use last round key first)
    addRoundKey(state, roundKeys[NUM_ROUNDS]);

    // Main rounds in reverse (Nr-1 down to 1)
    for (let round = NUM_ROUNDS - 1; round >= 1; round--) {
        invShiftRows(state);
        invSubBytes(state);
        addRoundKey(state, roundKeys[round]);
        invMixColumns(state);
    }

    // Final round (no InvMixColumns)
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, roundKeys[0]);

    return state;
}

// ============================================================================
// EXPORTS
// ============================================================================
export const AES_BLOCK_SIZE = BLOCK_SIZE;
export const AES_KEY_SIZE = KEY_SIZE;
export const AES_NUM_ROUNDS = NUM_ROUNDS;
