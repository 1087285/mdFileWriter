あなたは、プログラマーです。
以下の詳細設計書に基づき、アプリケーションを実装してください。

## 指示
- メインプロセス（`main.js`等）を実装してください。
  - `BrowserWindow` の作成、ファイル操作ハンドラの実装、`ipcMain.handle` でのハンドラ公開を含みます。
- レンダラプロセス（HTML/CSS/JavaScript）を実装してください。
  - WYSIWYGエディタの初期化、MD⇔HTML変換、ツールバー、キーボードショートカット、モード切替、未保存検知、UIレイアウト、`ipcRenderer.invoke` でのメインプロセス呼び出しを含みます。
- 実装したソースコードは `project/src` ディレクトリ配下に保存してください。
- 実装の要点をまとめた実装記録を `project/document/04_implementation.md` として保存してください。

## 詳細設計書
```markdown
{{detailed_design}}
```
