# 詳細設計書

| 版数 | 更新日 | 変更概要 |
|------|------------|------------------------------------------|
| 1.0.0 | 2026-03-03 | 初版作成（基本設計 v1.0.0 対応） |
| 1.1.0 | 2026-03-03 | MDファイルD&D方式に変更。`dialog:openFolder`/`fs:readDir`廃止、ツリー関連実装廃止 |
| 1.1.1 | 2026-03-04 | `contextIsolation: false` / `nodeIntegration: true` に修正。renderer.js の `require('@toast-ui/editor')` を有効化。本アプリは完全ローカル動作・外部URLナビゲーションなしのため許容（prosemirror依存パッケージがESM専用ビルドのみでscriptTag UMD方式が不可のため） |
| 1.2.0 | 2026-03-04 | CommonMark準拠対応。`preprocessMarkdown()`関数仕様を追加。`loadFile`に前処理呼び出しを追加。ツールバーにタスクリストコマンドを追加（基本設計 v1.2.0 対応） |
| 1.3.0 | 2026-03-04 | 不具合 #2 対応。`initializeEditor` に `customHTMLRenderer.hardBreak` 仕様を追加し、WYSIWYG上でのtrailing-space改行（`<br>`）レンダリングを確定仕様化。`preprocessMarkdown` 仕様の "実装工程で確定" 記述を削除し確定仕様に改訂 |
| 1.4.0 | 2026-03-04 | 不具合 #2 再対応。Windows実機で v1.3.0 修正（customHTMLRenderer.hardBreak）が WYSIWYG に有効でないことを確認。`customHTMLRenderer.hardBreak` を削除し、`preprocessMarkdown` で `  \n` → `<br>\n` 変換後に `setMarkdown()` へ渡す方式に変更 |

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

> **[変更] v1.1.0**: `handleOpenFolder`・`handleReadDir` を廃止。フォルダ選択・ツリー走査機能は不要となるため。

| 関数名 | 引数 | 戻り値 | 処理内容 | 異常系 |
|:---|:---|:---|:---|:---|
| `createWindow` | なし | `void` | `BrowserWindow` インスタンス生成、`index.html` ロード。<br> `webPreferences`: { `preload`, `contextIsolation: false`, `nodeIntegration: true` }<br>※外部URLナビゲーションなし・完全ローカル動作のため許容。`require()` はrenderrer.jsで有効になり、Toast UI Editorを標準のCommonJSロードで初期化できる | ロード失敗時ログ出力 |
| `handleReadFile` | `filePath` | `Promise<string>` | `fs.readFile` (Buffer) → `chardet` で判定 → `iconv-lite` でUTF-8デコードして返す。 | ファイル不在、読み取り権限不可 |
| `handleSaveFile` | `filePath`, `content` | `Promise<void>` | `fs.writeFile` でUTF-8で上書き保存。 | 書き込み権限エラー |
| `handleCreateFile` | `dirPath`, `fileName` | `Promise<string>` | `path.join` でパス生成。<br>`fs.writeFile` で空文字作成。<br>成功ならフルパスを返す。 | 同名ファイル存在時エラー |
| `handleDeletePath` | `targetPath` | `Promise<void>` | ファイルなら `fs.unlink`。 | 削除ロック時エラー |
| `handleRenamePath` | `oldPath`, `newPath` | `Promise<void>` | `fs.rename` を実行。 | 移動先重複エラー |
| `handleShowConfirm`| `message` | `Promise<boolean>` | `dialog.showMessageBox` (type: question, buttons: ['OK', 'Cancel'])。<br>response === 0 を返す。 | |

## 3. プリロードスクリプト (src/preload.js)

> **[変更] v1.1.1**: `contextIsolation: false` に伴い `contextBridge.exposeInMainWorld` を廃止。`window.api = { ... }` への直接代入に変更する（Electron 28 では `contextIsolation: false` 時に `contextBridge` が TypeError を投げるため）。

`window.api` に直接 IPC ラッパーを代入し、レンダラーへ公開する。

### 3.1. 公開API (`window.api`)

> **[変更] v1.1.0**: `openFolder` ・ `readDir` を廃止。

- `readFile: (path) => ipcRenderer.invoke('fs:readFile', path)`
- `saveFile: (path, content) => ipcRenderer.invoke('fs:saveFile', path, content)`
- `createFile: (dir, name) => ipcRenderer.invoke('fs:createFile', dir, name)`
- `deletePath: (path) => ipcRenderer.invoke('fs:deletePath', path)`
- `renamePath: (oldPath, newPath) => ipcRenderer.invoke('fs:renamePath', oldPath, newPath)`
- `showConfirm: (msg) => ipcRenderer.invoke('dialog:showConfirm', msg)`

## 4. レンダラープロセス詳細 (src/renderer/renderer.js)
HTML操作とイベントリスナーの設定を行う。

### 4.1. DOM要素ID

> **[変更] v1.1.0**: `#file-tree`・`#folder-open-btn` を廃止。`#drop-zone` を新設。

- `#drop-zone`: 左ペインのMDファイル D&D 受付ゾーン
- `#editor-container`: 右ペインのエディタマウントポイント
- `#toolbar-container`: 独自ツールバーのコンテナ
- `#mode-switch`: モード切替ラジオボタン/タブ
- `#unsaved-indicator`: 未保存状態表示

### 4.2. 変数管理

> **[変更] v1.1.0**: `currentRoot` を廃止。フォルダ管理概念なし。

- `currentFilePath`: 現在編集中のファイルパス
- `isUnsaved`: 未保存変更フラグ (boolean)
- `editor`: Toast UI Editor インスタンス

### 4.3. モジュール/関数仕様

#### 4.3.1. エディタ初期化 (`initializeEditor`)

> **[変更] v1.1.1**: `contextIsolation: false` / `nodeIntegration: true` に修正。`renderer.js` の `require('@toast-ui/editor')` は引き続き使用する（変更なし）。prosemirror各パッケージがESM専用ビルドのみであり、scriptタグにUMDロードが不可のため、`nodeIntegration`によるCommonJSロード方式を採用する。

> **[変更] v1.4.0**: `customHTMLRenderer.hardBreak` を削除。同オプションは Toast UI Editor のプレビュー / HTML出力にのみ作用し、WYSIWYG ProseMirror 描画には有効でないことが Windows 実機で判明したため。trailing-space 対応は `preprocessMarkdown`（§4.3.3a）単体で実現する。

- `renderer.js` 先頭: `const Editor = require('@toast-ui/editor');`（変更なし）
- `Editor` を `#editor-container` にインスタンス化。
- オプション:
  - `initialEditType: 'wysiwyg'`, `previewStyle: 'vertical'`, `height: '100%'`
  - `usageStatistics: false`
  - `toolbarItems: []`
- イベント登録: `change` イベントで `setUnsaved(true)` を呼ぶ。

#### 4.3.2. D&Dファイル自動読み込み (`handleFileDrop`)

> **[変更] v1.1.0**: `renderTree`/`onFileClick`/`window.api.readDir` を廃止。MDファイルを直接D&Dして開く。

- `#drop-zone` に `dragover` イベントを登録（`e.preventDefault()`）。
- `#drop-zone` に `drop` イベントを登録。
  - `e.dataTransfer.files[0]` でドロップされたファイルを取得。
  - 拡張子が `.md` でない場合は`alert`でエラー表示。
  - `isUnsaved` なら確認ダイアログを表示。OKなら `loadFile(file.path)` を実行。
- Electron環境では `file.path` にローカルファイルシステムの絶対パスが格納される。

#### 4.3.3. ファイル読み込み (`loadFile`)
- `window.api.readFile(path)` を実行。
- 成功時: `preprocessMarkdown(content)` で前処理した後、`editor.setMarkdown(processedContent)` を呼び出す。
- `isUnsaved = false`、`currentFilePath = path` 更新。
- タブ/タイトルバーにファイル名表示。

#### 4.3.3a. Markdown前処理 (`preprocessMarkdown`)
- **目的**: `editor.setMarkdown()` 呼び出し前に、trailing-space（行末スペース2個以上）を Toast UI Editor の WYSIWYG モードが認識する形式に変換する。
- **署名**: `preprocessMarkdown(content: string): string`
- **処理内容**:
  1. **trailing-space → `<br>` 変換**: 正規表現 `/ {2,}\n/g` → `'<br>\n'` で変換する。Toast UI Editor v3 の `setMarkdown()` はインライン HTML（`<br>`）を受け付け、WYSIWYG ProseMirror ドキュメントに `hard_break` ノードとして変換する。
  2. 将来的なCommonMark非互换構文への実装拡張点。
- **WYSIWYG レンダリング保証**: `setMarkdown()` へ渡すテキスト内の `<br>` が ProseMirror によって `hard_break` ノードとして解釈され、WYSIWYG 画面上で改行として描画される。`getMarkdown()` での保存時は `hard_break` は `  \n`（trailing-space 2個 + 改行）として復元されるため、CommonMark 形式の保存を保証する。
- **`customHTMLRenderer` との関係**: v1.4.0 より `customHTMLRenderer.hardBreak` は削除。本関数単体で WYSIWYG trailing-space 対応を完結させる。
- **テスト観点**:
  - 文字列変換: `'  \n'`（2スペース）を含む行が `'<br>\n'` に変換されること。`'   \n'`（3スペース以上）も `'<br>\n'` に変換されること。スペース1個の行末は変換されないこと。
  - WYSIWYGレンダリング: trailing-space を含む `.md` ファイルをD&Dで開いた際、WYSIWYG上で `<br>` 相当の強制改行として表示されること（**Windows実機での目視確認を合否判定の必須条件とする**）。

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
    - **タスクリスト**: `editor.exec('taskList')`（Toast UI Editor v3 GFM拡張。未対応の場合はカスタムボタン実装で対応する）
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
- **D01 (D&D読込)**: MDファイルをD&Dした際エディタに表示されるか。非`.md`ファイルをD&Dした際エラー表示されるか。
- **F04 (新規)**: 同名ファイル時のエラー、特殊文字ファイル名の扱い。
- **E01 (読込)**: Shift-JISファイルが化けずに開けるか。
- **E02 (編集)**: 太字、リスト等が正常にMarkdownに変換されるか。
- **E03 (CommonMark準拠)**: 行末スペース2個を含むMDファイル読み込み時、WYSIWYG上で`<br>`相当の改行として表示されるか（`preprocessMarkdown` の `<br>` 変換による保証）。見出し・表・コードブロック・引用・リンク・画像・水平線が正確にレンダリングされるか。保存後のMDファイルで構文が崩れていないか。**Windows実機での目視確認を合否判定の必須条件とする**。
- **E04 (タスクリスト)**: `- [ ]`/`- [x]`を含むMDファイル読み込み時にチェックボックスとして表示されるか。ツールバーからタスクリストを挿入できるか。保存後のMDファイルに`- [ ]`記法が保存されるか。
- **E06 (未保存)**: 編集中に `*` が出るか。閉じる時に警告が出るか。
