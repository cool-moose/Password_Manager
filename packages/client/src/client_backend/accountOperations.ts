import { Vault } from "./vault";
import { SRPClient } from "../../../shared/src/srp";
import {printGreen} from "./prints";

const SERVER_URL = 'http://localhost:3000';
let vault: Vault | null = null;

export async function register(username: string, masterKey: string): Promise<void> {
    printGreen("\n[REGISTER] Starting registration process for user: " + username + " identified by: " + masterKey);
    // 1. generate srp identity
    printGreen("[REGISTER] Generating SRP identity");
    const { salt, verifier } = await SRPClient.generateRegistration(masterKey);

    printGreen("[REGISTER] Registering identity with server")
    // 2. send to server
    await fetch(`${SERVER_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, salt, verifier })
    });

    printGreen("[REGISTER] Creating new vault")

    vault = new Vault(username);
    await vault.factory(masterKey, true);
}

export async function login(username: string, masterKey: string): Promise<void> {
    // 1. SRP Handshake
    printGreen("\n[LOGIN] Starting login proces for user: " + username + " identified by: " + masterKey);
    printGreen("[LOGIN] Initiating SRP handshake")
    const { a, A } = await SRPClient.generateEphemeral();

    // Login Init
    const initRes = await fetch(`${SERVER_URL}/login/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, A })
    });

    if (!initRes.ok) throw new Error("User not found or login failed");
    const { salt, B } = await initRes.json();

    // Compute Proof
    const { M1, M2: expectedM2 } = await SRPClient.computeSession(salt, username, masterKey, a, B);

    // Login Verify
    const verifyRes = await fetch(`${SERVER_URL}/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, A, M1 })
    });

    if (!verifyRes.ok) throw new Error("Incorrect password");
    const { M2, token } = await verifyRes.json();

    if (M2 !== expectedM2) {
        throw new Error("Server verification failed (M2 mismatch) - Possible Man-in-the-Middle attack!");
    }

    if (!token) throw new Error("No token returned");

    // 2. Open Vault
    printGreen("[LOGIN] Opening user vault")
    vault = new Vault(username);
    await vault.factory(masterKey, false);


    // 3. Set Token and Sync
    printGreen("[LOGIN] Syncing user vault")
    vault.setToken(token);
    await vault.sync();
}

export async function getVaultData() {
    if (vault) {
        let data = vault.getDecryptedPasswords();
        return data;
    }
}

export async function addVaultEntry(
    site: string,
    username: string,
    password: string,
    note: string,
    category: string,
    favorite: boolean,
): Promise<void> {
    console.log("\n")
    if (vault) {
        await vault.addPassword(username, password, site, note, category, favorite)
        await vault.sync(); // Auto-sync on add
    }
}

export function removeVaultEntry(id: string) {
    console.log("\n")
    if (vault) {
        vault.removePassword(Number(id));
        vault.sync(); // Auto-sync
    }
}

export function editVaultEntry(
    id: string,
    username: string | null,
    password: string | null,
    site: string | null,
    note: string | null,
    category: string | null,
    favorite: boolean | null,
): void {
    console.log("\n")
    if (vault) {
        vault.editPassword(Number(id), username, password, site, note, category, favorite);
        vault.sync(); // Auto-sync
    }
}

export async function sync() {
    console.log("\n")
    printGreen("[SYNC] Vault synchronization")
    if (vault) {
        return vault.sync();
    }
}

// Export vault to CSV format
export async function exportToCSV(): Promise<string> {
    console.log("\n")
    if (!vault) {
        throw new Error('No vault loaded');
    }

    const passwords = vault.getDecryptedPasswords();

    // CSV header
    const header = 'site,username,password,note,category,favorite,createdAt,updatedAt';

    // CSV rows - escape fields properly
    const escapeCSV = (field: string): string => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    };

    const rows = passwords.map(p =>
        [
            escapeCSV(p.site),
            escapeCSV(p.username),
            escapeCSV(p.password),
            escapeCSV(p.note),
            escapeCSV(p.category),
            p.favorite ? 'true' : 'false',
            p.createdAt,
            p.updatedAt
        ].join(',')
    );

    return [header, ...rows].join('\n');
}

// Import passwords from CSV
export async function importFromCSV(csvContent: string): Promise<{ imported: number; errors: number }> {
    console.log("\n")
    if (!vault) {
        throw new Error('No vault loaded');
    }

    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
    }

    // Skip header
    const dataLines = lines.slice(1);

    let imported = 0;
    let errors = 0;

    for (const line of dataLines) {
        try {
            // Simple CSV parsing (handles basic quoted fields)
            const fields: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    fields.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            fields.push(current);

            if (fields.length < 4) {
                errors++;
                continue;
            }

            const [site, username, password, note = '', category = '', favoriteStr = 'false'] = fields;
            const favorite = favoriteStr.toLowerCase() === 'true';

            await vault.addPassword(username, password, site, note, category, favorite);
            imported++;
        } catch (e) {
            console.error('[Import] Error importing row:', e);
            errors++;
        }
    }

    return { imported, errors };
}

// Change master password
export async function changeMasterPassword(
    currentPassword: string,
    newPassword: string
): Promise<{ success: boolean; message: string }> {
    console.log("\n")
    if (!vault) {
        return { success: false, message: 'No vault loaded' };
    }

    try {
        await vault.changeMasterPassword(currentPassword, newPassword);
        return { success: true, message: 'Master password changed successfully' };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to change password'
        };
    }
}
