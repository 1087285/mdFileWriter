module.exports = {
  // テスト環境はファイルごとに @jest-environment docblock で指定する
  // - main.test.js: node (デフォルト)
  // - integration.test.js: jest-environment-jsdom (docblock指定)
  transformIgnorePatterns: [
    '/node_modules/(?!(@exodus|whatwg-encoding)/)'
  ]
};
