
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('electronAPI', {
  register: (user: string, masterPassword: string) => ipcRenderer.invoke('register', user, masterPassword),
  login: (user: string, masterPassword: string) => ipcRenderer.invoke('login', user, masterPassword),
  getvaultdata: () => ipcRenderer.invoke('get-vault-data'),
  addvaultentry: (
    site: string,
    username: string,
    password: string,
    note: string,
    category: string,
    favorite: boolean,
  ) => ipcRenderer.invoke('add-vault-entry', site, username, password, note, category, favorite),
  removevaultentry: (id: string) => ipcRenderer.invoke('remove-vault-entry', id),
  editvaultentry: (
    id: string,
    username: string | null,
    password: string | null,
    site: string | null,
    note: string | null,
    category: string | null,
    favorite: boolean | null,
  ) => ipcRenderer.invoke('edit-vault-entry', id, username, password, site, note, category, favorite),
  sync: () => ipcRenderer.invoke('sync'),
  exportCSV: () => ipcRenderer.invoke('export-csv'),
  importCSV: (csvContent: string) => ipcRenderer.invoke('import-csv', csvContent),
  changeMasterPassword: (currentPassword: string, newPassword: string) => ipcRenderer.invoke('change-master-password', currentPassword, newPassword)
})

function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      parent.removeChild(child)
    }
  },
}

function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
