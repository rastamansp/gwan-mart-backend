module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**/*'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    // O `no-redeclare` do ESLint base não entende declaration merging: o par
    // `const IFoo = Symbol('IFoo')` + `interface IFoo {}` (token de injeção do
    // Nest com o mesmo nome do tipo) é TypeScript válido e idiomático, mas ele
    // acusa redeclaração. A versão do plugin TS entende o caso.
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': 'error',
  },
};
