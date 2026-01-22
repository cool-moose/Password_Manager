import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import { register, login, getVaultData, addVaultEntry, removeVaultEntry, editVaultEntry, sync, exportToCSV, importFromCSV, changeMasterPassword } from '../client_backend/accountOperations';
import { initSRP } from '../../../shared/src/srp';
import { ipcMain } from 'electron';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const wasmPath = path.resolve(__dirname, '../../../../packages/shared/src/wasm/pkg/wasm_crypto_bg.wasm');
if (fs.existsSync(wasmPath)) {
  const wasmBuffer = fs.readFileSync(wasmPath);
  initSRP(wasmBuffer).then(() => console.log("WASM Initialized in Main Process"))
    .catch(err => console.error("Failed to initialize WASM:", err));
} else {
  console.error("WASM file not found in Main:", wasmPath);
}

process.env.DIST = path.join(__dirname, '../../dist')

process.env.DIST = path.join(__dirname, '../../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.PUBLIC || '', 'electron-vite.svg'),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'))
  }
}

app.on('window-all-closed', () => {
  win = null
})


app.whenReady().then(() => {
  ipcMain.handle('register', (event, user, masterPassword) => {
    return register(user, masterPassword)
  })

  ipcMain.handle('login', (event, user, masterPassword) => {
    return login(user, masterPassword)
  })


  ipcMain.handle('get-vault-data', () => {
    return getVaultData();
  })


  ipcMain.handle('add-vault-entry', (event,
    site,
    username,
    password,
    note,
    category,
    favorite,
  ) => {
    return addVaultEntry(site, username, password, note, category, favorite)
  })

  ipcMain.handle('remove-vault-entry', (event,
    id,
  ) => {
    return removeVaultEntry(id)
  })


  ipcMain.handle('edit-vault-entry', (event,
    id,
    username,
    password,
    site,
    note,
    category,
    favorite,
  ) => {
    return editVaultEntry(id, username, password, site, note, category, favorite);
  })

  ipcMain.handle('sync', () => {
    return sync();
  });

  ipcMain.handle('export-csv', () => {
    return exportToCSV();
  });

  ipcMain.handle('import-csv', (event, csvContent: string) => {
    return importFromCSV(csvContent);
  });

  ipcMain.handle('change-master-password', (event, currentPassword: string, newPassword: string) => {
    return changeMasterPassword(currentPassword, newPassword);
  });

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
