# 08 リリース報告書

## 1. 概要

| 項目 | 内容 |
|:--|:--|
| アプリ名 | mdFileWriter |
| バージョン | v1.5.0 |
| リリース日 | 2026-03-04 |
| 対象OS | Windows 10 / 11 |
| ビルドツール | electron-builder v24.x |
| 配布形式 | NSISインストーラ (.exe) / ポータブル (.exe) |

---

## 2. リリース可否判定

| フェーズ | 結果 | 備考 |
|:--|:--|:--|
| 01 要件定義 | ✅ 完了 | |
| 02 基本設計 | ✅ 完了 | |
| 03 詳細設計 | ✅ 完了 | |
| 04 実装 | ✅ 完了 | BUG-04-001〜003修正済み・BUG-03修正済み・BUG-04修正済み・不具合 #2 再対応（v1.4.0）・不具合 #3 修正（v1.5.0: `preprocessMarkdown` バックスラッシュ改行方式変更） |
| 05 単体評価 | ✅ 32/32 Pass | v1.5.0 対応テスト（IT-MD-001〜006）全件合格。バックスラッシュ改行変換確認・`customHTMLRenderer` 削除確認を含む |
| 06 結合評価 | ✅ 14/14 Pass | 46件全件合格 |
| 07 システム評価 | ✅ 条件付き合格 | ST-E03 trailing-space WYSIWYG表示はWindows実機確認待ち（Manual:Pending） |
| **総合判定** | **✅ リリース可** | |

---

## 3. 成果物一覧

| 成果物 | パス / 備考 |
|:--|:--|
| ソースコード | `project/src/` |
| メインプロセス | `project/src/main.js` |
| プリロード | `project/src/preload.js` |
| UI (HTML/CSS/JS) | `project/src/renderer/` |
| ビルド設定 | `project/package.json` (electron-builder) |
| CI/CDワークフロー | `.github/workflows/build-release.yml` |
| Windowsインストーラ | `project/dist/MdFileWriter Setup 1.5.0.exe` (GitHub Actionsで生成) |
| ポータブル実行ファイル | `project/dist/MdFileWriter 1.5.0.exe` (GitHub Actionsで生成) |
| HOWTOUSEドキュメント | `HOWTOUSE.md` |
| リリースノート | 本ドキュメント |

---

## 4. ビルド設定確認

### 4.1. `package.json` ビルド設定

```json
"build": {
  "appId": "com.example.mdfilewriter",
  "productName": "MdFileWriter",
  "directories": { "output": "dist" },
  "win": { "target": ["nsis", "portable"] },
  "files": ["src/**/*", "package.json"]
}
```

- **NSIS**: インストーラ形式。スタートメニュー登録・アンインストーラ付き。
- **portable**: フォルダコピーのみで動作するポータブル形式。

### 4.2. CI/CD (GitHub Actions)

| 項目 | 設定値 |
|:--|:--|
| トリガー | `v*.*.*` タグのpush |
| ランナー | `windows-latest` |
| Node.js | v20 |
| ビルドコマンド | `npm run build` (`electron-builder --win`) |
| アップロード先 | GitHub Releases |
| リリースノート参照 | `project/document/08_release.md` |

---

## 5-new. リリースノート (v1.5.0)

### バグ修正
- **Bug #3 修正: Markdownソースタブで行の内容が別の行の内容に化ける**
  - v1.4.0 の `<br>\n` 変換方式が `setMarkdown()` → `getMarkdown()` round-trip でコンテンツを崩すことが判明（全角文字を含む行で次行の内容が表示される）
  - `renderer.js` `preprocessMarkdown()` の変換方式を `/ {2,}\n/g` → `'<br>\n'`（inline HTML）から `/ {2,}\n/g` → `'\\\n'`（CommonMark §6.7 バックスラッシュ改行）に変更
  - HTML パースを経由しないためコンテンツが正確に保持される

### テスト
- 単体テスト: 32/32 PASS（IT-MD-001〜004 期待値を `\\\n` に更新）
- 結合テスト: 14/14 PASS（IT-MD-001〜004/006 のバックスラッシュ改行期待値確認）

### ドキュメント
- `04_implementation.md`: v1.5.0（実装内容を記録）
- `05_unit_test.md`: v1.7.0（32/32 PASS）
- `06_integration_test.md`: v1.6.0（14/14 PASS）
- `07_system_test.md`: v1.6.0（ST-E03 Auto:Pass、Manual:Pending）
- `09_bug_analysis_report.md`: v1.2.0（Bug #3 解析セクション追加）
- `HOWTOUSE.md`: v1.5.0（trailing-space 注意事項をバックスラッシュ改行方式に更新）

### 既知の制限・保留事項
- ST-E03 trailing-space WYSIWYG表示確認: Windows実機での目視確認が必要（Manual:Pending）
  - 確認完了後に Bug #2 を正式クローズする

---

## 5-new-prev. リリースノート (v1.4.0)（v1.5.0 にて Bug #3 修正済み）

### バグ修正
- **Bug #2 再対応: trailing-space（末尾2スペース）WYSIWYGレンダリング修正（方式変更）**
  - v1.3.0 の `customHTMLRenderer.hardBreak` が Windows 実機の WYSIWYG ProseMirror 描画に有効でないことを確認したため削除
  - `renderer.js` `preprocessMarkdown()` の変換方式を `/ {2,}\n/g` → `'  \n'`（2スペース正規化）から `/ {2,}\n/g` → `'<br>\n'`（inline HTML 変換）に変更
  - `setMarkdown()` に `<br>\n` を渡すことで ProseMirror が `hard_break` ノードとして取り込み、WYSIWYG 上で改行として描画される設計

### テスト
- 単体テスト: 32/32 PASS（IT-MD-005: `customHTMLRenderer` 削除確認、IT-MD-006: trailing-space 1個は非変換確認）
- 結合テスト: 14/14 PASS（IT-MD-005/006 内容を v1.4.0 方式に更新）

### ドキュメント
- `03_detailed_design.md`: v1.4.0（`customHTMLRenderer` 削除・`<br>\n` 変換方式を確定仕様化）
- `04_implementation.md`: v1.4.0（実装内容を記録）
- `05_unit_test.md`: v1.6.0（32/32 PASS）
- `06_integration_test.md`: v1.5.0（14/14 PASS）
- `07_system_test.md`: v1.5.0（ST-E03 Auto:Pass、Manual:Pending）
- `HOWTOUSE.md`: v1.4.0（trailing-space 注意事項を `<br>\n` 変換方式に更新）

### 既知の制限・保留事項
- ST-E03 trailing-space `<br>` WYSIWYG表示確認: Windows実機での目視確認が必要（Manual:Pending）
  - 確認完了後に Bug #2 を正式クローズする

---

## 5-new-prev. リリースノート (v1.3.0)（v1.4.0 にて上書き対応済み）

### バグ修正
- **Bug #2対応: trailing-space（末尾2スペース）WYSIWYGレンダリング修正**
  - `renderer.js` `initEditor()` に `customHTMLRenderer: { hardBreak() { return [{ type: 'html', content: '<br>' }]; } }` を追加
  - Toast UI Editor (ProseMirror) が CommonMark `hardBreak` AST ノードを WYSIWYG で `<br>` としてレンダリングするように対応
  - `preprocessMarkdown()` との組み合わせにより、行末スペース正規化 + WYSIWYG `<br>` 表示の両方を保証

### テスト
- 単体テスト: 32/32 PASS（IT-MD-005〜006 追加: `customHTMLRenderer.hardBreak` 関数渡し確認・戻り値確認）
- 結合テスト: 14/14 PASS（IT-MD-005〜006 結合テスト追加）

### ドキュメント
- `03_detailed_design.md`: v1.3.0（`customHTMLRenderer.hardBreak` を必須仕様として明記）
- `04_implementation.md`: v1.3.0（実装内容を記録）
- `05_unit_test.md`: v1.5.0（32/32 PASS）
- `06_integration_test.md`: v1.4.0（14/14 PASS）
- `07_system_test.md`: v1.4.0（ST-E03 Auto:Pass、Manual:Pending）
- `HOWTOUSE.md`: v1.3.0（trailing-space WYSIWYG表示の注意事項を更新）

### 既知の制限・保留事項
- ST-E03 trailing-space `<br>` WYSIWYG表示確認: Windows実機での目視確認が必要（Manual:Pending）
  - 確認完了後に Bug #2 を正式クローズする

---

## 5-0. リリースノート (v1.2.0)

### 機能追加
- **CommonMark準拠: trailing-space強制改行対応**（不具合#1対応）
  - `renderer.js` に `preprocessMarkdown()` 関数を追加
  - MDファイル読み込み時（`loadFile`）に `editor.setMarkdown()` 呼び出し前に前処理を実行
  - 行末スペース2個以上（`/ {2,}\n/g`）を正確に2スペース（`  \n`）に正規化し、CommonMark仕様の `<br>` 相当レンダリングを保証
- **タスクリストコマンド追加**
  - ツールバーの `commandMap` に `TaskList: () => editorInstance.exec('taskList')` を追加
  - `- [ ]` / `- [x]` 記法をGFM拡張として対応

### テスト
- 単体テスト: 30/30 PASS（`preprocessMarkdown` 単体テスト IT-MD-001〜004 追加）
- 結合テスト: 12/12 PASS（Markdown前処理フロー追加）

### ドキュメント
- `HOWTOUSE.md`: v1.2.0対応（タスクリスト・trailing-space注意事項を追記）
- `03_detailed_design.md` 〜 `07_system_test.md`: 全工程をv1.2.0対応に更新

---

## 5-0b. リリースノート (v1.1.2)

### バグ修正
- **BUG-04**: MDファイルD&D時に禁止マークが出てドロップできない問題を修正
  1. `main.js` の `contextIsolation: true` → `false` に変更
  2. `preload.js` の `contextBridge.exposeInMainWorld` を廃止し、`window.api = {...}` 直接代入に変更
  - **原因**: `contextIsolation: true` + `nodeIntegration: true` の競合により renderer.js 起動時にクラッシュ → `setupDropZone()` 未実行 → `dragover` リスナ未登録 となり、OSがドロップ不可と判断し禁止マーク表示
  - 本アプリは完全ローカル動作・外部URLナビゲーションなしのためセキュリティ上許容

### テスト
- 単体テスト（26/26 PASS）・結合テスト（8/8 PASS）再確認済み

### ドキュメント
- `HOWTOUSE.md`: v1.1.2対応
- `03_detailed_design.md` 〜 `07_system_test.md`: 全工程をv1.1.2対応に更新

---

## 5-1. リリースノート (v1.1.1)

### 新機能
- **D&DによるファイルオープンUI**（v1.1.0〜）: 左ペインをフォルダツリーからD&Dゾーンに変更。エクスプローラーからMDファイルをドロップして開く方式に刷新。
- ツールバーに **💾保存 / 📄新規作成 / 🗑️削除 / ✏️リネーム** ボタンを統合

### バグ修正
- **BUG-03**: exeビルド後にエディタが真っ白になる問題を修正
  1. `index.html` のCSS参照 `toastui-editor.min.css` → `toastui-editor.css`
  2. `index.html` の不要スクリプトタグ（`toastui-editor-all.js`）を削除
  3. `main.js` の `nodeIntegration: false` → `true` に変更
  4. `renderer.js` のエディタ初期化を `toastui.Editor` → `require('@toast-ui/editor')` に変更

### テスト修正
- `integration.test.js`: モックパターンを `global.toastui` → `jest.mock('@toast-ui/editor', factory, {virtual: true})` に変更。26/26 PASS 確認済み。

### ドキュメント
- `HOWTOUSE.md`: D&DゾーンUIに全面改訂
- `03_detailed_design.md` ～ `07_system_test.md`: 全工程をv1.1.1対応に更新

---

## 5. リリースノート (v1.0.1)

### バグ修正
- **BUG-04-001**: Linux/devcontainer環境でフォルダ選択ダイアログが開かない不具合を修正
  - `package.json` の `start` スクリプトに `--no-sandbox --disable-gpu` を追加
- **BUG-04-002**: `dialog:openFolder` のエラーハンドリング不足を修正
  - try/catchの追加と `BrowserWindow.getFocusedWindow()` フォールバック
- **BUG-04-003**: `folderOpenBtn` が null の場合にスクリプトが停止するリスクを修正
  - nullガードと try/catch の追加

### テスト強化
- 単体テスト追加（`fs:deletePath` / `fs:renamePath` / `dialog:openFolder` キャンセル系）: +5件
- 結合テスト追加（新規作成 / リネーム / 未保存インジケータ）: +4件
- 合計: 12 → 21 件

### 変更なし
- 機能仕様・UI・IPC API に変更なし

---

## 5-2. リリースノート (v1.0.0)

### 新機能
- Markdown (.md) ファイルのWYSIWYG編集に対応（Toast UI Editor採用）
- 左ペインにファイルツリー（フォルダ選択・MDファイル一覧表示）
- Word風ツールバー（見出し H1〜H6、太字、斜体、リスト、リンク、画像、表、コードブロック、引用、水平線、Undo/Redo）
- キーボードショートカット（Ctrl+S, Ctrl+B, Ctrl+I, Ctrl+Z, Ctrl+Y）
- 編集モード切替（WYSIWYGモード / Markdownソースモード）
- 未保存検知と確認ダイアログ
- ファイル操作（新規作成、削除、リネーム）
- 保存形式: UTF-8 Markdown

### バグ修正
- `electron-squirrel-startup` が `dependencies` に未登録のため、Windows上でexe起動時に `Cannot find module` エラーが発生する問題を修正（[BUG-02](05_unit_test.md)）
- GitHub Actionsでの `npm ci` 実行時に `package-lock.json` が存在しないエラーを修正

### 制約事項・既知の制限
- ルートフォルダ外のファイルへのアクセスは禁止（セキュリティ仕様）
- 画像はローカルパス参照のみ対応（外部URL可だがファイル埋め込みは非対応）
- ビルドはGitHub Actions (windows-latest) で実施（ローカルLinux環境からの直接ビルドは Wine が必要なため非対応）

---

## 6. リリース手順

### 6.1. GitHub Actionsによる自動ビルド・リリース

1. ソースコードが `main` ブランチにマージされていることを確認する。
2. バージョンタグを作成して push する。
   ```bash
   git tag v1.4.0
   git push origin v1.4.0
   ```
3. GitHub Actions (`Build & Release (Windows .exe)`) が自動起動する。
4. `windows-latest` ランナーで `electron-builder --win` が実行されNSISインストーラとポータブルexeが生成される。
5. `project/dist/*.exe` が GitHub Releases に自動アップロードされる。

### 6.2. 事前確認チェックリスト（push前）

- [x] `project/package.json` の `version` フィールドがリリースバージョンと一致しているか
- [x] `project/package.json` の `version` が `1.4.0` であること
- [x] `08_release.md` のバージョン・日付が正しいか
- [x] `HOWTOUSE.md` が最終仕様と一致しているか
- [x] すべてのテストが Pass していることを確認（`npm test`）
- [x] `main` ブランチに未コミットの変更がないか

---

## 7. 配布・運用

| 項目 | 内容 |
|:--|:--|
| 配布方法 | GitHub Releases からダウンロード |
| インストール | インストーラ(.exe)実行またはポータブル版をフォルダに配置 |
| アンインストール | Windowsの「アプリと機能」から削除（インストーラ版）/ フォルダ削除（ポータブル版） |
| 更新方法 | 新バージョンのインストーラ/ポータブルを上書き実行 |
| サポートOS | Windows 10 / 11 (64bit) |
