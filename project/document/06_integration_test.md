# 06 結合評価報告書

| 版数 | 更新日 | 変更概要 |
|------|------------|------------------------------------------|
| 1.0.0 | 2026-03-03 | 初版作成 |
| 1.1.0 | 2026-03-03 | 実装 v1.1.0（D&D方式）対応。評価項目全面更新・全件再実行 |
| 1.1.1 | 2026-03-04 | 実装 v1.1.1 対応（nodeIntegration変更・ require化）。BUG-03 追記、nodeIntegration 記述修正、重複セクション削除 |
| 1.2.0 | 2026-03-04 | 実装 v1.1.2 対応（contextIsolation: false・preload.js 直接代入）。BUG-04 追記、基本設計対応表修正 |
| 1.3.0 | 2026-03-04 | 実装 v1.2.0 対応（trailing-space CommonMark準拠）。IT-MD-001〜004 追記、総合結果・基本設計対応表更新 |
| 1.4.0 | 2026-03-04 | 実装 v1.3.0 対応（不具合 #2 対応）。IT-MD-005〜006 追記、総合結果・基本設計対応表更新。32/32 PASS 確認 |
| 1.5.0 | 2026-03-04 | 実装 v1.4.0 対応（不具合 #2 再対応）。`customHTMLRenderer` 削除・`preprocessMarkdown` `<br>\n` 変換方式変更を反映。IT-MD-001〜006 更新・基本設計対応表更新。32/32 PASS 確認 |

## 1. 評価概要

- **評価対象**: レンダラープロセス (`src/renderer/renderer.js`) ⇔ メインプロセス (`src/main.js`) の IPC 通信結合フロー
- **評価方法**: Jest + JSDOM による自動テスト（`integration.test.js`）
- **テスト実施日**: 2026-03-03（初回）/ 2026-03-04（v1.1.2 再確認・v1.2.0 追加確認・v1.3.0 追加確認・v1.4.0 再確認）
- **基本設計参照**: `02_basic_design.md` v1.2.0

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

### 3.4. Markdown前処理フロー（v1.4.0: `<br>\n` 変換方式）

| ID | テストケース | 結合パス | 結果 | 備考 |
|:--|:--|:--|:--|:--|
| IT-MD-001 | trailing-space 2個 → `<br>\n` 変換 | `drop` → `readFile` → `preprocessMarkdown` → `setMarkdown('line A<br>\nline B')` | **PASS** | `/ {2,}\n/g` → `'<br>\n'`（v1.4.0方式） |
| IT-MD-002 | trailing-space 3個以上も `<br>\n` に変換 | `drop` → `readFile` → `preprocessMarkdown` → `setMarkdown` に `<br>\n` | **PASS** | v1.4.0方式 |
| IT-MD-003 | trailing-space なしの行は無変化 | `drop` → `readFile` → `preprocessMarkdown` → `setMarkdown` 入力と同一 | **PASS** | |
| IT-MD-004 | 複数行混在の全行変換 | `drop` → `readFile` → `preprocessMarkdown` → `setMarkdown` 各行を `<br>\n` 変換 | **PASS** | |

### 3.5. customHTMLRenderer 削除確認・trailing-space 境界条件フロー（v1.4.0）

| ID | テストケース | 結合パス | 結果 | 備考 |
|:--|:--|:--|:--|:--|
| IT-MD-005 | `customHTMLRenderer` が **存在しない**こと（v1.4.0削除確認） | `initEditor` → `new Editor(options)` → `options.customHTMLRenderer` が `undefined` であること | **PASS** | `MockEditorCtor.lastOptions` で確認。v1.4.0にて削除済み |
| IT-MD-006 | trailing-space 1個の行末は `<br>\n` に変換されないこと | `drop` → `readFile` → `preprocessMarkdown` → `setMarkdown` に trailing-space 1個は `<br>\n` 変換なしで渡される | **PASS** | `/ {2,}\n/g` の正規表現により1個は対象外 |

**総合結果: 14/14 Pass**

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
| CommonMark準拠: trailing-space改行（v1.4.0） | `preprocessMarkdown` による `/ {2,}\n/g` → `'<br>\n'` 変換（IT-MD-001〜004 確認済）。trailing-space 1個は変換対象外（IT-MD-006 確認済） | ✅ 確認済 |
| CommonMark準拠: `customHTMLRenderer` 削除（v1.4.0） | `initEditor()` の `Editor` コンストラクタに `customHTMLRenderer` キーが存在しないこと（IT-MD-005 確認済） | ✅ 確認済 |
| CommonMark準拠: hardBreak WYSIWYG実レンダリング | `setMarkdown('<br>\n'...)` が WYSIWYG 上で改行として表示されること。Windows 実機（ST-E03 Manual）で確認 | Manual:Pending（実機） |

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

レンダラープロセスの D&D 読み込み・ファイル操作・未保存検知の各フローにおいて、IPC 結合動作が基本設計 v1.2.0 通りであることを確認した。  
実装 v1.4.0（`preprocessMarkdown` による `<br>\n` 変換方式・`customHTMLRenderer` 削除）への変更後も 32 件全件 PASS を再確認した。  
単体テスト（32件）と結合テスト（14件）の合計 **46件すべて合格** 。  
ツールバー実動作・モード切替・ショートカットキー・WYSIWYG `<br>` 実表示確認（BUG-02）は実機評価（07）に委ねる。  
**システム評価（07）への引き渡し条件を充足する。**
