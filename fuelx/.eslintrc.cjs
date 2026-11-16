module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist/', 'node_modules/', 'public/js/', 'coverage/', '*.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'error',
  },
  overrides: [
    {
      files: ['scripts/**/*.ts', 'tests/**/*.ts'],
      rules: { 'no-console': 'off', '@typescript-eslint/no-explicit-any': 'off' },
    },
    {
      files: ['client/**/*.ts'],
      env: { browser: true },
    },
  ],
};
