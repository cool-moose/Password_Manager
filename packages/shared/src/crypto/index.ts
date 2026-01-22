/**
 * AES-256-GCM Cryptography Module
 * 
 * Pure TypeScript implementation from scratch.
 * No external cryptographic libraries used.
 * 
 * References:
 * - FIPS 197: AES Block Cipher
 * - NIST SP 800-38D: GCM Mode
 * - RFC 5116: AEAD Interface
 * 
 * @author Hubert Czernicki
 */

// AES-256 Block Cipher
export {
    keyExpansion,
    encryptBlock,
    decryptBlock,
    AES_BLOCK_SIZE,
    AES_KEY_SIZE,
    AES_NUM_ROUNDS
} from './aes';

// GHASH (Galois Hash)
export {
    GF128,
    gf128Multiply,
    ghash,
    padTo16,
    createLengthBlock
} from './ghash';

// AES-256-GCM (Galois/Counter Mode)
export {
    encrypt,
    decrypt,
    AES256GCM,
    GCM_IV_SIZE,
    GCM_TAG_SIZE,
    type GCMEncryptResult
} from './gcm';
