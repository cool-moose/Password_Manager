use std::u8;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn sha512(input: &str) -> String {
    let digest = sha512_bytes(input.as_bytes());
    bytes_to_hex(&digest)
}


#[wasm_bindgen]
pub fn sha256(input: &str) -> String {
    let digest = sha256_bytes(input.as_bytes());
    bytes_to_hex(&digest)
}

#[wasm_bindgen]
pub fn hmac_sha256(key: &str, input: &str) -> String {
    let digest = hmac_sha256_bytes(key.as_bytes(),input.as_bytes());
    bytes_to_hex(&digest)
}

#[wasm_bindgen]
pub fn pbkdf2_hmac_sha256(
    password: &str,
    salt: &str,
    iterations: u32,
    dk_len: usize,
) -> Result<String, String> {
    let dk = pbkdf2_hmac_sha256_bytes(password.as_bytes(), salt.as_bytes(), iterations, dk_len)?;
    Ok(bytes_to_hex(&dk))
}
#[wasm_bindgen]
pub fn hmac_sha512(key: &str, input: &str) -> String {
    let digest = hmac_sha512_bytes(key.as_bytes(),input.as_bytes());
    bytes_to_hex(&digest)
}

#[wasm_bindgen]
pub fn pbkdf2_hmac_sha512(
    password: &str,
    salt: &str,
    iterations: u32,
    dk_len: usize,
) -> Result<String, String> {
    let dk = pbkdf2_hmac_sha512_bytes(password.as_bytes(), salt.as_bytes(), iterations, dk_len)?;
    Ok(bytes_to_hex(&dk))
}

fn pbkdf2_hmac_sha512_bytes(password: &[u8], salt: &[u8], c: u32, dk_len: usize) -> Result<Vec<u8>,String> {
    const H_LEN: usize = 64; 
    if dk_len > (u32::MAX as usize).checked_mul(H_LEN as usize).unwrap_or(usize::MAX) {
        return Err("derived key too long".to_string());
    }

    let mut dk = vec![0u8; dk_len];
    
    let l = (dk_len + H_LEN - 1) / H_LEN;
    let r = dk_len - (l - 1) * H_LEN;

    let mut pos = 0usize;
    
    for i in 1..=l{
        let block = pbkdf2_f(password, salt, c, i as u32);
        let copy_len = if i == 1 {r} else {H_LEN};
        dk[pos..pos + copy_len].copy_from_slice(&block[..copy_len]);
        pos += copy_len;
    }

    Ok(dk)
}

fn pbkdf2_f(password: &[u8], salt: &[u8], c: u32, i: u32) -> [u8; 64]{
    let mut u = hmac_sha512_bytes(password, &[salt, &i.to_be_bytes()].concat());
    let mut t = u;

    for _ in 1..c {
        u = hmac_sha512_bytes(password, &u);
        for j in 0..64 {
            t[j] ^= u[j];
        }
    }
    t
}
fn hmac_sha512_bytes(key: &[u8], data: &[u8]) -> [u8; 64]{
    const BLOCK_SIZE: usize = 128;

    let k = if key.len() > BLOCK_SIZE{
        let key_hash = sha512_bytes(key);
        let mut padded = [0u8; BLOCK_SIZE];
        padded[..64].copy_from_slice(&key_hash);
        padded
    } else{
        let mut padded = [0u8; BLOCK_SIZE];
        padded[..key.len()].copy_from_slice(key);
        padded
    };

    let mut ipad = [0u8; BLOCK_SIZE];
    let mut opad = [0u8; BLOCK_SIZE];

    for i in 0..BLOCK_SIZE{
        ipad[i] = k[i] ^ 0x36;
        opad[i] = k[i] ^ 0x5c;
    }

    let mut inner = ipad.to_vec();
    inner.extend_from_slice(data);
    let inner_hash = sha512_bytes(&inner);

    let mut outer = opad.to_vec();
    outer.extend_from_slice(&inner_hash);
    sha512_bytes(&outer)
}

fn pbkdf2_hmac_sha256_bytes(password: &[u8], salt: &[u8], c: u32, dk_len: usize) -> Result<Vec<u8>,String> {
    const H_LEN: usize = 32; 
    if dk_len > (u32::MAX as usize).checked_mul(H_LEN as usize).unwrap_or(usize::MAX) {
        return Err("derived key too long".to_string());
    }

    let mut dk = vec![0u8; dk_len];
    
    let l = (dk_len + H_LEN - 1) / H_LEN;
    let r = dk_len - (l - 1) * H_LEN;

    let mut pos = 0usize;
    
    for i in 1..=l{
        let block = pbkdf2_f_sha256(password, salt, c, i as u32);
        let copy_len = if i == 1 {r} else {H_LEN};
        dk[pos..pos + copy_len].copy_from_slice(&block[..copy_len]);
        pos += copy_len;
    }

    Ok(dk)
}

fn pbkdf2_f_sha256(password: &[u8], salt: &[u8], c: u32, i: u32) -> [u8; 32]{
    let mut u = hmac_sha256_bytes(password, &[salt, &i.to_be_bytes()].concat());
    let mut t = u;

    for _ in 1..c {
        u = hmac_sha256_bytes(password, &u);
        for j in 0..32 {
            t[j] ^= u[j];
        }
    }
    t
}
fn hmac_sha256_bytes(key: &[u8], data: &[u8]) -> [u8; 32]{
    const BLOCK_SIZE: usize = 64;

    let k = if key.len() > BLOCK_SIZE{
        let key_hash = sha256_bytes(key);
        let mut padded = [0u8; BLOCK_SIZE];
        padded[..32].copy_from_slice(&key_hash);
        padded
    } else{
        let mut padded = [0u8; BLOCK_SIZE];
        padded[..key.len()].copy_from_slice(key);
        padded
    };

    let mut ipad = [0u8; BLOCK_SIZE];
    let mut opad = [0u8; BLOCK_SIZE];

    for i in 0..BLOCK_SIZE{
        ipad[i] = k[i] ^ 0x36;
        opad[i] = k[i] ^ 0x5c;
    }

    let mut inner = ipad.to_vec();
    inner.extend_from_slice(data);
    let inner_hash = sha256_bytes(&inner);

    let mut outer = opad.to_vec();
    outer.extend_from_slice(&inner_hash);
    sha256_bytes(&outer)
}

fn sha256_bytes(data: &[u8]) -> [u8; 32] {

    const K: [u32; 64] = [ 
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5
       ,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5
       ,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3
       ,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174
       ,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc
       ,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da
       ,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7
       ,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967
       ,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13
       ,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85
       ,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3
       ,0xd192e819,0xd6990624,0xf40e3585,0x106aa070
       ,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5
       ,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3
       ,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208
       ,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];

    let mut h = [
        0x6a09e667,
        0xbb67ae85,
        0x3c6ef372,
        0xa54ff53a,
        0x510e527f,
        0x9b05688c,
        0x1f83d9ab,
        0x5be0cd19
    ];

    //dodajemy padding
    let mut msg = data.to_vec();
    let bit_len = (data.len() as u64) * 8;

    msg.push(0x80);
    while (msg.len() % 64) != 56 {
        msg.push(0x00);
    }
    msg.extend_from_slice(&bit_len.to_be_bytes());

    for block in msg.chunks_exact(64) {
        let mut w = [0u32; 64];

        for i in 0..16 {
            w[i] = u32::from_be_bytes(
                block[i*4..i*4 + 4].try_into().unwrap()
            );
        }

        for i in 16..64 {
            let s0 = w[i-15].rotate_right(7) ^ w[i-15].rotate_right(18) ^ (w[i-15] >> 3);
            let s1 = w[i-2].rotate_right(17) ^ w[i-2].rotate_right(19) ^ (w[i-2] >> 10);

            w[i] = w[i-16].wrapping_add(s0).wrapping_add(w[i-7]).wrapping_add(s1);
        }

        let mut a: u32 = h[0];
        let mut b: u32 = h[1];
        let mut c: u32 = h[2];
        let mut d: u32 = h[3];
        let mut e: u32 = h[4];
        let mut f: u32 = h[5];
        let mut g: u32 = h[6];
        let mut hh: u32 = h[7];

        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ (!e & g);
            let temp1 = hh.wrapping_add(s1).wrapping_add(ch).wrapping_add(K[i]).wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);

            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }

    let mut out = [0u8; 32];
    for (i, &val) in h.iter().enumerate() {
        out[i*4..i*4+4].copy_from_slice(&val.to_be_bytes());
    }
    out
}


fn sha512_bytes(data: &[u8]) -> [u8; 64] {

    //inicjacja stałych
    const K: [u64; 80] = [
        0x428a2f98d728ae22, 0x7137449123ef65cd, 0xb5c0fbcfec4d3b2f, 0xe9b5dba58189dbbc, 
        0x3956c25bf348b538, 0x59f111f1b605d019, 0x923f82a4af194f9b, 0xab1c5ed5da6d8118,
        0xd807aa98a3030242, 0x12835b0145706fbe, 0x243185be4ee4b28c, 0x550c7dc3d5ffb4e2,
        0x72be5d74f27b896f, 0x80deb1fe3b1696b1, 0x9bdc06a725c71235, 0xc19bf174cf692694,
        0xe49b69c19ef14ad2, 0xefbe4786384f25e3, 0x0fc19dc68b8cd5b5, 0x240ca1cc77ac9c65,
        0x2de92c6f592b0275, 0x4a7484aa6ea6e483, 0x5cb0a9dcbd41fbd4, 0x76f988da831153b5,
        0x983e5152ee66dfab, 0xa831c66d2db43210, 0xb00327c898fb213f, 0xbf597fc7beef0ee4,
        0xc6e00bf33da88fc2, 0xd5a79147930aa725, 0x06ca6351e003826f, 0x142929670a0e6e70,
        0x27b70a8546d22ffc, 0x2e1b21385c26c926, 0x4d2c6dfc5ac42aed, 0x53380d139d95b3df,
        0x650a73548baf63de, 0x766a0abb3c77b2a8, 0x81c2c92e47edaee6, 0x92722c851482353b,
        0xa2bfe8a14cf10364, 0xa81a664bbc423001, 0xc24b8b70d0f89791, 0xc76c51a30654be30,
        0xd192e819d6ef5218, 0xd69906245565a910, 0xf40e35855771202a, 0x106aa07032bbd1b8,
        0x19a4c116b8d2d0c8, 0x1e376c085141ab53, 0x2748774cdf8eeb99, 0x34b0bcb5e19b48a8,
        0x391c0cb3c5c95a63, 0x4ed8aa4ae3418acb, 0x5b9cca4f7763e373, 0x682e6ff3d6b2b8a3,
        0x748f82ee5defb2fc, 0x78a5636f43172f60, 0x84c87814a1f0ab72, 0x8cc702081a6439ec,
        0x90befffa23631e28, 0xa4506cebde82bde9, 0xbef9a3f7b2c67915, 0xc67178f2e372532b,
        0xca273eceea26619c, 0xd186b8c721c0c207, 0xeada7dd6cde0eb1e, 0xf57d4f7fee6ed178,
        0x06f067aa72176fba, 0x0a637dc5a2c898a6, 0x113f9804bef90dae, 0x1b710b35131c471b,
        0x28db77f523047d84, 0x32caab7b40c72493, 0x3c9ebe0a15c9bebc, 0x431d67c49c100d4c,
        0x4cc5d4becb3e42b6, 0x597f299cfc657e2a, 0x5fcb6fab3ad6faec, 0x6c44198c4a475817
    ];

    let mut h = [
        0x6a09e667f3bcc908,
        0xbb67ae8584caa73b,
        0x3c6ef372fe94f82b,
        0xa54ff53a5f1d36f1,
        0x510e527fade682d1,
        0x9b05688c2b3e6c1f,
        0x1f83d9abfb41bd6b,
        0x5be0cd19137e2179
    ];

    //dodajemy padding
    let mut msg = data.to_vec();
    let bit_len = (data.len() as u128) * 8;

    msg.push(0x80);
    while (msg.len() % 128) != 112 {
        msg.push(0x00);
    }
    msg.extend_from_slice(&bit_len.to_be_bytes());

    for block in msg.chunks_exact(128) {
        let mut w = [0u64; 128];

        for i in 0..16 {
            w[i] = u64::from_be_bytes(
                block[i*8..i*8 + 8].try_into().unwrap()
            );
        }

        for i in 16..80 {
            //let s0 = w[i-15].rotate_right(7) ^ w[i-15].rotate_right(18) ^ (w[i-15] >> 3);
//            let s1 = w[i-2].rotate_right(17) ^ w[i-2].rotate_right(19) ^ (w[i-2] >> 10);

            let s0 = w[i-15].rotate_right(1) ^ w[i-15].rotate_right(8) ^ (w[i-15] >> 7);
            let s1 = w[i-2].rotate_right(19) ^ w[i-2].rotate_right(61) ^ (w[i-2] >> 6);
            w[i] = w[i-16].wrapping_add(s0).wrapping_add(w[i-7]).wrapping_add(s1);
        }

        let mut a: u64 = h[0];
        let mut b: u64 = h[1];
        let mut c: u64 = h[2];
        let mut d: u64 = h[3];
        let mut e: u64 = h[4];
        let mut f: u64 = h[5];
        let mut g: u64 = h[6];
        let mut hh: u64 = h[7];

        for i in 0..80 {
            let s1 = e.rotate_right(14) ^ e.rotate_right(18) ^ e.rotate_right(41);
            //let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ (!e & g);
            let temp1 = hh.wrapping_add(s1).wrapping_add(ch).wrapping_add(K[i]).wrapping_add(w[i]);
            //let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let s0 = a.rotate_right(28) ^ a.rotate_right(34) ^ a.rotate_right(39);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);

            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }

    let mut out = [0u8; 64];
    for (i, &val) in h.iter().enumerate() {
        out[i*8..i*8+8].copy_from_slice(&val.to_be_bytes());
    }
    out
}


fn bytes_to_hex(data: &[u8]) -> String {
    const TABLE: &[u8] = b"0123456789abcdef";
    let mut s = String::with_capacity(data.len() * 2);
    for &b in data {
        s.push(TABLE[(b >> 4) as usize] as char);
        s.push(TABLE[(b & 0xf) as usize] as char);
    }
    s
}
