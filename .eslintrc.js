// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint'
  },
  env: {
    browser: true,
  },
  extends: [
    'plugin:vue/recommended', 
    'standard'
  ],
  // required to lint *.vue files
  plugins: [
    'vue'
  ],
  rules: {
    'generator-star-spacing': 'off',
    'space-after-function-name': 'never',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  }
}
