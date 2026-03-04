# 04 実装記録

| 版数 | 更新日 | 変更概要 |
|------|------------|------------------------------------------|
| 1.0.0 | 2026-03-03 | 初版作成 |
| 1.1.0 | 2026-03-03 | 詳細設計 v1.1.0 対応（D&D方式への変更） |
| 1.1.1 | 2026-03-03 | exe実行時エディタ未初期化バグ修正（nodeIntegration・require化・CSSファイル名） |
| 1.1.2 | 2026-03-04 | D&D禁止マーク不具合修正（`contextIsolation: false`に変更、preload.jsの`contextBridge`を直接window代入に変更） |

## 1. 実装概要
詳細設計書（v1.1.0）に基づき、メインプロセス、レンダラープロセス、UIの実装を行った。  
v1.1.0 では「フォルダ選択＋ファイルツリー方式」を廃止し、**MDファイルD&D方式**へ変更した。

## 2. 実装詳細

### 2.1. メインプロセス (src/main.js)
- **[削除] v1.1.0**: `dialog:openFolder` ハンドラを廃止。
- **[削除] v1.1.0**: `fs:readDir` ハンドラを廃止。
- **[維持] IPCハンドラ**: `fs:readFile`, `fs:saveFile`, `fs:createFile`, `fs:deletePath`, `fs:renamePath`, `dialog:showConfirm` を実装。
- **セキュリティ対策**: `validatePath` でパストラバーサル（`..`）を簡易チェック。
- **文字コード対応**: `chardet` と `iconv-lite` を用いて読み込み時の自動判定とUTF-8変換を実装。

### 2.2. プリロードスクリプト (src/preload.js)
- **[削除] v1.1.0**: `openFolder`, `readDir` を廃止。
- **[変更] v1.1.2**: `contextBridge.exposeInMainWorld` を廃止。`contextIsolation: false` 環境でElectron 28は`contextBridge`を呼ぶとTypeErrorを投げるため、`window.api = { ... }` への直接代入に変更。
- 公開API (`window.api`): `readFile`, `saveFile`, `createFile`, `deletePath`, `renamePath`, `showConfirm`。6つのみ。

### 2.3. レンダラープロセス (src/renderer/index.html, renderer.js, styles.css)
- **[変更] v1.1.0 UI構成**: 左ペインを `#drop-zone`（D&Dゾーン）に置き換え。`#file-tree`・`#folder-open-btn`・`#toolbar-left` を廃止。
- **[変更] v1.1.0 変数**: `currentRoot` を廃止。`currentFilePath` のみで管理。
- **[削除] v1.1.0**: `buildTreeItem()`・`renderTree()` 関数を廃止。
- **[新規] v1.1.0 D&Dファイル読み込み** (`setupDropZone`):
  - `dragover`/`dragleave`/`drop` イベントを登録。
  - `.md` 以外のファイルをドロップした場合は `alert` でエラー表示。
  - `isUnsaved` が true の場合は確認ダイアログを表示し、OKなら `loadFile(file.path)` を実行。
- **エディタ**: Toast UI Editor 3.x を用いた WYSIWYGエディタ。
- **ツールバー**: `data-cmd` 属性ボタンから `editor.exec()` で書式適用。
- **ファイル操作**（現在開いているファイルに対して実行）:
  - **新規作成**: `currentFilePath` と同ディレクトリにタイムスタンプ付きファイルを作成。
  - **削除**: 現在のファイルを削除（確認ダイアログ付き）。
  - **リネーム**: 現在のファイルをリネーム（`prompt` ダイアログ使用）。
- **未保存検知**: `change` イベント監視によるインジケータ表示、ファイル読み込み時の確認ダイアログを実装。
- **Ctrl+S**: グローバルショートカットで `saveFile()` を呼び出す。
- **モード切替**: `#mode-switch` セレクトで WYSIWYGモード / Markdownソースモードを切替。

### 2.4. パッケージとビルド (package.json)
- 依存関係: `electron`, `chardet`, `iconv-lite`, `@toast-ui/editor`。
- `electron-builder` の設定: `appId: com.example.mdfilewriter`, Windows向け（nsis, portable）ビルド構成済み。

## 3. 詳細設計との差分
- **v1.1.0 D&D方式採用**: `dialog:openFolder`/`fs:readDir`/ツリー関連を廃止し、左ペインをD&DゾーンUIに変更した。これは詳細設計 v1.1.0 の変更に完全対応した実装。
- **新規作成ロジック v1.1.0**: ツリー廃止に伴い、`currentRoot` の代わりに `currentFilePath` のディレクトリを使用するよう変更。
- **削除・リネームロジック v1.1.0**: ツリー選択状態（`.selected`）から現在開いているファイル（`currentFilePath`）を操作する形式に変更。

## 3a. バグ修正記録（v1.1.1）

### 問題
exe を実行すると Toast UI Editor が初期化されず、エディタ領域が空白のまま表示。D&D も機能しない状態だった。

### 根本原因（3点）

| # | ファイル | 問題内容 |
|---|---|---|
| 1 | `src/renderer/index.html` | CSS 参照が `toastui-editor.min.css`（存在しない）→ スタイル未適用 |
| 2 | `src/renderer/index.html` | JS 参照が `toastui-editor-all.js`（存在しない）→ `toastui` グローバル未定義 |
| 3 | `src/renderer/renderer.js` | `const Editor = toastui.Editor` → `toastui` が undefined のため ReferenceError 発生・エディタ未初期化 |

`toastui-editor.js` は UMD 形式だが、ブラウザグローバルモードで prosemirror 依存部が `root[undefined]` になっており `nodeIntegration: false` 環境では独立ロードが不可能な構造だった。

### 修正内容

| ファイル | 修正前 | 修正後 |
|---|---|---|
| `src/renderer/index.html` | `toastui-editor.min.css` | `toastui-editor.css` |
| `src/renderer/index.html` | `<script src="toastui-editor-all.js">` タグあり | 削除（renderer.js の require() で代替） |
| `src/renderer/renderer.js` | `const Editor = toastui.Editor` | `const Editor = require('@toast-ui/editor')` |
| `src/main.js` | `nodeIntegration: false` | `nodeIntegration: true` |

`nodeIntegration: true` により renderer.js で Node.js `require()` が使用可能になり、UMD の CJS ブランチが実行され prosemirror 依存が正常にロードされる。

## 3b. バグ修正記録（v1.1.2）

### 問題
MDファイルをD&Dしても禁止マークが出てドロップできない。

### 根本原因
v1.1.1で `nodeIntegration: true` まで修正したが、`contextIsolation: true` が同時に設定されており、モダンElectronでは`contextIsolation: true`が優先され rendererのメインワールドで`require`が未定義のままだった。結果として`renderer.js`の1行目でクラッシュ→`setupDropZone()`が未実行→`dragover`リスナ未登録→OSがドロップ不可と判断し禁止マークが表示されていた。

### 修正内容

| ファイル | 修正前 | 修正後 |
|---|---|---|
| `src/main.js` | `contextIsolation: true` | `contextIsolation: false` |
| `src/preload.js` | `contextBridge.exposeInMainWorld('api', {...})` | `window.api = {...}` 直接代入 |

`contextIsolation: false` にすることで `nodeIntegration: true` が有効になり、renderer.js の `require('@toast-ui/editor')` が正常に実行される。またElectron 28では`contextIsolation: false`時に`contextBridge.exposeInMainWorld`がTypeErrorを投げるためpreload.jsも合わせて修正。本アプリは完全ローカル動作・外部URLナビゲーションなしのためセキュリティ上許容。

## 4. 既知の問題・制約
- **リネームUI**: Electronで `prompt()` の動作が制限される場合があるため、カスタムモーダルへの改修が望ましい。
- **新規作成の場所**: ファイルを開いていない状態では新規作成できない設計になっている（D&D後のみ操作可能）。
- **エラーハンドリング**: ファイルシステムエラー時は `alert()` で通知する簡易実装となっている。

## 5. テスト対象一覧
### メインプロセス（main.js）
| 関数名 | テスト観点 |
|---|---|
| `handleReadFile` | 正常読込・Shift-JIS判定・ファイル不在エラー |
| `handleSaveFile` | 正常保存・書き込み権限エラー |
| `handleCreateFile` | 正常作成・同名ファイル存在時エラー |
| `handleDeletePath` | ファイル削除・削除失敗エラー |
| `handleRenamePath` | 正常リネーム・移動先重複エラー |
| `handleShowConfirm` | OK/Cancelの戻り値 |

### レンダラープロセス（renderer.js）
| 機能 | テスト観点 |
|---|---|
| D&D読込 | .mdドロップ→エディタ表示、非.mdドロップ→エラー |
| ファイル保存 | Ctrl+S・保存ボタンでファイル保存 |
| 未保存検知 | 編集後の`*`表示、ファイル切替時の確認 |
| ツールバー | 各書式ボタンがToast UIコマンドを発行 |
| モード切替 | WYSIWYGとMarkdownモードの切り替え |

## 6. ビルド手順
```
cd project
npm install
npm run build   # electron-builder (Windows環境で実行)
```
- Linux環境での Windows ビルドは `wine` が必要。Linuxネイティブビルド: `npm run build -- --linux`

