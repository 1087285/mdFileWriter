// src/renderer/renderer.js

// Import Toast UI Editor
const Editor = toastui.Editor;

// Variables
let editorInstance;
let currentRoot = null;
let currentFilePath = null;
let isUnsaved = false;

// DOM Elements
const folderOpenBtn = document.getElementById('folder-open-btn');
const fileTree = document.getElementById('file-tree');
const editorContainer = document.getElementById('editor-container');
const unsavedIndicator = document.getElementById('unsaved-indicator');
const modeSwitch = document.getElementById('mode-switch');
const btnSave = document.getElementById('btn-save');
const btnNew = document.getElementById('btn-new');
const btnDelete = document.getElementById('btn-delete');
const btnRename = document.getElementById('btn-rename');

/**
 * Initialize Editor
 */
function initEditor() {
    editorInstance = new Editor({
        el: editorContainer,
        height: '100%',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        usageStatistics: false, 
        toolbarItems: [], 
        events: {
            change: () => {
                if (!isUnsaved) setUnsaved(true);
            }
        }
    });
}

function getBasename(filePath) {
    if (!filePath) return 'Untitled';
    return filePath.split(/[\\/]/).pop();
}

function setUnsaved(status) {
    isUnsaved = status;
    unsavedIndicator.style.display = status ? 'inline' : 'none';
    const baseName = getBasename(currentFilePath);
    document.title = (status ? '* ' : '') + baseName + ' - MdFileWriter';
}

/**
 * Tree Building
 */
async function buildTreeItem(entry) {
    const li = document.createElement('li');
    li.title = entry.path;
    li.style.cursor = 'pointer';
    
    // Icon
    const label = document.createElement('span');
    label.textContent = (entry.isDirectory ? '📁 ' : '📄 ') + entry.name;
    li.appendChild(label); // Allow selecting folder too?

    // Mark for selection logic
    label.onclick = async (e) => {
        e.stopPropagation();
        
        // Selection state
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        li.classList.add('selected');

        if (entry.isDirectory) {
            // Toggle Expand
            const ul = li.querySelector('ul');
            if (ul) {
                ul.style.display = ul.style.display === 'none' ? 'block' : 'none';
                if (ul.style.display === 'block' && ul.dataset.loaded !== 'true') {
                    ul.dataset.loaded = 'true';
                    ul.textContent = 'Loading...';
                    try {
                        const children = await window.api.readDir(entry.path);
                        children.sort((a, b) => {
                             if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                             return a.isDirectory ? -1 : 1;
                        });
                        ul.innerHTML = '';
                        for (const child of children) {
                            ul.appendChild(await buildTreeItem(child));
                        }
                    } catch (err) {
                        ul.textContent = 'Error: ' + err.message;
                    }
                }
            }
        } else {
            // File Open
            if (isUnsaved) {
                const ok = await window.api.showConfirm('未保存の変更があります。破棄して開きますか？');
                if (!ok) return;
            }
            loadFile(entry.path);
        }
    };

    if (entry.isDirectory) {
        li.classList.add('folder');
        const ul = document.createElement('ul');
        ul.style.display = 'none';
        li.appendChild(ul);
    }

    return li;
}

async function renderTree(dirPath) {
    fileTree.innerHTML = 'Loading...';
    try {
        const entries = await window.api.readDir(dirPath);
        entries.sort((a, b) => {
             if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
             return a.isDirectory ? -1 : 1;
        });

        const ul = document.createElement('ul');
        ul.className = 'tree';
        for (const entry of entries) {
            ul.appendChild(await buildTreeItem(entry));
        }
        fileTree.innerHTML = '';
        fileTree.appendChild(ul);
    } catch (err) {
        fileTree.innerHTML = 'Error: ' + err.message;
    }
}

/**
 * File Operations
 */
async function loadFile(filePath) {
    try {
        const content = await window.api.readFile(filePath);
        editorInstance.setMarkdown(content);
        // Reset unsaved after loading (setMarkdown might trigger change)
        setTimeout(() => {
            currentFilePath = filePath;
            setUnsaved(false);
        }, 50);
    } catch (err) {
        alert('Load Error: ' + err.message);
    }
}

async function saveFile() {
    if (!currentFilePath) {
        // Implement "Save As" or "New File" logic if needed, but for now alert
        if (currentRoot) {
            // Suggest creating new file?
            alert('既存のファイルを選択するか、新規作成してください。');
        }
        return;
    }
    try {
        const content = editorInstance.getMarkdown();
        await window.api.saveFile(currentFilePath, content);
        setUnsaved(false);
    } catch (err) {
        alert('Save Error: ' + err.message);
    }
}

async function createNewFile() {
    if (!currentRoot) {
        alert('フォルダを開いてください。');
        return;
    }
    // Simple prompt for now (or modal dialog)
    // Using simple prompt (not available in Electron? Renderer can use prompt?)
    // Electron's window.prompt is restricted. We need a custom dialog or IPC.
    // Let's use a simple approach: "Untitled.md" or ask user.
    // Since we don't have prompt dialog implemented in main process yet, 
    // we can try prompt() in renderer (might work depending on setting) or just name it "NewFile_timestamp.md".
    // Or ask calling main process to show input dialog? `dialog` doesn't support prompt input.
    // We will use a JS prompt if available, fallback to default name.
    
    // Note: window.prompt() might be disabled in Electron unless `enableRemoteModule` or similar.
    // Let's assume we create "NewFile.md" and let user rename it.
    let name = 'NewFile.md';
    
    // Find a unique name
    // Just try create. Logic in main handles collision? No, it throws.
    // We need user input.
    // Let's create a minimal custom modal in HTML later?
    // For now: Try "NewFile.md", if exists "NewFile_1.md"...
    
    // Actually, let's use a hack: create file with time
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    name = `NewFile_${timestamp}.md`;
    
    // Where to create? In current selected folder or root?
    // Let's use currentRoot for simplicity or try to find selected folder from UI tree.
    // Finding selected folder from DOM is tricky without state.
    // Use currentRoot.
    
    try {
       const newPath = await window.api.createFile(currentRoot, name);
       await renderTree(currentRoot); // Refresh
       loadFile(newPath);
    } catch(err) {
       alert('New File Error: ' + err.message);
    }
}

async function deleteSelected() {
    const selected = document.querySelector('.selected');
    if (!selected) {
        alert('削除するファイル/フォルダを選択してください。');
        return;
    }
    const path = selected.title; // we stored path in title
    
    const confirm = await window.api.showConfirm(`本当に削除しますか？\n${path}`);
    if (confirm) {
        try {
            await window.api.deletePath(path);
            if (currentFilePath === path) {
                currentFilePath = null;
                editorInstance.setMarkdown('');
                setUnsaved(false);
            }
            // Refresh tree
            await renderTree(currentRoot);
        } catch(err) {
            alert('Delete Error: ' + err.message);
        }
    }
}

async function renameSelected() {
    const selected = document.querySelector('.selected');
    if (!selected) {
        alert('変更するファイル/フォルダを選択してください。');
        return;
    }
    const oldPath = selected.title;
    const oldName = getBasename(oldPath);
    
    // For rename, we really need text input.
    // Since prompt() is unsure, let's use a custom overlay in HTML or just reuse logic.
    // Let's try simple prompt() - if it fails (returns null/undefined or throws), we catch.
    let newName = null;
    try {
        newName = prompt('新しい名前を入力してください:', oldName);
    } catch(e) {
        alert('入力ダイアログを表示できません。');
        return;
    }
    
    if (!newName || newName === oldName) return;
    
    // Construct new path
    // Need parent dir.
    // Assuming separator is platform specific, but here in renderer we might receive mixed.
    // Let's rely on string manipulation for now OR better, pass dir and name to main?
    // But `renamePath` takes full `newPath`.
    // Let's extract dir from `oldPath`.
    // Simple approach: replace last segment
    const separator = oldPath.includes('\\') ? '\\' : '/';
    const parts = oldPath.split(separator);
    parts.pop();
    const dir = parts.join(separator);
    const newPath = dir + separator + newName;
    
    try {
        await window.api.renamePath(oldPath, newPath);
         if (currentFilePath === oldPath) {
             currentFilePath = newPath;
             document.title = getBasename(newPath) + ' - MdFileWriter';
         }
         await renderTree(currentRoot);
    } catch(err) {
        alert('Rename Error: ' + err.message);
    }
}


/**
 * Event Listeners
 */
folderOpenBtn.addEventListener('click', async () => {
    const path = await window.api.openFolder();
    if (path) {
        currentRoot = path;
        renderTree(path);
    }
});

btnSave.addEventListener('click', saveFile);

// New Listeners for File Operations
if (btnNew) btnNew.addEventListener('click', createNewFile);
if (btnDelete) btnDelete.addEventListener('click', deleteSelected);
if (btnRename) btnRename.addEventListener('click', renameSelected);

modeSwitch.addEventListener('change', (e) => {
    editorInstance.changeMode(e.target.value); 
});

// Toolbar
const commandMap = {
    'Bold': () => editorInstance.exec('bold'),
    'Italic': () => editorInstance.exec('italic'),
    'Strike': () => editorInstance.exec('strike'),
    'UL': () => editorInstance.exec('bulletList'),
    'OL': () => editorInstance.exec('orderedList'),
    'HR': () => editorInstance.exec('hr'),
    'Table': () => editorInstance.exec('addTable'),
    'Image': () => editorInstance.exec('addImage'),
    'Link': () => editorInstance.exec('addLink'),
    'Blockquote': () => editorInstance.exec('blockQuote'), 
    'Code': () => editorInstance.exec('code'),
};

document.querySelectorAll('button[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        if (cmd === 'Heading') {
            const level = parseInt(btn.dataset.level, 10) || 1;
            editorInstance.exec('heading', { level: level });
        } else if (commandMap[cmd]) {
            commandMap[cmd]();
        }
        editorInstance.focus();
    });
});

// Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        if (e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveFile();
        }
    }
});

initEditor();
