import init, { pbkdf2_hmac_sha256,sha256 } from '../../../shared/src/wasm/pkg/wasm_crypto.js'
import { encrypt, decrypt, GCMEncryptResult } from '../../../shared/src/crypto/gcm'
import { writeData, readDataBuffer, writeDataBuffer, findUserVaultData } from './fileOperations'
import { SRPClient } from '../../../shared/src/srp'
import { Buffer } from 'buffer';
import { webcrypto } from 'crypto';
import { safeStorage } from 'electron';
import {printCyan,printRed} from './prints';

const SERVER_URL = 'http://localhost:3000';

const { subtle } = webcrypto;

async function storeSecretKey(user: string, plaintext: string) {
    printCyan("[VAULT] Storing secret key: " + plaintext + " for user: " + user)
    if (!safeStorage.isEncryptionAvailable()) return null;
    await writeDataBuffer(safeStorage.encryptString(plaintext), user + "-key.json")
}

async function getSecretKey(user: string): Promise<string | null> {
    printCyan("[VAULT] Getting secret key for user: " + user)
    try {
        let encryptedBuffer = await readDataBuffer(user + "-key.json");
        printCyan("[VAULT] Got secret key: " + safeStorage.decryptString(encryptedBuffer))
        return safeStorage.decryptString(encryptedBuffer);
    } catch (e) {
        return null;  // Invalid or unavailable
    }
}
async function deriveKey(salt: string, masterPassword: string, secretKey: string): Promise<Uint8Array> {
    printRed("[PBKDF2] Deriving 256 bit key from")
    console.log(masterPassword + secretKey + "\nwith salt: " + salt + "\nusing 600000 iterations")
    const derivedKeyHex = pbkdf2_hmac_sha256(masterPassword + secretKey, salt, 600000, 32);
    console.log("Derived key: " + uint8ArrayToBase64(new Uint8Array(Buffer.from(derivedKeyHex,'hex'))))
    return new Uint8Array(Buffer.from(derivedKeyHex, 'hex'));
}

function generateRandomBytes(length: number): string {
    const buffer = new Uint8Array(length);
    webcrypto.getRandomValues(buffer);
    return btoa(String.fromCharCode(...buffer));
}


export class Vault {
    public user: string;
    private createdAt: string;
    private updatedAt: string;
    private version: number = 1;
    private vaultPasswords: Password[];
    private salt: string = generateRandomBytes(32);
    private secretKey: string = generateRandomBytes(32);
    private token: string | null = null;
    private remoteUpdatedAt: string | null = null;

    // Verification token - encrypted known value to verify password
    private verificationToken: string = '';
    private verificationIV: string = '';
    private verificationTag: string = '';
    private verificationPlaintext: string = '';

    protected derivedKey: Uint8Array;

    public constructor(user: string) {
        printCyan("[VAULT] constructing vault for user: " + user)
        this.user = user;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        this.version = 1;
        this.vaultPasswords = [];
        this.derivedKey = new Uint8Array();
    }

    public async factory(masterPassword: string, isNew: boolean = false) {
        printCyan("[VAULT] Running vault factory with materPassword:" + masterPassword)

        if (isNew) {
            this.derivedKey = await deriveKey(this.salt, masterPassword, this.secretKey);
            printCyan("[VAULT] Vault secret key: " + this.secretKey)
            printCyan("[VAULT] Vault salt: " + this.salt)
            await this.saveToFile();
            await storeSecretKey(this.user, this.secretKey);
        }
        else {
            const secretKeyBuf = await getSecretKey(this.user);
            if (secretKeyBuf) {
                this.secretKey = secretKeyBuf;
            }
        }
        await this.createFromFile();

        if(this.derivedKey != new Uint8Array()){
            this.derivedKey = await deriveKey(this.salt, masterPassword, this.secretKey);
        }

        if(!this.verifyPassword())
        {
            throw new Error("Password verification failed")
        }
        await this.saveToFile(); // Save again with verification token
    }

    // Verify that the password is correct by decrypting the verification token
    public verifyPassword(): boolean {
        printCyan("[VAULT] Verifying vault password")
        if (!this.verificationToken || !this.verificationIV || !this.verificationTag) {
            // Old vault without verification token - can't verify (backward compatibility)
            console.warn('[VAULT] No verification token found - vault may be from old version');
            return true; // Allow login for backward compatibility
        }

        try {
            console.log(this.derivedKey)
            // Use base64 decoding for binary data
            const decrypted = decrypt(
                this.derivedKey,
                base64ToUint8Array(this.verificationIV),
                base64ToUint8Array(this.verificationToken),
                base64ToUint8Array(this.verificationTag)
            );
            const decryptedString = uint8ArrayToString(decrypted);
            console.log("\nDecrypted token: " + decryptedString)
            console.log("Generated token: " + sha256(JSON.stringify(this.vaultPasswords)))
            return decryptedString === sha256(JSON.stringify(this.vaultPasswords));
        } catch (error) {
            // Decryption failed - wrong password
            console.error('[VAULT] Password verification failed:', error);
            return false;
        }
    }

    async setVerificationToken(){
            printCyan("[VAULT] Creating vault verification token")
            console.log("from: " + this.verificationPlaintext)
            const iv = generateRandomIV();
            const encrypted = encrypt(this.derivedKey, iv, stringToUint8Array(this.verificationPlaintext));
            // Use base64 encoding for binary data - CRITICAL for JSON storage
            this.verificationToken = uint8ArrayToBase64(encrypted.ciphertext);
            this.verificationIV = uint8ArrayToBase64(iv);
            this.verificationTag = uint8ArrayToBase64(encrypted.tag);

    }
    public setToken(token: string) {
        printCyan("[VAULT] Setting token: " + token)
        this.token = token;
    }

    public async createFromFile() {
        printCyan("[VAULT] Loading vault from file")
        let vaultFile = findUserVaultData(this.user);
        if (vaultFile) {
            let content = JSON.parse(vaultFile);

            if ('createdAt' in content) {
                this.createdAt = content.createdAt;
            }

            if ('updatedAt' in content) {
                this.updatedAt = content.updatedAt || content.createdAt;
            }

            if ('version' in content) {
                this.version = typeof content.version === 'number' ? content.version : parseInt(content.version) || 1;
            }

            if ('salt' in content) {
                this.salt = content.salt;
            }

            if ('vault' in content) {
                const vault = content.vault.passwords;
                for (const key of vault) {
                    const passwordId = key.password_id;
                    const username = key.data.username;
                    const usernameIV = key.data.username_iv;
                    const usernameTag = key.data.username_tag;
                    const password = key.data.password;
                    const passwordIV = key.data.password_iv;
                    const passwordTag = key.data.password_tag;
                    const site = key.metadata.site;
                    const category = key.metadata.category;
                    const note = key.metadata.note;
                    const favorite = key.metadata.favorite;
                    const created = key.metadata.created;
                    const updated = key.metadata.updated;

                    this.vaultPasswords.push(
                        new Password(
                            Number(passwordId),
                            username,
                            usernameIV,
                            usernameTag,
                            password,
                            passwordIV,
                            passwordTag,
                            site,
                            note,
                            category,
                            favorite,
                            created,
                            updated
                        )
                    )
                }
            }

            // Load verification token
            if ('verificationToken' in content) {
                this.verificationToken = content.verificationToken;
                this.verificationIV = content.verificationIV || '';
                this.verificationTag = content.verificationTag || '';
            }


        }
    }

    public async saveToFile() {
        printCyan("[VAULT] Saving vault data to file")
        this.version++;
        this.updatedAt = new Date().toISOString();

        let passwords = [];

        for (const password of this.vaultPasswords) {
            passwords.push(password.getAsObject());
        }

        this.verificationPlaintext = sha256(JSON.stringify(this.vaultPasswords));

        await this.setVerificationToken()


        const userData = {
            user: this.user,
            version: this.version,
            salt: this.salt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            verificationToken: this.verificationToken,
            verificationIV: this.verificationIV,
            verificationTag: this.verificationTag,
            vault: {
                passwords: passwords
            }
        }


        await writeData(userData, this.user + '-vault.json');
    }

    // --- Synchronization Logic ---

    public async sync() {
        printCyan("[VAULT] Starting vault synchronization")
        if (!this.token) {
            console.warn("Cannot sync: No token");
            return;
        }

        console.log("Syncing vault...", this.updatedAt);

        try {
            // 1. Download parameters/metadata to check if we need to merge
            const res = await fetch(`${SERVER_URL}/vault`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (res.status === 404) {
                // No vault on server, upload ours
                console.log("No remote vault, uploading local.");
                await this.uploadVault();
                return;
            }

            if (!res.ok) {
                console.error("Sync download failed", res.status);
                return;
            }

            const remoteData = await res.json();
            // Simple Conflict Resolution: Last Write Wins based on updatedAt
            const remoteTime = new Date((remoteData as any).updatedAt).getTime();
            const localTime = new Date(this.updatedAt).getTime();

            if (remoteTime > localTime) {
                console.log("Remote is newer, importing...");
                await this.importVaultData(remoteData);
                await this.saveToFile();
            } else if (localTime > remoteTime) {
                console.log("Local is newer, uploading...");
                await this.uploadVault();
            } else {
                console.log("Vaults are in sync.");
            }

        } catch (err) {
            console.error("Sync error:", err);
        }
    }

    private async uploadVault() {
        printCyan("[VAULT] Uploading vault")
        if (!this.token) return;

        let passwords = [];
        for (const password of this.vaultPasswords) {
            passwords.push(password.getAsObject());
        }


        let ivPass = generateRandomIV();
        let encPassword: GCMEncryptResult = encrypt(this.derivedKey, ivPass, stringToUint8Array(JSON.stringify(passwords)));


        let vaultEncData = { vault_iv: uint8ArrayToBase64(ivPass), 
                    vault_ciphertext: uint8ArrayToBase64(encPassword.ciphertext), 
                    vault_tag: uint8ArrayToBase64(encPassword.tag) };

        let verificationVaultSync = sha256(JSON.stringify(vaultEncData))

        let ivVer = generateRandomIV();

        let encVer: GCMEncryptResult = encrypt(this.derivedKey, ivVer, stringToUint8Array(verificationVaultSync));



        const vaultData = {
            user: this.user,
            version: this.version,
            salt: this.salt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            verificationIV: uint8ArrayToBase64(ivVer),
            verificationCiphertext: uint8ArrayToBase64(encVer.ciphertext),
            verificationTag: uint8ArrayToBase64(encVer.tag),
            vault: vaultEncData
        };

        await fetch(`${SERVER_URL}/vault`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(vaultData)
        });
        console.log("Vault uploaded.");
    }

    private async importVaultData(data: any) {
        printCyan("[VAULT] Importing vault data");
        this.updatedAt = data.updatedAt;
        this.salt = data.salt;
        
        
        let verificationIV = data.verificationIV;
        let verificationCiphertext = data.verificationCiphertext;
        let verificationTag = data.verificationTag;
        let encVault = data.vault;

        let verification = uint8ArrayToString(decrypt(this.derivedKey, base64ToUint8Array(verificationIV), base64ToUint8Array(verificationCiphertext), base64ToUint8Array(verificationTag)))

        if (verification != sha256(JSON.stringify(encVault))){
            throw new Error("Remote import verification failed")
        }

        let passwords = JSON.parse(uint8ArrayToString(decrypt(
            this.derivedKey, 
            base64ToUint8Array(encVault.vault_iv), 
            base64ToUint8Array(encVault.vault_ciphertext), base64ToUint8Array(encVault.vault_tag))))


        if (data.salt !== this.salt) {
            console.warn("Remote salt differs! Overwriting local salt and keys not implemented fully without re-derivation.");
            this.salt = data.salt;
        }
        
        console.log(passwords)


        this.vaultPasswords = [];
        if (passwords) {
            for (const key of passwords) {
                this.vaultPasswords.push(new Password(
                    Number(key.password_id),
                    key.data.username,
                    key.data.username_iv,
                    key.data.username_tag,
                    key.data.password,
                    key.data.password_iv,
                    key.data.password_tag,
                    key.metadata.site,
                    key.metadata.note,
                    key.metadata.category,
                    key.metadata.favorite,
                    key.metadata.created,
                    key.metadata.updated
                ));
            }
        }
    }

    public async addPassword(
        user: string,
        password: string,
        site: string,
        note: string = '',
        category: string = '',
        favorite: boolean = false
    ) {
        printCyan("[VAULT] Adding password: " + password + " for user " + user)
        let ivPass = generateRandomIV();
        let ivUser = generateRandomIV();
        let encPassword: GCMEncryptResult = encrypt(this.derivedKey, ivPass, stringToUint8Array(password));
        let encUser: GCMEncryptResult = encrypt(this.derivedKey, ivUser, stringToUint8Array(user))
        let passId = 0;

        this.updatedAt = new Date().toISOString();
        if (this.vaultPasswords.length > 0) {
            passId = this.vaultPasswords[this.vaultPasswords.length - 1].passwordId + 1;
        }
        this.vaultPasswords.push(new Password(
            passId,
            uint8ArrayToBase64(encUser.ciphertext),
            uint8ArrayToBase64(ivUser),
            uint8ArrayToBase64(encUser.tag),
            uint8ArrayToBase64(encPassword.ciphertext),
            uint8ArrayToBase64(ivPass),
            uint8ArrayToBase64(encPassword.tag),
            site,
            note,
            category,
            favorite
        ))
        await this.saveToFile();
        await this.sync();
    }

    public removePassword(id: number) {
        printCyan("[VAULT] Removing password with id: " + id.toString())
        for (let i = 0; i < this.vaultPasswords.length; i++) {
            if (this.vaultPasswords[i].passwordId == id) {
                this.vaultPasswords.splice(id, 1);
            }
        }

        this.updatedAt = new Date().toISOString();
        this.saveToFile();
        this.sync();
    }

    public editPassword(
        id: number,
        user: string | null,
        password: string | null,
        site: string | null,
        note: string | null,
        category: string | null,
        favorite: boolean | null
    ) {
        printCyan("[VAULT] Editing info of password with id: " + id.toString())

        for (let i = 0; i < this.vaultPasswords.length; i++) {
            if (this.vaultPasswords[i].passwordId == id) {

                let passData: [Uint8Array, Uint8Array, Uint8Array] | null = null
                let userData: [Uint8Array, Uint8Array, Uint8Array] | null = null

                if (password === null) { }
                else {
                    let ivPass = generateRandomIV();
                    let encPassword: GCMEncryptResult = encrypt(this.derivedKey, ivPass, stringToUint8Array(password));
                    passData = [encPassword.ciphertext, ivPass, encPassword.tag];
                }

                if (user === null) { }
                else {
                    let ivUser = generateRandomIV();
                    let encUser: GCMEncryptResult = encrypt(this.derivedKey, ivUser, stringToUint8Array(user));
                    userData = [encUser.ciphertext, ivUser, encUser.tag];
                }

                this.vaultPasswords[i].editPrivate(userData, passData, site, note, category, favorite);
            }
        }

        this.updatedAt = new Date().toISOString();
        this.saveToFile();
        this.sync();

    }

    public getDecryptedPasswords() {
        let passwordsDecrypted:
            {
                id: string;
                site: string;
                username: string;
                password: string;
                note: string;
                category: string;
                favorite: boolean;
                createdAt: string;
                updatedAt: string;
            }[] = []

        for (const password of this.vaultPasswords) {
            passwordsDecrypted.push(password.getAccountInfo(this.derivedKey));
        }

        return passwordsDecrypted
    }

    /**
     * Get vault data formatted for sync with server
     */
    public getVaultForSync(): {
        user: string;
        version: number;
        updatedAt: string;
        data: string;
    } {
        const vaultData = {
            user: this.user,
            version: this.version,
            salt: this.salt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            vault: {
                passwords: this.vaultPasswords.map(p => p.getAsObject())
            }
        };

        return {
            user: this.user,
            version: this.version,
            updatedAt: this.updatedAt,
            data: JSON.stringify(vaultData)
        };
    }

    /**
     * Merge vault from remote server (Last Write Wins strategy)
     */
    public async mergeFromRemote(remoteData: string): Promise<boolean> {
        printCyan("[VAULT] Vault merge started")
        try {
            const remoteVault = JSON.parse(remoteData);

            const remoteDate = new Date(remoteVault.updatedAt);
            const localDate = new Date(this.updatedAt);

            // Only merge if remote is newer
            if (remoteDate <= localDate) {
                return false; // No merge needed
            }

            // Remote is newer - replace local
            this.createdAt = remoteVault.createdAt;
            this.updatedAt = remoteVault.updatedAt;
            this.version = typeof remoteVault.version === 'number'
                ? remoteVault.version
                : parseInt(remoteVault.version) || 1;
            // NOTE: salt is NOT synced - it must remain local for key derivation
            this.vaultPasswords = [];

            // Rebuild passwords from remote
            if (remoteVault.vault && remoteVault.vault.passwords) {
                for (const pw of remoteVault.vault.passwords) {
                    this.vaultPasswords.push(new Password(
                        pw.password_id,
                        pw.data.username,
                        pw.data.username_iv,
                        pw.data.username_tag,
                        pw.data.password,
                        pw.data.password_iv,
                        pw.data.password_tag,
                        pw.metadata.site,
                        pw.metadata.note,
                        pw.metadata.category,
                        pw.metadata.favorite,
                        pw.metadata.created,
                        pw.metadata.updated
                    ));
                }
            }

            // Save merged vault locally (without incrementing version)
            await this.saveToFileWithoutVersionBump();
            return true;
        } catch (error) {
            console.error('Failed to merge from remote:', error);
            return false;
        }
    }

    /**
     * Save to file without incrementing version (used after merge)
     */
    private async saveToFileWithoutVersionBump() {
        const passwords = this.vaultPasswords.map(p => p.getAsObject());

        const userData = {
            user: this.user,
            version: this.version,
            salt: this.salt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            vault: {
                passwords: passwords
            }
        };

        await writeData(userData, this.user + '-vault.json');
    }

    /**
     * Change master password - re-encrypts all passwords with new key
     */
    public async changeMasterPassword(currentPassword: string, newPassword: string): Promise<void> {
        // Get current secret key
        printCyan("[VAULT] Password change from: " + currentPassword + " to " + newPassword)
        const currentSecretKey = await getSecretKey(this.user);
        if (!currentSecretKey) {
            throw new Error('Cannot retrieve secret key');
        }

        // Verify current password by trying to derive key and decrypti
        printCyan("[VAULT] Deriving current key and decrypting passwords")
        const currentKey = await deriveKey(this.salt, currentPassword, currentSecretKey);

        // Test decryption with first password entry if available
        if (this.vaultPasswords.length > 0) {
            try {
                this.vaultPasswords[0].getAccountInfo(currentKey);
            } catch (e) {
                throw new Error('Current password is incorrect');
            }
        }

        // Decrypt all passwords with current key
        const decryptedPasswords = this.vaultPasswords.map(p => p.getAccountInfo(currentKey));

        // Generate new salt for the new password

        const newSalt = generateRandomBytes(32);
        printCyan("[VAULT] Generated new salt " + newSalt)
        printCyan("[VAULT] Deriving new key and encrypting passwords")

        // Derive new key
        const newKey = await deriveKey(newSalt, newPassword, currentSecretKey);

        // Re-encrypt all passwords with new key
        this.vaultPasswords = [];
        for (const dp of decryptedPasswords) {
            const ivPass = generateRandomIV();
            const ivUser = generateRandomIV();
            const encPassword = encrypt(newKey, ivPass, stringToUint8Array(dp.password));
            const encUser = encrypt(newKey, ivUser, stringToUint8Array(dp.username));

            this.vaultPasswords.push(new Password(
                Number(dp.id),
                uint8ArrayToBase64(encUser.ciphertext),
                uint8ArrayToBase64(ivUser),
                uint8ArrayToBase64(encUser.tag),
                uint8ArrayToBase64(encPassword.ciphertext),
                uint8ArrayToBase64(ivPass),
                uint8ArrayToBase64(encPassword.tag),
                dp.site,
                dp.note,
                dp.category,
                dp.favorite,
                dp.createdAt,
                dp.updatedAt
            ));
        }

        // Update salt and derived key
        this.salt = newSalt;
        this.derivedKey = newKey;

        // Regenerate verification token with new key - CRITICAL for login to work
        printCyan("[VAULT] Regenerating verification token")
        this.setVerificationToken()
        // Generate new SRP verifier and update on server
        printCyan("[VAULT] Generating neew SRP verifier")
        const { salt: srpSalt, verifier } = await SRPClient.generateRegistration(newPassword);

        if (this.token) {
            const response = await fetch(`${SERVER_URL}/password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ salt: srpSalt, verifier })
            });

            if (!response.ok) {
                throw new Error('Failed to update password on server');
            }
            console.log('[Vault] SRP credentials updated on server');
        }

        // Save vault with new encryption
        await this.saveToFile();
    }
}


class Password {
    private username: Uint8Array;
    private usernameIV: Uint8Array;
    private usernameTag: Uint8Array;
    public passwordId: number;
    private password: Uint8Array;
    private passwordIV: Uint8Array;
    private passwordTag: Uint8Array;

    private site: string;

    private isFavorite: boolean;
    private note: string;
    private category: string;

    private created: string;
    private updated: string;


    public constructor(passwordId: number,
        username: string,
        usernameIV: string,
        usernameTag: string,
        password: string,
        passwordIV: string,
        passwordTag: string,
        site: string,
        note: string = '',
        category: string = '',
        favorite: boolean = false,
        created: string = new Date().toISOString(),
        updated: string = new Date().toISOString()
    ) {
        this.passwordId = passwordId;
        this.username = base64ToUint8Array(username);
        this.usernameIV = base64ToUint8Array(usernameIV);
        this.usernameTag = base64ToUint8Array(usernameTag);
        this.password = base64ToUint8Array(password);
        this.passwordIV = base64ToUint8Array(passwordIV);
        this.passwordTag = base64ToUint8Array(passwordTag);
        this.site = site;
        this.isFavorite = favorite;
        this.category = category;
        this.note = note;
        this.created = created,
            this.updated = updated
    }

    public getAccountInfo(key: Uint8Array): {
        id: string;
        site: string;
        username: string;
        password: string;
        note: string;
        category: string;
        favorite: boolean;
        createdAt: string;
        updatedAt: string;
    } {

        const objectJSON = {
            id: this.passwordId.toString(),
            site: this.site,
            username: uint8ArrayToString(decrypt(key, this.usernameIV, this.username, this.usernameTag)),
            password: uint8ArrayToString(decrypt(key, this.passwordIV, this.password, this.passwordTag)),
            note: this.note,
            category: this.category,
            favorite: this.isFavorite,
            createdAt: this.created,
            updatedAt: this.updated
        }

        return objectJSON;
    }


    public editPrivate(
        userData: [Uint8Array, Uint8Array, Uint8Array] | null,
        passwordData: [Uint8Array, Uint8Array, Uint8Array] | null,
        site: string | null,
        note: string | null,
        category: string | null,
        favorite: boolean | null
    ) {

        if (userData === null) { }
        else {
            this.username = userData[0];
            this.usernameIV = userData[1];
            this.usernameTag = userData[2];
        }

        if (passwordData === null) { }
        else {
            this.password = passwordData[0];
            this.passwordIV = passwordData[1];
            this.passwordTag = passwordData[2];
        }

        if (site === null) { }
        else {
            this.site = site;
        }

        if (note === null) { }
        else {
            this.note = note;
        }

        if (category === null) { }
        else {
            this.category = category;
        }

        if (favorite === null) { }
        else {
            this.isFavorite = favorite;
        }

        this.updated = new Date().toISOString();
    }


    public getAsObject() {
        const objectJSON = {
            password_id: this.passwordId,
            metadata: {
                site: this.site,
                category: this.category,
                note: this.note,
                favorite: this.isFavorite,
                created: this.created,
                updated: this.updated
            },
            data: {
                username: uint8ArrayToBase64(this.username),
                username_iv: uint8ArrayToBase64(this.usernameIV),
                username_tag: uint8ArrayToBase64(this.usernameTag),
                password: uint8ArrayToBase64(this.password),
                password_iv: uint8ArrayToBase64(this.passwordIV),
                password_tag: uint8ArrayToBase64(this.passwordTag)
            }
        }

        return objectJSON;
    }
}


function checkIfUserExists(user: string): boolean {
    if (!findUserVaultData(user)) {
        return false
    }
    return true
}

function generateRandomIV() {
    const iv = webcrypto.getRandomValues(new Uint8Array(16));
    return iv;
}

export function stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

function stringToBase64(str: string): string {
    return uint8ArrayToBase64(stringToUint8Array(str));
}

function uint8ArrayToString(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const byteArray = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        byteArray[i] = binaryString.charCodeAt(i);
    }

    return byteArray;
}

function base64ToString(base64: string): string {
    return Buffer.from(base64, 'base64').toString('utf8');
}


