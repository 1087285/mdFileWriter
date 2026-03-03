# 04 実装記録

## 1. 実装概要
詳細設計書に基づき、メインプロセス、レンダラープロセス、UIの実装を行った。

## 2. 実装詳細

### 2.1. メインプロセス (src/main.js)
- **IPCハンドラの実装**: , , , , , , ,  を実装済み。
- **セキュリティ対策**:  でパストラバーサル（）を簡易チェックするように実装。
- **文字コード対応**:  と  を用いて読み込み時の自動判定とUTF-8変換を実装。

### 2.2. プリロードスクリプト (src/preload.js)
-  を介して、レンダラープロセスに必要なAPIのみを公開。

### 2.3. レンダラープロセス (src/renderer/index.html, renderer.js, styles.css)
- **UI構成**: 左右ペイン（ファイルツリー、エディタ）、カスタムツールバーを実装。
- **エディタ**: Toast UI Editor 3.x を採用。
- **ツールバー**: カスタムボタン (属性) を配置し、 で太字・リスト等の書式適用を実装。
- **ファイルツリー**: 再帰的読み込み構造を実装（クリック展開）。選択状態のスタイル適用。
- **ファイル操作**:
    - **新規作成**: ルートフォルダ直下にタイムスタンプ付きファイルを作成する簡易実装 ()。
    - **削除**: 選択中ファイルの削除（確認ダイアログ付き）。
    - **リネーム**: 選択中ファイルのリネーム（ ダイアログ使用）。
- **未保存検知**: 変更監視によるインジケータ表示、ファイル切り替え時の確認ダイアログを実装。

### 2.4. パッケージとビルド (package.json)
- 依存関係 (, , , ) を追加。
-  の設定を追加し、Windows向け（nsis, portable）ビルドが可能になるよう構成。

## 3. 詳細設計との差分
- **ツールバー実装**: 標準のToast UI Editorツールバーを非表示にし、要件に合わせたカスタムボタンを実装した。
- **新規作成ロジック**: ファイル名入力ダイアログ（モーダル）の作成工数を削減するため、一時的に現在時刻ベースの自動命名＋リネーム推奨の運用とした。
- **リネームUI**: 簡易的に  を使用して実装した。

## 4. 既知の問題・制約
- **ツリー更新**: ファイル操作後のツリー更新は  を呼び出すことで全体リロードしている。フォルダ階層が深い場合、展開状態がリセットされる可能性がある。
- **エラーハンドリング**: ファイルシステムエラー時は  で通知する簡易実装となっている。

## 5. 次のステップ
- 単体テストの実施。
- ビルドテスト (
> md-file-writer@1.0.0 build
> electron-builder --win

  • electron-builder  version=24.13.3 os=6.8.0-1044-azure
  • loaded configuration  file=package.json ("build" field)
  • author is missed in the package.json  appPackageFile=/workspaces/mdFileWriter/project/package.json
  • packaging       platform=win32 arch=x64 electron=28.3.3 appOutDir=dist/win-unpacked
  • downloading     url=https://github.com/electron/electron/releases/download/v28.3.3/electron-v28.3.3-win32-x64.zip size=108 MB parts=4
  • downloaded      url=https://github.com/electron/electron/releases/download/v28.3.3/electron-v28.3.3-win32-x64.zip duration=854ms
  • Cannot detect repository by .git/config. Please specify "repository" in the package.json (https://docs.npmjs.com/files/package.json#repository).
Please see https://electron.build/configuration/publish
  • default Electron icon is used  reason=application icon is not set
  • downloading     url=https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z size=5.6 MB parts=1
  • downloaded      url=https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z duration=1.078s
  ⨯ wine is required, please see https://electron.build/multi-platform-build#linux  
  ⨯ /workspaces/mdFileWriter/project/node_modules/app-builder-bin/linux/x64/app-builder process failed ERR_ELECTRON_BUILDER_CANNOT_EXECUTE
Exit code:
1  failedTask=build stackTrace=Error: /workspaces/mdFileWriter/project/node_modules/app-builder-bin/linux/x64/app-builder process failed ERR_ELECTRON_BUILDER_CANNOT_EXECUTE
Exit code:
1
    at ChildProcess.<anonymous> (/workspaces/mdFileWriter/project/node_modules/builder-util/src/util.ts:252:14)
    at Object.onceWrapper (node:events:623:26)
    at ChildProcess.emit (node:events:508:28)
    at maybeClose (node:internal/child_process:1101:16)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:305:5)
From previous event:
    at processImmediate (node:internal/timers:504:21)
From previous event:
    at WinPackager.signApp (/workspaces/mdFileWriter/project/node_modules/app-builder-lib/src/winPackager.ts:384:27)
    at WinPackager.doSignAfterPack (/workspaces/mdFileWriter/project/node_modules/app-builder-lib/src/platformPackager.ts:336:32)
    at WinPackager.doPack (/workspaces/mdFileWriter/project/node_modules/app-builder-lib/src/platformPackager.ts:321:7)
    at WinPackager.pack (/workspaces/mdFileWriter/project/node_modules/app-builder-lib/src/platformPackager.ts:140:5)
    at Packager.doBuild (/workspaces/mdFileWriter/project/node_modules/app-builder-lib/src/packager.ts:445:9)
    at executeFinally (/workspaces/mdFileWriter/project/node_modules/builder-util/src/promise.ts:12:14)
    at Packager._build (/workspaces/mdFileWriter/project/node_modules/app-builder-lib/src/packager.ts:379:31)
    at Packager.build (/workspaces/mdFileWriter/project/node_modules/app-builder-lib/src/packager.ts:340:12)
    at executeFinally (/workspaces/mdFileWriter/project/node_modules/builder-util/src/promise.ts:12:14)) の実施。
