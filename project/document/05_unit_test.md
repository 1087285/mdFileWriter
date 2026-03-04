# 05 単体評価報告書

| 版数 | 更新日 | 変更概要 |
|------|------------|------------------------------------------|
| 1.0.0 | 2026-03-03 | 初版作成 |
| 1.1.0 | 2026-03-03 | 実装 v1.1.0（D&D方式）対応。テストケース更新・全件再実行 |
| 1.2.0 | 2026-03-03 | BUG-01 修正対応。validatePath 接続・テスト追加・全件再実行 |
| 1.2.1 | 2026-03-04 | 実装 v1.1.1 対応（nodeIntegration/require化）。integration.test.js のモック方式を `global.toastui` → `jest.mock('@toast-ui/editor')` に変更。26/26 PASS 再確認 |

## 1. 評価概要
- **評価対象**: メインプロセス (`src/main.js`) および レンダラープロセス (`src/renderer/renderer.js`)
- **評価方法**: Jest による自動テスト（unit: `main.test.js`、integration(renderer): `integration.test.js`）

## 2. 評価環境
- **OS**: Linux (Dev Container)
- **Framework**: Jest (`npx jest`)
- **Mocking**: Electron API (`ipcMain`, `dialog`, `BrowserWindow`), File System (`fs`), `chardet`, `iconv-lite`, Toast UI Editor

## 3. テスト項目と結果

### 3.1. メインプロセス (main.test.js) — 12/12 PASS

| ID | 機能 | テストケース | 結果 | 備考 |
|:---|:---|:---|:---|:---|
| UT-M-001 | IPC登録確認 | `dialog:openFolder`/`fs:readDir` が未登録であること（v1.1.0廃止確認） | **PASS** | |
| UT-M-002 | IPC登録確認 | `fs:readFile`,`saveFile`,`createFile`,`deletePath`,`renamePath`,`showConfirm` が登録されていること | **PASS** | |
| UT-M-003 | ファイル読込 | 指定ファイルの内容が返ること（UTF-8 / chardet経由） | **PASS** | |
| UT-M-004 | ファイル保存 | 内容が UTF-8 で書き込まれること | **PASS** | |
| UT-M-005 | 新規作成 | 指定名で空ファイルが作成されフルパスが返ること | **PASS** | |
| UT-M-006 | 新規作成 | 同名ファイル存在時にエラーが投げられること | **PASS** | |
| UT-M-007 | 確認ダイアログ | OK（response=0）で true が返ること | **PASS** | |
| UT-M-008 | 確認ダイアログ | Cancel（response=1）で false が返ること | **PASS** | |
| UT-M-009 | 削除 | ファイルが `fs.unlink` で削除されること | **PASS** | |
| UT-M-010 | 削除 | ディレクトリが `fs.rm（recursive）` で削除されること | **PASS** | |
| UT-M-011 | リネーム | `fs.rename` が呼ばれること | **PASS** | |
| UT-M-012 | リネーム | 移動先が存在する場合にエラーが投げられること | **PASS** | |
| UT-V-001 | パストラバーサル防御 | `fs:readFile` に `..` を含むパスを渡すとエラーになること | **PASS** | BUG-01 fix |
| UT-V-002 | パストラバーサル防御 | `fs:saveFile` に `..` を含むパスを渡すとエラーになること | **PASS** | BUG-01 fix |
| UT-V-003 | パストラバーサル防御 | `fs:createFile` の dirPath に `..` を含むとエラーになること | **PASS** | BUG-01 fix |
| UT-V-004 | パストラバーサル防御 | `fs:deletePath` に `..` を含むパスを渡すとエラーになること | **PASS** | BUG-01 fix |
| UT-V-005 | パストラバーサル防御 | `fs:renamePath` の oldPath に `..` を含むとエラーになること | **PASS** | BUG-01 fix |
| UT-V-006 | パストラバーサル防御 | `fs:renamePath` の newPath に `..` を含むとエラーになること | **PASS** | BUG-01 fix |

### 3.2. レンダラープロセス (integration.test.js) — 8/8 PASS

| ID | 機能 | テストケース | 結果 | 備考 |
|:---|:---|:---|:---|:---|
| IT-DND-001 | D&Dファイル読込 | .mdファイルをD&DするとreadFileが呼ばれエディタに表示される | **PASS** | `#drop-filename`にファイル名表示も確認 |
| IT-DND-002 | D&Dファイル読込 | .md以外のファイルをD&DするとalertでエラーになりreadFileは呼ばれない | **PASS** | |
| IT-DND-003 | D&D未保存確認 | 未保存時にD&Dすると確認ダイアログが出てCancelで中止できる | **PASS** | |
| IT-IPC-003 | ファイル保存 | 保存ボタン押下で saveFile が currentFilePath・内容で呼ばれる | **PASS** | |
| IT-IPC-004 | 新規作成 | 新規作成ボタン押下で createFile が呼ばれる | **PASS** | |
| IT-IPC-005 | 削除 | 削除ボタン押下で確認後 deletePath が呼ばれる | **PASS** | |
| IT-IPC-006 | リネーム | リネームボタン押下で renamePath が正しいパスで呼ばれる | **PASS** | |
| IT-STATE-001 | 未保存検知 | 編集変更で未保存インジケータが表示される | **PASS** | |

**総合結果**: **26/26 Pass**

## 4. 不具合・課題

| No | 不具合内容 | 重要度 | 状態 | 対応内容 |
|:--|:--|:--|:--|:--|
| BUG-01 | `validatePath` 関数がIPCハンドラから呼び出されていない / 実装が空 | 中 | **解決済み** | セグメント単位の `..` 検査に修正し、全5ハンドラへ接続。UT-V-001〜006 で検証。 |
| BUG-02 | `electron-squirrel-startup` が `dependencies` に未登録 | 高 | **解決済み** | `npm install electron-squirrel-startup --save` で対応済み。 |
| BUG-03 | exe実行時エディタ未初期化（`toastui-editor-all.js` 存在せず・`nodeIntegration: false` で `require()` 不可） | 高 | **解決済み** | `nodeIntegration: true` 化・CSS/JSファイル名修正・`require('@toast-ui/editor')` に変更（実装 v1.1.1）。integration.test.js のモック方式も `global.toastui` → `jest.mock('@toast-ui/editor')` に更新。 |

## 5. 未評価項目

| ID | 項目 | 理由 |
|:---|:---|:---|
| UT-R-* | ツールバー各ボタン・Ctrl+S・モード切替 | JSDOM 環境でToast UI Editor の実際のコマンド発行確認が困難。E2E（Spectron等）での評価推奨 |

## 6. 結合評価への引き継ぎ事項
- 主要IPCハンドラ（readFile/saveFile/createFile/deletePath/renamePath/showConfirm）はすべて単体テスト PASS。
- D&D読込・保存・削除・リネームの基本フローはレンダラーテストで確認済み。
- `validatePath` による `..` パストラバーサル防御を全5ハンドラに実装・テスト済み（BUG-01 解決）。
- Windows環境でのビルドには wine が必要（Linux環境での制約）。

- **評価対象**: メインプロセス (`src/main.js`) および レンダラープロセス (`src/renderer/renderer.js`)
- **評価方法**: 自動テストフレームワーク (`jest`) による関数単位の検証。レンダラープロセスは構造上、統合テストまたは手動確認を主とする。

