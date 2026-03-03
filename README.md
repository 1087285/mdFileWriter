# mdFileWriter

Markdown記法を意識せず **Word感覚（WYSIWYG）** でMarkdownファイルを作成・編集・保存できるデスクトップアプリです。  
Electronベースで動作し、Windows 10/11 向けに実行ファイル（`.exe`）として配布します。

---

## 特長

- **WYSIWYGエディタ**：Markdown記法を覚えなくてもワープロ感覚で文書を編集できます。
- **Markdownソース編集モード**：Markdownに慣れたユーザはソースモードに切り替え可能です。
- **Word風ツールバー**：見出し・太字・斜体・リスト・表・リンク・画像挿入など豊富な書式ボタンを搭載しています。
- **ファイルツリー**：フォルダを指定すると配下の `.md` ファイルをツリー表示し、クリックで即時開きます。
- **完全ローカル動作**：外部サーバへの接続は不要で、すべてオフラインで動作します。
- **キーボードショートカット**：`Ctrl+S` 保存、`Ctrl+B` 太字、`Ctrl+Z` Undo など主要操作に対応しています。
- **未保存検知**：未保存状態をタイトルバーに表示し、ファイル切替・終了時に確認ダイアログを表示します。

---

## 動作環境

| 項目 | 内容 |
|:--|:--|
| OS | Windows 10 / 11 |
| 配布形式 | インストーラ版（`.exe`）またはポータブル版（`.exe`） |
| 外部依存 | なし（Node.js 不要・完全スタンドアロン） |

---

## 使い方

詳細な操作手順は [HOWTOUSE.md](HOWTOUSE.md) を参照してください。

**基本的な流れ：**

1. アプリを起動する。
2. 左ペインの「フォルダを開く」からMarkdownファイルが入ったフォルダを選択する。
3. ファイルツリーで編集したいファイルをクリックする。
4. 右ペインのエディタで内容を編集する。
5. `Ctrl+S` またはツールバーの「保存」ボタンで保存する。

---

## 技術スタック

| 分類 | 技術・ライブラリ |
|:--|:--|
| アプリフレームワーク | [Electron](https://www.electronjs.org/) v28 |
| WYSIWYGエディタ | [Toast UI Editor](https://ui.toast.com/tui-editor) v3 |
| 文字コード自動判定 | [chardet](https://www.npmjs.com/package/chardet) / [iconv-lite](https://www.npmjs.com/package/iconv-lite) |
| ビルド | [electron-builder](https://www.electron.build/) v24 |
| テスト | [Jest](https://jestjs.io/) v30 |

---

## フォルダ構成

```
mdFileWriter/
├── HOWTOUSE.md              # アプリの使い方ガイド
├── README.md
├── agent/                   # 各工程エージェント定義
├── prompt/                  # 各工程プロンプト定義
├── skills/                  # エージェントスキル定義
├── requests/                # 要求・議事録
└── project/
    ├── package.json
    ├── jest.config.js
    ├── document/            # 各工程成果物（設計書・評価書 等）
    ├── src/
    │   ├── main.js          # Electronメインプロセス
    │   ├── preload.js       # プリロードスクリプト
    │   └── renderer/
    │       ├── index.html   # レンダラーUI
    │       ├── renderer.js  # レンダラープロセス制御
    │       └── styles.css   # スタイルシート
    └── test/
        ├── main.test.js         # 単体テスト
        └── integration.test.js  # 結合テスト
```

---

## 開発者向け

### 必要なもの

- Node.js 18 以上
- npm

### セットアップ

```bash
cd project
npm install
```

### 開発実行

```bash
npm start
```

### テスト実行

```bash
npm test
```

### Windows向けビルド

```bash
npm run build
# → project/dist/ に .exe が生成されます
```

---

## 開発プロセス

ウォーターフォール方式で開発しており、各工程の成果物は `project/document/` に保存されています。

| 工程 | 成果物 |
|:--|:--|
| 1. 要件定義 | [01_requirements.md](project/document/01_requirements.md) |
| 2. 基本設計 | [02_basic_design.md](project/document/02_basic_design.md) |
| 3. 詳細設計 | [03_detailed_design.md](project/document/03_detailed_design.md) |
| 4. 実装 | [04_implementation.md](project/document/04_implementation.md) |
| 5. 単体評価 | [05_unit_test.md](project/document/05_unit_test.md) |
| 6. 結合評価 | [06_integration_test.md](project/document/06_integration_test.md) |
| 7. システム評価 | [07_system_test.md](project/document/07_system_test.md) |
| 8. リリース | [08_release.md](project/document/08_release.md) |

---

## ライセンス

本プロジェクトは MIT ライセンスのもとで公開しています。
