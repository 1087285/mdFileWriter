const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
// const chardet = require('chardet'); // In a real env, install via npm

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('fs:getTree', async (event, dirPath) => {
    // Simplified flat list for demo, in real life parsing recursive tree
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      return items.filter(i => i.isFile() && i.name.endsWith('.md')).map(i => ({
        name: i.name,
        path: path.join(dirPath, i.name),
        isDirectory: i.isDirectory()
      }));
    } catch (e) {
      return [];
    }
  });

  ipcMain.handle('fs:readFile', async (event, filePath) => {
    const raw = await fs.readFile(filePath);
    // Simple mock form of chardet. Normally: chardet.detect(raw)
    return raw.toString('utf-8'); 
  });

  ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
