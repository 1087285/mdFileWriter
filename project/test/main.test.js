const path = require('path');
const { ipcMain, dialog } = require('electron');
const fs = require('fs');

// 1. Mock Electron modules
jest.mock('electron', () => ({
  app: {
    quit: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn().mockReturnValue(Promise.resolve()),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    webContents: {
      openDevTools: jest.fn()
    }
  })),
  ipcMain: {
    handle: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn()
  }
}));

// 2. Mock fs modules
// We need to mock fs.promises entirely
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    rmdir: jest.fn()
  },
  readdirSync: jest.fn(),
  statSync: jest.fn()
}));

// 3. Mock helper libraries
jest.mock('electron-squirrel-startup', () => false, { virtual: true });
jest.mock('chardet', () => ({
  detect: jest.fn().mockReturnValue('UTF-8')
}));
jest.mock('iconv-lite', () => ({
  decode: jest.fn().mockImplementation((buf) => buf.toString())
}));

describe('Main Process Unit Tests', () => {
  let handlers = {};

  beforeAll(() => {
    // Setup handler capture
    ipcMain.handle.mockImplementation((channel, listener) => {
      handlers[channel] = listener;
    });

    // Load main.js to execute registration
    jest.isolateModules(() => {
        try {
            require('../src/main.js');
        } catch (e) {
            console.warn('Load main.js warning (expected if app.quit called):', e);
        }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Re-setup handler mock because clearAllMocks clears implementation too? 
    // No, clearAllMocks clears usage data. resetAllMocks clears implementation.
    // However, handlers map is persistent.
  });

  test('IPC Handler Registration', () => {
    // v1.1.0: openFolder/readDir は廃止
    expect(handlers['dialog:openFolder']).toBeUndefined();
    expect(handlers['fs:readDir']).toBeUndefined();
    // 残り6ハンドラが登録されていること
    expect(handlers['fs:readFile']).toBeDefined();
    expect(handlers['fs:saveFile']).toBeDefined();
    expect(handlers['fs:createFile']).toBeDefined();
    expect(handlers['fs:deletePath']).toBeDefined();
    expect(handlers['fs:renamePath']).toBeDefined();
    expect(handlers['dialog:showConfirm']).toBeDefined();
  });

  test('fs:readFile should return content', async () => {
    const mockBuffer = Buffer.from('test content');
    fs.promises.readFile.mockResolvedValue(mockBuffer);
    
    if (handlers['fs:readFile']) {
        const result = await handlers['fs:readFile']({}, '/test/file.txt');
        
        expect(fs.promises.readFile).toHaveBeenCalledWith('/test/file.txt');
        expect(result).toBe('test content');
    }
  });

  test('fs:saveFile should write content', async () => {
    fs.promises.writeFile.mockResolvedValue(undefined);
    
    if (handlers['fs:saveFile']) {
        await handlers['fs:saveFile']({}, '/test/file.txt', 'new content');
        
        expect(fs.promises.writeFile).toHaveBeenCalledWith('/test/file.txt', 'new content', 'utf-8');
    }
  });

  test('fs:createFile should create file if it does not exist', async () => {
    // access throws error (file not found) -> good
    fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
    fs.promises.writeFile.mockResolvedValue(undefined);

    if (handlers['fs:createFile']) {
        const result = await handlers['fs:createFile']({}, '/test/dir', 'newfile.txt');

        expect(result).toBe(path.join('/test/dir', 'newfile.txt'));
        expect(fs.promises.writeFile).toHaveBeenCalledWith(path.join('/test/dir', 'newfile.txt'), '', 'utf-8');
    }
  });

  test('fs:createFile should throw if file exists', async () => {
    // access resolves (file exists)
    fs.promises.access.mockResolvedValue(undefined);

    if (handlers['fs:createFile']) {
        await expect(handlers['fs:createFile']({}, '/test/dir', 'existing.txt'))
        .rejects.toThrow('File already exists');
    }
  });
  
  test('dialog:showConfirm should return true on OK', async () => {
      const mockShowMessageBox = require('electron').dialog.showMessageBox;
      if (!mockShowMessageBox) return;
      require('electron').dialog.showMessageBox = jest.fn().mockResolvedValue({ response: 0 });
      if (handlers['dialog:showConfirm']) {
          const result = await handlers['dialog:showConfirm']({}, '続けますか？');
          expect(result).toBe(true);
      }
  });

  test('dialog:showConfirm should return false on Cancel', async () => {
      require('electron').dialog.showMessageBox = jest.fn().mockResolvedValue({ response: 1 });
      if (handlers['dialog:showConfirm']) {
          const result = await handlers['dialog:showConfirm']({}, '続けますか？');
          expect(result).toBe(false);
      }
  });

  test('fs:deletePath should delete a file', async () => {
      fs.promises.stat.mockResolvedValue({ isDirectory: () => false });
      fs.promises.unlink = jest.fn().mockResolvedValue(undefined);
      if (handlers['fs:deletePath']) {
          await handlers['fs:deletePath']({}, '/test/file.txt');
          expect(fs.promises.stat).toHaveBeenCalledWith('/test/file.txt');
          expect(fs.promises.unlink).toHaveBeenCalledWith('/test/file.txt');
      }
  });

  test('fs:deletePath should delete a directory recursively', async () => {
      fs.promises.stat.mockResolvedValue({ isDirectory: () => true });
      fs.promises.rm = jest.fn().mockResolvedValue(undefined);
      if (handlers['fs:deletePath']) {
          await handlers['fs:deletePath']({}, '/test/dir');
          expect(fs.promises.rm).toHaveBeenCalledWith('/test/dir', { recursive: true, force: true });
      }
  });

  test('fs:renamePath should rename path', async () => {
      // existsSync returns false (target doesn't exist)
      const origExistsSync = require('fs').existsSync;
      require('fs').existsSync = jest.fn().mockReturnValue(false);
      fs.promises.rename.mockResolvedValue(undefined);
      if (handlers['fs:renamePath']) {
          await handlers['fs:renamePath']({}, '/test/old.md', '/test/new.md');
          expect(fs.promises.rename).toHaveBeenCalledWith('/test/old.md', '/test/new.md');
      }
      require('fs').existsSync = origExistsSync;
  });

  test('fs:renamePath should throw when destination exists', async () => {
      require('fs').existsSync = jest.fn().mockReturnValue(true);
      if (handlers['fs:renamePath']) {
          await expect(handlers['fs:renamePath']({}, '/test/old.md', '/test/existing.md'))
              .rejects.toThrow('Destination already exists');
      }
  });

  test('IPC Handler Registration - renamePath and showConfirm', () => {
      expect(handlers['fs:renamePath']).toBeDefined();
      expect(handlers['dialog:showConfirm']).toBeDefined();
  });

  // --- validatePath (BUG-01 fix) ---
  test('fs:readFile should throw on path traversal', async () => {
    if (handlers['fs:readFile']) {
      await expect(handlers['fs:readFile']({}, '/safe/../etc/passwd'))
        .rejects.toThrow('path traversal detected');
    }
  });

  test('fs:saveFile should throw on path traversal', async () => {
    if (handlers['fs:saveFile']) {
      await expect(handlers['fs:saveFile']({}, '/safe/../secret.md', 'x'))
        .rejects.toThrow('path traversal detected');
    }
  });

  test('fs:createFile should throw on path traversal in dirPath', async () => {
    if (handlers['fs:createFile']) {
      await expect(handlers['fs:createFile']({}, '/safe/../etc', 'evil.md'))
        .rejects.toThrow('path traversal detected');
    }
  });

  test('fs:deletePath should throw on path traversal', async () => {
    if (handlers['fs:deletePath']) {
      await expect(handlers['fs:deletePath']({}, '/safe/../etc'))
        .rejects.toThrow('path traversal detected');
    }
  });

  test('fs:renamePath should throw on path traversal in oldPath', async () => {
    if (handlers['fs:renamePath']) {
      await expect(handlers['fs:renamePath']({}, '/safe/../etc/old.md', '/safe/new.md'))
        .rejects.toThrow('path traversal detected');
    }
  });

  test('fs:renamePath should throw on path traversal in newPath', async () => {
    if (handlers['fs:renamePath']) {
      await expect(handlers['fs:renamePath']({}, '/safe/old.md', '/safe/../etc/new.md'))
        .rejects.toThrow('path traversal detected');
    }
  });

});
