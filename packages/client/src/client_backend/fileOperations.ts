import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { printGray } from './prints';


export function findUserVaultData(targetUser: string): string {
    printGray("[FILE] Looking for vault data of user: " + targetUser)
    const baseDir = getBaseDirectory();
    ensureDirectory(baseDir);

    let newestMatch: string = "";

    try {
            const filePath = path.join(baseDir, targetUser + '-vault.json');

            try {
                if(fs.existsSync((filePath)))
        {
                const content = fs.readFileSync(filePath, 'utf-8');
                newestMatch = content;    
            }

            } catch (parseError) {
                console.warn(`Failed to parse JSON in ${filePath}:`, parseError);
            }
    } catch (err) {
        console.error('Error reading base directory:', err);
    }
    
    printGray("[FILE] Returning vaults data")
    console.log(newestMatch)
    return newestMatch;
}
// These are now computed lazily inside functions
const getBaseDirectory = (): string => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, '.vaults');
};

function ensureDirectory(directoryPath: string): void {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    } else {
    }
}

function ensureFileExistence(filePath: string): void {
    const dirname = path.dirname(filePath);
    ensureDirectory(dirname);

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}), 'utf-8');
    }
}

export async function writeData(data: any,filename: string = 'output.json'): Promise<void> {
    printGray("[FILE] Writing data")
    console.log(JSON.stringify(data,null,2) + "\nto file: " + filename)
    const baseDir = getBaseDirectory();
    ensureDirectory(baseDir);

    let directoryPath = baseDir;

    const filePath = path.join(directoryPath, filename);

    ensureFileExistence(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readData(filename: string = 'output.json'): Promise<any> {
    printGray("[FILE] Reading data from file: " + filename)
    const baseDir = getBaseDirectory();
    ensureDirectory(baseDir);

    let filePath = path.join(baseDir,filename);
    console.log(filePath);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
            printGray("[FILE] Read data")
            console.log(content)
            return JSON.parse(content);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            return {};
        }
    } else {
        console.warn('File not found:', filePath);
        return {};  // Better to return empty object than stringified one
    }
}



export async function writeDataBuffer(
  data: any,
  filename: string = 'output.json',
): Promise<void> {
    printGray("[FILE] Writing data buffer")
    console.log(JSON.stringify(data,null,2) + "\nto file: " + filename)
  const baseDir = getBaseDirectory();
  ensureDirectory(baseDir);

  const directoryPath = baseDir;

  ensureDirectory(directoryPath);

  const filePath = path.join(directoryPath, filename);

  let buffer: Buffer;

  if (Buffer.isBuffer(data)) {
    buffer = data;
  } else if (typeof data === 'string') {
    // Convert string to buffer
    buffer = Buffer.from(data, 'utf-8');
  } else {
    // Assume JSON-serializable object
    buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  fs.writeFileSync(filePath, buffer);
}

export async function readDataBuffer(
  filename: string = 'output.json',
): Promise<Buffer> {
    printGray("[FILE] Reading data buffer from file: " + filename)
  const baseDir = getBaseDirectory();
  ensureDirectory(baseDir);

  let filePath = path.join(baseDir, filename);

  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath); // <-- returns Buffer
  } else {
    console.warn('File not found:', filePath);
    return Buffer.alloc(0); // safe empty buffer
  }
}

