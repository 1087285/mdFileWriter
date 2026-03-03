/**
 * @jest-environment jsdom
 *
 * Integration Test for Renderer Logic
 *
 * Verifies that Renderer UI functions correctly call window.api (Preload/IPC).
 * Uses jest-environment-jsdom.
 */

const path = require('path');

// Mock Toast UI Editor
const mockSetMarkdown = jest.fn();
const mockGetMarkdown = jest.fn();
class MockEditor {
    constructor(options) {
        this.options = options;
        // Simulate change event listener registration
        if (options.events && options.events.change) {
            this.changeHandler = options.events.change;
        }
    }
    setMarkdown(md) { mockSetMarkdown(md); }
    getMarkdown() { return mockGetMarkdown(); }
    exec() {}
}
global.toastui = { Editor: MockEditor };

// Mock Preload API
const mockApi = {
    openFolder: jest.fn(),
    readDir: jest.fn(),
    readFile: jest.fn(),
    saveFile: jest.fn(),
    createFile: jest.fn(),
    deletePath: jest.fn(),
    renamePath: jest.fn(),
    showConfirm: jest.fn()
};

// Setup Globals
// Jest JSDOM sets window as global
// Verify window existence
if (typeof window === 'undefined') {
    // Should not happen with testEnvironment: 'jsdom'
    global.window = {}; // Fallback
}
Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true
});
global.alert = jest.fn();
global.prompt = jest.fn();

// Init DOM
document.body.innerHTML = `
    <button id="folder-open-btn">Open Folder</button>
    <div id="file-tree"></div>
    <div id="editor-container"></div>
    <span id="unsaved-indicator" style="display:none">*</span>
    <button id="btn-save">Save</button>
    <button id="btn-new">New</button>
    <button id="btn-delete">Delete</button>
    <button id="btn-rename">Rename</button>
    <button id="mode-switch">Mode</button>
`;

// Load renderer.js logic
try {
    // Force reload if possible?
    require('../src/renderer/renderer.js');
} catch (e) {
    console.error('Renderer Load Error:', e);
}

describe('Integration: Renderer -> IPC', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('IT-IPC-001: Open Folder -> Render Tree', async () => {
        mockApi.openFolder.mockResolvedValue('/test/root');
        mockApi.readDir.mockResolvedValue([
            { name: 'file1.md', isDirectory: false, path: '/test/root/file1.md' },
            { name: 'subdir', isDirectory: true, path: '/test/root/subdir' }
        ]);

        const btn = document.getElementById('folder-open-btn');
        btn.click();
        
        // Wait for async
        await new Promise(r => setTimeout(r, 50));

        expect(mockApi.openFolder).toHaveBeenCalled();
        expect(mockApi.readDir).toHaveBeenCalledWith('/test/root');
        
        const tree = document.getElementById('file-tree');
        expect(tree.innerHTML).toContain('file1.md');
        expect(tree.innerHTML).toContain('subdir');
    });

    test('IT-IPC-002: Click File -> Load Content', async () => {
        mockApi.readFile.mockResolvedValue('# Hello World');
        
        const labels = document.querySelectorAll('li span');
        let fileLabel;
        for (const l of labels) { 
            if (l.textContent.includes('file1.md')) fileLabel = l; 
        }
        
        expect(fileLabel).toBeDefined();
        fileLabel.click();

        // Increase delay to ensure currentFilePath is set via setTimeout(50) in renderer.js
        await new Promise(r => setTimeout(r, 100));

        expect(mockApi.readFile).toHaveBeenCalledWith('/test/root/file1.md');
        expect(mockSetMarkdown).toHaveBeenCalledWith('# Hello World');
    });

    test('IT-IPC-003: Save File', async () => {
        // Depends on state from IT-IPC-002: currentFilePath must be set.
        // Jest executes tests in order. So if global state persists, this works.
        // If isolateModules() was used or beforeEach reset, it would fail.
        // Here we rely on persistent state of require('../src/renderer/renderer.js').
        
        mockGetMarkdown.mockReturnValue('New Content');
        mockApi.saveFile.mockResolvedValue();

        const btn = document.getElementById('btn-save');
        btn.click();
        
        await new Promise(r => setTimeout(r, 50));
        
        expect(mockApi.saveFile).toHaveBeenCalledWith('/test/root/file1.md', 'New Content');
    });

    test('IT-IPC-005: Delete File', async () => {
         // Select file first
         mockApi.showConfirm.mockResolvedValue(true); 
         mockApi.deletePath.mockResolvedValue();
         mockApi.readDir.mockResolvedValue([]); 

         const btn = document.getElementById('btn-delete');
         btn.click();
         
         await new Promise(r => setTimeout(r, 50));
         
         expect(mockApi.showConfirm).toHaveBeenCalled();
         expect(mockApi.deletePath).toHaveBeenCalledWith('/test/root/file1.md');
    });
});
