# 02 基本設計書

## 1. アプリケーション全体構成

### 1.1. プロセス構成
Electronフレームワークを採用し、以下の2プロセス構成とする。
セキュリティ確保のため、`nodeIntegration: false`, `contextIsolation: true` を前提とし、`preload.js` と `contextBridge` を介したIPC通信を行う。

- **メインプロセス (Main Process)**
    - 役割: アプリケーションのライフサイクル管理、ネイティブ機能（ファイルシステム、メニュー、ダイアログ）の提供。
    - 技術スタック: Node.js
    - 責務:
        - ウィンドウ(`BrowserWindow`)の生成・管理
        - アプリケーションメニューの構築
        - IPC通信(`ipcMain`)によるレンダラーからの要求処理
        - ファイルシステム(`fs`)へのアクセスとセキュリティ検証（パスのトラバーサル対策等）

- **レンダラープロセス (Renderer Process)**
    - 役割: ユーザーインターフェース(UI)の描画、WYSIWYGエディタの動作、ユーザー入力のハンドリング。
    - 技術スタック: Chromium, HTML, CSS, JavaScript (Toast UI Editor)
    - 責務:
        - 画面描画（ファイルツリー、エディタ、ツールバー）
        - ユーザー操作のイベントハンドリング
        - IPC通信(`ipcRenderer`)によるメインプロセスへの処理依頼
        - エディタライブラリ(Toast UI Editor)の制御
        - Markdown ⇔ HTML の変換（エディタ機能またはライブラリ利用）

## 2. 画面構成

### 2.1. 画面レイアウト
ウィンドウ全体を左右2分割（スプリットビュー）する構成とする。

- **左ペイン: ファイルエクスプローラー** (幅: 可変/初期値250px程度)
    - フォルダ選択ボタン
    - 選択したルートフォルダ配下のファイルツリー表示
    - コンテキストメニュー（新規作成、削除、リネーム）
- **右ペイン: エディタ領域** (幅: 残り全域)
    - 上部: Word風ツールバー（固定表示）
    - 中央: WYSIWYGエディタ（スクロール可能）
    - 下部（または上部右端）: 編集モード切替（WYSIWYG / Markdownソース）
    - ステータスバー（任意）: 保存状態、カーソル位置など

### 2.2. 主要コンポーネント

| コンポーネント名 | 配置 | 概要 | 備考 |
|:---|:---|:---|:---|
| `AppContainer` | 全体 | アプリ全体のレイアウトコンテナ。左右ペインの分割と状態管理を行う。 | |
| `FileTree` | 左ペイン | 再帰的なファイル構造を表示する。フォルダの展開/折りたたみ、ファイル選択イベントを管理。 | |
| `Toolbar` | 右ペイン | 見出し、太字、リスト等の書式設定ボタン群。エディタへのコマンド発行を行う。 | Toast UI Editor APIを使用 |
| `Editor` | 右ペイン | WYSIWYGエディタ本体。Markdown/HTMLの変換と表示、編集を受け持つ。 | Toast UI Editor をラップ |
| `ModeSwitcher` | 右ペイン | 編集モード（WYSIWYG / Markdown）を切り替えるUI。 | タブまたはボタングループ |
| `UnsavedIndicator`| タイトルバー等 | 未保存変更がある場合にインジケータ（`*`など）を表示する。 | |

## 3. インターフェース設計 (IPC)

レンダラープロセスからメインプロセスを呼び出す非同期通信 (`invoke` / `handle`) パターンを採用する。

### 3.1. API定義 (Preload経由)

| チャネル名 (`channel`) | 引数 | 戻り値 | 説明 |
|:---|:---|:---|:---|
| `dialog:openFolder` | なし | `Promise<string \| null>` | フォルダ選択ダイアログを開き、選択されたパスを返す。キャンセル時は `null`。 |
| `fs:readDir` | `dirPath: string` | `Promise<Dirent[]>` | 指定ディレクトリのエントリ一覧（名前、種類）を返す。 |
| `fs:readFile` | `filePath: string` | `Promise<string>` | 指定ファイルの内容をテキストとして読み込む（文字コード自動判定）。 |
| `fs:saveFile` | `filePath: string`, `content: string` | `Promise<void>` | 指定ファイルにテキスト内容（Markdown）をUTF-8で書き込む。 |
| `fs:createFile` | `dirPath: string`, `fileName: string` | `Promise<string>` | 新規ファイルを作成し、そのフルパスを返す。 |
| `fs:deletePath` | `targetPath: string` | `Promise<void>` | 指定パス（ファイル/フォルダ）を削除する。 |
| `fs:renamePath` | `oldPath: string`, `newPath: string` | `Promise<void>` | パスのリネームを行う。 |
| `dialog:showConfirm` | `message: string` | `Promise<boolean>` | 確認ダイアログ（Yes/No等）を表示し、Yesなら `true` を返す。 |

## 4. データフロー

1. **初期化**:
   - アプリ起動 → メインプロセス立ち上げ → ウィンドウ生成 → レンダラー読み込み。
2. **フォルダ展開**:
   - ユーザーが「フォルダを開く」 → `dialog:openFolder` → パス取得。
   - レンダラーが `fs:readDir` を呼び出し、ファイルツリーを構築・表示。
3. **ファイル編集**:
   - ユーザーがファイル選択 → `fs:readFile` → データ受信 → エディタにセット。
   - ユーザーが編集 → エディタの `change` イベント → 未保存フラグON。
4. **保存**:
   - ユーザーが `Ctrl+S` または保存ボタン → `fs:saveFile` → メインプロセスで書き込み → 保存完了通知 → 未保存フラグOFF。

## 5. 配布・デプロイ設計

- **ビルドツール**: `electron-builder`
- **ターゲット**: Windows (nsis, portable)
- **アーティファクト**:
    - Setup.exe (インストーラ)
    - Portable.exe (インストール不要版)
- **設定**: `package.json` に `build` 設定を追加し、アイコン、プロダクト名、ID等を指定する。
