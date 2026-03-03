const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  saveFile: (path, content) => ipcRenderer.invoke('fs:saveFile', path, content),
  createFile: (dir, name) => ipcRenderer.invoke('fs:createFile', dir, name),
  deletePath: (path) => ipcRenderer.invoke('fs:deletePath', path),
  renamePath: (oldPath, newPath) => ipcRenderer.invoke('fs:renamePath', oldPath, newPath),
  showConfirm: (msg) => ipcRenderer.invoke('dialog:showConfirm', msg)
});
