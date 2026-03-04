# 08 リリース報告書

## 1. 概要

| 項目 | 内容 |
|:--|:--|
| アプリ名 | mdFileWriter |
| バージョン | v1.2.0 |
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
| 04 実装 | ✅ 完了 | BUG-04-001〜003修正済み（フォルダダイアログ不起動）・BUG-03修正済み（exeエディタ未初期化）・BUG-04修正済み（D&D禁止マーク） |
| 05 単体評価 | ✅ 30/30 Pass | BUG-01（validatePath）対応済み。v1.2.0 preprocessMarkdown 対応テスト（IT-MD-001〜004）追加済み |
| 06 結合評価 | ✅ 12/12 Pass | 42件全件合格 |
| 07 システム評価 | ✅ 条件付き合格 | UIの最終確認はWindows実機で行うこと |
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
| Windowsインストーラ | `project/dist/MdFileWriter Setup 1.2.0.exe` (GitHub Actionsで生成) |
| ポータブル実行ファイル | `project/dist/MdFileWriter 1.2.0.exe` (GitHub Actionsで生成) |
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
   git tag v1.2.0
   git push origin v1.2.0
   ```
3. GitHub Actions (`Build & Release (Windows .exe)`) が自動起動する。
4. `windows-latest` ランナーで `electron-builder --win` が実行されNSISインストーラとポータブルexeが生成される。
5. `project/dist/*.exe` が GitHub Releases に自動アップロードされる。

### 6.2. 事前確認チェックリスト（push前）

- [x] `project/package.json` の `version` フィールドがリリースバージョンと一致しているか
- [x] `project/package.json` の `version` が `1.2.0` であること
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
