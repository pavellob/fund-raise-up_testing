module.exports = {
  root: true,
  extends: ["eslint:recommended", "turbo"],
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  }
};