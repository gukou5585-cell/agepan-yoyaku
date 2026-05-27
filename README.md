# あげパン よやくシステム 🍩

## デプロイ手順（Vercel + Firebase）

### 1. Firebase セットアップ（無料）
1. https://console.firebase.google.com/ にアクセス
2. 「プロジェクトを追加」→ 名前を入力（例: kyushoku-app）
3. 左メニュー「構築」→「Realtime Database」→「データベースを作成」
   - ロケーション: asia-southeast1（シンガポール）
   - セキュリティルール: **テストモード**で開始
4. 左メニュー「プロジェクトの概要」⚙️ →「プロジェクトの設定」
5. 「マイアプリ」→「</>」ウェブアイコン → アプリを登録
6. 表示された `firebaseConfig` をコピー

### 2. src/App.jsx を編集
```js
const firebaseConfig = {
  apiKey: "実際の値を貼り付け",
  authDomain: "実際の値を貼り付け",
  databaseURL: "実際の値を貼り付け",
  ...
};
```

### 3. GitHub にアップロード
1. https://github.com/new でリポジトリ作成（名前: kyushoku-app）
2. このフォルダをアップロード（「uploading an existing file」をクリック）
   - package.json, public/, src/ をすべてアップロード

### 4. Vercel でデプロイ
1. https://vercel.com → 「Add New Project」
2. 作ったGitHubリポジトリを選択 → 「Deploy」
3. 数分でURLが発行される 🎉

### 5. URLをQRコードに反映
- デプロイ後のURL（例: https://kyushoku-app.vercel.app）を開くと
  ホーム画面に自動でQRコードが生成されます！

## フォルダ構成
```
kyushoku-app/
├── package.json
├── public/
│   └── index.html
└── src/
    ├── index.js
    └── App.jsx   ← ここにfirebaseConfigを貼り付け
```
