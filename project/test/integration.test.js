/**
 * @jest-environment jsdom
 *
 * Integration Test for Renderer Logic (v1.1.0 D&D方式対応)
 *
 * Verifies that Renderer UI functions correctly call window.api (Preload/IPC).
 * Uses jest-environment-jsdom.
 */

const path = require('path');

// Mock Toast UI Editor via require (v1.1.1: renderer.js は require('@toast-ui/editor') を使用)
// jest.mock はホイスティングされるためファクトリ内で完結させ、MockEditor はrequire経由で取得する
jest.mock('@toast-ui/editor', () => {
    const MockEditorCtor = jest.fn().mockImplementation(function(options) {
        MockEditorCtor.lastInstance = this;
        MockEditorCtor.lastOptions = options;
        this._changeHandler = (options && options.events && options.events.change) || null;
        this.setMarkdown = jest.fn();
        this.getMarkdown = jest.fn();
        this.exec = jest.fn();
        this.changeMode = jest.fn();
    });
    MockEditorCtor.lastInstance = null;
    MockEditorCtor.lastOptions = null;
    return MockEditorCtor;
}, { virtual: true });

// jest.mock後にrequireしてMockEditorCtorへの参照を取得
const MockEditorCtor = require('@toast-ui/editor');

// Mock Preload API (v1.1.0: openFolder/readDir なし)
const mockApi = {
    readFile: jest.fn(),
    saveFile: jest.fn(),
    createFile: jest.fn(),
    deletePath: jest.fn(),
    renamePath: jest.fn(),
    showConfirm: jest.fn()
};

Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true
});
global.alert = jest.fn();
global.prompt = jest.fn();

// Init DOM (v1.1.0: #drop-zone, #drop-filename)
document.body.innerHTML = `
    <div id="drop-zone">
        <p>📄 MDファイルをここに<br>ドラッグ＆ドロップ</p>
        <p id="drop-filename"></p>
    </div>
    <div id="editor-container"></div>
    <span id="unsaved-indicator" style="display:none">*</span>
    <button id="btn-save">Save</button>
    <button id="btn-new">New</button>
    <button id="btn-delete">Delete</button>
    <button id="btn-rename">Rename</button>
    <select id="mode-switch">
        <option value="wysiwyg">WYSIWYG</option>
        <option value="markdown">Markdown</option>
    </select>
`;

// Load renderer.js
try {
    require('../src/renderer/renderer.js');
} catch (e) {
    console.error('Renderer Load Error:', e);
}

// Helper: D&Dイベントを発生させる
function createDropEvent(fileName, filePath) {
    const event = new Event('drop', { bubbles: true });
    event.preventDefault = jest.fn();
    event.dataTransfer = {
        files: [{ name: fileName, path: filePath }]
    };
    return event;
}

function createDragoverEvent() {
    const event = new Event('dragover', { bubbles: true });
    event.preventDefault = jest.fn();
    return event;
}

describe('Integration: Renderer v1.1.0 D&D方式', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('IT-DND-001: .mdファイルをD&DするとloadFileが呼ばれエディタに表示される', async () => {
        mockApi.readFile.mockResolvedValue('# Hello World');

        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('test.md', '/path/to/test.md');
        dropZone.dispatchEvent(dropEvent);

        await new Promise(r => setTimeout(r, 100));

        expect(mockApi.readFile).toHaveBeenCalledWith('/path/to/test.md');
        expect(MockEditorCtor.lastInstance.setMarkdown).toHaveBeenCalledWith('# Hello World');

        const dropFilename = document.getElementById('drop-filename');
        expect(dropFilename.textContent).toBe('test.md');
    });

    test('IT-DND-002: .md以外のファイルをD&DするとalertでエラーになりreadFileは呼ばれない', async () => {
        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('image.png', '/path/to/image.png');
        dropZone.dispatchEvent(dropEvent);

        await new Promise(r => setTimeout(r, 50));

        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('.md'));
        expect(mockApi.readFile).not.toHaveBeenCalled();
    });

    test('IT-DND-003: 未保存時にD&Dすると確認ダイアログが出る（Cancelで読み込まない）', async () => {
        mockApi.showConfirm.mockResolvedValue(false);

        // 未保存状態にする
        const editorInst = MockEditorCtor.lastInstance;
        if (editorInst && editorInst._changeHandler) {
            editorInst._changeHandler();
        }
        await new Promise(r => setTimeout(r, 50));

        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('other.md', '/path/to/other.md');
        dropZone.dispatchEvent(dropEvent);

        await new Promise(r => setTimeout(r, 100));

        expect(mockApi.showConfirm).toHaveBeenCalled();
        expect(mockApi.readFile).not.toHaveBeenCalled();
    });

    test('IT-IPC-003: 保存ボタン押下でsaveFileが呼ばれる', async () => {
        // currentFilePathを設定するためにD&Dしてファイルを開く
        mockApi.readFile.mockResolvedValue('# Save Test');
        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('save.md', '/path/to/save.md');
        mockApi.showConfirm.mockResolvedValue(true); // 未保存確認OK
        dropZone.dispatchEvent(dropEvent);
        await new Promise(r => setTimeout(r, 100));

        jest.clearAllMocks();
        MockEditorCtor.lastInstance.getMarkdown.mockReturnValue('# Save Test Updated');
        mockApi.saveFile.mockResolvedValue();

        const btn = document.getElementById('btn-save');
        btn.click();

        await new Promise(r => setTimeout(r, 50));

        expect(mockApi.saveFile).toHaveBeenCalledWith('/path/to/save.md', '# Save Test Updated');
    });

    test('IT-IPC-004: 新規作成ボタン押下でcreateFileが呼ばれる', async () => {
        mockApi.createFile.mockResolvedValue('/path/to/NewFile_xxx.md');
        mockApi.readFile.mockResolvedValue('');

        const btn = document.getElementById('btn-new');
        btn.click();

        await new Promise(r => setTimeout(r, 100));

        expect(mockApi.createFile).toHaveBeenCalled();
    });

    test('IT-IPC-005: 削除ボタン押下でdeletePathが呼ばれる', async () => {
        // IT-IPC-004 で新規作成 → currentFilePath が NewFile になっているので再度 D&D でファイルを開く
        mockApi.readFile.mockResolvedValue('# Delete Test');
        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('delete.md', '/path/to/delete.md');
        mockApi.showConfirm.mockResolvedValue(true);
        dropZone.dispatchEvent(dropEvent);
        await new Promise(r => setTimeout(r, 100));

        jest.clearAllMocks();
        mockApi.showConfirm.mockResolvedValue(true);
        mockApi.deletePath.mockResolvedValue();

        const btn = document.getElementById('btn-delete');
        btn.click();

        await new Promise(r => setTimeout(r, 50));

        expect(mockApi.showConfirm).toHaveBeenCalled();
        expect(mockApi.deletePath).toHaveBeenCalledWith('/path/to/delete.md');
    });

    test('IT-IPC-006: リネームボタン押下でrenamePathが呼ばれる', async () => {
        // ファイルを再度開く
        mockApi.readFile.mockResolvedValue('# Rename Test');
        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('rename.md', '/path/to/rename.md');
        mockApi.showConfirm.mockResolvedValue(true);
        dropZone.dispatchEvent(dropEvent);
        await new Promise(r => setTimeout(r, 100));

        jest.clearAllMocks();
        global.prompt = jest.fn().mockReturnValue('renamed.md');
        mockApi.renamePath.mockResolvedValue();

        const btn = document.getElementById('btn-rename');
        btn.click();

        await new Promise(r => setTimeout(r, 50));

        expect(mockApi.renamePath).toHaveBeenCalledWith(
            '/path/to/rename.md',
            expect.stringContaining('renamed.md')
        );
    });

    test('IT-STATE-001: 編集変更で未保存インジケータが表示される', async () => {
        const unsaved = document.getElementById('unsaved-indicator');

        const editorInst = MockEditorCtor.lastInstance;
        expect(editorInst).not.toBeNull();
        if (editorInst && editorInst._changeHandler) {
            editorInst._changeHandler();
        }

        await new Promise(r => setTimeout(r, 50));

        expect(unsaved.style.display).toBe('inline');
    });
});

// ----------------------------------------------------------------
// v1.2.0: preprocessMarkdown（trailing-space改行）対応テスト
// ----------------------------------------------------------------
describe('Integration: preprocessMarkdown v1.2.0 trailing-space改行対応', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // 未保存状態でD&Dしても確認をスキップできるように設定
        mockApi.showConfirm.mockResolvedValue(true);
    });

    test('IT-MD-001: trailing-space 2個を含む行を読み込むとき、setMarkdown がバックスラッシュ改行に変換して呼ばれること', async () => {
        // CommonMark: "line A  \n" はバックスラッシュ改行（CommonMark §6.7）に変換される
        const input = 'line A  \nline B';
        mockApi.readFile.mockResolvedValue(input);

        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('trailing2.md', '/path/to/trailing2.md');
        dropZone.dispatchEvent(dropEvent);

        await new Promise(r => setTimeout(r, 100));

        // 2スペース以上の trailing-space はバックスラッシュ改行（\<newline>）に変換されること
        expect(MockEditorCtor.lastInstance.setMarkdown).toHaveBeenCalledWith('line A\\\nline B');
    });

    test('IT-MD-002: trailing-space 3個以上もバックスラッシュ改行に変換されて setMarkdown が呼ばれること', async () => {
        // 3スペース → バックスラッシュ改行に変換される
        const input = 'line A   \nline B';
        mockApi.readFile.mockResolvedValue(input);

        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('trailing3.md', '/path/to/trailing3.md');
        dropZone.dispatchEvent(dropEvent);

        await new Promise(r => setTimeout(r, 100));

        expect(MockEditorCtor.lastInstance.setMarkdown).toHaveBeenCalledWith('line A\\\nline B');
    });

    test('IT-MD-003: trailing-space なしの通常Markdownは前処理で変化しないこと', async () => {
        const input = '# Title\nline A\nline B';
        mockApi.readFile.mockResolvedValue(input);

        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('notrailing.md', '/path/to/notrailing.md');
        dropZone.dispatchEvent(dropEvent);

        await new Promise(r => setTimeout(r, 100));

        expect(MockEditorCtor.lastInstance.setMarkdown).toHaveBeenCalledWith('# Title\nline A\nline B');
    });

    test('IT-MD-004: 複数行で trailing-space が混在するとき、全行にバックスラッシュ改行変換が適用されること', async () => {
        // line A: 2スペース → バックスラッシュ改行
        // line B: 5スペース → バックスラッシュ改行
        // line C: スペースなし → 変化なし
        const input = 'line A  \nline B     \nline C';
        mockApi.readFile.mockResolvedValue(input);

        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('multitrailing.md', '/path/to/multitrailing.md');
        dropZone.dispatchEvent(dropEvent);

        await new Promise(r => setTimeout(r, 100));

        expect(MockEditorCtor.lastInstance.setMarkdown).toHaveBeenCalledWith('line A\\\nline B\\\nline C');
    });
});

// ----------------------------------------------------------------
// v1.5.0: customHTMLRenderer 削除確認・バックスラッシュ改行方式（不具合 #2/#3 対応）
// ----------------------------------------------------------------
describe('Integration: preprocessMarkdown v1.5.0 不具合#2/#3再対応', () => {

    test('IT-MD-005: Editor コンストラクタに customHTMLRenderer が含まれないこと（v1.4.0で削除）', () => {
        const options = MockEditorCtor.lastOptions;
        expect(options).toBeDefined();
        expect(options.customHTMLRenderer).toBeUndefined();
    });

    test('IT-MD-006: trailing-space 1個の行末はバックスラッシュ改行に変換されず setMarkdown に渡されること', async () => {
        // スペース1個の行末は CommonMark の強制改行ではない（変換しない）
        const input = 'line A \nline B';
        mockApi.readFile.mockResolvedValue(input);

        const dropZone = document.getElementById('drop-zone');
        const dropEvent = createDropEvent('singlespace.md', '/path/to/singlespace.md');
        dropZone.dispatchEvent(dropEvent);

        await new Promise(r => setTimeout(r, 100));

        expect(MockEditorCtor.lastInstance.setMarkdown).toHaveBeenCalledWith('line A \nline B');
    });
});
