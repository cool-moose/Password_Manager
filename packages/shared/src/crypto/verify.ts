/**
 * ULTIMATE VERIFICATION SUITE for AES-256-GCM
 * 
 * Run with: npx tsx src/crypto/verify.ts
 * 
 * Includes:
 * 1. NIST SP 800-38D Conformance Tests (Multiple Vectors)
 * 2. Massive Property-Based Fuzzing (5,000 runs)
 * 3. Exact Block Boundary Analysis (0..512 bytes)
 * 4. Large Dataset Integrity (1MB+)
 * 5. Tamper Detection (Bit-Flipping Attacks)
 * 6. Edge Cases (Empty data, AAD-only, extreme IVs)
 * 7. Security Tests (Zero keys, IV variations)
 * 
 * @author Hubert Czernicki
 */

import { AES256GCM, encrypt, decrypt, AES_BLOCK_SIZE } from './index';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { Buffer } from 'buffer';

// Use Node.js native crypto to verify our implementation against a "Gold Standard"
// This ensures our implementation matches OpenSSL's behavior exactly.
function goldStandardEncrypt(key: Buffer, iv: Buffer, plaintext: Buffer, aad: Buffer) {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext: ct, tag };
}

// ============================================================================
// 1. NIST VECTORS (Multiple Test Cases)
// ============================================================================

function testNIST() {
    console.log('🔹 1. NIST SP 800-38D Conformance...');

    // Test Case 16 from NIST (256-bit key, 96-bit IV, with AAD)
    const key16 = Buffer.from('feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308', 'hex');
    const iv16 = Buffer.from('cafebabefacedbaddecaf888', 'hex');
    const plaintext16 = Buffer.from('d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39', 'hex');
    const aad16 = Buffer.from('feedfacedeadbeeffeedfacedeadbeefabaddad2', 'hex');
    const expCT16 = Buffer.from('522dc1f099567d07f47f37a32a84427d643a8cdcbfe5c0c97598a2bd2555d1aa8cb08e48590dbb3da7b08b1056828838c5f61e6393ba7a0abcc9f662', 'hex');
    const expTag16 = Buffer.from('76fc6ece0f4e1768cddf8853bb2d551b', 'hex');

    const aes16 = new AES256GCM(key16);
    const res16 = aes16.encrypt(plaintext16, iv16, aad16);

    if (Buffer.compare(res16.ciphertext, expCT16) !== 0) throw new Error('NIST TC16 Ciphertext Mismatch');
    if (Buffer.compare(res16.tag, expTag16) !== 0) throw new Error('NIST TC16 Tag Mismatch');
    console.log('   ✅ NIST Test Case 16 PASSED (256-bit key, 96-bit IV, with AAD)');

    // Test Case 13: 256-bit key, 96-bit IV, no AAD, empty plaintext
    const key13 = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
    const iv13 = Buffer.from('000000000000000000000000', 'hex');
    const plaintext13 = Buffer.alloc(0);
    const expCT13 = Buffer.alloc(0);
    const expTag13 = Buffer.from('530f8afbc74536b9a963b4f1c4cb738b', 'hex');

    const aes13 = new AES256GCM(key13);
    const res13 = aes13.encrypt(plaintext13, iv13);

    if (Buffer.compare(res13.ciphertext, expCT13) !== 0) throw new Error('NIST TC13 Ciphertext Mismatch');
    if (Buffer.compare(res13.tag, expTag13) !== 0) throw new Error('NIST TC13 Tag Mismatch');
    console.log('   ✅ NIST Test Case 13 PASSED (256-bit key, empty plaintext)');

    // Test Case 14: 256-bit key, 96-bit IV, no AAD, 16 bytes plaintext
    const key14 = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
    const iv14 = Buffer.from('000000000000000000000000', 'hex');
    const plaintext14 = Buffer.from('00000000000000000000000000000000', 'hex');
    const expCT14 = Buffer.from('cea7403d4d606b6e074ec5d3baf39d18', 'hex');
    const expTag14 = Buffer.from('d0d1c8a799996bf0265b98b5d48ab919', 'hex');

    const aes14 = new AES256GCM(key14);
    const res14 = aes14.encrypt(plaintext14, iv14);

    if (Buffer.compare(res14.ciphertext, expCT14) !== 0) throw new Error('NIST TC14 Ciphertext Mismatch');
    if (Buffer.compare(res14.tag, expTag14) !== 0) throw new Error('NIST TC14 Tag Mismatch');
    console.log('   ✅ NIST Test Case 14 PASSED (256-bit key, 16-byte plaintext)');

    // Test Case 15: 256-bit key, 96-bit IV, no AAD, 64 bytes plaintext - verify against OpenSSL
    const key15 = Buffer.from('feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308', 'hex');
    const iv15 = Buffer.from('cafebabefacedbaddecaf888', 'hex');
    const plaintext15 = Buffer.from('d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b391aafd255', 'hex');

    const aes15 = new AES256GCM(key15);
    const res15 = aes15.encrypt(plaintext15, iv15);

    const gold15 = goldStandardEncrypt(key15, iv15, plaintext15, Buffer.alloc(0));
    if (Buffer.compare(res15.ciphertext, gold15.ciphertext) !== 0) throw new Error('NIST TC15 Ciphertext Mismatch vs OpenSSL');
    if (Buffer.compare(res15.tag, gold15.tag) !== 0) throw new Error('NIST TC15 Tag Mismatch vs OpenSSL');
    console.log('   ✅ NIST Test Case 15 PASSED (256-bit key, 64-byte plaintext, vs OpenSSL)');
}

// ============================================================================
// 2. BLOCK BOUNDARY ANALYSIS (0 to 512 bytes)
// ============================================================================

function testBlockBoundaries() {
    console.log('🔹 2. Block Boundary Analysis (0..512 bytes)...');
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const aes = new AES256GCM(key);

    for (let size = 0; size <= 512; size++) {
        const plaintext = randomBytes(size);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv);
        const decrypted = aes.decrypt(ciphertext, iv, tag);

        if (Buffer.compare(plaintext, decrypted) !== 0) {
            throw new Error(`Boundary Fail at size ${size}`);
        }

        const gold = goldStandardEncrypt(key, iv, plaintext, Buffer.alloc(0));
        if (Buffer.compare(tag, gold.tag) !== 0) {
            throw new Error(`OpenSSL Mismatch at size ${size} (Tag)`);
        }
        if (Buffer.compare(ciphertext, gold.ciphertext) !== 0) {
            throw new Error(`OpenSSL Mismatch at size ${size} (Ciphertext)`);
        }
    }
    console.log('   ✅ Tested all sizes 0..512 against OpenSSL');
}

// ============================================================================
// 3. MASSIVE FUZZING (5,000 Iterations)
// ============================================================================

function testMassiveFuzzing() {
    const ITERATIONS = 5000;
    console.log(`🔹 3. Massive Fuzzing (${ITERATIONS} runs)...`);

    let lastPercent = 0;

    for (let i = 0; i < ITERATIONS; i++) {
        const percent = Math.floor((i / ITERATIONS) * 100);
        if (percent > lastPercent && percent % 10 === 0) {
            process.stdout.write(`${percent}%... `);
            lastPercent = percent;
        }

        const key = randomBytes(32);
        const ivLen = Math.random() > 0.1 ? 12 : Math.floor(Math.random() * 50) + 1;
        const iv = randomBytes(ivLen);
        const ptLen = Math.floor(Math.random() * 2000);
        const aadLen = Math.floor(Math.random() * 200);
        const plaintext = randomBytes(ptLen);
        const aad = randomBytes(aadLen);

        const aes = new AES256GCM(key);
        const result = aes.encrypt(plaintext, iv, aad);
        const decrypted = aes.decrypt(result.ciphertext, iv, result.tag, aad);

        if (Buffer.compare(plaintext, decrypted) !== 0) {
            throw new Error(`Fuzzing Integrity Fail (Run ${i})`);
        }

        if (ivLen === 12) {
            const gold = goldStandardEncrypt(key, iv, plaintext, aad);
            if (Buffer.compare(result.tag, gold.tag) !== 0) {
                throw new Error(`Fuzzing OpenSSL Tag Mismatch (Run ${i})`);
            }
        }
    }
    console.log(' DONE');
    console.log('   ✅ 5,000 Random Runs PASSED');
}

// ============================================================================
// 4. LARGE DATA (1MB)
// ============================================================================

function testLargeData() {
    console.log('🔹 4. Large Data (1MB)...');
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const plaintext = randomBytes(1024 * 1024);
    const aad = randomBytes(1024);

    const aes = new AES256GCM(key);

    const start = performance.now();
    const { ciphertext, tag } = aes.encrypt(plaintext, iv, aad);
    const timeEncrypt = performance.now() - start;

    const startDec = performance.now();
    const decrypted = aes.decrypt(ciphertext, iv, tag, aad);
    const timeDecrypt = performance.now() - startDec;

    if (Buffer.compare(plaintext, decrypted) !== 0) {
        throw new Error('Large Data Integrity Fail');
    }

    const gold = goldStandardEncrypt(key, iv, plaintext, aad);
    if (Buffer.compare(tag, gold.tag) !== 0) throw new Error('Large Data Tag Mismatch');

    console.log(`   ✅ 1MB Encrypt/Decrypt PASSED`);
    console.log(`      Enc Time: ${timeEncrypt.toFixed(2)}ms, Dec Time: ${timeDecrypt.toFixed(2)}ms`);
}

// ============================================================================
// 5. TAMPER DETECTION (Bit-Flipping Attacks)
// ============================================================================

function testTamperDetection() {
    console.log('🔹 5. Tamper Detection (Bit-Flipping)...');
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const plaintext = Buffer.from('This is a secret message that must be protected!');
    const aad = Buffer.from('Additional authenticated data header');

    const aes = new AES256GCM(key);
    const { ciphertext, tag } = aes.encrypt(plaintext, iv, aad);

    // Test 5.1: Bit-flip in ciphertext
    let tamperedCiphertext = Buffer.from(ciphertext);
    tamperedCiphertext[0] ^= 0x01;
    let caught = false;
    try {
        aes.decrypt(tamperedCiphertext, iv, tag, aad);
    } catch (e: any) {
        if (e.message.includes('Authentication failed')) caught = true;
    }
    if (!caught) throw new Error('TAMPER: Bit-flip in ciphertext was NOT detected!');
    console.log('   ✅ Bit-flip in ciphertext DETECTED');

    // Test 5.2: Bit-flip in tag
    let tamperedTag = Buffer.from(tag);
    tamperedTag[0] ^= 0x01;
    caught = false;
    try {
        aes.decrypt(ciphertext, iv, tamperedTag, aad);
    } catch (e: any) {
        if (e.message.includes('Authentication failed')) caught = true;
    }
    if (!caught) throw new Error('TAMPER: Bit-flip in tag was NOT detected!');
    console.log('   ✅ Bit-flip in tag DETECTED');

    // Test 5.3: Bit-flip in AAD
    let tamperedAAD = Buffer.from(aad);
    tamperedAAD[0] ^= 0x01;
    caught = false;
    try {
        aes.decrypt(ciphertext, iv, tag, tamperedAAD);
    } catch (e: any) {
        if (e.message.includes('Authentication failed')) caught = true;
    }
    if (!caught) throw new Error('TAMPER: Bit-flip in AAD was NOT detected!');
    console.log('   ✅ Bit-flip in AAD DETECTED');

    // Test 5.4: Wrong IV
    let wrongIV = randomBytes(12);
    caught = false;
    try {
        aes.decrypt(ciphertext, wrongIV, tag, aad);
    } catch (e: any) {
        if (e.message.includes('Authentication failed')) caught = true;
    }
    if (!caught) throw new Error('TAMPER: Wrong IV was NOT detected!');
    console.log('   ✅ Wrong IV DETECTED');

    // Test 5.5: Truncated ciphertext
    let truncatedCT = ciphertext.slice(0, ciphertext.length - 1);
    caught = false;
    try {
        aes.decrypt(truncatedCT, iv, tag, aad);
    } catch (e: any) {
        if (e.message.includes('Authentication failed')) caught = true;
    }
    if (!caught) throw new Error('TAMPER: Truncated ciphertext was NOT detected!');
    console.log('   ✅ Truncated ciphertext DETECTED');

    // Test 5.6: Tag from different message
    const plaintext2 = Buffer.from('Completely different message');
    const result2 = aes.encrypt(plaintext2, iv, aad);
    caught = false;
    try {
        aes.decrypt(ciphertext, iv, result2.tag, aad);
    } catch (e: any) {
        if (e.message.includes('Authentication failed')) caught = true;
    }
    if (!caught) throw new Error('TAMPER: Tag swap was NOT detected!');
    console.log('   ✅ Tag from different message DETECTED');

    // Test 5.7: Multiple bit-flips
    tamperedCiphertext = Buffer.from(ciphertext);
    for (let i = 0; i < 5; i++) {
        tamperedCiphertext[i] ^= 0xFF;
    }
    caught = false;
    try {
        aes.decrypt(tamperedCiphertext, iv, tag, aad);
    } catch (e: any) {
        if (e.message.includes('Authentication failed')) caught = true;
    }
    if (!caught) throw new Error('TAMPER: Multiple bit-flips were NOT detected!');
    console.log('   ✅ Multiple bit-flips DETECTED');
}

// ============================================================================
// 6. EDGE CASES
// ============================================================================

function testEdgeCases() {
    console.log('🔹 6. Edge Cases...');
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const aes = new AES256GCM(key);

    // Test 6.1: Empty plaintext, empty AAD
    {
        const plaintext = Buffer.alloc(0);
        const aad = Buffer.alloc(0);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv, aad);
        const decrypted = aes.decrypt(ciphertext, iv, tag, aad);
        if (ciphertext.length !== 0) throw new Error('EdgeCase: Empty PT should give empty CT');
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('EdgeCase: Empty data roundtrip failed');
        const gold = goldStandardEncrypt(key, iv, plaintext, aad);
        if (Buffer.compare(tag, gold.tag) !== 0) throw new Error('EdgeCase: Empty data tag mismatch vs OpenSSL');
        console.log('   ✅ Empty plaintext + empty AAD PASSED');
    }

    // Test 6.2: Only AAD (no plaintext) - authentication only mode
    {
        const plaintext = Buffer.alloc(0);
        const aad = Buffer.from('This is only authenticated, not encrypted. Everyone can read but nobody can modify.');
        const { ciphertext, tag } = aes.encrypt(plaintext, iv, aad);
        const decrypted = aes.decrypt(ciphertext, iv, tag, aad);
        if (ciphertext.length !== 0) throw new Error('EdgeCase: AAD-only should give empty CT');
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('EdgeCase: AAD-only roundtrip failed');
        let tamperedAAD = Buffer.from(aad);
        tamperedAAD[0] ^= 0x01;
        let caught = false;
        try {
            aes.decrypt(ciphertext, iv, tag, tamperedAAD);
        } catch { caught = true; }
        if (!caught) throw new Error('EdgeCase: AAD-only tamper should be detected');
        console.log('   ✅ AAD-only mode (no encryption, just auth) PASSED');
    }

    // Test 6.3: Exactly 1 block (16 bytes plaintext, 16 bytes AAD)
    {
        const plaintext = randomBytes(16);
        const aad = randomBytes(16);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv, aad);
        const decrypted = aes.decrypt(ciphertext, iv, tag, aad);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('EdgeCase: Exact 1 block failed');
        const gold = goldStandardEncrypt(key, iv, plaintext, aad);
        if (Buffer.compare(tag, gold.tag) !== 0) throw new Error('EdgeCase: 1 block tag mismatch');
        console.log('   ✅ Exactly 1 block (16B PT, 16B AAD) PASSED');
    }

    // Test 6.4: Exactly 2 blocks (32 bytes)
    {
        const plaintext = randomBytes(32);
        const aad = randomBytes(32);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv, aad);
        const decrypted = aes.decrypt(ciphertext, iv, tag, aad);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('EdgeCase: Exact 2 blocks failed');
        console.log('   ✅ Exactly 2 blocks (32B PT, 32B AAD) PASSED');
    }

    // Test 6.5: Block boundary -1 (15 bytes)
    {
        const plaintext = randomBytes(15);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv);
        const decrypted = aes.decrypt(ciphertext, iv, tag);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('EdgeCase: 15 bytes failed');
        console.log('   ✅ 15 bytes (block boundary -1) PASSED');
    }

    // Test 6.6: Block boundary +1 (17 bytes)
    {
        const plaintext = randomBytes(17);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv);
        const decrypted = aes.decrypt(ciphertext, iv, tag);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('EdgeCase: 17 bytes failed');
        console.log('   ✅ 17 bytes (block boundary +1) PASSED');
    }

    // Test 6.7: Single byte
    {
        const plaintext = Buffer.from([0x42]);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv);
        const decrypted = aes.decrypt(ciphertext, iv, tag);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('EdgeCase: Single byte failed');
        console.log('   ✅ Single byte PASSED');
    }

    // Test 6.8: Large AAD (10KB)
    {
        const plaintext = randomBytes(100);
        const aad = randomBytes(10 * 1024);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv, aad);
        const decrypted = aes.decrypt(ciphertext, iv, tag, aad);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('EdgeCase: Large AAD failed');
        console.log('   ✅ Large AAD (10KB) PASSED');
    }
}

// ============================================================================
// 7. SECURITY TESTS
// ============================================================================

function testSecurityProperties() {
    console.log('🔹 7. Security Properties...');

    // Test 7.1: Zero key (all zeros) - should still work correctly
    {
        const key = Buffer.alloc(32, 0x00);
        const iv = randomBytes(12);
        const plaintext = Buffer.from('Testing with zero key');
        const aes = new AES256GCM(key);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv);
        const decrypted = aes.decrypt(ciphertext, iv, tag);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('Security: Zero key failed');
        const gold = goldStandardEncrypt(key, iv, plaintext, Buffer.alloc(0));
        if (Buffer.compare(tag, gold.tag) !== 0) throw new Error('Security: Zero key tag mismatch vs OpenSSL');
        console.log('   ✅ Zero key (0x00*32) PASSED');
    }

    // Test 7.2: All-ones key (0xFF)
    {
        const key = Buffer.alloc(32, 0xFF);
        const iv = randomBytes(12);
        const plaintext = Buffer.from('Testing with all-ones key');
        const aes = new AES256GCM(key);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv);
        const decrypted = aes.decrypt(ciphertext, iv, tag);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('Security: All-ones key failed');
        const gold = goldStandardEncrypt(key, iv, plaintext, Buffer.alloc(0));
        if (Buffer.compare(tag, gold.tag) !== 0) throw new Error('Security: All-ones key tag mismatch');
        console.log('   ✅ All-ones key (0xFF*32) PASSED');
    }

    // Test 7.3: Very short IV (1 byte) - non-standard but should work via GHASH
    {
        const key = randomBytes(32);
        const iv = Buffer.from([0x42]);
        const plaintext = Buffer.from('Short IV test');
        const aes = new AES256GCM(key);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv);
        const decrypted = aes.decrypt(ciphertext, iv, tag);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('Security: Short IV failed');
        console.log('   ✅ Very short IV (1 byte) PASSED');
    }

    // Test 7.4: Long IV (64 bytes) - non-standard, triggers GHASH path
    {
        const key = randomBytes(32);
        const iv = randomBytes(64);
        const plaintext = Buffer.from('Long IV test');
        const aes = new AES256GCM(key);
        const { ciphertext, tag } = aes.encrypt(plaintext, iv);
        const decrypted = aes.decrypt(ciphertext, iv, tag);
        if (Buffer.compare(plaintext, decrypted) !== 0) throw new Error('Security: Long IV failed');
        console.log('   ✅ Long IV (64 bytes) PASSED');
    }

    // Test 7.5: Same plaintext, different IVs produce different ciphertexts
    {
        const key = randomBytes(32);
        const iv1 = randomBytes(12);
        const iv2 = randomBytes(12);
        const plaintext = Buffer.from('Same message encrypted twice');
        const aes = new AES256GCM(key);
        const result1 = aes.encrypt(plaintext, iv1);
        const result2 = aes.encrypt(plaintext, iv2);
        if (Buffer.compare(result1.ciphertext, result2.ciphertext) === 0) {
            throw new Error('Security: Different IVs produced same ciphertext!');
        }
        console.log('   ✅ Different IVs produce different ciphertexts PASSED');
    }

    // Test 7.6: Invalid tag size should throw
    {
        const key = randomBytes(32);
        const iv = randomBytes(12);
        const plaintext = Buffer.from('Test');
        const aes = new AES256GCM(key);
        const { ciphertext } = aes.encrypt(plaintext, iv);
        let caught = false;
        try {
            const shortTag = randomBytes(8);
            aes.decrypt(ciphertext, iv, shortTag);
        } catch (e: any) {
            if (e.message.includes('Invalid tag size')) caught = true;
        }
        if (!caught) throw new Error('Security: Short tag should throw');
        console.log('   ✅ Invalid tag size rejection PASSED');
    }

    // Test 7.7: Decryption with wrong key should fail authentication
    {
        const key1 = randomBytes(32);
        const key2 = randomBytes(32);
        const iv = randomBytes(12);
        const plaintext = Buffer.from('Secret data');
        const aes1 = new AES256GCM(key1);
        const aes2 = new AES256GCM(key2);
        const { ciphertext, tag } = aes1.encrypt(plaintext, iv);
        let caught = false;
        try {
            aes2.decrypt(ciphertext, iv, tag);
        } catch (e: any) {
            if (e.message.includes('Authentication failed')) caught = true;
        }
        if (!caught) throw new Error('Security: Wrong key should fail auth');
        console.log('   ✅ Wrong key authentication failure PASSED');
    }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function run() {
    console.log('\n🔥 STARTING AES-256-GCM ULTIMATE VERIFICATION 🔥\n');
    try {
        testNIST();
        testBlockBoundaries();
        testMassiveFuzzing();
        testLargeData();
        testTamperDetection();
        testEdgeCases();
        testSecurityProperties();
        console.log('\n⭐⭐⭐ ALL 7 TEST SUITES PASSED - IMPLEMENTATION IS BULLETPROOF ⭐⭐⭐\n');
    } catch (e) {
        console.error('\n💀 FATAL ERROR:', e);
        process.exit(1);
    }
}

run();
