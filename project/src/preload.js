const { ipcRenderer } = require('electron');

// contextIsolation: false のため window に直接代入（contextBridge 不使用）
window.api = {
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  saveFile: (path, content) => ipcRenderer.invoke('fs:saveFile', path, content),
  createFile: (dir, name) => ipcRenderer.invoke('fs:createFile', dir, name),
  deletePath: (path) => ipcRenderer.invoke('fs:deletePath', path),
  renamePath: (oldPath, newPath) => ipcRenderer.invoke('fs:renamePath', oldPath, newPath),
  showConfirm: (msg) => ipcRenderer.invoke('dialog:showConfirm', msg)
};
