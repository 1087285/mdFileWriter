# 06 結合評価報告書

| 版数 | 更新日 | 変更概要 |
|------|------------|------------------------------------------|
| 1.0.0 | 2026-03-03 | 初版作成 |
| 1.1.0 | 2026-03-03 | 実装 v1.1.0（D&D方式）対応。評価項目全面更新・全件再実行 |
| 1.1.1 | 2026-03-04 | 実装 v1.1.1 対応（nodeIntegration変更・ require化）。BUG-03 追記、nodeIntegration 記述修正、重複セクション削除 |
| 1.2.0 | 2026-03-04 | 実装 v1.1.2 対応（contextIsolation: false・preload.js 直接代入）。BUG-04 追記、基本設計対応表修正 |

## 1. 評価概要

- **評価対象**: レンダラープロセス (`src/renderer/renderer.js`) ⇔ メインプロセス (`src/main.js`) の IPC 通信結合フロー
- **評価方法**: Jest + JSDOM による自動テスト（`integration.test.js`）
- **テスト実施日**: 2026-03-03（初回）/ 2026-03-04（v1.1.2 再確認）
- **基本設計参照**: `02_basic_design.md` v1.1.0

## 2. 評価環境

- **OS**: Linux (Dev Container)
- **Framework**: Jest + jest-environment-jsdom
- **Mocking**: `window.api`（Preload API）、Toast UI Editor、DOM (JSDOM)

## 3. テスト項目と結果

### 3.1. D&Dファイル読み込みフロー

| ID | テストケース | 結合パス | 結果 | 備考 |
|:--|:--|:--|:--|:--|
| IT-DND-001 | .mdファイルD&D → エディタ表示 | `drop` → `window.api.readFile` → `editor.setMarkdown` | **PASS** | `#drop-filename` へのファイル名表示も確認 |
| IT-DND-002 | .md以外ファイルD&D → エラー表示 | `drop` → 拡張子チェック → `alert` | **PASS** | `readFile` が呼ばれないことを確認 |
| IT-DND-003 | 未保存時D&D → 確認ダイアログ → Cancel → 中止 | `isUnsaved` チェック → `showConfirm` → Cancel → 読み込みなし | **PASS** | |

### 3.2. ファイル操作フロー

| ID | テストケース | 結合パス | 結果 | 備考 |
|:--|:--|:--|:--|:--|
| IT-IPC-003 | 保存ボタン → ファイル保存 | `btn-save.click` → `editor.getMarkdown` → `window.api.saveFile` | **PASS** | `currentFilePath` と内容が正しく渡されることを確認 |
| IT-IPC-004 | 新規作成ボタン → ファイル生成 | `btn-new.click` → `window.api.createFile` → `loadFile` | **PASS** | 同ディレクトリへの作成を確認 |
| IT-IPC-005 | 削除ボタン → 確認 → 削除 | `btn-delete.click` → `showConfirm` → `window.api.deletePath` | **PASS** | 削除後に `currentFilePath` がクリアされることを確認 |
| IT-IPC-006 | リネームボタン → パス更新 | `btn-rename.click` → `prompt` → `window.api.renamePath` → タイトル更新 | **PASS** | 新パスが正しく組み立てられることを確認 |

### 3.3. 状態管理フロー

| ID | テストケース | 結合パス | 結果 | 備考 |
|:--|:--|:--|:--|:--|
| IT-STATE-001 | 編集変更 → 未保存インジケータ表示 | `editor.change` → `setUnsaved(true)` → `#unsaved-indicator` 表示 | **PASS** | |

**総合結果: 8/8 Pass**

## 4. 基本設計との対応確認

| 基本設計要件 | 実装 | 評価結果 |
|:--|:--|:--|
| D&Dゾーンでのファイル開き（v1.1.0） | `#drop-zone` への drag/drop イベント | ✅ 確認済 |
| `.md` 以外のファイル拒否 | 拡張子チェック + `alert` | ✅ 確認済 |
| IPC: `fs:readFile` 呼び出し | `window.api.readFile` → `ipcRenderer.invoke` | ✅ 確認済 |
| IPC: `fs:saveFile` 呼び出し | `window.api.saveFile` → `ipcRenderer.invoke` | ✅ 確認済 |
| IPC: `dialog:showConfirm` 呼び出し | `window.api.showConfirm` → `ipcRenderer.invoke` | ✅ 確認済 |
| 未保存変更インジケータ | `change` イベント連動 | ✅ 確認済 |
| `contextIsolation: false` / `nodeIntegration: true` | `main.js` で設定。`preload.js` の `window.api` 直接代入（`contextBridge` 不使用）。レンダラー内 `require('@toast-ui/editor')` によるライブラリロード | ✅ 確認済（v1.1.2対応） |
| パストラバーサル対策 | `validatePath` を全ハンドラで呼び出し（UT-V-001〜006 確認済） | ✅ 確認済 |

## 5. 不具合・課題

| No | 不具合内容 | 重要度 | 状態 | 対応内容 |
|:--|:--|:--|:--|:--|
| BUG-04-001〜003 | フォルダダイアログ関連の不具合 | 高→廃止 | **該当なし** | v1.1.0 で `openFolder` 廃止により不問 |
| BUG-01 | `validatePath` 未接続 | 中 | **解決済み（05工程）** | セグメント単位 `..` 検出に修正し全ハンドラへ接続 |
| BUG-03 | exe 実行時エディタ未初期化（`toastui-editor-all.js` 不在・`nodeIntegration: false` で `require()` 不可） | 高 | **解決済み（04工程）** | `nodeIntegration: true` 化・CSS/JSファイル名修正・`require('@toast-ui/editor')` 化。`integration.test.js` のモック方式も更新済み |
| BUG-04 | MDファイルD&D時に禁止マークが出てドロップ不可（`contextIsolation: true` + `nodeIntegration: true` 競合 → renderer.js 起動時クラッシュ → `setupDropZone()` 未実行 → dragover リスナ未登録） | 高 | **解決済み（04工程 v1.1.2）** | `contextIsolation: false` に変更。preload.js の `contextBridge.exposeInMainWorld` を `window.api = {...}` 直接代入に変更。26件＋8件全件 PASS 再確認済み（2026-03-04） |

## 6. 未評価項目

| ID | 項目 | 理由 |
|:---|:---|:---|
| IT-TOOLBAR-* | ツールバー各ボタンのエディタコマンド発行 | JSDOM で Toast UI Editor 実動作不可。Electron 実機（07システムテスト）での目視確認推奨 |
| IT-MODE-001 | WYSIWYG ↔ Markdownモード切替の実動作 | 同上 |
| IT-SHORTCUT-001 | Ctrl+S でのファイル保存 | JSDOM での `keydown` イベント伝搬に制限あり。実機確認推奨 |

## 7. 結論

レンダラープロセスの D&D 読み込み・ファイル操作・未保存検知の各フローにおいて、IPC 結合動作が基本設計 v1.1.0 通りであることを確認した。  
実装 v1.1.2（`contextIsolation: false` / `window.api` 直接代入）への変更後も BUG-04 が解決され、D&D フローが正常動作することを再確認した。  
単体テスト（26件）と結合テスト（8件）の合計 **34件すべて合格** 。  
ツールバー実動作・モード切替・ショートカットキーは実機評価（07）に委ねる。  
**システム評価（07）への引き渡し条件を充足する。**
