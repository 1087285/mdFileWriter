# 07 システム評価報告書

| 版数 | 更新日 | 変更概要 |
|------|------------|----------------------------------------------|
| 1.0.0 | 2026-03-03 | 初版作成（v1.0.0対応） |
| 1.1.0 | 2026-03-03 | v1.1.0対応（D&D方式への変更を反映、テスト件数更新26→34）|
| 1.1.1 | 2026-03-04 | v1.1.1対応（exeエディタ未初期化修正・BUG-03追記、nodeIntegration記述修正、アプリバージョン更新）|
| 1.2.0 | 2026-03-04 | v1.1.2対応（D&D禁止マーク修正・BUG-04追記、contextIsolation記述修正・リリース判定更新）|
| 1.3.0 | 2026-03-04 | v1.2.0対応（trailing-space CommonMark準拠・preprocessMarkdown実装反映）テスト件数更新42件 |
| 1.4.0 | 2026-03-04 | v1.3.0対応（不具合 #2 customHTMLRenderer.hardBreak 実装反映）。自動テスト件数更新 30→32件。ST-E03 Auto 欄に IT-MD-005〜006 追記。アプリバージョン更新 |

## 1. 目的
本ドキュメントは、mdFileWriterシステムが要件定義書 (`01_requirements.md`) に記載されたすべての要件を満たしていることを確認するためのシステム評価計画および結果報告書である。

## 2. 評価対象
- アプリケーション名: mdFileWriter
- バージョン: v1.3.0 (Release Candidate)
- 対象OS: Windows 10 / 11 (※開発環境はUbuntu 24.04 Dev Container)

## 3. 評価環境

### 3.1 自動テスト環境 (Unit/Integration)
- OS: Ubuntu 24.04 (Dev Container)
- Node.js: v20.x
- Test Framework: Jest + JSDOM

### 3.2 手動テスト環境 (System)
- OS: Windows 10 / 11 (※本フェーズでは実機確認手順の策定までを含む)
- 画面解像度: 1920x1080 推奨

## 4. テストケースと結果一覧

凡例:
- **Auto**: Unit/Integrationテストで検証済み（`npm test` 全件 Pass）
- **Manual**: 実機（Windows）で手動確認が必要
- **Review**: コードレビュー/机上確認で論理的整合性を確認済み

### 4.1 要件トレーサビリティ

| 要件ID | 要件概要 | 対応テストID |
|:--|:--|:--|
| FR-1.1 | ファイル指定（D&D） | ST-003 |
| FR-1.2 | ファイル読み込み（文字コード自動判定） | ST-004 |
| FR-1.3 | ファイル保存（UTF-8上書き） | ST-009 |
| FR-1.4 | 新規作成 | ST-005 |
| FR-1.5 | 削除（確認ダイアログあり） | ST-006 |
| FR-1.6 | リネーム | ST-007 |
| FR-2.1 | リッチテキスト編集（WYSIWYG） | ST-010 |
| FR-2.2 | Markdown⇔HTML相互変換 | ST-004, ST-009 |
| FR-2.3 | CommonMark準拠: trailing-space改行（行末スペース2個=`<br>`） | ST-E03 |
| FR-3 | Word風ツールバー（H1-H6, 太字, 斜体等） | ST-011, ST-012, ST-013 |
| FR-4 | キーボードショートカット（Ctrl+S/B/I/Z/Y） | ST-009, ST-011, ST-014 |
| FR-5 | 編集モード切替（WYSIWYG⇔ソース） | ST-015 |
| FR-6 | 未保存検知・確認ダイアログ | ST-016, ST-017 |
| NFR-1 | ユーザビリティ（D&Dで即編集開始） | ST-002, ST-003 |
| NFR-2 | ポータビリティ（exe単独起動） | ST-001, ST-018 |
| NFR-3 | セキュリティ（完全ローカル・パストラバーサル防止） | ST-008, ST-019 |
| OPR-1 | エラーハンドリング | ST-020a |

### 4.2 機能要件評価 (Functional Requirements)

| ID | カテゴリ | テスト項目 | 内容 | 期待値 | 検証方法 | 結果 |
|:--|:--|:--|:--|:--|:--|:--|
| ST-001 | 起動 | アプリ起動 | 生成されたexeを実行する | エラーなくウィンドウが表示されること | Manual | Pending |
| ST-002 | UI | 画面構成 | 起動直後の画面を確認する | 左側にD&Dドロップゾーン（破線ボーダー）、右側にWYSIWYGエディタが表示されること（フォルダツリー・フォルダ選択ボタンは存在しないこと） | Manual | Pending |
| ST-003 | ファイル操作 | D&D指定 | `.md`ファイルをドロップゾーンにドラッグ&ドロップする | ドロップゾーンにファイル名が表示され、エディタに内容が読み込まれること | Auto/Review | Pass |
| ST-004 | ファイル操作 | ファイル読込 | D&D後のエディタ表示を確認する | エディタにファイルの内容がWYSIWYG形式で表示されること。文字コード（UTF-8/Shift-JIS等）が正しく判定されること | Auto/Review | Pass |
| ST-005 | ファイル操作 | 新規作成 | 新規作成ボタンを押下する | ファイル名入力ダイアログが表示され、現在開いているファイルと同ディレクトリに新しい`.md`ファイルが作成されること | Auto/Review | Pass |
| ST-006 | ファイル操作 | 削除 | 削除ボタンを押下する | 確認ダイアログが表示され、「OK」でファイルが削除されること。「キャンセル」で削除が中断されること | Auto/Review | Pass |
| ST-007 | ファイル操作 | リネーム | リネームボタンを押下する | ファイル名入力ダイアログが表示され、入力後にファイル名が変更されること | Auto/Review | Pass |
| ST-008 | セキュリティ | パストラバーサル防止 | `../`等を含むパスでIPC操作を試みる | `validatePath()`がエラーをスローし操作が拒否されること | Auto | Pass |
| ST-009 | 保存 | 上書き保存 | 編集後にCtrl+Sまたは保存ボタンを押す | ファイルの内容がUTF-8 Markdownとして更新されること | Auto/Review | Pass |
| ST-E03 | エディタ | trailing-space改行レンダリング（v1.2.0/v1.3.0） | 行末スペース2個（`  \n`）を含む.mdファイルをD&Dで開く | WYSIWYGエディタ上で`<br>`相当の強制改行として表示されること。`preprocessMarkdown`により3スペース以上は2スペースに正規化されること。`customHTMLRenderer.hardBreak`により`<br>`レンダリングが保証されること | Auto/Manual | Auto:Pass（IT-MD-001〜006）/ Manual:Pending |
| ST-010 | エディタ | WYSIWYG編集 | 文字入力・見出し適用・段落改行を行う | 入力通りに表示され、Markdown記法が適用されること | Manual | Pending |
| ST-011 | エディタ | 文字装飾 | 太字(Ctrl+B)、斜体(Ctrl+I)、取り消し線を適用する | 選択テキストにスタイルが適用されること | Review | Pass |
| ST-012 | エディタ | リスト作成 | 箇条書き・番号付きリストを挿入する | リスト形式で表示されること | Manual | Pending |
| ST-013 | エディタ | 挿入機能 | リンク・画像・表・コードブロック・引用・水平線を挿入する | 各要素が正しく挿入・表示されること | Manual | Pending |
| ST-014 | エディタ | Undo/Redo | Ctrl+Z / Ctrl+Y を使用する | 操作の取り消し・やり直しができること | Manual | Pending |
| ST-015 | エディタ | モード切替 | WYSIWYGとMarkdownソースのタブを切り替える | どちらのモードでも内容が保持され、行き来できること | Manual | Pending |
| ST-016 | 状態管理 | 未保存検知 | 内容を変更する | タイトルバーに`*`が付く、または内部フラグ`isUnsaved`が`true`になること | Auto/Review | Pass |
| ST-017 | 状態管理 | D&D切替時確認 | 未保存状態で別のMDファイルをD&Dする | 保存確認ダイアログが表示され、「キャンセル」でファイル切替が中断されること | Auto/Review | Pass |
| ST-017b | 状態管理 | 終了時確認 | 未保存状態でウィンドウを閉じる | 保存確認ダイアログが表示され、「キャンセル」で終了が中断されること | Manual | Pending |

### 4.3 非機能要件評価 (Non-Functional Requirements)

| ID | カテゴリ | テスト項目 | 内容 | 期待値 | 検証方法 | 結果 |
|:--|:--|:--|:--|:--|:--|:--|
| ST-018 | 配布 | インストールレス起動 | exeファイルをダブルクリックで実行する | インストール不要で即座に起動すること | Manual | Pending |
| ST-019 | セキュリティ | 外部通信なし | ネットワーク切断状態で起動・編集・保存を行う | 通信エラーなく正常に動作すること（完全ローカル） | Review | Pass |
| ST-020 | パフォーマンス | 応答速度 | 1万文字程度のファイルを編集する | 入力遅延が著しくないこと | Manual | Pending |
| ST-020a | 運用 | エラーハンドリング | 存在しないファイルを操作しようとする | ユーザーに分かりやすいエラーメッセージが表示されること | Auto/Review | Pass |

### 4.4 受入条件評価（01_requirements.md §4.2）

#### 正常系
| # | 受入条件 | 結果 | 対応テストID |
|:--|:--|:--|:--|
| AC-N-1 | アプリ起動時にウィンドウが表示されること | Pending（Manual） | ST-001 |
| AC-N-2 | MDファイルをD&DでWYSIWYGエディタに直接表示されること（フォルダダイアログ・ツリー表示を一切使用しないこと） | Pass（Auto/Review） | ST-003, ST-004 |
| AC-N-3 | 太字・リスト・画像挿入などの編集操作が正しく反映されること | Pending（Manual） | ST-011〜ST-013 |
| AC-N-4 | Ctrl+Sまたは保存ボタンでMarkdownとして正しく保存されること | Pass（Auto/Review） | ST-009 |
| AC-N-5 | 新規作成・リネーム・削除が正しく動作すること | Pass（Auto/Review） | ST-005〜ST-007 |
| AC-N-6 | 行末スペース2個を含むMDファイルを開いた際、WYSIWYG上で強制改行として表示されること | Auto:Pass（IT-MD-001〜006）/ Manual:Pending | ST-E03 |

#### 異常系
| # | 受入条件 | 結果 | 対応テストID |
|:--|:--|:--|:--|
| AC-E-1 | 読み込み不可能なファイルを選択した際、エラーメッセージが表示されること | Pass（Auto/Review） | ST-020a |
| AC-E-2 | 保存失敗時にエラーメッセージが表示されること | Pass（Auto/Review） | ST-020a |
| AC-E-3 | 未保存状態で終了しようとした際、確認ダイアログが表示され「キャンセル」で終了を中断できること | Pending（Manual） | ST-017b |

## 5. 自動テスト結果サマリ (Unit & Integration)

### 5.1 Unit Test (Main Process) — `test/main.test.js`
- 対象: `project/src/main.js` のIPCハンドラ・validatePath
- 結果: **18/18 Pass**
- 確認済項目:
  - readFile / saveFile / createFile / deletePath / renamePath / showConfirm ハンドラ（正常・エラー系）
  - `dialog:openFolder` / `fs:readDir` が未登録であることの確認
  - validatePath パストラバーサル検出（UT-V-001〜006）
- エビデンス: `project/document/05_unit_test.md` 参照

### 5.2 Integration Test (Renderer + IPC) — `test/integration.test.js`
- 対象: `project/src/renderer/renderer.js` とIPC連携
- 結果: **14/14 Pass**
- 確認済項目:
  - D&DドロップによるMDファイル読み込み（IT-DND-001〜003）
  - 新規作成・削除・リネームのIPC呼び出し（IT-IPC-003〜006）
  - 未保存インジケータ動作（IT-STATE-001）
  - `preprocessMarkdown` trailing-space正規化（IT-MD-001〜004）
  - `customHTMLRenderer.hardBreak` オプション設定・戻り値（IT-MD-005〜006、不具合 #2 対応）
- エビデンス: `project/document/06_integration_test.md` 参照

### 5.3 テストサマリー

| 工程 | 件数 | 結果 |
|:--|:--|:--|
| Unit Test (main.test.js) | 18 | **18/18 Pass** |
| Integration Test (integration.test.js) | 14 | **14/14 Pass** |
| **合計** | **32** | **32/32 Pass** |

## 6. 残存課題と対応

### 6.1 未実施の手動テスト (Windows環境)
本環境（Linux Dev Container）ではGUIアプリの実機表示確認ができないため、「Manual」判定の項目はWindows実機での確認が必要となる。
これらはexe成果物（electron-builder生成）をWindows環境に持ち込んで実施する手順とする。

**Manual判定の項目一覧:**
- ST-001: exe起動確認
- ST-002: 画面構成確認（D&Dドロップゾーン表示）
- ST-010: WYSIWYG編集動作
- ST-012: リスト作成
- ST-013: 挿入機能（リンク・画像・表等）
- ST-014: Undo/Redo
- ST-015: WYSIWYGとMarkdownソードモード切替
- ST-017b: 終了時未保存確認ダイアログ
- ST-018: exeインストールレス起動
- ST-E03: trailing-space改行のWYSIWYG実レンダリング確認（`preprocessMarkdown` + `customHTMLRenderer.hardBreak` ロジックはAutoで IT-MD-001〜006 Pass済み。Toast UI EditorがWYSIWYG上で実際に`<br>`として表示するかは実機確認が必要）
- ST-020: パフォーマンス（1万文字編集）
- AC-N-1, AC-N-3, AC-E-3, AC-N-6（Manual部分）

### 6.2 Linux環境における制約
- **electron-builder (Windows exe生成)**: Linux環境では `wine` が不在のため、WindowsターゲットのNSIS/portableビルドは直接実行不可。Windows環境またはCI環境での実施が必要。
- **Electronアプリ起動確認 (devcontainer)**: `npx electron . --no-sandbox --disable-gpu` で起動は可能だが、GUIのスクリーンショット確認には追加ツール（Xvfb等）が必要。

### 6.3 リリース判定
- 自動テスト（ロジック検証）は全32件クリアしている。
- D&D方式への変更（v1.1.0）の主要ロジックは Auto/Review で検証済み。
- 手動テスト（GUI動作・Windows実機）はリリース直前の最終確認として実施する。
- BUG-04（D&D禁止マーク不具合）は v1.1.2 で解決済みであり、D&Dによるファイル読み込みフローは Auto/Review で確認済み。
- `preprocessMarkdown` による trailing-space CommonMark 正規化（v1.2.0）はAutoテストで全4件 Pass 済み。
- `customHTMLRenderer.hardBreak` による WYSIWYG `<br>` レンダリング仕様（v1.3.0・不具合 #2 対応）はロジックAutoテスト（IT-MD-005〜006）で Pass 済み。Toast UI Editor 実レンダリング（`<br>`表示）の最終確認は Windows 実機（ST-E03 Manual）で行う。確認後に不具合 #2 をクローズする。
- 現時点でのシステム品質は、ロジック面において「リリース候補（条件付き合格）」であると判断する。

## 7. 結論

Unit/Integrationフェーズでの網羅的なロジック検証（計32件，全件合格）により、主要機能の正常性は担保されている。

v1.1.0でのアーキテクチャ変更（MDファイルD&D直接読込方式）についても、以下が確認済みである：
- 旧 `dialog:openFolder` / `fs:readDir` ハンドラの削除確認
- D&DによるMDファイル読み込みフローの動作確認
- `validatePath()` によるパストラバーサル防止（BUG-01修正済み）

v1.1.1でのバグ修正として、以下が確認済みである：
- exe実行時エディタ未初期化の修正（BUG-03）：`nodeIntegration: true` 化・CSS/JSファイル名修正・`require('@toast-ui/editor')` 化

v1.1.2でのバグ修正として、以下が確認済みである：
- D&Dドロップ禁止マーク不具合の修正（BUG-04）：`contextIsolation: true` + `nodeIntegration: true` 競合により renderer.js 起動時クラッシュ→`setupDropZone()` 未実行→dragover リスナ未登録 の連鎖を解消。`contextIsolation: false` に変更し、preload.js の `contextBridge.exposeInMainWorld` を `window.api = {...}` 直接代入に変更。修正後 Auto/Review テスト 26件全件 PASS 再確認済み

v1.2.0でのバグ修正・機能追加として、以下が確認済みである：
- trailing-space（行末スペース2個）CommonMark 準拠レンダリング（不具合#1対応）：`preprocessMarkdown` 関数が `/ {2,}\n/g` → `'  \n'` で正規化し、`setMarkdown` 前に適用（IT-MD-001〜004 PASS）。Toast UI Editor 実レンダリングの `<br>` 表示確認は Windows 実機（ST-E03）にて確認予定。

v1.3.0でのバグ修正として、以下が確認済みである：
- WYSIWYG上での trailing-space 強制改行非表示（不具合 #2 対応）：`initEditor()` に `customHTMLRenderer: { hardBreak() { return [{ type: 'html', content: '<br>' }]; } }` を追加。`customHTMLRenderer.hardBreak` の設定・戻り値をAutoテスト（IT-MD-005〜006 PASS）で検証済み。Toast UI Editor 実レンダリングの最終確認は Windows 実機（ST-E03 Manual）で行い、確認後に不具合 #2 をクローズする。

最終的なUI動作（WYSIWYG操作、ツールバー、モード切替）とWindows固有の動作については、配布パッケージ作成後の実機手動テストに委ねるものとし、本フェーズ（システム評価）としては **条件付き合格** とする。
