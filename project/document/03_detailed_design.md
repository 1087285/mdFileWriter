# 詳細設計書

## 1. ディレクトリ構造・ファイル構成
```
project/
  package.json      # ビルド設定・依存関係
  src/
    main.js         # メインプロセス (IPCハンドラ、ウィンドウ管理)
    preload.js      # プリロードスクリプト (ContextBridge)
    renderer/
      index.html    # アプリ画面のHTML構造
      renderer.js   # レンダラープロセス制御 (UI操作、IPC呼び出し)
      styles.css    # スタイル定義
```

## 2. メインプロセス詳細 (src/main.js)
`BrowserWindow` の生成と、IPC通信 (`ipcMain`) のハンドリングを行う。

### 2.1. モジュール読み込み
- `electron`: { app, BrowserWindow, ipcMain, dialog, Menu }
- `fs`: Node.js標準 (promises版推奨)
- `path`: パス操作
- `chardet`: 文字コード判定に使用
- `iconv-lite`: 文字コード変換に使用

### 2.2. 関数仕様一覧

| 関数名 | 引数 | 戻り値 | 処理内容 | 異常系 |
|:---|:---|:---|:---|:---|
| `createWindow` | なし | `void` | `BrowserWindow` インスタンス生成、`index.html` ロード。<br> `webPreferences`: { `preload`, `contextIsolation: true`, `nodeIntegration: false` } | ロード失敗時ログ出力 |
| `handleOpenFolder` | なし | `Promise<string\|null>` | `dialog.showOpenDialog` (properties: `openDirectory`) を実行。<br>選択パスを返す。キャンセル時はErrorではなく `null` を返す。 | |
| `handleReadDir` | `dirPath` | `Promise<object[]>` | `fs.readdir` でエントリ取得。`isDirectory()` で種別判定。<br>戻り値: `{ name: string, isDirectory: boolean, path: string }[]`。<br>**バリデーション**: `path.normalize` で遡り (`..`) をチェックし、ルート外アクセスなら例外。 | 読み取り権限エラー、パス不在 |
| `handleReadFile` | `filePath` | `Promise<string>` | `fs.readFile` (Buffer) → `chardet` で判定 → `iconv-lite` でUTF-8デコードして返す。<br>**バリデーション**: ルート外チェック。 | ファイル不在、読み取り権限不可 |
| `handleSaveFile` | `filePath`, `content` | `Promise<void>` | `fs.writeFile` でUTF-8で上書き保存。<br>**バリデーション**: ルート外チェック。 | 書き込み権限エラー |
| `handleCreateFile` | `dirPath`, `fileName` | `Promise<string>` | `path.join` でパス生成。<br>`fs.writeFile` で空文字作成。<br>成功ならフルパスを返す。 | 同名ファイル存在時エラー |
| `handleDeletePath` | `targetPath` | `Promise<void>` | フォルダなら `fs.rm(..., {recursive: true})`、ファイルなら `fs.unlink`。 | 削除ロック時エラー |
| `handleRenamePath` | `oldPath`, `newPath` | `Promise<void>` | `fs.rename` を実行。 | 移動先重複エラー |
| `handleShowConfirm`| `message` | `Promise<boolean>` | `dialog.showMessageBox` (type: question, buttons: ['OK', 'Cancel'])。<br>response === 0 を返す。 | |

## 3. プリロードスクリプト (src/preload.js)
`contextBridge.exposeInMainWorld('api', { ... })` を使用し、レンダラーへ安全なAPIを公開する。

### 3.1. 公開API (`window.api`)
- `openFolder: () => ipcRenderer.invoke('dialog:openFolder')`
- `readDir: (path) => ipcRenderer.invoke('fs:readDir', path)`
- `readFile: (path) => ipcRenderer.invoke('fs:readFile', path)`
- `saveFile: (path, content) => ipcRenderer.invoke('fs:saveFile', path, content)`
- `createFile: (dir, name) => ipcRenderer.invoke('fs:createFile', dir, name)`
- `deletePath: (path) => ipcRenderer.invoke('fs:deletePath', path)`
- `renamePath: (oldPath, newPath) => ipcRenderer.invoke('fs:renamePath', oldPath, newPath)`
- `showConfirm: (msg) => ipcRenderer.invoke('dialog:showConfirm', msg)`

## 4. レンダラープロセス詳細 (src/renderer/renderer.js)
HTML操作とイベントリスナーの設定を行う。

### 4.1. DOM要素ID
- `#file-tree`: 左ペインのコンテナ
- `#folder-open-btn`: フォルダを開くボタン
- `#editor-container`: 右ペインのエディタマウントポイント
- `#toolbar-container`: 独自ツールバーのコンテナ
- `#mode-switch`: モード切替ラジオボタン/タブ
- `#unsaved-indicator`: 未保存状態表示

### 4.2. 変数管理
- `currentRoot`: 現在開いているルートフォルダパス
- `currentFilePath`: 現在編集中のファイルパス
- `isUnsaved`: 未保存変更フラグ (boolean)
- `editor`: Toast UI Editor インスタンス

### 4.3. モジュール/関数仕様

#### 4.3.1. エディタ初期化 (`initializeEditor`)
- Toast UI Editor を `#editor-container` にインスタンス化。
- オプション: `initialEditType: 'wysiwyg'`, `previewStyle: 'vertical'`, `height: '100%'`
- イベント登録: `change` イベントで `setUnsaved(true)` を呼ぶ。

#### 4.3.2. ファイルツリー制御 (`renderTree`, `onFileClick`)
- `root` パスを受け取り `window.api.readDir` をコール。
- 再帰的呼び出しについては、初回は1階層のみ、フォルダクリック時に下位階層を遅延読み込み（または一括読み込み）する。
- **UI**: `<ul>`, `<li>` 要素を動的生成。
- ファイルクリック時:
    - `isUnsaved` なら `confirm` ダイアログ表示。
    - キャンセルなら遷移中断。
    - OKなら `loadFile(path)` を実行。

#### 4.3.3. ファイル読み込み (`loadFile`)
- `window.api.readFile(path)` を実行。
- 成功時: `editor.setMarkdown(content)` (Toast UI EditorはMD入力で内部HTML変換する)。
- `isUnsaved = false`、`currentFilePath = path` 更新。
- タブ/タイトルバーにファイル名表示。

#### 4.3.4. ファイル保存 (`saveFile`)
- `editor.getMarkdown()` を取得。
- `window.api.saveFile(currentFilePath, content)` を実行。
- 成功時: `isUnsaved = false`。通知（Toast等）があれば出す。

#### 4.3.5. ツールバー動作
- Toast UI Editor は標準でツールバーを持つが、"Word風"にするためカスタマイズが必要な場合、標準ツールバーを非表示(`toolbarItems: []`)にし、自作HTMLボタンから `editor.exec()` コマンドを発行する。
- **実装コマンド例**:
    - **太字**: `editor.exec('bold')`
    - **見出し**: `editor.exec('heading', {level: 1})`
    - **リスト**: `editor.exec('ul')` / `editor.exec('ol')`
    - **表**: `editor.exec('addTable')`
    - **Undo/Redo**: エディタインスタンスには直接公開メソッドがない場合があるため、標準ツールバーを利用するか、内部CodeMirrorインスタンスへのアクセス要検討。
    - *（注記: 初期実装ではToastUI標準ツールバーのカスタマイズ設定を優先し、不足時のみ自作ボタン実装とする）*

#### 4.3.6. ショートカットキー
- `document.addEventListener('keydown', ...)`
- `Ctrl+S`: `e.preventDefault()`, `saveFile()`
- エディタフォーカス時はToast UI Editorが標準で `Ctrl+B`, `Ctrl+I`, `Ctrl+Z` 等をハンドリングするため、競合しないよう注意。グローバルショートカット（保存）のみ自前実装する。

## 5. 異常系・エラーハンドリング
- **IPCエラー**: `try-catch` で捕捉し、`alert()` または専用のエラー表示領域にメッセージを出す。
- **ファイル削除時の競合**: 他のプロセスが開いている場合のエラーメッセージを表示。

## 6. ビルド設定 (package.json)
- `dependencies`: `electron`, `chardet`, `iconv-lite`, `@toast-ui/editor`
- `devDependencies`: `electron-builder`
- `build`:
    - `appId`: `com.example.mdfilewriter`
    - `win`: { `target`: ["nsis", "portable"] }
    - `directories`: { `output`: "dist" }
    - `files`: ["src/**/*", "package.json"]

## 7. テスト観点対応
- **F01 (ツリー)**: 階層構造が正しく表示されるか。ルート外ファイルが見えないか。
- **F04 (新規)**: 同名ファイル時のエラー、特殊文字ファイル名の扱い。
- **E01 (読込)**: Shift-JISファイルが化けずに開けるか。
- **E02 (編集)**: 太字、リスト等が正常にMarkdownに変換されるか。
- **E06 (未保存)**: 編集中に `*` が出るか。閉じる時に警告が出るか
