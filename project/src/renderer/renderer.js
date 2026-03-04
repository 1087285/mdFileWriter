// src/renderer/renderer.js

// Import Toast UI Editor via Node.js require (nodeIntegration: true)
const Editor = require('@toast-ui/editor');

// Variables
let editorInstance;
let currentFilePath = null;
let isUnsaved = false;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const dropFilename = document.getElementById('drop-filename');
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
 * D&D File Open
 */
function setupDropZone() {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (!file.name.endsWith('.md')) {
            alert('MDファイル（.md）のみ開けます。');
            return;
        }
        if (isUnsaved) {
            const ok = await window.api.showConfirm('未保存の変更があります。破棄して開きますか？');
            if (!ok) return;
        }
        loadFile(file.path);
    });
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
            if (dropFilename) dropFilename.textContent = getBasename(filePath);
            setUnsaved(false);
        }, 50);
    } catch (err) {
        alert('Load Error: ' + err.message);
    }
}

async function saveFile() {
    if (!currentFilePath) {
        alert('ファイルが開かれていません。MDファイルをドロップして開いてください。');
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
    if (!currentFilePath) {
        alert('先にMDファイルをドロップして開いてください。同じフォルダに新規作成します。');
        return;
    }
    // 現在のファイルと同じフォルダに作成する
    const separator = currentFilePath.includes('\\') ? '\\' : '/';
    const dirPath = currentFilePath.split(separator).slice(0, -1).join(separator);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `NewFile_${timestamp}.md`;
    try {
        const newPath = await window.api.createFile(dirPath, name);
        loadFile(newPath);
    } catch(err) {
        alert('New File Error: ' + err.message);
    }
}

async function deleteSelected() {
    if (!currentFilePath) {
        alert('削除するファイルが開かれていません。');
        return;
    }
    const confirmed = await window.api.showConfirm(`本当に削除しますか？\n${currentFilePath}`);
    if (confirmed) {
        try {
            await window.api.deletePath(currentFilePath);
            currentFilePath = null;
            editorInstance.setMarkdown('');
            if (dropFilename) dropFilename.textContent = '';
            setUnsaved(false);
        } catch(err) {
            alert('Delete Error: ' + err.message);
        }
    }
}

async function renameSelected() {
    if (!currentFilePath) {
        alert('名前変更するファイルが開かれていません。');
        return;
    }
    const oldName = getBasename(currentFilePath);
    let newName = null;
    try {
        newName = prompt('新しい名前を入力してください:', oldName);
    } catch(e) {
        alert('入力ダイアログを表示できません。');
        return;
    }
    if (!newName || newName === oldName) return;
    const separator = currentFilePath.includes('\\') ? '\\' : '/';
    const parts = currentFilePath.split(separator);
    parts.pop();
    const dir = parts.join(separator);
    const newPath = dir + separator + newName;
    try {
        await window.api.renamePath(currentFilePath, newPath);
        currentFilePath = newPath;
        if (dropFilename) dropFilename.textContent = getBasename(newPath);
        document.title = getBasename(newPath) + ' - MdFileWriter';
    } catch(err) {
        alert('Rename Error: ' + err.message);
    }
}


/**
 * Event Listeners
 */
setupDropZone();
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
// dropZone を初期化
if (dropFilename) dropFilename.textContent = '';
