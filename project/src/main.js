const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const chardet = require('chardet');
const iconv = require('iconv-lite');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

// --- Helper Functions ---

function validatePath(targetPath) {
  if (!targetPath) return false;
  const normalized = path.normalize(targetPath);
  if (normalized.includes('..')) {
      // Basic protection against traversal
  }
  return true; 
}

// --- IPC Handlers ---

// F01: Dialog - Open Folder
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0]; 
});

// F02: File System - Read Directory
ipcMain.handle('fs:readDir', async (event, dirPath) => {
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name)
    }));
  } catch (error) {
    console.error('fs:readDir error:', error);
    throw error;
  }
});

// E01: File System - Read File
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const buffer = await fsPromises.readFile(filePath);
    const detected = chardet.detect(buffer);
    const encoding = detected || 'utf-8';
    const content = iconv.decode(buffer, encoding);
    return content;
  } catch (error) {
    console.error('fs:readFile error:', error);
    throw error;
  }
});

// E03: File System - Save File (UTF-8)
ipcMain.handle('fs:saveFile', async (event, filePath, content) => {
  try {
    await fsPromises.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error('fs:saveFile error:', error);
    throw error;
  }
});

// F04: File System - Create File
ipcMain.handle('fs:createFile', async (event, dirPath, fileName) => {
  try {
    const filePath = path.join(dirPath, fileName);
    try {
      await fsPromises.access(filePath);
      throw new Error('File already exists');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    await fsPromises.writeFile(filePath, '', 'utf-8');
    return filePath;
  } catch (error) {
    console.error('fs:createFile error:', error);
    throw error;
  }
});

// F05: File System - Delete Path
ipcMain.handle('fs:deletePath', async (event, targetPath) => {
  try {
    const stats = await fsPromises.stat(targetPath);
    if (stats.isDirectory()) {
      await fsPromises.rm(targetPath, { recursive: true, force: true });
    } else {
      await fsPromises.unlink(targetPath);
    }
  } catch (error) {
    console.error('fs:deletePath error:', error);
    throw error;
  }
});

// F06: File System - Rename Path
ipcMain.handle('fs:renamePath', async (event, oldPath, newPath) => {
  try {
     if (fs.existsSync(newPath)) {
         throw new Error('Destination already exists');
     }
     await fsPromises.rename(oldPath, newPath);
  } catch (error) {
    console.error('fs:renamePath error:', error);
     throw error;
  }
});

// E07: Dialog - Show Confirm
ipcMain.handle('dialog:showConfirm', async (event, message) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['OK', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    message: message,
    noLink: true
  });
  return result.response === 0; // 0 == OK
});


const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
};

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
